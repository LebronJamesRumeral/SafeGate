# Student Attendance Schedule System - Quick Reference Guide

## For School Administrators

### Setting Up Schedules

**Step 1: Access the Database**
Connect to Supabase and navigate to the `student_attendance_schedules` table.

**Step 2: Create Schedule per Student**
```sql
INSERT INTO student_attendance_schedules 
(student_lrn, school_year_id, year_level, entry_time, exit_time, school_days, is_active)
VALUES ('LRN-2026-0001', 1, 'Grade 4', '08:00:00', '17:00:00', 
'{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": false, "sunday": false}', true);
```

**Step 3: Verify Setup**
- Check that all students have active schedules
- Confirm times are correct for each grade level
- Test with a sample student QR code

### Managing Exceptions

**Change a Student's Schedule:**
```sql
UPDATE student_attendance_schedules 
SET entry_time = '09:00:00', exit_time = '16:00:00'
WHERE student_lrn = 'LRN-2026-0001';
```

**Temporarily Disable a Schedule:**
```sql
UPDATE student_attendance_schedules 
SET is_active = false
WHERE student_lrn = 'LRN-2026-0001';
```

**Add Grace Period (e.g., 5 minutes):**
```sql
UPDATE student_attendance_schedules 
SET grace_period_minutes = 5
WHERE year_level = 'Grade 4';
```

---

## For Scanning Officers/Teachers

### Understanding Status Badges

When a student is scanned, you'll see:

| Status | Appearance | Meaning |
|--------|-----------|---------|
| **Present** | Green badge | ✓ Student on time |
| **Late** | Yellow badge | ⏰ Arrived after entry time |
| **Invalid Timeout** | Red badge | ⚠ Left after exit time |

### What Each Status Means

**Present** ✓
- Student arrived at or before their entry time
- Example: Entry time 8:00 AM, arrived 7:50 AM → Present

**Late** ⏰  
- Student arrived after their scheduled entry time
- Grace period NOT applied (set to 0 by default)
- Example: Entry time 8:00 AM, arrived 8:15 AM → Late

**Invalid Timeout** ⚠
- Student checked out after their exit time
- Usually indicates extended stay or error
- Requires follow-up

### Example Scenarios

**Morning Check-In:**
```
Time: 07:55 AM (Entry time: 8:00 AM)
→ Status: ✓ Present
```

**Late Morning Check-In:**
```
Time: 8:20 AM (Entry time: 8:00 AM)  
→ Status: ⏰ Late
```

**Evening Check-Out:**
```
Time: 5:15 PM (Exit time: 5:00 PM)
→ Status: ⚠ Invalid Timeout
```

---

## For Parents

### What the Status Means for Your Child

**Present** ✓
- Your child arrived on time
- No concerns
- Regular status

**Late** ⏰
- Your child arrived after the scheduled entry time
- The school may monitor patterns
- Multiple late arrivals may affect attendance record

**Invalid Timeout** ⚠
- Your child stayed after the scheduled exit time
- Usually not a concern
- May indicate special activity or care arrangement

---

## For Dashboard Users

### Viewing Attendance by Status

**How to Filter:**
1. Go to Dashboard
2. Select Student
3. View attendance log
4. Each entry shows the status

**Understanding the Breakdown:**
- **Total Days**: Number of days tracked
- **Present**: On-time arrivals
- **Late**: Late arrivals  
- **Absent**: No check-in on school day
- **Invalid Timeout**: Late check-outs

### Interpreting Attendance Data

**Good Attendance Pattern:**
- High "Present" count
- Low "Late" count
- Indicates consistent on-time behavior

**Attendance Concern:**
- Increasing "Late" count
- Pattern of late arrivals on certain days
- May indicate transportation or routine issue

---

## Schedule Reference by Year Level

### Elementary (Grades 1-6)
- **Entry**: 8:00 AM
- **Exit**: 5:00 PM
- **School Days**: Monday - Friday
- **Use Case**: Full-day classes

### Kindergarten
- **Entry**: 8:30 AM
- **Exit**: 3:30 PM
- **School Days**: Monday - Friday
- **Use Case**: Half-day program

### Pre-K  
- **Entry**: 9:00 AM
- **Exit**: 3:00 PM
- **School Days**: Monday - Friday
- **Use Case**: Morning program

### Toddler & Nursery
- **Entry**: 7:00 AM
- **Exit**: 4:00 PM
- **School Days**: Monday - Friday
- **Use Case**: Extended day care

---

## Troubleshooting

### "Student not found" message
- Verify QR code is correctly printed
- Check student is in the system
- Scan again slowly and clearly

### "Already checked out" message
- Student already checked out for the day
- Wait until next day to check in again

### Status not showing
- Wait 2-3 seconds after scan for status to update
- Refresh the page if needed
- Check internet connection

### Incorrect entry/exit times
- Notify administrator immediately
- Do not modify times yourself
- Check if student has custom schedule

---

## Reports & Analytics

### Daily Report
Check dashboard to see:
- How many students checked in on-time
- How many were late
- Any students still checked in

### Weekly/Monthly Report
- Trends in late arrivals
- Days with highest lateness
- Individual student patterns

### By Year Level
- Compare lateness across grades
- Identify systemic issues
- Adjust schedules if needed

---

## Common Questions

**Q: What if a student is absent?**  
A: No status shown, appears as "Absent" in reports.

**Q: Can I manually change a student's status?**  
A: No, status is automatically determined from entry/exit times. Contact administrator if correction needed.

**Q: What about excused absences or late arrivals?**  
A: Currently recorded as-is. Excuses can be noted in notes field by admin.

**Q: Do weekends count?**  
A: No, only Monday-Friday are configured as school days.

**Q: What is the grace period?**  
A: Currently 0 minutes (strictly on-time). Any minute late = Late status.

**Q: Can schedules change per student?**  
A: Yes, each student has their own schedule by year level.

---

## Quick Commands

### Check Student's Schedule
**Via Supabase SQL Editor:**
```sql
SELECT * FROM student_attendance_schedules 
WHERE student_lrn = 'LRN-2026-0001' AND is_active = true;
```

### Check Today's Attendance Summary
**Via API:**
```
GET /api/attendance-schedules/stats/LRN-2026-0001?start_date=2026-03-17&end_date=2026-03-17
```

### Get All Late Arrivals This Month
**Via Supabase:**
```sql
SELECT * FROM attendance_logs 
WHERE student_lrn = 'LRN-2026-0001'
AND attendance_status = 'late'
AND date >= '2026-03-01' AND date <= '2026-03-31'
ORDER BY date DESC;
```

---

## Safety & Best Practices

1. **Data Integrity**
   - Only administrators should modify schedules
   - Double-check times before saving
   - Keep backup of schedule changes

2. **Student Privacy**
   - Don't share attendance details unnecessarily
   - Discuss concerns with parents privately
   - Store data securely

3. **Equipment**
   - Keep camera clean for clear QR scans
   - Test scanner daily
   - Report technical issues immediately

4. **Consistency**
   - Use the system for all students
   - Scan both check-in and check-out
   - Follow school policy on timing

---

## Contact & Support

**Questions about setup?**
Contact School IT Department

**Issues with scanner?**
Report to Technical Support

**Need schedule changes?**
Submit request to Principal/Admin

**Questions about your child's attendance?**
Contact your child's Teacher/Administrator

---

**Last Updated**: March 17, 2026  
**Version**: 1.0  
**For Questions**: Contact School Administration
