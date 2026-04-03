import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Activity from '@/models/Activity';
import Lead from '@/models/Lead';
import { sendEmail } from '@/lib/email';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { leadId, subject, message } = body;

    if (!leadId || !subject || !message) {
      return NextResponse.json({ error: 'Missing leadId, subject, or message' }, { status: 400 });
    }

    await connectDB();
    const lead = await Lead.findById(leadId);
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    if (!lead.email) return NextResponse.json({ error: 'Lead has no email address' }, { status: 400 });

    // Send via SMTP
    try {
      await sendEmail({
        to: lead.email,
        subject: subject,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #334155;">
            <div style="margin-bottom: 24px; white-space: pre-wrap;">${message}</div>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8;">
              Sent via ${process.env.NEXT_PUBLIC_APP_NAME || 'DealByte CRM'}
            </p>
          </div>
        `
      });
    } catch (err: any) {
      console.error('SMTP Error:', err.message);
      return NextResponse.json({ error: 'Failed to send email. Check SMTP configuration.' }, { status: 500 });
    }

    // Log activity
    const activity = await Activity.create({
      organizationId: user.organizationId,
      leadId,
      type: 'email',
      notes: `Sent Email: ${subject}\n\n${message}`,
      createdBy: user.userId,
    });

    return NextResponse.json({ success: true, activity });
  } catch (err: any) {
    console.error('API Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
