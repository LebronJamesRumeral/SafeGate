import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn

from config import settings
from database import init_db, close_db
from routers import health, attendance, behavior, students, risk

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle: startup and shutdown.
    """
    # Startup
    logger.info(f"Starting FastAPI application in {settings.environment} mode")
    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down FastAPI application")
    try:
        close_db()
        logger.info("Database connection closed")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")


# Create FastAPI application
app = FastAPI(
    title="SafeGate Backend API",
    description="FastAPI backend for attendance tracking and behavior scoring",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)


# Configure CORS for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add trusted host middleware for security
if settings.is_production:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[
            "localhost",
            "127.0.0.1",
            settings.frontend_url.replace("http://", "").replace("https://", ""),
        ]
    )


# Register routers
app.include_router(health.router)
app.include_router(students.router)
app.include_router(attendance.router)
app.include_router(behavior.router)
app.include_router(risk.router)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint providing API information."""
    return {
        "name": "SafeGate Backend API",
        "version": "1.0.0",
        "environment": settings.environment,
        "docs": "/api/docs",
        "health": "/health"
    }


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Handle uncaught exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": str(exc) if settings.debug else None
        }
    )


if __name__ == "__main__":
    logger.info(
        f"Starting server on {settings.api_host}:{settings.api_port} "
        f"(Environment: {settings.environment})"
    )
    
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
        log_level="info" if not settings.debug else "debug",
    )
