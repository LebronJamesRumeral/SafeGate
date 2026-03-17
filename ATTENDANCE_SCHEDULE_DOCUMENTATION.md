# Student Attendance Schedule System - Documentation

## Overview

The Safe Gate PWA now features an intelligent attendance schedule system that validates each student's attendance based on their personalized entry/exit times and school days. This ensures fair and accurate attendance tracking aligned with each student's actual schedule.

## Key Features

### 1. **Schedule-Based Attendance**
- Each student has their own entry and exit times (e.g., 8:00 AM - 5:00 PM)
- Attendance is validated against these scheduled times
- Different year levels have different schedules

### 2. **Attendance Status Classifications**
- **Present**: Student scanned at or before scheduled entry time
- **Late**: Student scanned after scheduled entry time
- **Invalid Timeout**: Student scanned after scheduled exit time
- **Absent**: Not a school day OR no scan recorded

### 3. **School Days Configuration**
- Schedule specifies which days are school days (Mon-Fri by default)
- Can be customized per student or year level
- Weekend days and holidays can be excluded

### 4. **Grace Period**
- Optional grace period (in minutes) for late arrivals
- Default: 0 minutes (strictly on-time)
- Can be customized per student

## Database Schema

### `student_attendance_schedules` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `student_lrn` | VARCHAR(50) | Reference to student LRN |
| `school_year_id` | BIGINT | Reference to school year |
| `year_level` | VARCHAR(50) | Grade level (e.g., 'Grade 4', 'Kinder 1') |
| `entry_time` | TIME | Scheduled check-in time |
| `exit_time` | TIME | Scheduled check-out time |
| `school_days` | JSONB | JSON object with day names and boolean values |
| `grace_period_minutes` | SMALLINT | Grace period for late arrivals |
| `is_active` | BOOLEAN | Whether schedule is currently active |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time |

### `attendance_logs` Table Updates

New columns added:
- `attendance_status` VARCHAR(30) - Status: 'present', 'late', 'absent', 'invalid_timeout'
- `is_late` BOOLEAN - Whether student was late
- `is_invalid_timeout` BOOLEAN - Whether student has invalid timeout

## Default Schedule Configuration

### Grade Levels (1-6)
- **Entry Time**: 8:00 AM
- **Exit Time**: 5:00 PM  
- **School Days**: Monday - Friday
- **Grace Period**: 0 minutes

### Kindergarten (Kinder 1 & 2)
- **Entry Time**: 8:30 AM
- **Exit Time**: 3:30 PM
- **School Days**: Monday - Friday
- **Grace Period**: 0 minutes

### Pre-K
- **Entry Time**: 9:00 AM
- **Exit Time**: 3:00 PM
- **School Days**: Monday - Friday
- **Grace Period**: 0 minutes

### Toddler & Nursery
- **Entry Time**: 7:00 AM
- **Exit Time**: 4:00 PM
- **School Days**: Monday - Friday
- **Grace Period**: 0 minutes

## API Endpoints

### Create Attendance Schedule
```http
POST /api/attendance-schedules/
Content-Type: application/json

{
  "student_lrn": "LRN-2026-0001",
  "school_year_id": 1,
  "year_level": "Grade 4",
  "entry_time": "08:00:00",
  "exit_time": "17:00:00",
  "school_days": {
    "monday": true,
    "tuesday": true,
    "wednesday": true,
    "thursday": true,
    "friday": true,
    "saturday": false,
    "sunday": false
  },
  "grace_period_minutes": 0
}
```

### Get Student Schedule
```http
GET /api/attendance-schedules/student/{student_lrn}?school_year_id=1
```

### Validate Attendance
```http
POST /api/attendance-schedules/validate/{student_lrn}
?check_in_time=2026-03-17T08:15:00Z&check_out_time=2026-03-17T17:30:00Z
```

Returns:
```json
{
  "attendance_status": "late",
  "is_late": true,
  "is_invalid_timeout": true,
  "minutes_early": 15,
  "minutes_overtime": 30,
  "status_reason": "Late by 15 minutes, Invalid timeout: 30 minutes after exit"
}
```

