"""
Attendance Schedule Routes

Endpoints for managing student attendance schedules and validating attendance status.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List, Optional

from database import get_db
from schemas import (
    StudentAttendanceScheduleCreate,
    StudentAttendanceScheduleResponse,
    StudentAttendanceScheduleUpdate,
    AttendanceStatusValidation,
    AttendanceSummaryByStatus
)
from services.attendance_schedule import AttendanceScheduleService

router = APIRouter(prefix="/api/attendance-schedules", tags=["attendance-schedules"])


@router.post("/", response_model=StudentAttendanceScheduleResponse, status_code=201)
def create_attendance_schedule(
    schedule: StudentAttendanceScheduleCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new attendance schedule for a student.
    
    - **student_lrn**: Student LRN (Learning Reference Number)
    - **year_level**: Grade level (e.g., 'Grade 4', 'Kinder 1')
    - **entry_time**: Scheduled entry time (HH:MM:SS format)
    - **exit_time**: Scheduled exit time (HH:MM:SS format)
    - **school_days**: JSON object with day names as keys (monday-sunday) and boolean values
    - **grace_period_minutes**: Grace period for late arrivals (optional, default 0)
    """
    try:
        result = AttendanceScheduleService.create_schedule(db, schedule)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{schedule_id}", response_model=StudentAttendanceScheduleResponse)
def get_schedule(
    schedule_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific attendance schedule by ID."""
    schedule = AttendanceScheduleService.get_schedule_by_id(db, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Attendance schedule not found")
    return schedule


@router.get("/student/{student_lrn}", response_model=Optional[StudentAttendanceScheduleResponse])
def get_student_schedule(
    student_lrn: str,
    school_year_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get the current attendance schedule for a student."""
    schedule = AttendanceScheduleService.get_current_schedule(db, student_lrn, school_year_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="No active attendance schedule found for student")
    return schedule


@router.put("/{schedule_id}", response_model=StudentAttendanceScheduleResponse)
def update_schedule(
    schedule_id: int,
    schedule_data: StudentAttendanceScheduleUpdate,
    db: Session = Depends(get_db)
):
    """Update an attendance schedule."""
    schedule = AttendanceScheduleService.update_schedule(db, schedule_id, schedule_data)
    if not schedule:
        raise HTTPException(status_code=404, detail="Attendance schedule not found")
    return schedule


@router.delete("/{schedule_id}", status_code=204)
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db)
):
    """Deactivate an attendance schedule."""
    success = AttendanceScheduleService.delete_schedule(db, schedule_id)
    if not success:
        raise HTTPException(status_code=404, detail="Attendance schedule not found")
    return None


@router.post("/validate/{student_lrn}", response_model=AttendanceStatusValidation)
def validate_attendance(
    student_lrn: str,
    check_in_time: datetime = Query(...),
    check_out_time: Optional[datetime] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Validate attendance status based on student's schedule.
    
    Returns the attendance status (present, late, invalid_timeout, absent) and details.
    
    Query Parameters:
    - **check_in_time**: Check-in time as ISO 8601 datetime
    - **check_out_time**: Check-out time as ISO 8601 datetime (optional)
    """
    try:
        result = AttendanceScheduleService.validate_attendance_status(
            db, student_lrn, check_in_time, check_out_time
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/stats/{student_lrn}", response_model=AttendanceSummaryByStatus)
def get_attendance_summary(
    student_lrn: str,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get attendance summary for a student grouped by status.
    
    Query Parameters:
    - **start_date**: Start date for filtering (YYYY-MM-DD format, optional)
    - **end_date**: End date for filtering (YYYY-MM-DD format, optional)
    """
    try:
        result = AttendanceScheduleService.get_attendance_summary(
            db, student_lrn, start_date, end_date
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/by-status/{student_lrn}", response_model=List)
def get_attendance_by_status(
    student_lrn: str,
    status: str = Query(..., description="Attendance status: present, late, absent, invalid_timeout"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get attendance records for a student filtered by status.
    
    Query Parameters:
    - **status**: Status to filter by (present, late, absent, invalid_timeout)
    - **start_date**: Start date for filtering (YYYY-MM-DD format, optional)
    - **end_date**: End date for filtering (YYYY-MM-DD format, optional)
    """
    if status not in ['present', 'late', 'absent', 'invalid_timeout']:
        raise HTTPException(
            status_code=400,
            detail="Invalid status. Must be one of: present, late, absent, invalid_timeout"
        )
    
    try:
        records = AttendanceScheduleService.get_student_attendance_by_status(
            db, student_lrn, status, start_date, end_date
        )
        return records
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/check-school-day/{student_lrn}")
def check_school_day(
    student_lrn: str,
    check_date: date = Query(...),
    db: Session = Depends(get_db)
):
    """
    Check if a given date is a school day for a student.
    
    Query Parameters:
    - **check_date**: Date to check (YYYY-MM-DD format)
    """
    try:
        is_school_day = AttendanceScheduleService.is_school_day(db, student_lrn, check_date)
        return {
            "student_lrn": student_lrn,
            "date": check_date,
            "is_school_day": is_school_day
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
