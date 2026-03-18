import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

type TriggerSource = 'behavior_event_logged' | 'manual_recheck' | 'guidance_approved';

interface ParentAutomationRequest {
  eventId: number;
  studentLrn: string;
  triggerSource?: TriggerSource;
}

interface MLNotificationDecision {
  shouldNotifyParent: boolean;
  reason: string;
  factors: string[];
}

function evaluateMLNotificationDecision(input: {
  currentSeverity: string;
  currentAttendanceRate: number;
  currentRiskLevel: string;
  predictionConfidence: number;
  recentMajorOrCriticalEvents: number;
  parentContactAvailable: boolean;
}): MLNotificationDecision {
  const factors: string[] = [];

  if (!input.parentContactAvailable) {
    return {
      shouldNotifyParent: false,
      reason: 'No parent contact found',
      factors: ['missing_parent_contact'],
    };
  }

  if (input.currentRiskLevel === 'critical' || input.currentRiskLevel === 'high') {
    factors.push(`risk_level_${input.currentRiskLevel}`);
  }

  if (input.currentSeverity === 'critical' || input.currentSeverity === 'major') {
    factors.push(`event_severity_${input.currentSeverity}`);
  }

  if (input.currentAttendanceRate > 0 && input.currentAttendanceRate < 85) {
    factors.push('attendance_below_85');
  }

  if (input.predictionConfidence >= 70) {
    factors.push('high_absence_prediction_confidence');
  }

  if (input.recentMajorOrCriticalEvents >= 2) {
    factors.push('repeated_high_severity_behavior');
  }

  const shouldNotifyParent =
    factors.includes('risk_level_critical') ||
    factors.includes('risk_level_high') ||
    (factors.includes('event_severity_critical') &&
      (factors.includes('attendance_below_85') || factors.includes('repeated_high_severity_behavior'))) ||
    (factors.includes('event_severity_major') &&
      factors.includes('repeated_high_severity_behavior') &&
      factors.includes('high_absence_prediction_confidence'));

  return {
    shouldNotifyParent,
    reason: shouldNotifyParent
      ? 'ML thresholds reached for parent intervention'
      : 'ML thresholds not reached for parent email',
    factors,
  };
}

function toIsoDateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function toSafeNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return fallback;
}

const FACTOR_LABELS: Record<string, string> = {
  risk_level_critical: 'Student is currently at a critical risk level and requires immediate attention.',
  risk_level_high: 'Student is at a high risk level and prompt action is recommended.',
  event_severity_critical: 'The reported incident has been classified as a critical behavioral concern.',
  event_severity_major: 'The reported incident has been classified as a major behavioral concern.',
  attendance_below_85: "Student's attendance has fallen below the required 85% threshold.",
  high_absence_prediction_confidence: 'Based on recent patterns, the system has detected a high likelihood of future absences.',
  repeated_high_severity_behavior: 'Multiple high-severity behavioral incidents have been recorded within the past 30 days.',
};

const SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#dc2626' },
  major:    { label: 'Major',    color: '#ea580c' },
  minor:    { label: 'Minor',    color: '#ca8a04' },
  low:      { label: 'Low',      color: '#16a34a' },
};

const RISK_LABELS: Record<string, { label: string; color: string; description: string }> = {
  critical: { label: 'Critical', color: '#dc2626', description: 'Immediate school intervention is underway.' },
  high:     { label: 'High',     color: '#ea580c', description: 'Prompt follow-up from school staff is recommended.' },
  medium:   { label: 'Medium',   color: '#ca8a04', description: 'Situation is being monitored closely.' },
  low:      { label: 'Low',      color: '#16a34a', description: 'No immediate concern at this time.' },
  unknown:  { label: 'Under Review', color: '#64748b', description: 'Assessment is currently in progress.' },
};

