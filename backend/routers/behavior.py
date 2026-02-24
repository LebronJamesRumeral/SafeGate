from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from database import get_db
from schemas import (
    BehaviorEventCreate, BehaviorEventUpdate, BehaviorEventResponse, BehaviorStats
)
from services import BehaviorService

router = APIRouter(prefix="/api/behavior", tags=["behavior"])


@router.post("/", response_model=BehaviorEventResponse, status_code=201)
def create_behavior_event(
    event: BehaviorEventCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new behavior event.
    
    - **student_id**: ID of the student
    - **event_type**: Type of event (positive, negative, neutral)
    - **description**: Description of the event
    - **severity**: Severity level (0-10)
    - **reported_by**: Name of person reporting event (optional)
    """
    try:
        result = BehaviorService.create_behavior_event(db, event)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{event_id}", response_model=BehaviorEventResponse)
def get_behavior_event(
    event_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific behavior event by ID."""
    event = BehaviorService.get_behavior_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Behavior event not found")
    return event


@router.get("/student/{student_id}", response_model=List[BehaviorEventResponse])
def get_student_behavior_events(
    student_id: int,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    Get all behavior events for a specific student.
    
    Optional filters:
    - **start_date**: Filter events from this date (RFC 3339 format)
    - **end_date**: Filter events until this date (RFC 3339 format)
    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return (pagination)
    """
    events = BehaviorService.get_student_behavior_events(
        db, student_id, start_date, end_date, skip, limit
    )
    return events


@router.get("/stats/student/{student_id}", response_model=BehaviorStats)
def get_behavior_stats(
    student_id: int,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get behavior statistics for a student.
    
    Returns:
    - Number of positive events
    - Number of negative events
    - Total events
    - Average severity score (0-10)
    """
    stats = BehaviorService.get_behavior_stats(db, student_id, start_date, end_date)
    return stats


@router.put("/{event_id}", response_model=BehaviorEventResponse)
def update_behavior_event(
    event_id: int,
    event_data: BehaviorEventUpdate,
    db: Session = Depends(get_db)
):
    """Update a behavior event."""
    event = BehaviorService.update_behavior_event(db, event_id, event_data)
    if not event:
        raise HTTPException(status_code=404, detail="Behavior event not found")
    return event


@router.delete("/{event_id}", status_code=204)
def delete_behavior_event(
    event_id: int,
    db: Session = Depends(get_db)
):
    """Delete a behavior event."""
    success = BehaviorService.delete_behavior_event(db, event_id)
    if not success:
        raise HTTPException(status_code=404, detail="Behavior event not found")
    return None
