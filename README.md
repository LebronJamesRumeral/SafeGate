
# SafeGate - Attendance & Behavior Analytics Platform

A modern, production-ready platform combining a responsive Next.js frontend with a robust FastAPI backend for comprehensive attendance tracking and behavioral analytics, including intelligent schedule-based attendance validation and ML risk scoring.

**Status:** Production-Ready | **Version:** 2.0 (Schedule System Integrated)
**Last Updated:** April 2026

---

## Quick Navigation

- [Quick Start](#1-minute-quick-start)
- [Complete Setup Guide](#complete-setup-guide)
- [System Requirements](#system-requirements)
- [User Role Guides](#user-role-guides)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Frontend Integration](#frontend-integration)
- [Testing & Verification](#testing--verification)
- [Troubleshooting](#troubleshooting)
- [Deployment Guide](#deployment-guide)
- [Performance & Security](#performance-monitoring)
- [Development Workflow](#development-workflow)
- [Support](#support)

---


## 1-Minute Quick Start

**Prerequisites:**
- Node.js 16+, Python 3.8+, PostgreSQL (Supabase account)

**Windows:**
```powershell
.\start-dev.bat
```
**macOS/Linux:**
```bash
chmod +x start-dev.sh
./start-dev.sh
```

- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/api/docs

---

## User Role Guides

### School Administrators
- Manage schedules, configure attendance rules, and review analytics.
- Add/modify student schedules via dashboard or API.
- Monitor chronic lateness and absences.

### Scanning Officers
- Use QR scanner interface for real-time attendance.
- Interpret status badges: Present, Late, Invalid Timeout, Absent.
- Report persistent issues to administration.

### Parents
- Access the parent portal for daily/weekly/monthly attendance summaries.
- Receive notifications for late/absent events.
- View risk and behavioral trends.

### Dashboard Users
- Generate and export attendance/behavior reports.
- Visualize trends and identify at-risk students.

### Developers
- Integrate with REST API.
- Extend backend/ML logic or frontend components.
- See Development Workflow section.

---
**macOS/Linux (Bash):**
```bash
source venv/bin/activate
# Your prompt should now show (venv) at the start:
# (venv) user@machine:path$
```

**Install Python packages:**
```bash
pip install -r requirements.txt
```

**Verify backend setup:**
```bash
python verify_setup.py
# Should show: ✓ All checks passed
```

#### Step 4: Environment Configuration

**Backend Configuration (.env):**

In the `backend` directory, create a file named `.env`:

**Windows (PowerShell):**
```powershell
New-Item -Path ".env" -ItemType "File"
```

**macOS/Linux:**
```bash
touch .env
nano .env  # or vi .env to edit
```

**Add this content to backend/.env:**
```ini
# Database Connection (Use Supabase)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=development
DEBUG=True

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Security (Change to random string)
API_KEY_SECRET=your-secret-key-here
```

**Get Supabase Credentials:**
1. Go to https://supabase.com and sign up
2. Create a new project
3. In Project Settings → API Keys, copy:
   - `SUPABASE_URL` under "Project URL"
   - `SUPABASE_SERVICE_ROLE_KEY` under "Service role key"

**Frontend Configuration (.env.local):**

In the **project root** (NOT backend), create `.env.local`:

**Windows (PowerShell):**
```powershell
New-Item -Path ".env.local" -ItemType "File"
```

**macOS/Linux:**
```bash
touch .env.local
nano .env.local  # or vi .env.local to edit
```

**Add this content:**
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

#### Step 5: Frontend Setup

**Go to project root:**

**Windows (PowerShell):**
```powershell
cd ..  # Go back from backend directory
```

**All platforms:**
```bash
cd ..  # Go back from backend directory
```

**Install frontend dependencies:**
```bash
npm install
# or use pnpm
pnpm install
```

---

## ⚙️ Running the System

### Recommended: Automated Startup

This starts both backend and frontend automatically.

**Windows (PowerShell):**
```powershell
.\start-dev.bat
```

**macOS/Linux (Bash):**
```bash
./start-dev.sh
```

**Check the output for:**
- ✓ FastAPI backend running on http://localhost:8000
- ✓ Next.js frontend running on http://localhost:3000

### Manual Startup (More Control)

**Terminal 1 - Backend:**

```powershell
# Windows PowerShell
cd backend
& venv\Scripts\Activate.ps1     # CRITICAL: Activate venv first!
python main.py

# macOS/Linux
cd backend
source venv/bin/activate        # CRITICAL: Activate venv first!
python main.py
```

**You should see:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

**Terminal 2 - Frontend (New terminal, from project root):**

```bash
npm run dev
# or
pnpm dev
```

**You should see:**
```
Ready in X.XXs
```

### Access Your Application

**After both terminals show "running":**

| Component | URL | Purpose |
|-----------|-----|---------|
| **Frontend** | http://localhost:3000 | Main application |
| **API Docs** | http://localhost:8000/api/docs | Test endpoints (Swagger UI) |
| **API Docs Alt** | http://localhost:8000/api/redoc | Alternative API documentation |
| **Health Check** | http://localhost:8000/health | Verify backend running |

---

## ✅ Testing & Verification

### Quick Verification

**In your browser, visit these URLs:**

1. http://localhost:3000 - Should load the frontend
2. http://localhost:8000/health - Should show `{"status": "healthy"}`
3. http://localhost:8000/api/docs - Should show Swagger UI

### Run Automated Tests

**Terminal 3 (Backend tests - new terminal):**

```bash
cd backend

# Activate venv (if not already active)
& venv\Scripts\Activate.ps1     # Windows
# or
source venv/bin/activate        # macOS/Linux

python test_api.py
```

**Expected output:**
```
✓ Health check passed
✓ Student API working
✓ Attendance API working
✓ Behavior API working
✓ All tests passed!
```

### Manual API Testing

**Using cURL in terminal:**

```bash
# Test health
curl http://localhost:8000/health

# Create a test student
curl -X POST http://localhost:8000/api/students \
  -H "Content-Type: application/json" \
  -d '{"student_id":"TEST001","first_name":"John","last_name":"Doe","email":"john@test.edu","class_level":"Grade 4"}'

# List all students
curl http://localhost:8000/api/students
```

---

## 🏗️ System Architecture

### How Everything Connects

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Next.js Frontend (React + TypeScript)        │   │
│  │  - Dashboard & Analytics                             │   │
│  │  - Student Management                                │   │
│  │  - Attendance Tracking UI                            │   │
│  │  - Behavior Reporting                                │   │
│  │  - Real-time Notifications                           │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ REST API (HTTP/HTTPS)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    APPLICATION LAYER                        │
│                                                              │
│  FastAPI Backend (Python 3.8+)                              │
│  ├─ API Routes (30+ Endpoints)                              │
│  ├─ Business Logic Services (5 services, 40+ methods)       │
│  ├─ Data Validation (Pydantic)                              │
│  ├─ Schedule-Based Validation                               │
│  └─ Risk Calculation Engine                                 │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ SQL
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    PostgreSQL Database                       │
│                                                              │
│  ├─ students (Student records)                              │
│  ├─ attendance_logs (Attendance tracking)                    │
│  ├─ student_attendance_schedules (Entry/exit times)         │
│  ├─ behavior_events (Behavior logs)                         │
│  ├─ risk_scores (Risk calculations)                         │
│  └─ school_years (Academic year config)                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Request Flow

```
1. User clicks button in web browser
2. React component calls API (lib/api.ts)
3. Request goes to http://localhost:3000/api/...
4. Next.js proxy (app/api/[...path]/route.ts) forwards to backend
5. FastAPI receives at http://localhost:8000/api/...
6. Router finds matching endpoint
7. Service layer executes business logic
8. SQLAlchemy ORM queries PostgreSQL
9. Result returned through same path
10. Frontend renders response
```

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend Framework** | Next.js | 14+ |
| **Frontend Language** | TypeScript | Latest |
| **Frontend UI** | React | 18+ |
| **Frontend Styling** | Tailwind CSS | Latest |
| **Backend Framework** | FastAPI | 0.104+ |
| **Backend Language** | Python | 3.8+ |
| **Server** | Uvicorn | Latest |
| **Database ORM** | SQLAlchemy | 2.0 |
| **Data Validation** | Pydantic | v2 |
| **Database** | PostgreSQL | 12+ |
| **API Style** | REST | HTTP/JSON |

---

## 📅 Attendance Schedule System

### What Is It?

SafeGate automatically validates student attendance based on their personalized entry and exit times. When a student is scanned, the system checks if they're on-time, late, or have other status issues.

### Key Benefits

✅ **Fair Attendance Tracking** - Each student has their own scheduled times  
✅ **Automatic Status Classification** - Present, Late, Invalid Timeout, or Absent  
✅ **School-Specific Schedules** - Different times for different grade levels  
✅ **Customizable Grace Periods** - Optional tolerance for late arrivals  
✅ **ML Integration** - Schedule data feeds into risk calculations  
✅ **Historical Tracking** - All attendance preserved with classifications  

### Default Schedules by Year Level

| Year Level | Entry | Exit | School Days | Grace Period |
|------------|-------|------|-------------|--------------|
| **Grade 1-6** | 8:00 AM | 5:00 PM | Mon-Fri | 0 min |
| **Kinder 1-2** | 8:30 AM | 3:30 PM | Mon-Fri | 0 min |
| **Pre-K** | 9:00 AM | 3:00 PM | Mon-Fri | 0 min |
| **Toddler & Nursery** | 7:00 AM | 4:00 PM | Mon-Fri | 0 min |

### Attendance Status Guide

When a student is scanned, they receive one of these statuses:

| Status | Badge | What It Means | Example | Action |
|--------|-------|--------------|---------|--------|
| **Present** | ✓ Green | On time! | Entry 8:00 AM, scanned 7:50 AM | No action needed |
| **Late** | ⏰ Yellow | Arrived late | Entry 8:00 AM, scanned 8:20 AM | May notify parent |
| **Invalid Timeout** | ⚠️ Red | Stayed after hours | Exit 5:00 PM, scanned 5:15 PM | Check with parent |
| **Absent** | ✗ Gray | No scan on school day | Expected on Mon, no scan | Follow-up needed |

### How It Works - Technical Flow

```
QR Code Scanned
        ↓
Student Identified
        ↓
System fetches student's schedule
  - Entry time: 8:00 AM
  - Exit time: 5:00 PM
  - School days: Mon-Fri
        ↓
Compare scan time to entry time
        ↓
Determine Status:
  - 7:30 AM scan: "Present" ✓ (before entry)
  - 8:15 AM scan: "Late" ⏰ (after entry)
        ↓
Check exit time if applicable
        ↓
If left after exit time: "Invalid Timeout" ⚠️
        ↓
Update attendance_logs with status
        ↓
Display status badge to staff
        ↓
Feed data to ML system for risk calculation
```

### Managing Schedules

#### Create a Schedule via API

```bash
curl -X POST http://localhost:8000/api/attendance-schedules/ \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

#### Update a Schedule via API

```bash
curl -X PUT http://localhost:8000/api/attendance-schedules/{schedule_id} \
  -H "Content-Type: application/json" \
  -d '{
    "entry_time": "08:30:00",
    "exit_time": "17:30:00",
    "grace_period_minutes": 5
  }'
```

#### Get Student's Schedule

```bash
curl "http://localhost:8000/api/attendance-schedules/student/LRN-2026-0001?school_year_id=1"
```

#### Get Attendance Summary

```bash
curl "http://localhost:8000/api/attendance-schedules/stats/LRN-2026-0001?start_date=2026-03-01&end_date=2026-03-31"

# Response:
# {
#   "total_days": 20,
#   "present": 18,
#   "late": 2,
#   "absent": 0,
#   "invalid_timeout": 1
# }
```

### Usage by Role

#### 👨‍💼 For School Administrators

**Setting Up Schedules:**

```sql
-- Add a new schedule for a student
INSERT INTO student_attendance_schedules 
(student_lrn, school_year_id, year_level, entry_time, exit_time, school_days, is_active)
VALUES ('LRN-2026-0001', 1, 'Grade 4', '08:00:00', '17:00:00', 
'{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": false, "sunday": false}', 
true);
```

**Modify a Student's Schedule:**

```sql
UPDATE student_attendance_schedules 
SET entry_time = '09:00:00', exit_time = '16:00:00'
WHERE student_lrn = 'LRN-2026-0001';
```

**Add Grace Period (e.g., 5 minutes):**

```sql
UPDATE student_attendance_schedules 
SET grace_period_minutes = 5
WHERE year_level = 'Grade 4';
```

#### 👨‍✈️ For Scanning Officers

**Understanding Results:**

When your screen shows scan results:

- **Green "✓ Present"** → Student arrived on time, no issues
- **Yellow "⏰ Late"** → Student arrived after entry time, may warrant follow-up
- **Red "⚠️ Invalid Timeout"** → Student left after exit time, check if expected
- **Refresh Speed**: Results appear in 1-2 seconds

**Best Practices:**

1. Ensure lighting is good for QR scanning
2. Hold scanner steady for clear scan
3. Wait for status badge before moving to next student
4. Note any unusual "Invalid Timeout" entries
5. Report persistent late arrivals to administration

#### 👨‍👩‍👧‍👦 For Parents

**How Status Affects Your Child:**

- **Present** ✓ → No concerns, regular attendance
- **Late** ⏰ → May affect attendance record, talk to school if frequent
- **Invalid Timeout** ⚠️ → Check with school if unexpected
- **Absent** ✗ → Missing from school, school should contact you

**View Your Child's Status:**

Log into SafeGate parent portal to see:
- Daily attendance status
- Weekly summary (total present, late, absent days)
- Monthly trends
- Notifications for chronic lateness

#### 📊 For Dashboard Users

**View Attendance Reports:**

1. Go to Dashboard
2. Select Student
3. Choose Date Range
4. See breakdown by status (Present, Late, Absent, Invalid Timeout)
5. Export or print report

**Interpret the Data:**

- High "Present" count = Good attendance
- Increasing "Late" count = Emerging pattern to address
- "Invalid Timeout" events = May indicate transportation issues

---

## 📂 Project Structure

```
safe-gate-pwa-design/
├── 📁 backend/                          # FastAPI Python backend
│   ├── main.py                          # Application entry point
│   ├── config.py                        # Configuration management
│   ├── database.py                      # Database setup
│   ├── schemas.py                       # Pydantic validation schemas
│   ├── models/
│   │   └── __init__.py                  # SQLAlchemy ORM models
│   ├── services/
│   │   └── __init__.py                  # Business logic services
│   ├── routers/
│   │   ├── health.py                    # Health check endpoints
│   │   ├── students.py                  # Student management
│   │   ├── attendance.py                # Attendance tracking
│   │   ├── attendance_schedules.py      # Schedule management
│   │   ├── behavior.py                  # Behavior events
│   │   └── risk.py                      # Risk assessment
│   ├── requirements.txt                 # Python dependencies
│   ├── test_api.py                      # Automated tests
│   ├── verify_setup.py                  # Setup verification
│   ├── run.bat                          # Windows startup
│   ├── run.sh                           # Unix startup
│   └── venv/                            # Python virtual environment
│
├── 📁 app/                              # Next.js React frontend
│   ├── layout.tsx                       # Root layout
│   ├── page.tsx                         # Home page
│   ├── api/
│   │   ├── route.ts                     # Health check proxy
│   │   └── [...path]/route.ts           # Main API proxy
│   ├── analytics/                       # Analytics pages
│   ├── attendance/                      # Attendance pages
│   ├── behavioral-events/               # Behavior pages
│   ├── scan/                            # QR scanner pages
│   ├── students/                        # Student management
│   └── settings/                        # Configuration pages
│
├── 📁 components/                       # React components
│   ├── navbar.tsx                       # Navigation bar
│   ├── sidebar.tsx                      # Sidebar menu
│   ├── dashboard-layout.tsx             # Dashboard layout
│   └── ui/                              # UI component library
│
├── 📁 lib/                              # Utility libraries
│   ├── api.ts                           # TypeScript API client
│   ├── auth-context.tsx                 # Authentication context
│   ├── supabase.ts                      # Supabase client
│   ├── attendance-schedule-validation.ts # Schedule validation
│   └── utils.ts                         # Utility functions
│
├── 📁 public/                           # Static assets
│   ├── logo.png
│   └── manifest.json
│
├── 📄 README.md                         # This file (comprehensive guide)
├── 📄 .env.example                      # Environment template
├── 📄 start-dev.bat                     # Windows startup script
├── 📄 start-dev.sh                      # Unix startup script
├── 📄 package.json                      # npm dependencies
├── 📄 tsconfig.json                     # TypeScript configuration
├── 📄 next.config.mjs                   # Next.js configuration
└── 📄 postcss.config.mjs                # PostCSS configuration
```

### Key Directories Explained

| Directory | Purpose | What's Inside |
|-----------|---------|---------------|
| `backend/` | Python FastAPI server | All business logic, database, API routes |
| `app/` | Next.js application root | All frontend pages and routing |
| `components/` | Reusable React components | UI components, layouts, forms |
| `lib/` | Shared utility code | API client, helpers, contexts |
| `public/` | Static assets | Images, logos, manifests |

---

## 🔌 API Endpoints

### Complete Endpoint List

#### Health & Status (3 endpoints)
```
GET    /health              - Application status
GET    /health/ready        - Readiness check
GET    /health/live         - Liveness check
```

#### Students (6 endpoints)
```
POST   /api/students                        - Create new student
GET    /api/students                        - List all students (paginated)
GET    /api/students/{id}                   - Get specific student
PUT    /api/students/{id}                   - Update student info
DELETE /api/students/{id}                   - Delete student
GET    /api/students/{id}/view/dashboard    - Get student dashboard
```

#### Attendance (6 endpoints)
```
POST   /api/attendance                          - Record attendance
GET    /api/attendance/{id}                     - Get attendance record
GET    /api/attendance/student/{id}             - List student attendance (paginated)
GET    /api/attendance/stats/student/{id}       - Get attendance statistics
PUT    /api/attendance/{id}                     - Update attendance
DELETE /api/attendance/{id}                     - Delete attendance
```

#### Attendance Schedules (9 endpoints)
```
POST   /api/attendance-schedules/                      - Create schedule
GET    /api/attendance-schedules/{schedule_id}         - Get schedule
GET    /api/attendance-schedules/student/{student_lrn} - Get student's schedule
PUT    /api/attendance-schedules/{schedule_id}         - Update schedule
DELETE /api/attendance-schedules/{schedule_id}         - Deactivate schedule
POST   /api/attendance-schedules/validate/{student_lrn} - Validate attendance
GET    /api/attendance-schedules/stats/{student_lrn}   - Get summary stats
GET    /api/attendance-schedules/by-status/{student_lrn} - Filter by status
POST   /api/attendance-schedules/check-school-day/{student_lrn} - Check school day
```

#### Behavior Events (6 endpoints)
```
POST   /api/behavior                        - Log behavior event
GET    /api/behavior/{id}                   - Get event
GET    /api/behavior/student/{id}           - List events (paginated)
GET    /api/behavior/stats/student/{id}     - Get behavior statistics
PUT    /api/behavior/{id}                   - Update event
DELETE /api/behavior/{id}                   - Delete event
```

#### Risk Assessment (2 endpoints)
```
GET    /api/risk/calculate/{student_id}    - Calculate/update risk score
GET    /api/risk/high-risk                  - Get high-risk students
```

**Total: 32+ Endpoints**

### Common API Examples

**Create a Student:**
```bash
curl -X POST http://localhost:8000/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "STU-001",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@school.edu",
    "class_level": "Grade 4"
  }'
```

**Record Attendance:**
```bash
curl -X POST http://localhost:8000/api/attendance \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "date": "2026-03-17T08:00:00",
    "status": "present",
    "time_in": "2026-03-17T07:55:00"
  }'
```

**Get Student Attendance Summary:**
```bash
curl "http://localhost:8000/api/attendance/stats/student/1?days_lookback=30"
```

**Calculate Risk Score:**
```bash
curl "http://localhost:8000/api/risk/calculate/1?days_lookback=30"
```

**Get Attendance by Status:**
```bash
curl "http://localhost:8000/api/attendance-schedules/stats/LRN-001?start_date=2026-03-01&end_date=2026-03-31"
```

---

## 💻 Frontend Integration

### Type-Safe API Client

The `lib/api.ts` file provides a fully typed TypeScript client for all API endpoints.

**Basic Usage:**

```typescript
import API from '@/lib/api';

// Create a student
const result = await API.Student.create({
  student_id: '12345',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@school.edu',
  class_level: '10A'
});

if (result.error) {
  console.error('Error:', result.error.detail);
} else {
  console.log('Student created:', result.data);
}
```

### API Domain Objects

```typescript
// Students
API.Student.create(data)
API.Student.getAll(skip, limit)
API.Student.getById(id)
API.Student.update(id, data)
API.Student.delete(id)
API.Student.getDashboard(id)

// Attendance
API.Attendance.create(data)
API.Attendance.getById(id)
API.Attendance.getStudentRecords(studentId, dateStart, dateEnd)
API.Attendance.getStatistics(studentId, daysLookback)
API.Attendance.update(id, data)
API.Attendance.delete(id)

// Attendance Schedules
API.AttendanceSchedule.create(data)
API.AttendanceSchedule.getSchedule(scheduleId)
API.AttendanceSchedule.getStudentSchedule(studentLrn)
API.AttendanceSchedule.validateAttendance(studentLrn, checkInTime)
API.AttendanceSchedule.getStats(studentLrn, startDate, endDate)
API.AttendanceSchedule.getByStatus(studentLrn, status, startDate, endDate)

// Behavior Events
API.Behavior.create(data)
API.Behavior.getById(id)
API.Behavior.getStudentEvents(studentId, dateStart, dateEnd)
API.Behavior.getStatistics(studentId, daysLookback)
API.Behavior.update(id, data)
API.Behavior.delete(id)

// Risk Assessment
API.Risk.calculate(studentId, daysLookback)
API.Risk.getHighRiskStudents(riskLevel)

// Health Checks
API.Health.checkHealth()
API.Health.checkReady()
API.Health.checkLive()
```

### Example React Component

```typescript
import { useEffect, useState } from 'react';
import API from '@/lib/api';

export function StudentDashboard({ studentId }: { studentId: number }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      const result = await API.Student.getDashboard(studentId);
      if (result.error) {
        setError(result.error.detail);
      } else {
        setData(result.data);
      }
      setLoading(false);
    }
    loadDashboard();
  }, [studentId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return null;

  return (
    <div>
      <h1>{data.student.first_name} {data.student.last_name}</h1>
      <p>Present Days: {data.attendance_stats.present}</p>
      <p>Late Days: {data.attendance_stats.late}</p>
      <p>Risk Level: {data.risk_score?.risk_level}</p>
      <p>Overall Score: {data.risk_score?.overall_score.toFixed(1)}/100</p>
    </div>
  );
}
```

---

## 📊 Database Schema

### Core Tables

#### `students` Table
Stores student information.

```sql
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  class_level VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `attendance_logs` Table
Records all attendance check-ins and check-outs.

```sql
CREATE TABLE attendance_logs (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id),
  check_in_time TIMESTAMP NOT NULL,
  check_out_time TIMESTAMP,
  attendance_status VARCHAR(30),  -- 'present', 'late', 'absent', 'invalid_timeout'
  is_late BOOLEAN DEFAULT false,
  is_invalid_timeout BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_student_date (student_id, check_in_time)
);
```

#### `student_attendance_schedules` Table
Defines entry/exit times for each student.

```sql
CREATE TABLE student_attendance_schedules (
  id SERIAL PRIMARY KEY,
  student_lrn VARCHAR(50) UNIQUE NOT NULL REFERENCES students(student_id),
  school_year_id BIGINT,
  year_level VARCHAR(50),                -- 'Grade 1', 'Kinder 1', etc.
  entry_time TIME NOT NULL,              -- e.g., '08:00:00'
  exit_time TIME NOT NULL,               -- e.g., '17:00:00'
  school_days JSONB,                     -- {"monday": true, "tuesday": true, ...}
  grace_period_minutes SMALLINT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `behavior_events` Table
Logs all behavior incidents.

```sql
CREATE TABLE behavior_events (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id),
  event_type VARCHAR(20) NOT NULL,      -- 'positive', 'negative', 'neutral'
  description TEXT NOT NULL,
  severity INTEGER DEFAULT 0,            -- 0-10 scale
  reported_by VARCHAR(100),
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_student_timestamp (student_id, timestamp)
);
```

#### `risk_scores` Table
Stores calculated risk assessments.

```sql
CREATE TABLE risk_scores (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL UNIQUE REFERENCES students(id),
  overall_score FLOAT DEFAULT 0.0,       -- 0-100
  behavioral_score FLOAT DEFAULT 0.0,    -- 0-100
  attendance_score FLOAT DEFAULT 0.0,    -- 0-100
  risk_level VARCHAR(20) NOT NULL,       -- 'low', 'medium', 'high', 'critical'
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Risk Scoring Algorithm

```
Behavioral Score (0-100):
  - Start with 100 points
  - For each negative behavior: subtract (severity × weight factor)
  - For each positive behavior: add (2 × weight factor)
  - Result: max(0, 100 - (total_deductions))

Attendance Score (0-100):
  - attendance_score = (present_days / total_days) × 100
  - Late arrivals subtract 2 points per incident
  - Absences subtract 10 points per incident

Overall Score (0-100):
  - weighted_average = (behavioral_score × 0.60) + (attendance_score × 0.40)

Risk Level Mapping:
  - 80-100: LOW (green - no concerns)
  - 60-79: MEDIUM (yellow - monitor)
  - 40-59: HIGH (orange - intervention recommended)
  - 0-39: CRITICAL (red - immediate action required)
```

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### Issue: "Permission denied" when activating venv

**Windows (PowerShell):**
```powershell
# Error: "PowerShell cannot execute scripts on this system"
# Solution: Open PowerShell as Administrator and run:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# Then try activating venv again
& venv\Scripts\Activate.ps1
```

#### Issue: Virtual environment not activating

**Signs:**
- Prompt doesn't show `(venv)` prefix
- `pip` and `python` commands fail

**Solution:**
```bash
# Make sure you're in the backend directory
cd backend

# For Windows:
& .\venv\Scripts\Activate.ps1

# For macOS/Linux:
source venv/bin/activate

# Verify it worked - should show (venv) prefix
```

#### Issue: "Port 8000 already in use"

**Windows (PowerShell):**
```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F

# Then restart backend
```

**macOS/Linux:**
```bash
# Find process using port 8000
lsof -i :8000

# Kill it (replace PID with actual number)
kill -9 <PID>

# Or use the simpler command
killall python

# Then restart backend
```

#### Issue: "Port 3000 already in use"

**Windows (PowerShell):**
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**macOS/Linux:**
```bash
lsof -i :3000
kill -9 <PID>
```

#### Issue: `.env` file not being read

**Solution:**
```bash
# Restart your backend terminal completely
# Close the terminal where you ran python main.py

# Open a new terminal and:
cd backend
& venv\Scripts\Activate.ps1  # or source venv/bin/activate
python main.py

# Backend should now read the .env file
```

#### Issue: Module import errors in backend

**Typical error:**
```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution:**
```bash
# Make sure venv is activated (look for (venv) prefix)
cd backend
& venv\Scripts\Activate.ps1  # or source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Try running again
python main.py
```

#### Issue: CORS errors in frontend

**Error in browser console:**
```
Access to XMLHttpRequest at 'http://localhost:8000/...' has been blocked by CORS policy
```

**Solution:**
1. Check backend is running: `curl http://localhost:8000/health`
2. Verify `FRONTEND_URL` in `backend/.env` is exactly: `http://localhost:3000`
3. (No trailing slash, include protocol)
4. Restart backend
5. Refresh browser (Ctrl+Shift+R for hard refresh)

#### Issue: API endpoint returns 404

**Solution:**
1. Verify endpoint exists in [API Endpoints](#-api-endpoints) section
2. Check URL format (case-sensitive)
3. Use Swagger UI to test: http://localhost:8000/api/docs
4. Check request method (GET vs POST vs PUT)

#### Issue: Database connection fails

**Error:**
```
sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) could not connect to server
```

**Solution:**
1. Verify Supabase credentials in `backend/.env`:
   - `SUPABASE_URL` - Should be from Project URL (not your domain)
   - `SUPABASE_SERVICE_ROLE_KEY` - Get from Project Settings → API Keys
2. Test credentials in Supabase web interface
3. Ensure no typos
4. Restart backend after updating `.env`

### Getting Help

**Check logs:**
1. **Backend errors** - Look at the terminal where `python main.py` runs
2. **Frontend errors** - Open browser DevTools (F12) → Console tab
3. **Network errors** - DevTools → Network tab → Try the request again

**Test with Postman/Insomnia:**
1. Download [Postman](https://postman.com)
2. Create new GET request to `http://localhost:8000/health`
3. Click Send - should get `{"status": "healthy"}`

**Run diagnostic:**
```bash
cd backend
& venv\Scripts\Activate.ps1  # or source venv/bin/activate
python verify_setup.py
```

---

## 🚀 Deployment Guide

### Prepare for Production

#### 1. Update `.env` Settings

**Before deploying, change:**

```ini
# In backend/.env

# Change to production
ENVIRONMENT=production

# Disable debug mode
DEBUG=False

# Update URLs to your domain
FRONTEND_URL=https://yourdomain.com
API_HOST=0.0.0.0
API_PORT=8080  # Or your hosting provider's port

# Generate strong secret keys
API_KEY_SECRET=your-very-secure-random-key-here
```

#### 2. Test Production Build Locally

```bash
# Build frontend
npm run build

# Test backend can start
cd backend
python main.py
```

### Deployment Options

#### Option 1: Vercel + Railway (Recommended)

**Frontend to Vercel:**
1. Push code to GitHub
2. Go to vercel.com and connect repository
3. Set `NEXT_PUBLIC_BACKEND_URL` environment variable
4. Deploy

**Backend to Railway:**
1. Go to railway.app
2. Create new project from GitHub
3. Add environment variables from `.env`
4. Deploy
5. Get public URL and update Frontend URL

#### Option 2: Docker

**Create backend Dockerfile:**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
CMD ["python", "main.py"]
```

**Deploy to any Docker-compatible host:**
```bash
docker build -t safegate-backend .
docker run -p 8000:8000 -e SUPABASE_URL=... safegate-backend
```

#### Option 3: Traditional Hosting

**Linux VPS Setup:**

```bash
# SSH into your server
ssh user@server.com

# Install dependencies
sudo apt-get update
sudo apt-get install python3 python3-pip nodejs npm

# Clone repository
git clone <repo-url>
cd safe-gate-pwa-design

# Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup frontend
cd ..
npm install
npm run build

# Use process manager (PM2)
npm install -g pm2
pm2 start "npm run start" --name "safegate-frontend"
pm2 start "cd backend && source venv/bin/activate && python main.py" --name "safegate-backend"
pm2 save
```

### Deployment Checklist

Before deploying:

- [ ] Change `ENVIRONMENT=production`
- [ ] Set `DEBUG=False`
- [ ] Update `FRONTEND_URL` and `API_HOST`
- [ ] Generate strong `API_KEY_SECRET`
- [ ] Test locally with production settings
- [ ] Configure database backups
- [ ] Setup monitoring/logging
- [ ] Configure HTTPS/SSL
- [ ] Set CORS origins correctly
- [ ] Run full test suite
- [ ] Get database credentials for production

---

## 📈 Performance Monitoring

### Key Metrics to Monitor

**Backend:**
- API response times (target: <200ms)
- Error rate (target: <0.1%)
- Database connection pool
- Memory usage

**Frontend:**
- Page load time (target: <3s)
- Time to interactive (target: <5s)
- Error rate (target: 0%)
- API call latency

### Logging Standards

**Backend logs should include:**
```python
import logging

logger = logging.getLogger(__name__)

logger.info(f"Student created: student_id={student_id}")
logger.warning(f"Slow query: {query_time}ms")
logger.error(f"Database error: {error}")
```

**Frontend logs should include:**
```typescript
console.log('API Call:', method, url);
console.error('API Error:', status, error);
console.time('operation');
// ... operation ...
console.timeEnd('operation');
```

---

## 🔒 Security Best Practices

### Authentication & Authorization
- ✅ Use JWT tokens for session management
- ✅ Implement role-based access control (RBAC)
- ✅ Hash passwords (use bcrypt)
- ✅ Set session timeout (30 min default)

### Data Protection
- ✅ Use HTTPS in production (never HTTP)
- ✅ Encrypt sensitive fields in database
- ✅ Never log passwords or tokens
- ✅ Use environment variables for secrets

### API Security
- ✅ Implement rate limiting
- ✅ Validate all inputs server-side
- ✅ Use SQL parameter binding (ORM does this)
- ✅ CORS whitelist only allowed origins

### Operational Security
- ✅ Regular security updates
- ✅ Monitor for suspicious activity
- ✅ Backup database regularly
- ✅ Rotate API keys periodically

---

## 🎓 Development Workflow

### Adding a New Feature

#### 1. Create Data Model

**In `backend/models/__init__.py`:**

```python
from sqlalchemy import Column, String, Integer
from database import Base

class NewFeature(Base):
    __tablename__ = "new_features"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), unique=True)
    value = Column(String(255))
```

#### 2. Create Validation Schema

**In `backend/schemas.py`:**

```python
from pydantic import BaseModel

class NewFeatureCreate(BaseModel):
    name: str
    value: str

class NewFeatureResponse(NewFeatureCreate):
    id: int
```

#### 3. Create Service

**In `backend/services/__init__.py`:**

```python
class NewFeatureService:
    @staticmethod
    def create(db, data: NewFeatureCreate):
        new_item = NewFeature(**data.dict())
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        return new_item
```

#### 4. Create Router

**In `backend/routers/new_feature.py`:**

```python
from fastapi import APIRouter
from schemas import NewFeatureCreate, NewFeatureResponse

router = APIRouter(prefix="/api/new-features", tags=["new-features"])

@router.post("/", response_model=NewFeatureResponse)
def create(item: NewFeatureCreate, db):
    return NewFeatureService.create(db, item)
```

#### 5. Register Router

**In `backend/main.py`:**

```python
from routers import new_feature
app.include_router(new_feature.router)
```

#### 6. Update Frontend Client

**In `lib/api.ts`:**

```typescript
export const NewFeature = {
  create: async (data) => {
    return fetch(`${API_URL}/new-features`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    }).then(r => r.json())
  }
}
```

#### 7. Create Frontend Component

**In `components/new-feature.tsx`:**

```typescript
import { useState } from 'react';
import API from '@/lib/api';

export function NewFeatureComponent() {
  const [data, setData] = useState(null);
  
  async function handleCreate() {
    const result = await API.NewFeature.create({ name: 'test' });
    setData(result);
  }
  
  return <button onClick={handleCreate}>Create</button>;
}
```

#### 8. Test

```bash
# Test API via Swagger
# http://localhost:8000/api/docs

# Test in frontend
# Visit http://localhost:3000 and use component
```

---

## 📚 Additional Resources

### Official Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev)
- [SQLAlchemy Docs](https://docs.sqlalchemy.org/)
- [Pydantic Docs](https://docs.pydantic.dev/)
- [Supabase Docs](https://supabase.com/docs)

### Live Resources (When Running)
- **Interactive API Testing**: http://localhost:8000/api/docs (Swagger UI)
- **Alternative API Docs**: http://localhost:8000/api/redoc
- **Health Status**: http://localhost:8000/health
- **Application**: http://localhost:3000

### Within This Project
- **Backend README**: `backend/README.md` (if exists)
- **Component Examples**: `components/api-integration-examples.tsx`
- **API Client**: `lib/api.ts` (280+ lines with full documentation)
- **Database Migrations**: `supabase-schema.sql`

---

## 💡 Tips & Tricks

### Development
- **Hot reload enabled** - Changes reflect automatically
- **Use Swagger UI** - Test all endpoints without frontend
- **DevTools F12** - Debug frontend issues
- **Terminal output** - Check backend logs for errors
- **Clear cache** - Ctrl+Shift+R (browser) to force refresh

### Database
- **Use Supabase UI** - Inspect data directly
- **Export/import via CSV** - Quick data migration
- **Monitor connections** - Watch connection pool
- **Backup regularly** - Automated daily backups

### Performance
- **Check response times** - DevTools Network tab
- **Monitor database queries** - Look at SQLAlchemy debug logs
- **Profile code** - Use Python profiler for slow functions
- **Frontend metrics** - Use Lighthouse audit

---

## 🎉 Getting Started Checklist

- [ ] Node.js 16+ installed and verified
- [ ] Python 3.8+ installed and verified
- [ ] Supabase account created
- [ ] .env and .env.local configured
- [ ] Backend venv created and activated
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] Backend running (python main.py)
- [ ] Frontend running (npm run dev)
- [ ] Health endpoint responds
- [ ] Swagger UI accessible
- [ ] Frontend loads at localhost:3000
- [ ] Tests pass (python test_api.py)

---

## 📞 Support

### Quick Help

| Issue | Solution |
|-------|----------|
| Port in use | See [Troubleshooting](#-troubleshooting) section |
| Database fails | Check Supabase credentials in .env |
| Module not found | Activate venv: `source venv/bin/activate` |
| API 404 | Verify URL in Swagger UI |
| CORS error | Check FRONTEND_URL in backend .env |
| Types not working | Restart TS server: Cmd+Shift+P → Reload |

### Debug Steps

1. **Check logs** - Look at terminal output
2. **Verify services** - Browse to health endpoint
3. **Use Swagger** - Test API directly
4. **Hard refresh** - Ctrl+Shift+R (browser)
5. **Restart services** - Kill and restart both
6. **Check .env** - Ensure no typos
7. **Review error** - Read full error message

---

## 📝 Document Information

**Document Version:** 2.0 (Consolidated)  
**Last Updated:** April 2026  
**Status:** ✅ Production Ready  
**Merged From:** README.md, IMPLEMENTATION_SUMMARY.md, QUICK_REFERENCE_GUIDE.md, ATTENDANCE_SCHEDULE_DOCUMENTATION.md

---

## 🚀 Ready to Start!

Open your terminal and run:

```bash
# Windows
.\start-dev.bat

# macOS/Linux
./start-dev.sh
```

Then visit:
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/api/docs

**Happy coding!** 🎉
