"""
Hotel Recommendation Engine — ML Server
========================================
Implements a 4-step recommendation pipeline:

  Step 1 — Filter hotels within a configurable radius (default 5 km) using Haversine.
  Step 2 — Embed the new event and search Qdrant `hotels_activity_vectors`
            to find hotels that have hosted similar events. Group by hotel
            and compute average similarity scores.
  Step 3 — Select the best hotel (highest similarity among candidates).
  Step 4 — Sort remaining candidate hotels by distance from the best hotel.

The Node.js backend sends event + hotel data (with coordinates).
This module returns the final ranked recommendation list.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Tuple
import math
import os
import logging
import httpx

from langchain_openai import OpenAIEmbeddings
from qdrant_client import QdrantClient

router = APIRouter()
logger = logging.getLogger("hotel_recommendation")

# ─── Coordinate helpers ───────────────────────────────────────────────
def _coords_valid(lat, lng) -> bool:
    """Return True only when both lat/lng are real-world values.
    (0, 0) is in the Gulf of Guinea — no hotel is there."""
    if lat is None or lng is None:
        return False
    if lat == 0.0 and lng == 0.0:
        return False
    return True

# ──────────────────────────────────────────────
# Geocoding Cache + Helper
# ──────────────────────────────────────────────

_geocode_cache: dict[str, Tuple[float, float]] = {}


async def geocode_city(city: str, country: str = "") -> Tuple[Optional[float], Optional[float]]:
    """
    Resolve (latitude, longitude) for a city+country string using
    the OpenStreetMap Nominatim free geocoding API.
    Results are cached in-memory to avoid repeated API calls.
    """
    if not city:
        return None, None

    cache_key = f"{city.strip().lower()}|{country.strip().lower()}"
    if cache_key in _geocode_cache:
        return _geocode_cache[cache_key]

    query = f"{city}, {country}" if country else city
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": query, "format": "json", "limit": 1},
                headers={"User-Agent": "SyncStay-ML/1.0"},
            )
            resp.raise_for_status()
            data = resp.json()

        if data:
            lat = float(data[0]["lat"])
            lon = float(data[0]["lon"])
            _geocode_cache[cache_key] = (lat, lon)
            logger.info(f"📍 Geocoded '{query}' → ({lat}, {lon})")
            return lat, lon
        else:
            logger.warning(f"⚠️  Geocoding returned no results for '{query}'")
            return None, None
    except Exception as e:
        logger.warning(f"⚠️  Geocoding failed for '{query}': {e}")
        return None, None

# ──────────────────────────────────────────────
# Pydantic Models
# ──────────────────────────────────────────────

class HotelInput(BaseModel):
    id: str
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: str = ""
    country: str = ""
    totalRooms: int = 0
    specialization: List[str] = []
    priceRange: dict = {}
    averageRating: float = 0
    eventsHostedCount: int = 0


class EventInput(BaseModel):
    id: str
    name: str
    type: str
    description: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: str = ""
    country: str = ""


class SelectedHotelInput(BaseModel):
    """When a hotel has already been selected, pass it here to skip ML
    and just sort remaining hotels by distance from this one."""
    id: str
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: str = ""
    country: str = ""


class RecommendationRequest(BaseModel):
    event: EventInput
    hotels: List[HotelInput]
    selected_hotel: Optional[SelectedHotelInput] = Field(
        default=None,
        description="If a hotel is already selected, remaining hotels are ranked by distance from it (no ML)",
    )
    radius_km: float = Field(default=5.0, description="Radius in km to filter candidate hotels")
    limit: int = Field(default=10, description="Max hotels to return")


class RecommendedHotel(BaseModel):
    hotel_id: str
    hotel_name: str
    rank: int
    is_best_match: bool
    similarity_score: float
    distance_from_event_km: float
    distance_from_best_km: float
    reasons: List[str]
    city: str = ""
    country: str = ""
    totalRooms: int = 0
    specialization: List[str] = []
    priceRange: dict = {}
    averageRating: float = 0


class RecommendationResponse(BaseModel):
    status: str
    recommendations: List[RecommendedHotel]
    total_candidates: int
    hotels_within_radius: int
    best_hotel_name: str = ""


# ──────────────────────────────────────────────
# Haversine Distance
# ──────────────────────────────────────────────

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance in km between two points
    on Earth using the Haversine formula.
    """
    R = 6371.0  # Earth radius in kilometres

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


# ──────────────────────────────────────────────
# Helper: Qdrant UUID ↔ ObjectId conversion
# ──────────────────────────────────────────────

