import os
import httpx
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

# Load env from parent ml-server/.env
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

ML_SERVER_URL = os.getenv("ML_SERVER_URL", "http://localhost:8020")

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
            lines.append(
                f"{i}. **{event['name']}** ({event['type']})\n"
                f"   📍 Location: {event['location']}\n"
                f"   📅 {event['startDate']} → {event['endDate']}\n"
                f"   🎯 Similarity: {event['percentage_similarity']}%\n"
                f"   🆔 ID: {event['id']}\n"
            )

        return "\n".join(lines)

    except httpx.HTTPStatusError as e:
        return f"Error from ML server: {e.response.status_code} — {e.response.text}"
    except httpx.ConnectError:
        return f"Could not connect to ML server at {ML_SERVER_URL}. Is it running?"
    except Exception as e:
        return f"Error searching events: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport="stdio")