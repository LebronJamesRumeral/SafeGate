/**
 * Example Components Demonstrating Backend API Integration
 * 
 * These components show practical examples of how to use the API client
 * to communicate with the FastAPI backend from the Next.js frontend.
 */

"use client";

import { useEffect, useState } from "react";
import API, {
  Student,
  StudentDashboard,
  RiskScore,
  AttendanceStats,
  BehaviorStats,
} from "@/lib/api";

/**
 * Example 1: Student List Component
 * Demonstrates: Fetching and displaying a list of students
 */
export function StudentListExample() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudents() {
      const result = await API.Student.getAll(0, 50);
      if (result.error) {
        setError(result.error.detail);
      } else {
        setStudents(result.data || []);
      }
      setLoading(false);
    }

    loadStudents();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Students</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Class Level</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id}>
              <td>{student.id}</td>
              <td>
                {student.first_name} {student.last_name}
              </td>
              <td>{student.email}</td>
              <td>{student.class_level}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Example 2: Create Student Form Component
 * Demonstrates: Creating a new student via POST request
 */
export function CreateStudentFormExample() {
  const [formData, setFormData] = useState({
    student_id: "",
    first_name: "",
    last_name: "",
    email: "",
    class_level: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await API.Student.create(formData);

    if (result.error) {
      setMessage({
        type: "error",
        text: `Failed to create student: ${result.error.detail}`,
      });
    } else {
      setMessage({
        type: "success",
        text: `Student ${result.data?.first_name} created successfully!`,
      });
      setFormData({
        student_id: "",
        first_name: "",
        last_name: "",
        email: "",
        class_level: "",
      });
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Create Student</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="student_id"
          placeholder="Student ID"
          value={formData.student_id}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="first_name"
          placeholder="First Name"
          value={formData.first_name}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="last_name"
          placeholder="Last Name"
          value={formData.last_name}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="class_level"
          placeholder="Class Level"
          value={formData.class_level}
          onChange={handleChange}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Student"}
        </button>
      </form>
      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

/**
 * Example 3: Student Dashboard Component
 * Demonstrates: Fetching and displaying comprehensive student data
 */
export function StudentDashboardExample({ studentId }: { studentId: number }) {
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      const result = await API.Dashboard.getStudentDashboard(studentId, 30);
      if (result.error) {
        setError(result.error.detail);
      } else {
        setDashboard(result.data || null);
      }
      setLoading(false);
    }

    loadDashboard();
  }, [studentId]);

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!dashboard) return <div>No data found</div>;

  const { student, attendance_stats, behavior_stats, risk_score } = dashboard;

  return (
    <div className="dashboard">
      <h2>
        {student.first_name} {student.last_name}
      </h2>

      {/* Student Info */}
      <section className="student-info">
        <h3>Student Information</h3>
        <p>Student ID: {student.student_id}</p>
        <p>Email: {student.email}</p>
        <p>Class Level: {student.class_level}</p>
        <p>Status: {student.is_active ? "Active" : "Inactive"}</p>
      </section>

      {/* Attendance Stats */}
      <section className="attendance-stats">
        <h3>Attendance Statistics</h3>
        <p>Total Days: {attendance_stats.total_days}</p>
        <p>Present: {attendance_stats.present_days}</p>
        <p>Absent: {attendance_stats.absent_days}</p>
        <p>Late: {attendance_stats.late_days}</p>
        <p className="attendance-rate">
          Attendance Rate: {attendance_stats.attendance_rate}%
        </p>
      </section>

      {/* Behavior Stats */}
      <section className="behavior-stats">
        <h3>Behavior Statistics</h3>
        <p>Positive Events: {behavior_stats.positive_events}</p>
        <p>Negative Events: {behavior_stats.negative_events}</p>
        <p>Total Events: {behavior_stats.total_events}</p>
        <p>Average Severity: {behavior_stats.average_severity}/10</p>
      </section>

      {/* Risk Score */}
      {risk_score && (
        <section className={`risk-score risk-${risk_score.risk_level}`}>
          <h3>Risk Assessment</h3>
          <p className="overall-score">
            Overall Score: {risk_score.overall_score}/100
          </p>
          <p>Behavioral Score: {risk_score.behavioral_score}/100</p>
          <p>Attendance Score: {risk_score.attendance_score}/100</p>
          <p>Parent Reports (Minor Risk): {risk_score.parent_report_count ?? 0}</p>
          <p className="risk-level">Risk Level: {risk_score.risk_level.toUpperCase()}</p>
        </section>
      )}
    </div>
  );
}

