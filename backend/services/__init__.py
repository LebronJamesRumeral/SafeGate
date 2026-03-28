from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import List, Optional

from models import Student, Attendance, BehaviorEvent, RiskScore, Parent
from schemas import AttendanceCreate, AttendanceUpdate, AttendanceStats
from schemas import BehaviorEventCreate, BehaviorEventUpdate, BehaviorStats
from schemas import StudentCreate, StudentUpdate


    """Service for student-related operations."""
    Student = Student  # Expose Student model for router usage
    
    @staticmethod
    def create_student(db: Session, student: StudentCreate) -> Student:
        """Create a new student."""
        db_student = Student(
            student_id=student.student_id,
            first_name=student.first_name,
            last_name=student.last_name,
            email=student.email,
            class_level=student.class_level
        )
        db.add(db_student)
        db.commit()
        db.refresh(db_student)
        return db_student
    
    @staticmethod
    def get_student(db: Session, student_id: int) -> Optional[Student]:
        """Get student by ID."""
        return db.query(Student).filter(Student.id == student_id).first()
    
    @staticmethod
    def get_student_by_student_id(db: Session, student_id: str) -> Optional[Student]:
        """Get student by student_id."""
        return db.query(Student).filter(Student.student_id == student_id).first()
    
    @staticmethod
    def get_all_students(db: Session, skip: int = 0, limit: int = 100) -> List[Student]:
        """Get all students with pagination."""
        return db.query(Student).offset(skip).limit(limit).all()
    
    @staticmethod
    def update_student(db: Session, student_id: int, student_data: StudentUpdate) -> Optional[Student]:
        """Update student information."""
        db_student = db.query(Student).filter(Student.id == student_id).first()
        if not db_student:
            return None
        
        update_data = student_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_student, key, value)
        
        db.commit()
        db.refresh(db_student)
        return db_student
    
    @staticmethod
    def delete_student(db: Session, student_id: int) -> bool:
        """Delete a student."""
        db_student = db.query(Student).filter(Student.id == student_id).first()
        if not db_student:
            return False
        
        db.delete(db_student)
        db.commit()
        return True


