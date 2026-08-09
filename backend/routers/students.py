from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional


from database import get_db
from schemas import StudentCreate, StudentUpdate, StudentResponse, StudentDashboard, StudentWithParentLink
from schemas import AttendanceStats, BehaviorStats, RiskScoreResponse
from services import StudentService, AttendanceService, BehaviorService, RiskScoringService
from sqlalchemy import exists
from models import Parent

router = APIRouter(prefix="/api/students", tags=["students"])


# Endpoint: Get students with parent linkage status
@router.get("/with-parent-link", response_model=List[StudentWithParentLink])
def get_students_with_parent_link(db: Session = Depends(get_db)):
    """Get all students with parent linkage status (isLinked)."""
    students = db.query(StudentService.Student).all()
    result = []
    # Collect parent emails to avoid N+1 queries
    parent_emails = set()
    for student in students:
        if student.parent_email:
            parent_emails.add((student.parent_email or '').strip().lower())

    linked_emails = set()
    if parent_emails:
        parents = db.query(Parent).filter(Parent.parent_email.in_(list(parent_emails))).all()
        for p in parents:
            if p and p.parent_email:
                linked_emails.add(p.parent_email.strip().lower())

    for student in students:
        parent_email = (student.parent_email or '').strip().lower() if student.parent_email else None
        is_linked = False
        if parent_email and parent_email in linked_emails:
            is_linked = True
        result.append({
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "email": student.email,
            "class_level": student.class_level,
            "student_id": student.student_id,
            "parent_email": student.parent_email,
            "isLinked": is_linked
        })
    return result

router = APIRouter(prefix="/api/students", tags=["students"])


@router.post("/", response_model=StudentResponse, status_code=201)
def create_student(
    student: StudentCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new student.
    
    - **student_id**: Unique student ID
    - **first_name**: Student's first name
    - **last_name**: Student's last name
    - **email**: Student's email address
    - **class_level**: Class or grade level
    """
    try:
        result = StudentService.create_student(db, student)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[StudentResponse])
def get_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get all students with pagination."""
    students = StudentService.get_all_students(db, skip, limit)
    return students


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific student by ID."""
    student = StudentService.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.get("/view/{student_id}/dashboard", response_model=StudentDashboard)
def get_student_dashboard(
    student_id: int,
    days_lookback: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive dashboard data for a student.
    
    Includes:
    - Student information
    - Attendance statistics
    - Behavior statistics
    - Risk assessment score
    
    - **days_lookback**: Number of days to look back for statistics (default: 30)
    """
    student = StudentService.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    try:
        from datetime import datetime, timedelta
        start_date = datetime.utcnow() - timedelta(days=days_lookback)

        # Calculate risk score first (it already computes attendance and behavior stats)
        risk_score = RiskScoringService.calculate_risk_score(db, student_id, days_lookback)

        # Reuse stats attached to the returned risk_score when available to avoid duplicate DB reads
        attendance_stats = getattr(risk_score, 'attendance_stats', None)
        behavior_stats = getattr(risk_score, 'behavior_stats', None)

        if attendance_stats is None:
            attendance_stats = AttendanceService.get_attendance_stats(db, student_id, start_date)
        if behavior_stats is None:
            behavior_stats = BehaviorService.get_behavior_stats(db, student_id, start_date)

        return StudentDashboard(
            student=student,
            attendance_stats=attendance_stats,
            behavior_stats=behavior_stats,
            risk_score=risk_score
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: int,
    student_data: StudentUpdate,
    db: Session = Depends(get_db)
):
    """Update student information."""
    student = StudentService.update_student(db, student_id, student_data)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.delete("/{student_id}", status_code=204)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db)
):
    """Delete a student and all related records."""
    success = StudentService.delete_student(db, student_id)
    if not success:
        raise HTTPException(status_code=404, detail="Student not found")
    return None
