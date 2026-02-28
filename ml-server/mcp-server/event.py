import os
import httpx
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

# Load env from parent ml-server/.env
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

ML_SERVER_URL = os.getenv("ML_SERVER_URL", "http://localhost:8020")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5001")

mcp = FastMCP("SyncStay Event Search")


@mcp.tool()
def search_events(query: str, top_k: int = 5) -> str:
    """
    Search for public events matching a natural language query.

    Args:
        query: A natural language description of the event you're looking for.
               Example: "i want to attend a network related seminar between 12/08/2027 to 14/08/2027"
        top_k: Number of top matching events to return (default 5).

    Returns:
        A formatted string listing the most similar events with details and similarity scores.
    """
    try:
        response = httpx.post(
            f"{ML_SERVER_URL}/event/fetch",
            json={"query": query, "top_k": top_k},
            timeout=60.0,
        )
        response.raise_for_status()
        events = response.json()

        if not events:
            return "No matching events found for your query."

        lines = [f"Found {len(events)} matching event(s):\n"]
        for i, event in enumerate(events, 1):
            slug = event.get('customSlug', '')
            microsite_url = event.get('micrositeUrl', '')
            block = (
                f"{i}. **{event['name']}** ({event['type']})\n"
                f"   📍 Location: {event['location']}\n"
                f"   📅 {event['startDate']} → {event['endDate']}\n"
                f"   🎯 Similarity: {event['percentage_similarity']}%\n"
                f"   🆔 ID: {event['id']}\n"
            )
            if slug:
                block += f"   🔗 Slug: {slug}\n"
            if microsite_url:
                block += f"   🌐 Event Page: {microsite_url}\n"
            lines.append(block)

        return "\n".join(lines)

    except httpx.HTTPStatusError as e:
        return f"Error from ML server: {e.response.status_code} — {e.response.text}"
    except httpx.ConnectError:
        return f"Could not connect to ML server at {ML_SERVER_URL}. Is it running?"
    except Exception as e:
        return f"Error searching events: {str(e)}"


@mcp.tool()
def get_event_hotels(event_slug: str) -> str:
    """
    Get the selected hotels and booking options for a specific event using its microsite slug.

    Use this tool when a user wants to see which hotels are available for an event,
    what the room pricing is, or what amenities/facilities a hotel offers.

    The event_slug can be extracted from a previous search_events result — it is
    typically the event name lowercased with hyphens, e.g. 'jee-advance-preparation-guide-1771170534178'.

    Args:
        event_slug: The microsite slug identifier for the event.
                    Example: "jee-advance-preparation-guide-1771170534178"

    Returns:
        A formatted string listing all selected hotels with pricing, rooms, amenities, and facilities.
    """
    try:
        response = httpx.get(
            f"{BACKEND_URL}/api/hotel-proposals/microsite/{event_slug}/selected",
            timeout=60.0,
        )
        response.raise_for_status()
        result = response.json()

        if not result.get("success"):
            return result.get("message", "Failed to fetch hotel data.")

        hotels = result.get("data", [])
        if not hotels:
            return f"No hotels have been selected for this event yet. {result.get('message', '')}"

        lines = [f"Found {len(hotels)} hotel(s) for this event:\n"]
        for i, hotel in enumerate(hotels, 1):
            name = hotel.get("hotelName", "Unknown Hotel")
            rooms = hotel.get("totalRoomsOffered", "N/A")
            total_cost = hotel.get("totalEstimatedCost", "N/A")
            special_offer = hotel.get("specialOffer", "")
            notes = hotel.get("notes", "")

            # Pricing breakdown per room type
            pricing = hotel.get("pricing", {})
            pricing_lines = []
            for room_type, label in [("singleRoom", "Single Room"), ("doubleRoom", "Double Room"), ("suite", "Suite")]:
                room = pricing.get(room_type, {})
                if room and room.get("availableRooms", 0) > 0:
                    price = room.get("pricePerNight", "N/A")
                    avail = room.get("availableRooms", 0)
                    pricing_lines.append(f"{label}: ₹{price}/night ({avail} rooms)")
            pricing_str = " | ".join(pricing_lines) if pricing_lines else "Contact hotel"

            # Facilities (object of booleans)
            facilities_obj = hotel.get("facilities", {})
            facility_names = [key.replace("Room", " Room") for key, val in facilities_obj.items() if val]

            # Amenities (array of strings)
            amenities = hotel.get("amenities", [])

            # Additional services (nested object)
            additional_obj = hotel.get("additionalServices", {})
            additional_lines = []
            for svc_key, svc_val in additional_obj.items():
                if isinstance(svc_val, dict) and svc_val.get("available"):
                    desc = svc_val.get("description", svc_key)
                    additional_lines.append(desc)
                elif isinstance(svc_val, str) and svc_val:
                    additional_lines.append(svc_val)

            lines.append(
                f"{i}. 🏨 **{name}**\n"
                f"   🛏️ Rooms Offered: {rooms}\n"
                f"   💰 Pricing: {pricing_str}\n"
                f"   💵 Total Estimated Cost: ₹{total_cost}\n"
            )
            if amenities:
                lines.append(f"   ✨ Amenities: {', '.join(amenities)}\n")
            if facility_names:
                lines.append(f"   🏢 Facilities: {', '.join(facility_names)}\n")
            if additional_lines:
                lines.append(f"   🎁 Additional Services: {', '.join(additional_lines)}\n")
            if special_offer:
                lines.append(f"   🎉 Special Offer: {special_offer}\n")
            if notes:
                lines.append(f"   📝 Notes: {notes}\n")

        return "\n".join(lines)

    except httpx.HTTPStatusError as e:
        return f"Error from backend: {e.response.status_code} — {e.response.text}"
    except httpx.ConnectError:
        return f"Could not connect to backend at {BACKEND_URL}. Is it running?"
    except Exception as e:
        return f"Error fetching hotel data: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport="stdio")