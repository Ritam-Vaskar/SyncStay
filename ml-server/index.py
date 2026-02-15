from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uvicorn

# Register routers
from event.embedding import router as embedding_router
from event.event_fetch import router as event_fetch_router
from agent.routes import router as agent_router

load_dotenv()

app = FastAPI()



# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/")
async def root():
    return {"message": "Sync Stay AI Backend API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

app.include_router(embedding_router, prefix="/event")
app.include_router(event_fetch_router, prefix="/event")
app.include_router(agent_router, prefix="/agent")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8020)