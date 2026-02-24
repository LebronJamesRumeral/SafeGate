from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from database import get_db
from schemas import (
    AttendanceCreate, AttendanceUpdate, AttendanceResponse, AttendanceStats
)
from services import AttendanceService

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


@router.post("/", response_model=AttendanceResponse, status_code=201)
def create_attendance(
    attendance: AttendanceCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new attendance record.
    
    - **student_id**: ID of the student
    - **date**: Date of attendance
    - **status**: Attendance status (present, absent, late, excused)
    - **time_in**: Time student arrived (optional)
    - **time_out**: Time student left (optional)
    - **notes**: Additional notes (optional)
    """
    try:
        result = AttendanceService.create_attendance(db, attendance)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{attendance_id}", response_model=AttendanceResponse)
def get_attendance(
    attendance_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific attendance record by ID."""
    record = AttendanceService.get_attendance(db, attendance_id)
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return record


@router.get("/student/{student_id}", response_model=List[AttendanceResponse])
def get_student_attendance(
    student_id: int,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    Get all attendance records for a specific student.
    
    Optional filters:
    - **start_date**: Filter records from this date (RFC 3339 format)
    - **end_date**: Filter records until this date (RFC 3339 format)
    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return (pagination)
    """
    records = AttendanceService.get_student_attendance(
        db, student_id, start_date, end_date, skip, limit
    )
    return records


@router.get("/stats/student/{student_id}", response_model=AttendanceStats)
def get_attendance_stats(
    student_id: int,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get attendance statistics for a student.
    
    Returns:
    - Total days tracked
    - Present days
    - Absent days
    - Late days
    - Overall attendance rate percentage
    """
    stats = AttendanceService.get_attendance_stats(db, student_id, start_date, end_date)
    return stats


@router.put("/{attendance_id}", response_model=AttendanceResponse)
def update_attendance(
    attendance_id: int,
    attendance_data: AttendanceUpdate,
    db: Session = Depends(get_db)
):
    """Update an attendance record."""
    record = AttendanceService.update_attendance(db, attendance_id, attendance_data)
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return record


@router.delete("/{attendance_id}", status_code=204)
def delete_attendance(
    attendance_id: int,
    db: Session = Depends(get_db)
):
    """Delete an attendance record."""
    success = AttendanceService.delete_attendance(db, attendance_id)
    if not success:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return None
