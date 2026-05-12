import { buildParentAccountUnlinkedEmail, createMailTransporter } from '@/lib/email-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const parentName = typeof body?.parentName === 'string' ? body.parentName.trim() : '';

    if (!email) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const transporterResult = createMailTransporter();
    if ('error' in transporterResult) {
      return Response.json({ success: false, error: transporterResult.error, detail: transporterResult.detail }, { status: 500 });
    }

    const logoUrl = new URL('/SGCDC.png', request.url).toString();
    const emailContent = buildParentAccountUnlinkedEmail({
      parentName: parentName || email,
      parentEmail: email,
      schoolName: 'Subic Gateway Child Development Center',
      schoolLogoUrl: logoUrl,
    });

    const result = await transporterResult.transporter.sendMail({
      from: transporterResult.config.fromEmail,
      to: email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
      attachments: emailContent.attachments,
    });

    return Response.json({ success: true, notificationSent: true, emailMessageId: result.messageId });
  } catch (error) {
    return Response.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}