class AttendanceService:
    """Service for attendance-related operations."""
    
    @staticmethod
    def create_attendance(db: Session, attendance: AttendanceCreate) -> Attendance:
        """Create a new attendance record."""
        db_attendance = Attendance(
            student_id=attendance.student_id,
            date=attendance.date,
            status=attendance.status,
            time_in=attendance.time_in,
            time_out=attendance.time_out,
            notes=attendance.notes
        )
        db.add(db_attendance)
        db.commit()
        db.refresh(db_attendance)
        return db_attendance
    
    @staticmethod
    def get_attendance(db: Session, attendance_id: int) -> Optional[Attendance]:
        """Get attendance record by ID."""
        return db.query(Attendance).filter(Attendance.id == attendance_id).first()
    
    @staticmethod
    def get_student_attendance(
        db: Session,
        student_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Attendance]:
        """Get attendance records for a student within optional date range."""
        query = db.query(Attendance).filter(Attendance.student_id == student_id)
        
        if start_date:
            query = query.filter(Attendance.date >= start_date)
        if end_date:
            query = query.filter(Attendance.date <= end_date)
        
        return query.order_by(Attendance.date.desc()).offset(skip).limit(limit).all()
    
    @staticmethod
    def update_attendance(
        db: Session,
        attendance_id: int,
        attendance_data: AttendanceUpdate
    ) -> Optional[Attendance]:
        """Update attendance record."""
        db_attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
        if not db_attendance:
            return None
        
        update_data = attendance_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_attendance, key, value)
        
        db.commit()
        db.refresh(db_attendance)
        return db_attendance
    
    @staticmethod
    def delete_attendance(db: Session, attendance_id: int) -> bool:
        """Delete an attendance record."""
        db_attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
        if not db_attendance:
            return False
        
        db.delete(db_attendance)
        db.commit()
        return True
    
    @staticmethod
    def get_attendance_stats(
        db: Session,
        student_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> AttendanceStats:
        """Calculate attendance statistics for a student."""
        query = db.query(Attendance).filter(Attendance.student_id == student_id)
        
        if start_date:
            query = query.filter(Attendance.date >= start_date)
        if end_date:
            query = query.filter(Attendance.date <= end_date)
        
        records = query.all()
        total_days = len(records)
        
        if total_days == 0:
            return AttendanceStats(
                student_id=student_id,
                total_days=0,
                present_days=0,
                absent_days=0,
                late_days=0,
                attendance_rate=100.0
            )
        
        present_days = len([r for r in records if r.status == "present"])
        absent_days = len([r for r in records if r.status == "absent"])
        late_days = len([r for r in records if r.status == "late"])
        
        attendance_rate = (present_days / total_days * 100) if total_days > 0 else 0.0
        
        return AttendanceStats(
            student_id=student_id,
            total_days=total_days,
            present_days=present_days,
            absent_days=absent_days,
            late_days=late_days,
            attendance_rate=round(attendance_rate, 2)
        )


class BehaviorService:
    """Service for behavior event operations."""
    
    @staticmethod
    def create_behavior_event(db: Session, event: BehaviorEventCreate) -> BehaviorEvent:
        """Create a new behavior event."""
        db_event = BehaviorEvent(
            student_id=event.student_id,
            event_type=event.event_type,
            description=event.description,
            severity=event.severity,
            reported_by=event.reported_by
        )
        db.add(db_event)
        db.commit()
        db.refresh(db_event)
        return db_event
    
    @staticmethod
    def get_behavior_event(db: Session, event_id: int) -> Optional[BehaviorEvent]:
        """Get behavior event by ID."""
        return db.query(BehaviorEvent).filter(BehaviorEvent.id == event_id).first()
    
    @staticmethod
    def get_student_behavior_events(
        db: Session,
        student_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[BehaviorEvent]:
        """Get behavior events for a student."""
        query = db.query(BehaviorEvent).filter(BehaviorEvent.student_id == student_id)
        
        if start_date:
            query = query.filter(BehaviorEvent.timestamp >= start_date)
        if end_date:
            query = query.filter(BehaviorEvent.timestamp <= end_date)
        
        return query.order_by(BehaviorEvent.timestamp.desc()).offset(skip).limit(limit).all()
    
    @staticmethod
    def update_behavior_event(
        db: Session,
        event_id: int,
        event_data: BehaviorEventUpdate
    ) -> Optional[BehaviorEvent]:
        """Update behavior event."""
        db_event = db.query(BehaviorEvent).filter(BehaviorEvent.id == event_id).first()
        if not db_event:
            return None
        
        update_data = event_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_event, key, value)
        
        db.commit()
        db.refresh(db_event)
        return db_event
    
    @staticmethod
    def delete_behavior_event(db: Session, event_id: int) -> bool:
        """Delete a behavior event."""
        db_event = db.query(BehaviorEvent).filter(BehaviorEvent.id == event_id).first()
        if not db_event:
            return False
        
        db.delete(db_event)
        db.commit()
        return True
    
    @staticmethod
    def get_behavior_stats(
        db: Session,
        student_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> BehaviorStats:
        """Calculate behavior statistics for a student."""
        query = db.query(BehaviorEvent).filter(BehaviorEvent.student_id == student_id)
        
        if start_date:
            query = query.filter(BehaviorEvent.timestamp >= start_date)
        if end_date:
            query = query.filter(BehaviorEvent.timestamp <= end_date)
        
        events = query.all()
        total_events = len(events)
        
        if total_events == 0:
            return BehaviorStats(
                student_id=student_id,
                positive_events=0,
                negative_events=0,
                total_events=0,
                average_severity=0.0
            )
        
        positive_events = len([e for e in events if e.event_type == "positive"])
        negative_events = len([e for e in events if e.event_type == "negative"])
        average_severity = sum(e.severity for e in events) / total_events if total_events > 0 else 0.0
        
        return BehaviorStats(
            student_id=student_id,
            positive_events=positive_events,
            negative_events=negative_events,
            total_events=total_events,
            average_severity=round(average_severity, 2)
        )


class RiskScoringService:
    """Service for risk assessment and scoring."""
    
    @staticmethod
    def calculate_risk_score(
        db: Session,
        student_id: int,
        days_lookback: int = 30
    ) -> RiskScore:
        """
        Calculate risk score based on attendance and behavior data.
        
        Risk Calculation:
        - Behavioral Score: Based on severity and frequency of negative events
        - Attendance Score: Based on absence rate and tardiness
        - Overall Score: Weighted average of behavioral and attendance scores
        """
        student = StudentService.get_student(db, student_id)
        if not student:
            raise ValueError(f"Student {student_id} not found")
        
        # Set lookback date
        start_date = datetime.utcnow() - timedelta(days=days_lookback)
        
        # Get statistics
        attendance_stats = AttendanceService.get_attendance_stats(db, student_id, start_date)
        behavior_stats = BehaviorService.get_behavior_stats(db, student_id, start_date)
        
        # Calculate behavioral score (0-100)
        # Higher negative events = lower score
        negative_weight = 40
        behaviors = BehaviorService.get_student_behavior_events(db, student_id, start_date)
        
        if behaviors:
            negative_severity_total = sum(
                b.severity for b in behaviors if b.event_type == "negative"
            )
            negative_severity_avg = negative_severity_total / len(behaviors) if behaviors else 0
            behavioral_score = max(0, 100 - (negative_severity_avg * negative_weight))
        else:
            behavioral_score = 100.0
        
        # Calculate attendance score (0-100)
        # Lower attendance rate = lower score
        attendance_score = attendance_stats.attendance_rate
        
        # Calculate overall score (weighted average)
        overall_score = (behavioral_score * 0.6) + (attendance_score * 0.4)
        
        # Determine risk level
        if overall_score >= 80:
            risk_level = "low"
        elif overall_score >= 60:
            risk_level = "medium"
        elif overall_score >= 40:
            risk_level = "high"
        else:
            risk_level = "critical"
        
        # Update or create risk score record
        existing_score = db.query(RiskScore).filter(
            RiskScore.student_id == student_id
        ).first()
        
        if existing_score:
            existing_score.overall_score = round(overall_score, 2)
            existing_score.behavioral_score = round(behavioral_score, 2)
            existing_score.attendance_score = round(attendance_score, 2)
            existing_score.risk_level = risk_level
            existing_score.last_updated = datetime.utcnow()
            db.commit()
            db.refresh(existing_score)
            return existing_score
        else:
            new_score = RiskScore(
                student_id=student_id,
                overall_score=round(overall_score, 2),
                behavioral_score=round(behavioral_score, 2),
                attendance_score=round(attendance_score, 2),
                risk_level=risk_level
            )
            db.add(new_score)
            db.commit()
            db.refresh(new_score)
            return new_score
    
    @staticmethod
    def get_high_risk_students(db: Session, threshold: str = "high") -> List[RiskScore]:
        """Get all students with risk level at or above threshold."""
        return db.query(RiskScore).filter(
            RiskScore.risk_level.in_(["high", "critical"])
        ).all()
