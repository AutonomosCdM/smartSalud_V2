"""
smartSalud Backend - FastAPI Application

Main entry point for the FastAPI backend.
Handles database operations, business logic, and external API integrations.
"""

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
from sqlalchemy import text

from app.database import engine, get_db
from app.routers import appointments

app = FastAPI(
    title="smartSalud API",
    description="Backend for autonomous appointment management system",
    version="0.1.0"
)

# CORS configuration - Allow Cloudflare Workers and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",  # TODO: Restrict in production to specific domains
        "https://*.workers.dev",
        "http://localhost:3000",
        "http://localhost:8000"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include routers
app.include_router(appointments.router)


@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Health check endpoint for monitoring and load balancers.
    """
    # Check database connection
    db_status = "healthy"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return JSONResponse({
        "status": "healthy" if db_status == "healthy" else "degraded",
        "version": "0.1.0",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": db_status,
            "google_calendar": "not_configured",
            "groq": "not_configured"
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