/**
 * Example 4: Attendance Recorder Component
 * Demonstrates: Recording attendance for a student
 */
export function AttendanceRecorderExample({ studentId }: { studentId: number }) {
  const [status, setStatus] = useState("present");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleRecordAttendance = async () => {
    setLoading(true);
    setMessage(null);

    const now = new Date();
    const result = await API.Attendance.create({
      student_id: studentId,
      date: now.toISOString(),
      status,
      time_in: now.toISOString(),
    });

    if (result.error) {
      setMessage({
        type: "error",
        text: `Failed to record attendance: ${result.error.detail}`,
      });
    } else {
      setMessage({
        type: "success",
        text: `Attendance recorded as ${status}`,
      });
    }
    setLoading(false);
  };

  return (
    <div>
      <h3>Record Attendance</h3>
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="present">Present</option>
        <option value="absent">Absent</option>
        <option value="late">Late</option>
        <option value="excused">Excused</option>
      </select>
      <button onClick={handleRecordAttendance} disabled={loading}>
        {loading ? "Recording..." : "Record Attendance"}
      </button>
      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

/**
 * Example 5: Behavior Event Logger Component
 * Demonstrates: Logging behavior events for a student
 */
export function BehaviorLoggerExample({ studentId }: { studentId: number }) {
  const [formData, setFormData] = useState({
    event_type: "negative" as const,
    description: "",
    severity: 5,
    reported_by: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "severity" ? parseInt(value) : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await API.Behavior.create({
      student_id: studentId,
      ...formData,
    });

    if (result.error) {
      setMessage({
        type: "error",
        text: `Failed to log event: ${result.error.detail}`,
      });
    } else {
      setMessage({
        type: "success",
        text: "Behavior event logged successfully",
      });
      setFormData({
        event_type: "negative",
        description: "",
        severity: 5,
        reported_by: "",
      });
    }
    setLoading(false);
  };

  return (
    <div>
      <h3>Log Behavior Event</h3>
      <form onSubmit={handleSubmit}>
        <select name="event_type" value={formData.event_type} onChange={handleChange}>
          <option value="positive">Positive</option>
          <option value="negative">Negative</option>
          <option value="neutral">Neutral</option>
        </select>

        <textarea
          name="description"
          placeholder="Event description"
          value={formData.description}
          onChange={handleChange}
          required
        />

        <input
          type="number"
          name="severity"
          min="0"
          max="10"
          value={formData.severity}
          onChange={handleChange}
        />

        <input
          type="text"
          name="reported_by"
          placeholder="Reported by"
          value={formData.reported_by}
          onChange={handleChange}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Logging..." : "Log Event"}
        </button>
      </form>
      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

/**
 * Example 6: High-Risk Students Component
 * Demonstrates: Fetching and displaying high-risk students
 */
export function HighRiskStudentsExample() {
  const [students, setStudents] = useState<RiskScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHighRiskStudents() {
      const result = await API.Risk.getHighRiskStudents("high");
      if (result.error) {
        setError(result.error.detail);
      } else {
        setStudents(result.data || []);
      }
      setLoading(false);
    }

    loadHighRiskStudents();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>High-Risk Students ({students.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Student ID</th>
            <th>Overall Score</th>
            <th>Behavioral</th>
            <th>Attendance</th>
            <th>Risk Level</th>
          </tr>
        </thead>
        <tbody>
          {students.map((score) => (
            <tr key={score.id} className={`risk-${score.risk_level}`}>
              <td>{score.student_id}</td>
              <td>{score.overall_score}/100</td>
              <td>{score.behavioral_score}/100</td>
              <td>{score.attendance_score}/100</td>
              <td className="risk-badge">{score.risk_level.toUpperCase()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// NOTE: The following components are for API integration examples and demo purposes only.
// They are not used in production code. Remove or refactor if not needed for documentation.
