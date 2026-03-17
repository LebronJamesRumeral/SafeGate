import nodemailer from 'nodemailer';

interface ScheduleRowPayload {
  dayOfWeek: string;
  subject: string;
  startTime: string;
  endTime: string;
  room?: string | null;
  teacherName?: string | null;
}

interface ScheduleChangeEmailRequest {
  studentName: string;
  studentLrn: string;
  level: string;
  parentName?: string;
  parentEmail: string;
  scheduleRows: ScheduleRowPayload[];
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function formatTime12h(raw: string): string {
  if (!raw) return raw;
  const normalised = raw.replace(/\./g, ':');
  const [h, m] = normalised.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return raw;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function buildScheduleChangeEmailContent(payload: ScheduleChangeEmailRequest) {
  const schoolName = process.env.SCHOOL_NAME || 'SafeGate';
  const parentName = payload.parentName?.trim() || 'Parent/Guardian';

  const sortedRows = [...payload.scheduleRows].sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek);
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });

  // ── Plain-text fallback ──────────────────────────────────────────────────
  const rowsText = sortedRows
    .map((row) => {
      const room = row.room?.trim() ? ` | Room: ${row.room}` : '';
      const teacher = row.teacherName?.trim() ? ` | Teacher: ${row.teacherName}` : '';
      return `  • ${row.dayOfWeek}: ${row.subject} (${formatTime12h(row.startTime)} – ${formatTime12h(row.endTime)})${room}${teacher}`;
    })
    .join('\n');

  const subject = `[${schoolName}] Schedule Update Notice for ${payload.studentName}`;

  const text = [
    `Dear ${parentName},`,
    '',
    `We would like to inform you that the class schedule of your child,`,
    `${payload.studentName}, has been updated.`,
    '',
    'STUDENT INFORMATION',
    '─────────────────────────────────────',
    `  Full Name  : ${payload.studentName}`,
    `  LRN        : ${payload.studentLrn}`,
    `  Grade Level: ${payload.level}`,
    '',
    'UPDATED CLASS SCHEDULE',
    '─────────────────────────────────────',
    rowsText,
    '',
    'Please take note of the changes above. Should you have any questions or',
    'concerns, do not hesitate to contact the school registrar or class adviser.',
    '',
    'Respectfully,',
    `The ${schoolName} Administration`,
    '',
    '─────────────────────────────────────',
    'This is an automated notification from the SafeGate Student Monitoring System.',
    'Please do not reply directly to this email.',
  ].join('\n');

  // ── Schedule rows HTML ───────────────────────────────────────────────────
  const rowColors = ['#ffffff', '#f8fafc'];
  const rowsHtml = sortedRows
    .map((row, i) => `
      <tr style="background:${rowColors[i % 2]};">
        <td style="padding:11px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#1e293b;font-weight:600;">${row.dayOfWeek}</td>
        <td style="padding:11px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#1e293b;">${row.subject}</td>
        <td style="padding:11px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#374151;white-space:nowrap;">${formatTime12h(row.startTime)} – ${formatTime12h(row.endTime)}</td>
        <td style="padding:11px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#374151;">${row.room?.trim() || '—'}</td>
        <td style="padding:11px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#374151;">${row.teacherName?.trim() || '—'}</td>
      </tr>`)
    .join('');

  // ── HTML email ───────────────────────────────────────────────────────────
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
        <table width="660" cellpadding="0" cellspacing="0" style="max-width:660px;width:100%;">

          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%);border-radius:12px 12px 0 0;padding:32px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;color:#93c5fd;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">${schoolName} Student Monitoring System</p>
                    <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Class Schedule Update Notice</h1>
                  </td>
                  <td align="right" valign="top">
                    <span style="display:inline-block;background:#2563eb;border:1px solid #60a5fa;color:#dbeafe;font-size:12px;font-weight:600;padding:4px 14px;border-radius:20px;letter-spacing:0.5px;">Schedule Change</span>
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
                We would like to inform you that the class schedule of your child has been updated.
                Please review the new schedule below and take note of any changes in subjects,
                time slots, rooms, or assigned teachers.
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;" />

              <!-- Section: Student Information -->
              <h2 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:0.8px;">Student Information</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:28px;">
                <tr style="background:#f8fafc;">
                  <td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;width:36%;"><span style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Full Name</span></td>
                  <td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;"><span style="font-size:14px;color:#1e293b;font-weight:600;">${payload.studentName}</span></td>
                </tr>
                <tr>
                  <td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;background:#f8fafc;"><span style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Learner Reference No. (LRN)</span></td>
                  <td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;"><span style="font-size:14px;color:#1e293b;font-family:monospace;">${payload.studentLrn}</span></td>
                </tr>
                <tr style="background:#f8fafc;">
                  <td style="padding:11px 16px;"><span style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Grade Level</span></td>
                  <td style="padding:11px 16px;"><span style="font-size:14px;color:#1e293b;">${payload.level}</span></td>
                </tr>
              </table>

              <!-- Section: Updated Schedule -->
              <h2 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:0.8px;">Updated Class Schedule</h2>
              <p style="margin:0 0 14px;font-size:14px;color:#374151;line-height:1.6;">
                The following schedule is now in effect. Please keep this for your records.
              </p>
              <div style="border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:28px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <thead>
                    <tr style="background:#1e3a5f;">
                      <th style="padding:11px 14px;text-align:left;font-size:12px;font-weight:600;color:#93c5fd;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;">Day</th>
                      <th style="padding:11px 14px;text-align:left;font-size:12px;font-weight:600;color:#93c5fd;text-transform:uppercase;letter-spacing:0.5px;">Subject</th>
                      <th style="padding:11px 14px;text-align:left;font-size:12px;font-weight:600;color:#93c5fd;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;">Time</th>
                      <th style="padding:11px 14px;text-align:left;font-size:12px;font-weight:600;color:#93c5fd;text-transform:uppercase;letter-spacing:0.5px;">Room</th>
                      <th style="padding:11px 14px;text-align:left;font-size:12px;font-weight:600;color:#93c5fd;text-transform:uppercase;letter-spacing:0.5px;">Teacher</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
              </div>

              <!-- Notice callout -->
              <div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:28px;">
                <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1d4ed8;">Please Take Note</p>
                <ul style="margin:0;padding-left:20px;font-size:14px;color:#1e40af;line-height:1.8;">
                  <li>This schedule takes effect immediately unless otherwise communicated by the school.</li>
                  <li>Ensure that your child is aware of the updated times and room assignments.</li>
                  <li>Contact the school registrar if you notice any discrepancies.</li>
                </ul>
              </div>

              <!-- Closing -->
              <p style="margin:0 0 6px;font-size:14px;color:#374151;line-height:1.7;">
                Should you have any questions or concerns regarding this schedule update,
                please do not hesitate to contact the school registrar or your child's class adviser.
                We appreciate your continued support and cooperation.
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
    const body = (await request.json()) as Partial<ScheduleChangeEmailRequest>;

    if (!body.studentName || !body.studentLrn || !body.level || !body.parentEmail || !Array.isArray(body.scheduleRows) || body.scheduleRows.length === 0) {
      return Response.json(
        {
          success: false,
          error: 'studentName, studentLrn, level, parentEmail, and scheduleRows are required',
        },
        { status: 400 }
      );
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

    const emailContent = buildScheduleChangeEmailContent({
      studentName: body.studentName,
      studentLrn: body.studentLrn,
      level: body.level,
      parentName: body.parentName,
      parentEmail: body.parentEmail,
      scheduleRows: body.scheduleRows,
    });

    const emailResult = await transporter.sendMail({
      from: fromEmail,
      to: body.parentEmail,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    return Response.json({
      success: true,
      message: 'Schedule change email sent successfully.',
      data: {
        emailMessageId: emailResult.messageId,
      },
    });
  } catch (error) {
    console.error('Schedule change email API error:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to send schedule change email',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
