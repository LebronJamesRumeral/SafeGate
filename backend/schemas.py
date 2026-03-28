from pydantic import BaseModel, Field
from datetime import datetime, time as time_type
from typing import Optional, List, Dict
from enum import Enum


# ==================== Student Schemas ====================

class StudentBase(BaseModel):
    """Base schema for student data."""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., max_length=255)
    class_level: str = Field(..., min_length=1, max_length=50)
    student_id: str = Field(..., min_length=1, max_length=50)
    parent_email: str = Field(None, max_length=255)


class StudentCreate(StudentBase):
    """Schema for creating a student."""
    pass


class StudentUpdate(BaseModel):
    """Schema for updating a student."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    class_level: Optional[str] = None
    is_active: Optional[bool] = None
    parent_email: Optional[str] = None



class StudentResponse(StudentBase):
    """Schema for student response."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Schema for student with parent linkage status
class StudentWithParentLink(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    class_level: str
    student_id: str
    parent_email: Optional[str]
    isLinked: bool

    class Config:
        orm_mode = True


# ==================== Attendance Schemas ====================

class AttendanceBase(BaseModel):
    """Base schema for attendance data."""
    status: str = Field(..., min_length=1, max_length=20)
    notes: Optional[str] = None


class AttendanceCreate(AttendanceBase):
    """Schema for creating attendance record."""
    student_id: int
    date: datetime
    time_in: Optional[datetime] = None
    time_out: Optional[datetime] = None


class AttendanceUpdate(BaseModel):
    """Schema for updating attendance record."""
    status: Optional[str] = None
    time_in: Optional[datetime] = None
    time_out: Optional[datetime] = None
    notes: Optional[str] = None


class AttendanceResponse(AttendanceBase):
    """Schema for attendance response."""
    id: int
    student_id: int
    date: datetime
    time_in: Optional[datetime] = None
    time_out: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== Behavior Event Schemas ====================

class BehaviorEventType(str, Enum):
    """Behavior event type enumeration."""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"


class BehaviorEventBase(BaseModel):
    """Base schema for behavior event data."""
    event_type: BehaviorEventType
    description: str = Field(..., min_length=1, max_length=1000)
    severity: int = Field(..., ge=0, le=10)
    reported_by: Optional[str] = None


class BehaviorEventCreate(BehaviorEventBase):
    """Schema for creating behavior event."""
    student_id: int


class BehaviorEventUpdate(BaseModel):
    """Schema for updating behavior event."""
    event_type: Optional[BehaviorEventType] = None
    description: Optional[str] = None
    severity: Optional[int] = Field(None, ge=0, le=10)


class BehaviorEventResponse(BehaviorEventBase):
    """Schema for behavior event response."""
    id: int
    student_id: int
    timestamp: datetime
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== Risk Score Schemas ====================

class RiskScoreBase(BaseModel):
    """Base schema for risk score."""
    overall_score: float = Field(..., ge=0.0, le=100.0)
    behavioral_score: float = Field(..., ge=0.0, le=100.0)
    attendance_score: float = Field(..., ge=0.0, le=100.0)
    risk_level: str


class RiskScoreResponse(RiskScoreBase):
    """Schema for risk score response."""
    id: int
    student_id: int
    last_updated: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


# ==================== School Year Schemas ====================

class SchoolYearBase(BaseModel):
    """Base schema for school year."""
    year: str = Field(..., min_length=9, max_length=9)  # e.g., "2023-2024"
    start_date: datetime
    end_date: datetime


class SchoolYearCreate(SchoolYearBase):
    """Schema for creating school year."""
    is_active: bool = False


class SchoolYearUpdate(BaseModel):
    """Schema for updating school year."""
    is_active: Optional[bool] = None
    end_date: Optional[datetime] = None


class SchoolYearResponse(SchoolYearBase):
    """Schema for school year response."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== Attendance Schedule Schemas ====================

class StudentAttendanceScheduleBase(BaseModel):
    """Base schema for student attendance schedule."""
    student_lrn: str = Field(..., min_length=1, max_length=50)
    year_level: str = Field(..., min_length=1, max_length=50)
    entry_time: time_type = Field(...)  # e.g., 08:00:00
    exit_time: time_type = Field(...)   # e.g., 17:00:00
    school_days: Dict[str, bool] = Field(
        default_factory=lambda: {
            "monday": True,
            "tuesday": True,
            "wednesday": True,
            "thursday": True,
            "friday": True,
            "saturday": False,
            "sunday": False,
        }
    )
    grace_period_minutes: Optional[int] = Field(default=0, ge=0)


class StudentAttendanceScheduleCreate(StudentAttendanceScheduleBase):
    """Schema for creating attendance schedule."""
    school_year_id: Optional[int] = None


class StudentAttendanceScheduleUpdate(BaseModel):
    """Schema for updating attendance schedule."""
    entry_time: Optional[time_type] = None
    exit_time: Optional[time_type] = None
    school_days: Optional[Dict[str, bool]] = None
    grace_period_minutes: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class StudentAttendanceScheduleResponse(StudentAttendanceScheduleBase):
    """Schema for attendance schedule response."""
    id: int
    school_year_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== Attendance Status Validation Schema ====================

class AttendanceStatusValidation(BaseModel):
    """Schema for attendance status validation result."""
    attendance_status: str  # 'present', 'late', 'invalid_timeout', 'absent'
    is_late: bool
    is_invalid_timeout: bool
    minutes_early: int  # negative if late
    minutes_overtime: int  # negative if before exit
    status_reason: str


# ==================== Attendance Summary Schema ====================

class AttendanceSummaryByStatus(BaseModel):
    """Schema for attendance summary by status."""
    total_days: int
    present: int
    late: int
    absent: int
    invalid_timeout: int


# ==================== Batch Operations Schemas ====================

class AttendanceStats(BaseModel):
    """Schema for attendance statistics."""
    student_id: int
    total_days: int
    present_days: int
    absent_days: int
    late_days: int
    attendance_rate: float


class BehaviorStats(BaseModel):
    """Schema for behavior statistics."""
    student_id: int
    positive_events: int
    negative_events: int
    total_events: int
    average_severity: float


class StudentDashboard(BaseModel):
    """Combined dashboard data for a student."""
    student: StudentResponse
    attendance_stats: AttendanceStats
    behavior_stats: BehaviorStats
    risk_score: Optional[RiskScoreResponse] = None


# ==================== Error Response Schema ====================

class ErrorResponse(BaseModel):
    """Schema for error responses."""
    detail: str
    status_code: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
