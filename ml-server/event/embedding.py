from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import re
from bs4 import BeautifulSoup
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from langchain.schema import Document

router = APIRouter()


# Nested models for event structure
class EventLocation(BaseModel):
    city: str = ""
    country: str = ""
    venue: str = ""


class EventPost(BaseModel):
    id: str
    name: str
    type: str
    description: str
    startDate: str
    endDate: str
    location: Optional[EventLocation] = None
    customSlug: str = ""


def extract_text_from_html(html_content: str) -> str:
    """Extract plain text from HTML content and remove URLs"""
    soup = BeautifulSoup(html_content, 'html.parser')

    for script in soup(["script", "style"]):
        script.decompose()

    text = soup.get_text()
    text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)

    lines = (line.strip() for line in text.splitlines())
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    text = ' '.join(chunk for chunk in chunks if chunk)

    return text


@router.post("/embedding")
async def create_event_embedding(event: EventPost):
    """
    Create embeddings for an event and store in Qdrant
    """
    try:
        # Extract plain text from HTML description
        clean_description = extract_text_from_html(event.description)

        # Build location string
        location_parts = []
        if event.location:
            if event.location.venue:
                location_parts.append(event.location.venue)
            if event.location.city:
                location_parts.append(event.location.city)
            if event.location.country:
                location_parts.append(event.location.country)
        location_str = ", ".join(location_parts) if location_parts else "Not specified"

        # Combine key fields into a single text for embedding
        full_text = (
            f"Event Name: {event.name}\n"
            f"Type: {event.type}\n"
            f"Location: {location_str}\n"
            f"Start Date: {event.startDate}\n"
            f"End Date: {event.endDate}\n\n"
            f"Description:\n{clean_description}"
        )

        # Create document with metadata
        doc = Document(
            page_content=full_text,
            metadata={
                "id": event.id,
                "name": event.name,
                "type": event.type,
                "location": location_str,
                "startDate": event.startDate,
                "endDate": event.endDate,
                "customSlug": event.customSlug,
            }
        )

        # Split into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=100
        )
        chunks = text_splitter.split_documents([doc])

        # Initialize embeddings
        embedding = OpenAIEmbeddings(
            model="text-embedding-3-large",
        )

        # Store in Qdrant (cloud)
        import os
        url = os.getenv("QDRANT_URL")
        api_key = os.getenv("QDRANT_API_KEY")
        qdrant = QdrantVectorStore.from_documents(
            chunks,
            embedding,
            url=url,
            api_key=api_key,
            collection_name="events_vectors",
        )

        return {
            "status": "success",
            "message": f"Event '{event.name}' embedded successfully",
            "chunks_created": len(chunks),
            "event_id": event.id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))