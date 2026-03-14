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

function buildScheduleChangeEmailContent(payload: ScheduleChangeEmailRequest) {
  const schoolName = process.env.SCHOOL_NAME || 'SafeGate';
  const parentName = payload.parentName?.trim() || 'Parent/Guardian';

  const sortedRows = [...payload.scheduleRows].sort((a, b) => {
    if (a.dayOfWeek === b.dayOfWeek) {
      return a.startTime.localeCompare(b.startTime);
    }
    return a.dayOfWeek.localeCompare(b.dayOfWeek);
  });

  const rowsText = sortedRows
    .map((row) => {
      const room = row.room?.trim() ? ` | Room: ${row.room}` : '';
      const teacher = row.teacherName?.trim() ? ` | Teacher: ${row.teacherName}` : '';
      return `- ${row.dayOfWeek}: ${row.subject} (${row.startTime} - ${row.endTime})${room}${teacher}`;
    })
    .join('\n');

  const rowsHtml = sortedRows
    .map((row) => {
      return `<tr>
        <td style="padding:8px;border:1px solid #e2e8f0;">${row.dayOfWeek}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;">${row.subject}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;">${row.startTime} - ${row.endTime}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;">${row.room?.trim() || '—'}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;">${row.teacherName?.trim() || '—'}</td>
      </tr>`;
    })
    .join('');

  const subject = `[${schoolName}] Schedule Update for ${payload.studentName}`;

  const text = [
    `Hello ${parentName},`,
    '',
    `${schoolName} has updated the schedule for your child.`,
    '',
    `Student: ${payload.studentName}`,
    `LRN: ${payload.studentLrn}`,
    `Level: ${payload.level}`,
    '',
    'Updated Schedule:',
    rowsText,
    '',
    'If you have questions, please contact the school office.',
    '',
    `- ${schoolName}`,
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:700px;margin:0 auto;">
      <h2 style="margin-bottom:8px;">Student Schedule Update</h2>
      <p>Hello ${parentName},</p>
      <p>${schoolName} has updated the schedule for your child.</p>

      <table style="border-collapse:collapse;width:100%;margin:16px 0;">
        <tr><td style="padding:8px;border:1px solid #e2e8f0;"><strong>Student</strong></td><td style="padding:8px;border:1px solid #e2e8f0;">${payload.studentName}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;"><strong>LRN</strong></td><td style="padding:8px;border:1px solid #e2e8f0;">${payload.studentLrn}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;"><strong>Level</strong></td><td style="padding:8px;border:1px solid #e2e8f0;">${payload.level}</td></tr>
      </table>

      <h3 style="margin-bottom:8px;">Updated Schedule</h3>
      <table style="border-collapse:collapse;width:100%;margin:8px 0 16px;">
        <thead>
          <tr>
            <th style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;text-align:left;">Day</th>
            <th style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;text-align:left;">Subject</th>
            <th style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;text-align:left;">Time</th>
            <th style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;text-align:left;">Room</th>
            <th style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;text-align:left;">Teacher</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <p>If you have questions, please contact the school office.</p>
      <p style="margin-top:24px;">- ${schoolName}</p>
    </div>
  `;

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
