"""
Attendance Schedule Service

Handles:
- Student attendance schedule management
- Attendance status validation based on entry/exit times
- School day determination
- Late arrival and invalid timeout detection
"""

from datetime import datetime, time, date
from typing import Optional, Dict, List
from sqlalchemy.orm import Session
from sqlalchemy import and_

import sys
sys.path.insert(0, '.')

from models import StudentAttendanceSchedule, AttendanceLog, Student
from schemas import (
    StudentAttendanceScheduleCreate, 
    StudentAttendanceScheduleResponse,
    StudentAttendanceScheduleUpdate
)


class AttendanceScheduleService:
    """Service for student attendance schedule operations."""

    @staticmethod
    def get_current_schedule(
        db: Session, 
        student_lrn: str,
        school_year_id: Optional[int] = None
    ) -> Optional[StudentAttendanceSchedule]:
        """
        Get the current attendance schedule for a student.
        If school_year_id not provided, gets the active school year's schedule.
        """
        query = db.query(StudentAttendanceSchedule).filter(
            and_(
                StudentAttendanceSchedule.student_lrn == student_lrn,
                StudentAttendanceSchedule.is_active == True
            )
        )
        
        if school_year_id:
            query = query.filter(StudentAttendanceSchedule.school_year_id == school_year_id)
        
        return query.first()

    @staticmethod
    def get_schedule_by_id(
        db: Session,
        schedule_id: int
    ) -> Optional[StudentAttendanceSchedule]:
        """Get attendance schedule by ID."""
        return db.query(StudentAttendanceSchedule).filter(
            StudentAttendanceSchedule.id == schedule_id
        ).first()

    @staticmethod
    def create_schedule(
        db: Session,
        schedule: StudentAttendanceScheduleCreate
    ) -> StudentAttendanceSchedule:
        """Create a new attendance schedule for a student."""
        db_schedule = StudentAttendanceSchedule(
            student_lrn=schedule.student_lrn,
            school_year_id=schedule.school_year_id,
            year_level=schedule.year_level,
            entry_time=schedule.entry_time,
            exit_time=schedule.exit_time,
            school_days=schedule.school_days,
            grace_period_minutes=schedule.grace_period_minutes or 0,
            is_active=True
        )
        db.add(db_schedule)
        db.commit()
        db.refresh(db_schedule)
        return db_schedule

    @staticmethod
    def update_schedule(
        db: Session,
        schedule_id: int,
        schedule_data: StudentAttendanceScheduleUpdate
    ) -> Optional[StudentAttendanceSchedule]:
        """Update an attendance schedule."""
        db_schedule = db.query(StudentAttendanceSchedule).filter(
            StudentAttendanceSchedule.id == schedule_id
        ).first()
        
        if not db_schedule:
            return None
        
        update_data = schedule_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_schedule, key, value)
        
        db.commit()
        db.refresh(db_schedule)
        return db_schedule

    @staticmethod
    def delete_schedule(db: Session, schedule_id: int) -> bool:
        """Soft delete (deactivate) an attendance schedule."""
        db_schedule = db.query(StudentAttendanceSchedule).filter(
            StudentAttendanceSchedule.id == schedule_id
        ).first()
        
        if not db_schedule:
            return False
        
        db_schedule.is_active = False
        db.commit()
        return True

    @staticmethod
    def is_school_day(
        db: Session,
        student_lrn: str,
        check_date: date
    ) -> bool:
        """
        Check if a given date is a school day for a student.
        Returns True if the student should be in school on this date.
        """
        schedule = AttendanceScheduleService.get_current_schedule(db, student_lrn)
        if not schedule:
            return False
        
        # Get day name (0=Monday, 6=Sunday)
        day_name = check_date.strftime('%A').lower()
        
        # Check if school_days dict includes this day
        if schedule.school_days and isinstance(schedule.school_days, dict):
            return schedule.school_days.get(day_name, False)
        
        return False

    @staticmethod
    def validate_attendance_status(
        db: Session,
        student_lrn: str,
        check_in_time: datetime,
        check_out_time: Optional[datetime] = None
    ) -> Dict[str, any]:
        """
        Validate attendance status based on student's schedule.
        
        Returns:
        {
            'attendance_status': 'present' | 'late' | 'invalid_timeout' | 'absent',
            'is_late': bool,
            'is_invalid_timeout': bool,
            'minutes_early': int (negative if late),
            'minutes_overtime': int (negative if before exit),
            'status_reason': str
        }
        """
        schedule = AttendanceScheduleService.get_current_schedule(db, student_lrn)
        
        if not schedule:
            return {
                'attendance_status': 'absent',
                'is_late': False,
                'is_invalid_timeout': False,
                'minutes_early': 0,
                'minutes_overtime': 0,
                'status_reason': 'No attendance schedule found for student'
            }
        
        check_in_date = check_in_time.date()
        
        # Check if it's a school day
        if not AttendanceScheduleService.is_school_day(db, student_lrn, check_in_date):
            return {
                'attendance_status': 'absent',
                'is_late': False,
                'is_invalid_timeout': False,
                'minutes_early': 0,
                'minutes_overtime': 0,
                'status_reason': 'Not a school day for student'
            }
        
        # Get times from schedule
        scheduled_entry = schedule.entry_time
        scheduled_exit = schedule.exit_time
        grace_period = schedule.grace_period_minutes or 0
        
        # Extract time from check-in datetime
        check_in_time_only = check_in_time.time()
        
        # Calculate minutes difference for check-in
        entry_datetime = datetime.combine(check_in_date, scheduled_entry)
        check_in_datetime = datetime.combine(check_in_date, check_in_time_only)
        minutes_diff = int((check_in_datetime - entry_datetime).total_seconds() / 60)
        
        attendance_status = 'present'
        is_late = False
        status_reason = 'On time'
        
        # Check if late (after scheduled entry time + grace period)
        if minutes_diff > grace_period:
            is_late = True
            attendance_status = 'late'
            status_reason = f'Late by {minutes_diff - grace_period} minutes'
        
        # Check invalid timeout if check_out_time provided
        is_invalid_timeout = False
        minutes_overtime = 0
        
        if check_out_time:
            check_out_time_only = check_out_time.time()
            exit_datetime = datetime.combine(check_in_date, scheduled_exit)
            check_out_datetime = datetime.combine(check_in_date, check_out_time_only)
            minutes_overtime = int((check_out_datetime - exit_datetime).total_seconds() / 60)
            
            # If timeout is after scheduled exit time, it's treated as invalid
            if minutes_overtime > 0:
                is_invalid_timeout = True
                if attendance_status == 'present':
                    # If was marked present but has invalid timeout, keep as invalid
                    attendance_status = 'invalid_timeout'
                    status_reason = f'Invalid timeout: {minutes_overtime} minutes after exit time'
        
        return {
            'attendance_status': attendance_status,
            'is_late': is_late,
            'is_invalid_timeout': is_invalid_timeout,
            'minutes_early': minutes_diff,  # negative if early
            'minutes_overtime': minutes_overtime,  # negative if before exit
            'status_reason': status_reason
        }

    @staticmethod
    def update_attendance_status(
        db: Session,
        attendance_log_id: int,
        status_validation: Dict
    ) -> Optional[AttendanceLog]:
        """Update attendance log with validated status."""
        attendance = db.query(AttendanceLog).filter(
            AttendanceLog.id == attendance_log_id
        ).first()
        
        if not attendance:
            return None
        
        attendance.attendance_status = status_validation['attendance_status']
        attendance.is_late = status_validation['is_late']
        attendance.is_invalid_timeout = status_validation['is_invalid_timeout']
        
        db.commit()
        db.refresh(attendance)
        return attendance

    @staticmethod
    def get_student_attendance_by_status(
        db: Session,
        student_lrn: str,
        status: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[AttendanceLog]:
        """Get attendance records for a student by status."""
        query = db.query(AttendanceLog).filter(
            and_(
                AttendanceLog.student_lrn == student_lrn,
                AttendanceLog.attendance_status == status
            )
        )
        
        if start_date:
            query = query.filter(AttendanceLog.date >= start_date)
        if end_date:
            query = query.filter(AttendanceLog.date <= end_date)
        
        return query.order_by(AttendanceLog.date.desc()).all()

    @staticmethod
    def get_attendance_summary(
        db: Session,
        student_lrn: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, int]:
        """Get attendance status counts for a student."""
        query = db.query(AttendanceLog).filter(
            AttendanceLog.student_lrn == student_lrn
        )
        
        if start_date:
            query = query.filter(AttendanceLog.date >= start_date)
        if end_date:
            query = query.filter(AttendanceLog.date <= end_date)
        
        records = query.all()
        
        return {
            'total_days': len(records),
            'present': len([r for r in records if r.attendance_status == 'present']),
            'late': len([r for r in records if r.attendance_status == 'late']),
            'absent': len([r for r in records if r.attendance_status == 'absent']),
            'invalid_timeout': len([r for r in records if r.attendance_status == 'invalid_timeout'])
        }
