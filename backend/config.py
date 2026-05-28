from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application configuration settings loaded from environment variables."""
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    environment: str = "development"
    
    # CORS Configuration
    frontend_url: str = "http://localhost:3000"
    
    # Database Configuration
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    
    # Supabase uses PostgreSQL, so we configure connection details
    database_url: Optional[str] = None
    
    # Security
    api_key_secret: str = "your-secret-key-change-in-production"
    debug: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment.lower() == "production"
    
    def get_database_url(self) -> str:
        """
        Get the database URL.
        Constructs it from Supabase credentials or uses DATABASE_URL if provided.
        """
        if self.database_url:
            return self.database_url
        
        # For Supabase PostgreSQL connection
        # You would typically get these from Supabase connection string
        if self.supabase_url and self.supabase_service_role_key:
            # Placeholder - actual connection would be configured separately
            return "postgresql://user:password@host:5432/database"
        
        return "sqlite:///./test.db"  # Fallback for testing


# Create global settings instance
settings = Settings()
