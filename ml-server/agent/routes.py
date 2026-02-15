"""
FastAPI router for the query resolver agent.
Mount this in index.py to expose POST /agent/query
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from agents import InputGuardrailTripwireTriggered, OutputGuardrailTripwireTriggered

router = APIRouter()


class QueryRequest(BaseModel):
    user_id: str
    query: str


class QueryResponse(BaseModel):
    user_id: str
    query: str
    answer: str
    guardrail_blocked: bool = False
    block_reason: Optional[str] = None


@router.post("/query")
async def handle_query(request: QueryRequest) -> QueryResponse:
    """
    Resolve a user query using the SyncStay agent.
    Uses mem0 for memory, MCP for event search, and guardrails for safety.
    """
    try:
        from agent.query_resolver import resolve_query

        answer = await resolve_query(
            user_id=request.user_id,
            query=request.query,
        )

        return QueryResponse(
            user_id=request.user_id,
            query=request.query,
            answer=answer,
        )

    except InputGuardrailTripwireTriggered as e:
        return QueryResponse(
            user_id=request.user_id,
            query=request.query,
            answer="I can only help with event-related queries on SyncStay. Please ask about events, bookings, or accommodation.",
            guardrail_blocked=True,
            block_reason="input_blocked",
        )

    except OutputGuardrailTripwireTriggered as e:
        return QueryResponse(
            user_id=request.user_id,
            query=request.query,
            answer="I wasn't able to generate a reliable response. Please try rephrasing your question.",
            guardrail_blocked=True,
            block_reason="output_blocked",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
