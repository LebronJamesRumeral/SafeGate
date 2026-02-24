from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from database import Base


class Student(Base):
    """Student model for storing student information."""
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(50), unique=True, index=True)
    first_name = Column(String(100))
    last_name = Column(String(100))
    email = Column(String(255), unique=True, index=True)
    class_level = Column(String(50))
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    attendance_records = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    behavior_records = relationship("BehaviorEvent", back_populates="student", cascade="all, delete-orphan")
    risk_scores = relationship("RiskScore", back_populates="student", cascade="all, delete-orphan")


class Attendance(Base):
    """Attendance tracking model."""
    __tablename__ = "attendance"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), index=True)
    date = Column(DateTime, index=True)
    status = Column(String(20))  # present, absent, late, excused
    time_in = Column(DateTime, nullable=True)
    time_out = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationship
    student = relationship("Student", back_populates="attendance_records")


class BehaviorEventType(str, enum.Enum):
    """Enumeration of behavior event types."""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"


class BehaviorEvent(Base):
    """Behavior event tracking model."""
    __tablename__ = "behavior_events"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), index=True)
    event_type = Column(String(20), default=BehaviorEventType.NEUTRAL)  # positive, negative, neutral
    description = Column(Text)
    severity = Column(Integer, default=0)  # 0-10 scale
    reported_by = Column(String(100), nullable=True)
    timestamp = Column(DateTime, server_default=func.now(), index=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationship
    student = relationship("Student", back_populates="behavior_records")


class RiskScore(Base):
    """Risk assessment score model."""
    __tablename__ = "risk_scores"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), index=True)
    overall_score = Column(Float, default=0.0)  # 0-100
    behavioral_score = Column(Float, default=0.0)  # 0-100
    attendance_score = Column(Float, default=0.0)  # 0-100
    risk_level = Column(String(20))  # low, medium, high, critical
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationship
    student = relationship("Student", back_populates="risk_scores")


class SchoolYear(Base):
    """School year configuration model."""
    __tablename__ = "school_years"
    
    id = Column(Integer, primary_key=True, index=True)
    year = Column(String(20), unique=True, index=True)  # e.g., "2023-2024"
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    is_active = Column(Boolean, default=False)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
