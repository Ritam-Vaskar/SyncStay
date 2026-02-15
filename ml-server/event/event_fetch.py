from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from langchain_openai import OpenAIEmbeddings
from qdrant_client import QdrantClient
from collections import defaultdict
import os

router = APIRouter()


# Request model
class EventSearchRequest(BaseModel):
    query: str  
    top_k: Optional[int] = 5


# Response model
class SimilarEvent(BaseModel):
    id: str
    name: str
    type: str
    location: str
    startDate: str
    endDate: str
    percentage_similarity: float


@router.post("/fetch")
async def fetch_similar_events(request: EventSearchRequest) -> List[SimilarEvent]:
    """
    Takes a natural language query, creates an embedding vector,
    and fetches the most similar public events from Qdrant.
    """
    try:
        # Embed the query text
        embedding = OpenAIEmbeddings(model="text-embedding-3-large")
        query_vector = await embedding.aembed_query(request.query)

        # Search Qdrant for similar event chunks
        url = os.getenv("QDRANT_URL")
        client = QdrantClient(url=url)

        search_results = client.query_points(
            collection_name="syncstay_event_embeddings",
            query=query_vector,
            limit=request.top_k * 10,  # fetch extra to deduplicate across chunks
            with_payload=True,
        ).points

        # Aggregate by event id — keep max similarity and metadata per event
        event_best = {}  # event_id -> { score, metadata }

        for result in search_results:
            meta = result.payload.get("metadata", {})
            event_id = meta.get("id")
            if not event_id:
                continue

            score = result.score
            if event_id not in event_best or score > event_best[event_id]["score"]:
                event_best[event_id] = {
                    "score": score,
                    "name": meta.get("name", ""),
                    "type": meta.get("type", ""),
                    "location": meta.get("location", ""),
                    "startDate": meta.get("startDate", ""),
                    "endDate": meta.get("endDate", ""),
                }

        # Sort by similarity and take top_k
        sorted_events = sorted(
            event_best.items(),
            key=lambda x: x[1]["score"],
            reverse=True,
        )[: request.top_k]

        # Build response
        similar_events = [
            SimilarEvent(
                id=event_id,
                name=data["name"],
                type=data["type"],
                location=data["location"],
                startDate=data["startDate"],
                endDate=data["endDate"],
                percentage_similarity=round(data["score"] * 100, 2),
            )
            for event_id, data in sorted_events
        ]

        return similar_events

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))