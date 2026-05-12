import { existsSync } from 'fs';
import { join } from 'path';
import nodemailer from 'nodemailer';

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
  attachments?: Array<{
    filename: string;
    path: string;
    cid: string;
  }>;
}

export interface ParentAccountCreatedEmailData {
  parentName?: string | null;
  parentEmail: string;
  defaultPassword: string;
  schoolName?: string | null;
  schoolLogoUrl?: string | null;
}

export interface ParentAccountUnlinkedEmailData {
  parentName?: string | null;
  parentEmail: string;
  schoolName?: string | null;
  schoolLogoUrl?: string | null;
}

type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
};

function getSchoolName(explicitSchoolName?: string | null): string {
  return (explicitSchoolName || process.env.SCHOOL_NAME || 'Subic Gateway Child Development Center').trim() || 'Subic Gateway Child Development Center';
}

function getSchoolLogoUrl(explicitLogoUrl?: string | null): string {
  const configured = (explicitLogoUrl || process.env.SCHOOL_LOGO_URL || '').trim();
  if (configured) {
    return configured;
  }

  const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || '').replace(/\/$/, '');
  return appBaseUrl ? `${appBaseUrl}/SGCDC.png` : '';
}

function getSchoolLogoAttachment() {
  const logoPath = join(process.cwd(), 'public', 'SGCDC.png');
  if (!existsSync(logoPath)) {
    return null;
  }

  return {
    filename: 'SGCDC.png',
    path: logoPath,
    cid: 'sgcdc-logo',
  };
}

export function createMailTransporter(): { config: MailConfig; transporter: ReturnType<typeof nodemailer.createTransport> } | { error: string; detail: string } {
  const host = process.env.GMAIL_SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.GMAIL_SMTP_PORT || 465);
  const secure = (process.env.GMAIL_SMTP_SECURE || 'true').toLowerCase() === 'true';
  const user = process.env.GMAIL_SMTP_USER;
  const pass = process.env.GMAIL_SMTP_APP_PASSWORD;
  const fromEmail = process.env.GMAIL_FROM_EMAIL || user;

  if (!user || !pass || !fromEmail) {
    return {
      error: 'Missing Gmail SMTP configuration',
      detail: 'Set GMAIL_SMTP_USER, GMAIL_SMTP_APP_PASSWORD, and optional GMAIL_FROM_EMAIL in environment variables.',
    };
  }

  return {
    config: { host, port, secure, user, pass, fromEmail },
    transporter: nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    }),
  };
}

function buildSafeGateEmailShell(input: {
  schoolName?: string | null;
  schoolLogoUrl?: string | null;
  accentColor: string;
  greetingName: string;
  title: string;
  intro: string;
  rows: Array<{ label: string; value: string }>;
  closing: string[];
  footer: string;
}): EmailContent {
  const schoolName = getSchoolName(input.schoolName);
  const logoAttachment = getSchoolLogoAttachment();
  const schoolLogoUrl = getSchoolLogoUrl(input.schoolLogoUrl);
  const schoolLogoSrc = logoAttachment ? `cid:${logoAttachment.cid}` : schoolLogoUrl;
  const rowsHtml = input.rows
    .map(
      (row) => `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;background:#f8fafc;width:34%;font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;vertical-align:top;">
            ${row.label}
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;vertical-align:top;word-break:break-word;">
            ${row.value}
          </td>
        </tr>`
    )
    .join('');

  const text = [
    `Dear ${input.greetingName},`,
    '',
    input.intro,
    '',
    ...input.rows.map((row) => `${row.label}: ${row.value}`),
    '',
    ...input.closing,
    '',
    `Respectfully,`,
    `The ${schoolName} Administration`,
    '',
    input.footer,
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${input.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f 0%,${input.accentColor} 100%);border-radius:12px 12px 0 0;padding:24px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        ${schoolLogoSrc ? `<td style="padding-right:12px;vertical-align:top;"><img src="${schoolLogoSrc}" alt="${schoolName} Logo" width="48" height="48" style="display:block;border-radius:10px;background:#ffffff;padding:5px;object-fit:contain;" /></td>` : ''}
                        <td style="vertical-align:top;">
                          <p style="margin:0;color:#bfdbfe;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">${schoolName}</p>
                          <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${input.title}</h1>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:36px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
              <p style="margin:0 0 10px;font-size:15px;color:#374151;">Dear <strong>${input.greetingName}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">${input.intro}</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                ${rowsHtml}
              </table>
              ${input.closing.map((line) => `<p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.7;">${line}</p>`).join('')}
              <p style="margin:24px 0 0;font-size:14px;color:#374151;">Respectfully,</p>
              <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#1e293b;">The ${schoolName} Administration</p>
            </td>
          </tr>
          <tr>
            <td style="background:#1e293b;border-radius:0 0 12px 12px;padding:20px 36px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">${input.footer}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: input.title,
    text,
    html,
    attachments: logoAttachment ? [logoAttachment] : undefined,
  };
}

export function buildParentAccountCreatedEmail(data: ParentAccountCreatedEmailData): EmailContent {
  const schoolName = getSchoolName(data.schoolName);
  const displayName = (data.parentName || 'Parent/Guardian').trim() || 'Parent/Guardian';

  return buildSafeGateEmailShell({
    schoolName,
    schoolLogoUrl: data.schoolLogoUrl,
    accentColor: '#2563eb',
    greetingName: displayName,
    title: 'Parent Account Created',
    intro: `Your parent account has been created successfully for ${schoolName}. You can use the credentials below to sign in.`,
    rows: [
      { label: 'Parent Email', value: data.parentEmail },
      { label: 'Default Password', value: data.defaultPassword },
      { label: 'School', value: schoolName },
    ],
    closing: [
      'Please sign in as soon as possible and change the default password after your first login.',
      'If you did not expect this account, please contact the school administration immediately.',
    ],
    footer: 'This is an automated account notification from Subic Gateway Child Development Center. Please do not reply directly to this email.',
  });
}

export function buildParentAccountUnlinkedEmail(data: ParentAccountUnlinkedEmailData): EmailContent {
  const schoolName = getSchoolName(data.schoolName);
  const displayName = (data.parentName || 'Parent/Guardian').trim() || 'Parent/Guardian';

  return buildSafeGateEmailShell({
    schoolName,
    schoolLogoUrl: data.schoolLogoUrl,
    accentColor: '#dc2626',
    greetingName: displayName,
    title: 'Parent Account Access Removed',
    intro: `This is to inform you that your parent account access has been removed for ${schoolName}.`,
    rows: [
      { label: 'Parent Email', value: data.parentEmail },
      { label: 'Account Status', value: 'No longer accessible' },
      { label: 'School', value: schoolName },
    ],
    closing: [
      'You will no longer be able to access the parent account with this email address.',
      'If you believe this was done in error, please contact the school administration for assistance.',
    ],
    footer: 'This is an automated account notification from Subic Gateway Child Development Center. Please do not reply directly to this email.',
  });
}