function formatDisplayDate(raw: string | null | undefined): string {
  if (!raw) return 'N/A';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDisplayTime(raw: string | null | undefined): string {
  if (!raw) return 'N/A';
  // Handle "HH:MM:SS" or "HH.MM.SS" formats
  const normalised = raw.replace(/\./g, ':');
  const [h, m] = normalised.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return raw;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function buildParentEmailContent(reportPayload: any) {
  const schoolName = process.env.SCHOOL_NAME || 'SafeGate';
  const studentName = reportPayload.student?.name || reportPayload.student?.lrn || 'Student';
  const parentName = reportPayload.parent?.name || 'Parent/Guardian';
  const eventType = reportPayload.event?.type || 'Behavioral Event';
  const severity = (reportPayload.event?.severity || 'unknown').toLowerCase();
  const attendanceRate = toSafeNumber(reportPayload.attendanceSummary?.attendanceRate);
  const riskLevel = (reportPayload.mlSummary?.riskLevel || 'unknown').toLowerCase();
  const eventDate = formatDisplayDate(reportPayload.event?.eventDate);
  const eventTime = formatDisplayTime(reportPayload.event?.eventTime);
  const eventLocation = reportPayload.event?.location || 'N/A';
  const eventDescription = reportPayload.event?.description || 'No additional description provided.';
  const followUpRequired = reportPayload.event?.followUpRequired ? 'Yes' : 'No';
  const actionTaken = reportPayload.event?.actionTaken || 'Under review';

  const rawFactors: string[] = Array.isArray(reportPayload.decision?.factors)
    ? reportPayload.decision.factors
    : [];
  const factorDescriptions = rawFactors
    .map((f) => FACTOR_LABELS[f] ?? f)
    .filter(Boolean);

  const severityInfo = SEVERITY_LABELS[severity] ?? { label: severity.charAt(0).toUpperCase() + severity.slice(1), color: '#64748b' };
  const riskInfo = RISK_LABELS[riskLevel] ?? RISK_LABELS.unknown;

  const subject = `[${schoolName}] Important Notice: Behavioral Incident Report for ${studentName}`;

  // ── Plain-text fallback ──────────────────────────────────────────────────
  const text = [
    `Dear ${parentName},`,
    '',
    `We are writing to inform you of a behavioral incident involving your child, ${studentName},`,
    `that was recorded in our system on ${eventDate}.`,
    '',
    'INCIDENT DETAILS',
    '─────────────────────────────────────',
    `  Incident Type : ${eventType}`,
    `  Severity      : ${severityInfo.label}`,
    `  Date          : ${eventDate}`,
    `  Time          : ${eventTime}`,
    `  Location      : ${eventLocation}`,
    `  Description   : ${eventDescription}`,
    `  Action Taken  : ${actionTaken}`,
    `  Follow-Up     : ${followUpRequired}`,
    '',
    'STUDENT ACADEMIC STANDING (Last 30 Days)',
    '─────────────────────────────────────',
    `  Attendance Rate  : ${attendanceRate}%`,
    `  Risk Assessment  : ${riskInfo.label} — ${riskInfo.description}`,
    '',
    'REASONS FOR THIS NOTIFICATION',
    '─────────────────────────────────────',
    ...factorDescriptions.map((d) => `  • ${d}`),
    '',
    'We kindly ask that you reach out to the school guidance office or your child\'s',
    'adviser to discuss appropriate next steps. Your involvement is important in',
    'helping your child succeed.',
    '',
    'Should you have questions or concerns, please do not hesitate to contact us.',
    '',
    `Respectfully,`,
    `The ${schoolName} Administration`,
    '',
    '─────────────────────────────────────',
    'This is an automated notification generated by the SafeGate Student Monitoring System.',
    'Please do not reply directly to this email.',
  ].join('\n');

  // ── HTML email ───────────────────────────────────────────────────────────
  const factorListHtml = factorDescriptions.length > 0
    ? factorDescriptions.map((d) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;">
            <span style="display:inline-block;width:8px;height:8px;background:${riskInfo.color};border-radius:50%;margin-right:10px;vertical-align:middle;"></span>
            <span style="color:#374151;font-size:14px;">${d}</span>
          </td>
        </tr>`).join('')
    : `<tr><td style="padding:10px 12px;color:#6b7280;font-size:14px;">No specific factors were identified.</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;">

          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%);border-radius:12px 12px 0 0;padding:32px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;color:#93c5fd;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">${schoolName} Student Monitoring System</p>
                    <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Behavioral Incident Notice</h1>
                  </td>
                  <td align="right" valign="top">
                    <span style="display:inline-block;background:${severityInfo.color};color:#fff;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;text-transform:uppercase;">${severityInfo.label} Severity</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- White Card Body -->
          <tr>
            <td style="background:#ffffff;padding:36px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">

              <!-- Greeting -->
              <p style="margin:0 0 8px;font-size:15px;color:#374151;">Dear <strong>${parentName}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
                We are writing to inform you of a behavioral incident involving your child,
                <strong>${studentName}</strong>, that was recorded in our monitoring system on
                <strong>${eventDate}</strong>. We believe it is important to keep you informed
                so that we can work together to support your child's well-being and academic progress.
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;" />

              <!-- Section: Incident Details -->
              <h2 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:0.8px;">Incident Details</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:28px;">
                <tr style="background:#f8fafc;">
                  <td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;width:38%;"><span style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Incident Type</span></td>
                  <td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;"><span style="font-size:14px;color:#1e293b;font-weight:600;">${eventType}</span></td>
                </tr>
                <tr>
                  <td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;background:#f8fafc;"><span style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Severity</span></td>
                  <td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;"><span style="display:inline-block;background:${severityInfo.color}1a;color:${severityInfo.color};font-size:13px;font-weight:700;padding:2px 10px;border-radius:12px;">${severityInfo.label}</span></td>
                </tr>
                <tr style="background:#f8fafc;">
                  <td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;"><span style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Date</span></td>
                  <td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;"><span style="font-size:14px;color:#1e293b;">${eventDate}</span></td>
                </tr>
                <tr>
                  <td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;background:#f8fafc;"><span style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Time</span></td>
                  <td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;"><span style="font-size:14px;color:#1e293b;">${eventTime}</span></td>
                </tr>
                <tr style="background:#f8fafc;">
                  <td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;"><span style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Location</span></td>
                  <td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;"><span style="font-size:14px;color:#1e293b;">${eventLocation}</span></td>
                </tr>
                <tr>
                  <td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;background:#f8fafc;"><span style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Description</span></td>
                  <td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;"><span style="font-size:14px;color:#1e293b;">${eventDescription}</span></td>
                </tr>
                <tr style="background:#f8fafc;">
                  <td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;"><span style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Action Taken</span></td>
                  <td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;"><span style="font-size:14px;color:#1e293b;">${actionTaken}</span></td>
                </tr>
                <tr>
                  <td style="padding:11px 16px;background:#f8fafc;"><span style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Follow-Up Required</span></td>
                  <td style="padding:11px 16px;"><span style="font-size:14px;color:#1e293b;">${followUpRequired}</span></td>
                </tr>
              </table>

              <!-- Section: Academic Standing -->
              <h2 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:0.8px;">Student Academic Standing <span style="font-size:12px;color:#94a3b8;font-weight:400;text-transform:none;">(Last 30 Days)</span></h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td width="48%" style="vertical-align:top;padding-right:8px;">
                    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px 20px;">
                      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;">Attendance Rate</p>
                      <p style="margin:0;font-size:28px;font-weight:700;color:#0c4a6e;">${attendanceRate}%</p>
                      <p style="margin:4px 0 0;font-size:12px;color:#0369a1;">${attendanceRate >= 85 ? 'Within acceptable range' : 'Below the 85% required threshold'}</p>
                    </div>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="vertical-align:top;padding-left:8px;">
                    <div style="background:${riskInfo.color}0d;border:1px solid ${riskInfo.color}33;border-radius:8px;padding:16px 20px;">
                      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:${riskInfo.color};text-transform:uppercase;letter-spacing:0.5px;">Risk Assessment</p>
                      <p style="margin:0;font-size:22px;font-weight:700;color:${riskInfo.color};">${riskInfo.label}</p>
                      <p style="margin:4px 0 0;font-size:12px;color:${riskInfo.color}cc;">${riskInfo.description}</p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Section: Reasons for Notification -->
              <h2 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:0.8px;">Reasons for This Notification</h2>
              <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">
                Our student monitoring system flagged the following concerns that prompted this notification:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;margin-bottom:28px;">
                ${factorListHtml}
              </table>

              <!-- Section: What To Do -->
              <div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:28px;">
                <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#15803d;">Recommended Next Steps</p>
                <ul style="margin:0;padding-left:20px;font-size:14px;color:#166534;line-height:1.8;">
                  <li>Contact your child's class adviser or guidance counselor at the earliest convenience.</li>
                  <li>Discuss this incident with your child and encourage open communication.</li>
                  <li>Visit the school if a face-to-face consultation is necessary.</li>
                </ul>
              </div>

              <!-- Closing -->
              <p style="margin:0 0 6px;font-size:14px;color:#374151;line-height:1.7;">
                We appreciate your partnership in supporting your child's growth and development.
                Should you have any questions or require further clarification, please do not hesitate
                to reach out to the school administration.
              </p>
              <p style="margin:24px 0 0;font-size:14px;color:#374151;">Respectfully,</p>
              <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#1e293b;">The ${schoolName} Administration</p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1e293b;border-radius:0 0 12px 12px;padding:20px 36px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                This is an automated notification from the <strong style="color:#cbd5e1;">${schoolName}</strong> Student Monitoring System.<br />
                Please do not reply directly to this email. Contact the school office for inquiries.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

  return { subject, text, html };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ParentAutomationRequest>;
    const eventId = Number(body.eventId);
    const studentLrn = body.studentLrn?.trim();
    const triggerSource: TriggerSource = body.triggerSource || 'manual_recheck';

    if (!studentLrn || Number.isNaN(eventId)) {
      return Response.json(
        {
          success: false,
          error: 'eventId and studentLrn are required',
        },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return Response.json(
        {
          success: false,
          error: 'Missing Supabase credentials',
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('lrn, name, level, parent_name, parent_contact, parent_email')
      .eq('lrn', studentLrn)
      .single();

    if (studentError || !student) {
      return Response.json(
        {
          success: false,
          error: 'Student not found',
          detail: studentError?.message,
        },
        { status: 404 }
      );
    }

    const { data: eventData, error: eventError } = await supabase
      .from('behavioral_events')
      .select(`
        id,
        event_type,
        severity,
        description,
        location,
        event_date,
        event_time,
        follow_up_required,
        guidance_status,
        guidance_reviewed_by,
        guidance_reviewed_at,
        guidance_intervention_notes,
        action_taken,
        notes,
        event_categories(name, category_type, notify_parent)
      `)
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      return Response.json(
        {
          success: false,
          error: 'Behavioral event not found',
          detail: eventError?.message,
        },
        { status: 404 }
      );
    }

    const guidanceStatus = (eventData as any).guidance_status || 'pending_guidance';
    const isApprovedByGuidance = guidanceStatus === 'approved_for_ml';

    if (!isApprovedByGuidance && triggerSource !== 'guidance_approved') {
      return Response.json({
        success: true,
        queued: false,
        requiresGuidanceReview: true,
        message: 'Guidance review is required before ML scoring and parent notification.',
        decision: {
          shouldNotifyParent: false,
          reason: 'Pending guidance review',
          factors: ['awaiting_guidance_review'],
        },
      });
    }

    const rangeStart = toIsoDateDaysAgo(30);

    const [attendanceResult, behaviorResult, summaryResult, predictionResult] = await Promise.all([
      supabase
        .from('attendance_logs')
        .select('date, check_in_time, check_out_time, is_present')
        .eq('student_lrn', studentLrn)
        .gte('date', rangeStart),
      supabase
        .from('behavioral_events')
        .select('id, severity, event_type, event_date')
        .eq('student_lrn', studentLrn)
        .gte('event_date', rangeStart),
      supabase
        .from('student_attendance_summary')
        .select(
          'current_attendance_rate, attendance_trend, risk_level, next_likely_absent_date, next_absent_confidence, days_until_critical_threshold'
        )
        .eq('student_lrn', studentLrn)
        .maybeSingle(),
      supabase
        .from('absence_predictions')
        .select('predicted_absent_date, confidence_score, prediction_type, risk_factors')
        .eq('student_lrn', studentLrn)
        .order('prediction_made_at', { ascending: false })
        .limit(1),
    ]);

    const attendanceLogs = attendanceResult.data || [];
    const behaviorLogs = behaviorResult.data || [];
    const summary = summaryResult.data;
    const latestPrediction = predictionResult.data?.[0] || null;

    const totalPresent = attendanceLogs.filter((log) => log.is_present).length;
    const attendanceRateFromLogs = attendanceLogs.length > 0
      ? Number(((totalPresent / attendanceLogs.length) * 100).toFixed(2))
      : 0;

    const severityBreakdown = behaviorLogs.reduce<Record<string, number>>((acc, log) => {
      acc[log.severity] = (acc[log.severity] || 0) + 1;
      return acc;
    }, {});

    const parentContact = student.parent_contact || '';
    const parentEmail = student.parent_email || (parentContact.includes('@') ? parentContact : null);

    const recentMajorOrCriticalEvents = behaviorLogs.filter(
      (log) => log.severity === 'major' || log.severity === 'critical'
    ).length;

    const mlDecision = evaluateMLNotificationDecision({
      currentSeverity: eventData.severity,
      currentAttendanceRate: summary?.current_attendance_rate ?? attendanceRateFromLogs,
      currentRiskLevel: summary?.risk_level ?? 'unknown',
      predictionConfidence: summary?.next_absent_confidence ?? latestPrediction?.confidence_score ?? 0,
      recentMajorOrCriticalEvents,
      parentContactAvailable: Boolean(parentEmail),
    });

    const eventCategory = Array.isArray(eventData.event_categories)
      ? eventData.event_categories[0]
      : eventData.event_categories;

    const reportPayload = {
      meta: {
        generatedAt: new Date().toISOString(),
        triggerSource,
        sourceSystem: 'SafeGate',
      },
      student: {
        lrn: student.lrn,
        name: student.name,
        level: student.level,
      },
      parent: {
        name: student.parent_name || 'Parent/Guardian',
        contact: parentContact,
        email: parentEmail,
      },
      event: {
        id: eventData.id,
        type: eventData.event_type,
        severity: eventData.severity,
        description: eventData.description,
        location: eventData.location,
        eventDate: eventData.event_date,
        eventTime: eventData.event_time,
        followUpRequired: eventData.follow_up_required,
        actionTaken: eventData.action_taken,
        notes: eventData.notes,
        guidanceStatus,
        guidanceReviewedBy: (eventData as any).guidance_reviewed_by || null,
        guidanceReviewedAt: (eventData as any).guidance_reviewed_at || null,
        guidanceInterventionNotes: (eventData as any).guidance_intervention_notes || null,
        categoryName: eventCategory?.name || null,
        categoryType: eventCategory?.category_type || null,
      },
      attendanceSummary: {
        rangeDays: 30,
        totalRecords: attendanceLogs.length,
        presentCount: totalPresent,
        attendanceRate:
          summary?.current_attendance_rate ?? attendanceRateFromLogs,
        trend: summary?.attendance_trend ?? 'unknown',
      },
      behaviorSummary: {
        rangeDays: 30,
        totalEvents: behaviorLogs.length,
        severityBreakdown,
      },
      mlSummary: {
        riskLevel: summary?.risk_level ?? 'unknown',
        nextLikelyAbsentDate:
          summary?.next_likely_absent_date ?? latestPrediction?.predicted_absent_date ?? null,
        predictionConfidence:
          summary?.next_absent_confidence ?? latestPrediction?.confidence_score ?? null,
        daysUntilCriticalThreshold: summary?.days_until_critical_threshold ?? null,
        predictionType: latestPrediction?.prediction_type ?? null,
        riskFactors: latestPrediction?.risk_factors ?? null,
      },
      decision: mlDecision,
    };

    if (!mlDecision.shouldNotifyParent) {
      return Response.json({
        success: true,
        queued: false,
        message: mlDecision.reason,
        decision: mlDecision,
        data: reportPayload,
      });
    }

    if (!parentEmail) {
      return Response.json({
        success: true,
        queued: false,
        message: 'ML approved notification, but no parent email address is available.',
        decision: mlDecision,
        data: reportPayload,
      });
    }

    const smtpHost = process.env.GMAIL_SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.GMAIL_SMTP_PORT || 465);
    const smtpSecure = (process.env.GMAIL_SMTP_SECURE || 'true').toLowerCase() === 'true';
    const smtpUser = process.env.GMAIL_SMTP_USER;
    const smtpPass = process.env.GMAIL_SMTP_APP_PASSWORD;
    const fromEmail = process.env.GMAIL_FROM_EMAIL || smtpUser;

    if (!smtpUser || !smtpPass || !fromEmail) {
      return Response.json(
        {
          success: false,
          error: 'Missing Gmail SMTP configuration',
          detail: 'Set GMAIL_SMTP_USER, GMAIL_SMTP_APP_PASSWORD, and optional GMAIL_FROM_EMAIL in environment variables.',
        },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const emailContent = buildParentEmailContent(reportPayload);

    const emailResult = await transporter.sendMail({
      from: fromEmail,
      to: parentEmail,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    return Response.json({
      success: true,
      queued: true,
      message: 'Parent email sent successfully via Gmail SMTP.',
      decision: mlDecision,
      data: {
        eventId,
        studentLrn,
        emailMessageId: emailResult.messageId,
      },
    });
  } catch (error) {
    console.error('Parent automation API error:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to run parent automation',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
