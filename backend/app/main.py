"""
smartSalud Backend - FastAPI Application

Main entry point for the FastAPI backend.
Handles database operations, business logic, and external API integrations.
"""

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime

app = FastAPI(
    title="smartSalud API",
    description="Backend for autonomous appointment management system",
    version="0.1.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Health check endpoint for monitoring and load balancers.
    """
    return JSONResponse({
        "status": "healthy",
        "version": "0.1.0",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": "pending",  # TODO: Check DB connection
            "google_calendar": "pending",  # TODO: Check Calendar API
            "groq": "pending"  # TODO: Check Groq API
        }
    })


@app.get("/")
async def root():
    """
    Root endpoint with API information.
    """
    return {
        "name": "smartSalud API",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health"
    }


# TODO: Implement routes
# - /appointments/* - Appointment CRUD operations
# - /patients/* - Patient management
# - /calendar/sync - Google Calendar sync
# - /webhooks/agent - Cloudflare Agent callbacks


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
