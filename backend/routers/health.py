from fastapi import APIRouter
from datetime import datetime

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }


@router.get("/health/ready")
def readiness_check():
    """Readiness check endpoint for service availability."""
    return {
        "status": "ready",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/health/live")
def liveness_check():
    """Liveness check endpoint for service monitoring."""
    return {
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat()
    }
