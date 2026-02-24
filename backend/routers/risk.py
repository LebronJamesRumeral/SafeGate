from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from schemas import RiskScoreResponse
from services import RiskScoringService

router = APIRouter(prefix="/api/risk", tags=["risk-assessment"])


@router.get("/calculate/{student_id}", response_model=RiskScoreResponse)
def calculate_student_risk(
    student_id: int,
    days_lookback: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """
    Calculate or update risk score for a student.
    
    Risk Score Calculation:
    - Behavioral Score (60% weight): Based on negative events and severity
    - Attendance Score (40% weight): Based on attendance rate
    - Overall Score: Weighted average of both scores (0-100)
    
    Risk Levels:
    - Low: 80-100
    - Medium: 60-79
    - High: 40-59
    - Critical: 0-39
    
    - **student_id**: ID of the student
    - **days_lookback**: Number of days to consider for calculation (default: 30)
    """
    try:
        risk_score = RiskScoringService.calculate_risk_score(db, student_id, days_lookback)
        return risk_score
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/high-risk", response_model=List[RiskScoreResponse])
def get_high_risk_students(
    threshold: str = Query("high", regex="^(high|critical)$"),
    db: Session = Depends(get_db)
):
    """
    Get all students with high or critical risk levels.
    
    Useful for identifying students who need immediate attention.
    
    - **threshold**: Minimum risk level to include (high or critical)
    """
    high_risk = RiskScoringService.get_high_risk_students(db, threshold)
    return high_risk
