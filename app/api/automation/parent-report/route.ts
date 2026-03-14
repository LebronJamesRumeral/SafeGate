import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

type TriggerSource = 'behavior_event_logged' | 'manual_recheck';

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

function buildParentEmailContent(reportPayload: any) {
  const schoolName = process.env.SCHOOL_NAME || 'SafeGate';
  const studentName = reportPayload.student?.name || reportPayload.student?.lrn || 'Student';
  const parentName = reportPayload.parent?.name || 'Parent/Guardian';
  const eventType = reportPayload.event?.type || 'Behavioral Event';
  const severity = reportPayload.event?.severity || 'unknown';
  const attendanceRate = toSafeNumber(reportPayload.attendanceSummary?.attendanceRate);
  const riskLevel = reportPayload.mlSummary?.riskLevel || 'unknown';
  const predictionConfidence = toSafeNumber(reportPayload.mlSummary?.predictionConfidence);
  const eventDate = reportPayload.event?.eventDate || 'N/A';
  const eventTime = reportPayload.event?.eventTime || 'N/A';
  const eventLocation = reportPayload.event?.location || 'N/A';
  const eventDescription = reportPayload.event?.description || 'No description provided.';
  const factors = Array.isArray(reportPayload.decision?.factors)
    ? reportPayload.decision.factors.join(', ')
    : 'N/A';

  const subject = `[${schoolName}] Parent Alert: ${studentName} - ${eventType} (${severity.toUpperCase()})`;

  const text = [
    `Hello ${parentName},`,
    '',
    `This is an automated alert from ${schoolName}.`,
    `A behavioral event has been logged for ${studentName}.`,
    '',
    `Event: ${eventType}`,
    `Severity: ${severity}`,
    `Date: ${eventDate}`,
    `Time: ${eventTime}`,
    `Location: ${eventLocation}`,
    `Description: ${eventDescription}`,
    '',
    'ML Risk Summary',
    `- Current attendance rate: ${attendanceRate}%`,
    `- Risk level: ${riskLevel}`,
    `- Prediction confidence: ${predictionConfidence}%`,
    `- Decision factors: ${factors}`,
    '',
    'Please coordinate with the school if follow-up support is needed.',
    '',
    `- ${schoolName}`,
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:640px;margin:0 auto;">
      <h2 style="margin-bottom:8px;">Parent Alert: Behavioral Event</h2>
      <p>Hello ${parentName},</p>
      <p>This is an automated alert from <strong>${schoolName}</strong>. A behavioral event has been logged for <strong>${studentName}</strong>.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0;">
        <tr><td style="padding:8px;border:1px solid #e2e8f0;"><strong>Event</strong></td><td style="padding:8px;border:1px solid #e2e8f0;">${eventType}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;"><strong>Severity</strong></td><td style="padding:8px;border:1px solid #e2e8f0;">${severity}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;"><strong>Date</strong></td><td style="padding:8px;border:1px solid #e2e8f0;">${eventDate}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;"><strong>Time</strong></td><td style="padding:8px;border:1px solid #e2e8f0;">${eventTime}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;"><strong>Location</strong></td><td style="padding:8px;border:1px solid #e2e8f0;">${eventLocation}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;"><strong>Description</strong></td><td style="padding:8px;border:1px solid #e2e8f0;">${eventDescription}</td></tr>
      </table>
      <h3 style="margin-bottom:8px;">ML Risk Summary</h3>
      <ul>
        <li>Current attendance rate: <strong>${attendanceRate}%</strong></li>
        <li>Risk level: <strong>${riskLevel}</strong></li>
        <li>Prediction confidence: <strong>${predictionConfidence}%</strong></li>
        <li>Decision factors: <strong>${factors}</strong></li>
      </ul>
      <p>Please coordinate with the school if follow-up support is needed.</p>
      <p style="margin-top:24px;">- ${schoolName}</p>
    </div>
  `;

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