def object_id_to_uuid(object_id: str) -> str:
    """Mirror the Node.js objectIdToUUID conversion."""
    padded = object_id.ljust(32, "0")
    return (
        f"{padded[0:8]}-{padded[8:12]}-{padded[12:16]}"
        f"-{padded[16:20]}-{padded[20:32]}"
    )


def uuid_to_object_id(uuid: str) -> str:
    """Mirror the Node.js uuidToObjectId conversion."""
    return uuid.replace("-", "")[:24]


# ──────────────────────────────────────────────
# Reason Generator
# ──────────────────────────────────────────────

def _generate_reasons(
    candidate: dict,
    is_best: bool = False,
    best_hotel_name: str = "",
) -> List[str]:
    reasons: List[str] = []
    hotel: HotelInput = candidate["hotel"]

    if is_best:
        score = candidate.get("similarity_score", 0)
        if score > 0:
            pct = round(score * 100, 1)
            reasons.append(f"🎯 Best event similarity match ({pct}%)")
        else:
            reasons.append("🎯 Best available match (nearest to event)")
        reasons.append(
            f"📍 {candidate['distance_from_event_km']} km from event venue"
        )
    else:
        dist_best = candidate.get("distance_from_best_km", 0)
        reasons.append(f"📍 {dist_best} km from {best_hotel_name}")
        reasons.append(
            f"📍 {candidate['distance_from_event_km']} km from event venue"
        )

    if hotel.totalRooms > 0:
        reasons.append(f"🏨 {hotel.totalRooms} rooms available")

    if hotel.averageRating >= 4:
        reasons.append(f"⭐ Highly rated ({hotel.averageRating}/5)")

    if hotel.specialization:
        reasons.append(f"🎪 Specializes in: {', '.join(hotel.specialization)}")

    return reasons


# ──────────────────────────────────────────────
# Main Recommendation Endpoint
# ──────────────────────────────────────────────