### Get Attendance Summary
```http
GET /api/attendance-schedules/stats/{student_lrn}?start_date=2026-03-01&end_date=2026-03-31
```

Returns:
```json
{
  "total_days": 20,
  "present": 18,
  "late": 2,
  "absent": 0,
  "invalid_timeout": 1
}
```

### Get Attendance by Status
```http
GET /api/attendance-schedules/by-status/{student_lrn}?status=late&start_date=2026-03-01&end_date=2026-03-31
```

## Frontend Integration

### Getting Student Schedule
```typescript
import { getStudentSchedule } from '@/lib/attendance-schedule-validation';

const schedule = await getStudentSchedule('LRN-2026-0001');
```

### Validating Attendance
```typescript
import { 
  validateAttendanceStatus,
  getAttendanceStatusDisplay 
} from '@/lib/attendance-schedule-validation';

const checkInTime = new Date();
const validation = validateAttendanceStatus(schedule, checkInTime);

const display = getAttendanceStatusDisplay(validation);
// Returns: { text: 'Present', icon: '✓', color: 'green' }
```

### Checking School Days
```typescript
import { isSchoolDay } from '@/lib/attendance-schedule-validation';

const isSchool = isSchoolDay(schedule, new Date()); // True if school day
```

## Scanner Integration

The QR code scanner now automatically:

1. **Scans QR code** → Identifies student
2. **Retrieves schedule** → Gets student's entry/exit times
3. **Validates entry time** → Checks if on-time or late
4. **Records attendance** → Stores with status classification
5. **Displays feedback** → Shows Present/Late/Invalid Timeout status

Example scan result display:
- **Checked In** at 8:15 AM → Status badge shows "Late"
- **Checked In** at 7:50 AM → Status badge shows "Present"
- **Checked Out** at 5:30 PM → Status badge shows "Invalid Timeout"

## Dashboard & Reports

### Attendance Summary View
Shows breakdown by status:
- ✓ Present
- ⏰ Late  
- ✗ Absent
- ⚠ Invalid Timeout

### Individual Student View
- Historical attendance with status for each day
- Filter by status
- View trends over time

## Customizing Schedules

### Adding a New Year Level
```sql
INSERT INTO student_attendance_schedules 
(student_lrn, school_year_id, year_level, entry_time, exit_time, school_days, grace_period_minutes)
VALUES
('LRN-2026-NEW', 1, 'Grade 7', '07:30:00', '16:30:00', 
'{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": false, "sunday": false}', 
10);
```

### Updating Entry/Exit Times
```http
PUT /api/attendance-schedules/{schedule_id}
Content-Type: application/json

{
  "entry_time": "08:30:00",
  "exit_time": "17:30:00",
  "grace_period_minutes": 5
}
```

### Deactivating a Schedule
```http
DELETE /api/attendance-schedules/{schedule_id}
```

## ML Integration

The attendance validation data feeds into the ML system for:
- **Risk Score Calculation**: Late arrivals and invalid timeouts are factored into behavioral risk
- **Attendance Pattern Analysis**: Identifies chronic late arrivals or early departures
- **Predictive Modeling**: Forecasts student absence patterns
- **Trend Analysis**: Tracks improvement or decline in on-time arrivals

## Best Practices

1. **Set schedules at school year start** - Ensure all students have valid schedules
2. **Adjust by year level** - Different grades may have different times
3. **Use grace periods sparingly** - Keep system fair and transparent
4. **Review policies regularly** - Adjust if school start times change
5. **Train staff** - Explain the system to teachers and admin
6. **Monitor exceptions** - Investigate unusual timeout patterns

## Troubleshooting

### Schedule Not Found
- Ensure student has an active schedule
- Check if school_year_id is correct and current

### All Scans Marked as Late
- Verify entry_time is before current school opening time
- Check if grace_period_minutes is set correctly

### Invalid Timeout Not Detected
- Ensure exit_time is set correctly
- Verify check_out_time is being recorded in database

## Future Enhancements

- [ ] Bulk schedule upload via CSV
- [ ] Per-subject schedule support
- [ ] Automated grace period based on traffic patterns
- [ ] Excuse tracking for late arrivals
- [ ] Parent notifications for late check-ins
- [ ] Calendar view of school days