@router.post("/recommend")
async def recommend_hotels(request: RecommendationRequest):
    """
    Hotel recommendation pipeline with two modes:

    **Mode A – First selection (no hotel selected yet):**
      1. Filter hotels within *radius_km* of the event (Haversine).
      2. Embed the event → search Qdrant for similar hotels.
      3. Best hotel = highest similarity.
      4. Remaining sorted by distance from best hotel.

    **Mode B – After first selection (selected_hotel provided):**
      Skip ML entirely.  Filter hotels within radius of the event,
      then sort them by distance from the already-selected hotel so
      guests stay close together.
    """
    try:
        event = request.event
        hotels = request.hotels
        selected = request.selected_hotel
        radius_km = request.radius_km
        limit = request.limit

        mode = "distance-from-selected" if selected else "ml-pipeline"
        print(f"\n{'='*60}")
        print(f"🔍 [Reco] Mode: {mode}")
        print(f"🔍 [Reco] Event: {event.name} (id={event.id})")
        print(f"🔍 [Reco] Event city={event.city}, country={event.country}")
        print(f"🔍 [Reco] Hotels received: {len(hotels)}")
        if selected:
            print(f"🔍 [Reco] Selected hotel: {selected.name} (id={selected.id})")
        print(f"🔍 [Reco] Radius: {radius_km} km, Limit: {limit}")
        print(f"{'='*60}")

        # ── Common: geocode & distance-filter ─────────────────────────────
        candidates = await _geocode_and_filter(event, hotels, radius_km)

        if not candidates:
            print("🚫 No candidates within radius — returning empty")
            return RecommendationResponse(
                status="success",
                recommendations=[],
                total_candidates=len(hotels),
                hotels_within_radius=0,
                best_hotel_name="",
            )

        hotels_within_radius = len(candidates)

        # ── Branch by mode ────────────────────────────────────────────────
        if selected:
            return await _recommend_by_distance(
                candidates, selected, hotels_within_radius,
                len(hotels), limit,
            )
        else:
            return await _recommend_with_ml(
                candidates, event, hotels_within_radius,
                len(hotels), limit,
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Hotel recommendation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────
# Shared: geocode + Haversine radius filter
# ──────────────────────────────────────────────

async def _geocode_and_filter(
    event: EventInput,
    hotels: List[HotelInput],
    radius_km: float,
) -> List[dict]:
    """Geocode missing coords, then filter hotels within radius of event."""
    event_lat = event.latitude
    event_lng = event.longitude
    if not _coords_valid(event_lat, event_lng) and event.city:
        event_lat, event_lng = await geocode_city(event.city, event.country)
        if event_lat is not None:
            event.latitude = event_lat
            event.longitude = event_lng
            print(f"📍 Event geocoded to ({event_lat}, {event_lng})")

    geocoded_count = 0
    for h in hotels:
        if not _coords_valid(h.latitude, h.longitude) and h.city:
            h.latitude, h.longitude = await geocode_city(h.city, h.country)
            if h.latitude is not None:
                geocoded_count += 1
    if geocoded_count:
        print(f"📍 Geocoded {geocoded_count} hotels")

    if not _coords_valid(event_lat, event_lng):
        print("⚠️  Event has no coordinates — skipping distance filter")
        return [{"hotel": h, "distance_from_event_km": 0.0} for h in hotels]

    candidates = []
    skipped = 0
    for h in hotels:
        if not _coords_valid(h.latitude, h.longitude):
            skipped += 1
            continue
        dist = haversine(event_lat, event_lng, h.latitude, h.longitude)
        if dist <= radius_km:
            candidates.append({"hotel": h, "distance_from_event_km": round(dist, 2)})
    if skipped:
        print(f"   ⚠️  Skipped {skipped} hotels with no coordinates")
    print(f"   ✅ {len(candidates)} hotels within {radius_km} km radius")
    return candidates


# ──────────────────────────────────────────────
# Mode B: Sort by distance from selected hotel
# ──────────────────────────────────────────────

async def _recommend_by_distance(
    candidates: List[dict],
    selected: SelectedHotelInput,
    hotels_within_radius: int,
    total_candidates: int,
    limit: int,
) -> RecommendationResponse:
    """
    A hotel is already selected — skip ML, just sort remaining
    candidates by distance from the selected hotel so guests
    stay close together.
    """
    sel_lat = selected.latitude
    sel_lng = selected.longitude
    if not _coords_valid(sel_lat, sel_lng) and selected.city:
        sel_lat, sel_lng = await geocode_city(selected.city, selected.country)
        if sel_lat is not None:
            print(f"📍 Selected hotel geocoded to ({sel_lat}, {sel_lng})")

    if not _coords_valid(sel_lat, sel_lng):
        print("⚠️  Selected hotel has no coordinates — falling back to event distance")
        candidates.sort(key=lambda c: c["distance_from_event_km"])
    else:
        for c in candidates:
            h = c["hotel"]
            if _coords_valid(h.latitude, h.longitude):
                c["distance_from_selected_km"] = round(
                    haversine(sel_lat, sel_lng, h.latitude, h.longitude), 2,
                )
            else:
                c["distance_from_selected_km"] = 999.0
        candidates.sort(key=lambda c: c.get("distance_from_selected_km", 999))

    # Exclude the selected hotel itself from results
    candidates = [c for c in candidates if c["hotel"].id != selected.id]

    recommendations: List[RecommendedHotel] = []
    for i, c in enumerate(candidates[:limit]):
        h = c["hotel"]
        dist_sel = c.get("distance_from_selected_km", 0.0)
        dist_evt = c["distance_from_event_km"]

        reasons = [
            f"📍 {dist_sel} km from {selected.name} (selected hotel)",
            f"📍 {dist_evt} km from event venue",
        ]
        if h.totalRooms > 0:
            reasons.append(f"🏨 {h.totalRooms} rooms available")
        if h.averageRating >= 4:
            reasons.append(f"⭐ Highly rated ({h.averageRating}/5)")
        if h.specialization:
            reasons.append(f"🎪 Specializes in: {', '.join(h.specialization)}")

        recommendations.append(
            RecommendedHotel(
                hotel_id=h.id,
                hotel_name=h.name,
                rank=i + 1,
                is_best_match=False,
                similarity_score=0.0,
                distance_from_event_km=dist_evt,
                distance_from_best_km=dist_sel,
                reasons=reasons,
                city=h.city,
                country=h.country,
                totalRooms=h.totalRooms,
                specialization=h.specialization,
                priceRange=h.priceRange,
                averageRating=h.averageRating,
            )
        )

    print(f"✅ Mode B: {len(recommendations)} hotels sorted by distance from '{selected.name}'")
    return RecommendationResponse(
        status="success",
        recommendations=recommendations,
        total_candidates=total_candidates,
        hotels_within_radius=hotels_within_radius,
        best_hotel_name=selected.name,
    )


# ──────────────────────────────────────────────
# Mode A: Full ML pipeline (first selection)
# ──────────────────────────────────────────────

async def _recommend_with_ml(
    candidates: List[dict],
    event: EventInput,
    hotels_within_radius: int,
    total_candidates: int,
    limit: int,
) -> RecommendationResponse:
    """Full 4-step ML pipeline (distance filter already done)."""
    candidate_id_set = {c["hotel"].id for c in candidates}

    # ── Step 2: Vector similarity search ──────────────────────────────
    event_text = (
        f"Event Name: {event.name}. "
        f"Type: {event.type}. "
        f"Description: {event.description}. "
        f"Location: {event.city}, {event.country}."
    )

    embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")
    event_vector = await embedding_model.aembed_query(event_text)

    qdrant_url = os.getenv("QDRANT_URL")
    qdrant_api_key = os.getenv("QDRANT_API_KEY")
    client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)

    hotel_similarity: dict[str, float] = {}
    try:
        search_results = client.query_points(
            collection_name="hotels_activity_vectors",
            query=event_vector,
            limit=200,
            with_payload=True,
        ).points
        for result in search_results:
            hex_id = uuid_to_object_id(result.id)
            if hex_id in candidate_id_set:
                hotel_similarity[hex_id] = max(
                    hotel_similarity.get(hex_id, 0), result.score,
                )
    except Exception as e:
        logger.warning(f"Qdrant activity search failed: {e}")

    try:
        profile_results = client.query_points(
            collection_name="hotels_vectors",
            query=event_vector,
            limit=200,
            with_payload=True,
        ).points
        for result in profile_results:
            hex_id = uuid_to_object_id(result.id)
            if hex_id in candidate_id_set:
                existing = hotel_similarity.get(hex_id)
                if existing is not None:
                    hotel_similarity[hex_id] = (existing + result.score) / 2
                else:
                    hotel_similarity[hex_id] = result.score
    except Exception as e:
        logger.warning(f"Qdrant profile search failed: {e}")

    for c in candidates:
        c["similarity_score"] = round(hotel_similarity.get(c["hotel"].id, 0), 4)

    # ── Step 3: Best hotel ────────────────────────────────────────────
    best_hotel = max(candidates, key=lambda c: c["similarity_score"])
    if best_hotel["similarity_score"] <= 0:
        best_hotel = min(candidates, key=lambda c: c["distance_from_event_km"])

    best_lat = best_hotel["hotel"].latitude
    best_lng = best_hotel["hotel"].longitude

    # ── Step 4: Sort remaining by distance from best ──────────────────
    recommendations: List[RecommendedHotel] = []
    recommendations.append(
        RecommendedHotel(
            hotel_id=best_hotel["hotel"].id,
            hotel_name=best_hotel["hotel"].name,
            rank=1,
            is_best_match=True,
            similarity_score=best_hotel["similarity_score"],
            distance_from_event_km=best_hotel["distance_from_event_km"],
            distance_from_best_km=0.0,
            reasons=_generate_reasons(best_hotel, is_best=True),
            city=best_hotel["hotel"].city,
            country=best_hotel["hotel"].country,
            totalRooms=best_hotel["hotel"].totalRooms,
            specialization=best_hotel["hotel"].specialization,
            priceRange=best_hotel["hotel"].priceRange,
            averageRating=best_hotel["hotel"].averageRating,
        )
    )

    remaining = [c for c in candidates if c["hotel"].id != best_hotel["hotel"].id]
    for c in remaining:
        if _coords_valid(best_lat, best_lng) and _coords_valid(c["hotel"].latitude, c["hotel"].longitude):
            c["distance_from_best_km"] = round(
                haversine(best_lat, best_lng, c["hotel"].latitude, c["hotel"].longitude), 2,
            )
        else:
            c["distance_from_best_km"] = 0.0
    remaining.sort(key=lambda c: c["distance_from_best_km"])

    for i, c in enumerate(remaining):
        if len(recommendations) >= limit:
            break
        recommendations.append(
            RecommendedHotel(
                hotel_id=c["hotel"].id,
                hotel_name=c["hotel"].name,
                rank=i + 2,
                is_best_match=False,
                similarity_score=c["similarity_score"],
                distance_from_event_km=c["distance_from_event_km"],
                distance_from_best_km=c["distance_from_best_km"],
                reasons=_generate_reasons(
                    c, is_best=False, best_hotel_name=best_hotel["hotel"].name,
                ),
                city=c["hotel"].city,
                country=c["hotel"].country,
                totalRooms=c["hotel"].totalRooms,
                specialization=c["hotel"].specialization,
                priceRange=c["hotel"].priceRange,
                averageRating=c["hotel"].averageRating,
            )
        )

    print(f"✅ Mode A: {len(recommendations)} hotels (best={best_hotel['hotel'].name})")
    return RecommendationResponse(
        status="success",
        recommendations=recommendations,
        total_candidates=total_candidates,
        hotels_within_radius=hotels_within_radius,
        best_hotel_name=best_hotel["hotel"].name,
    )
