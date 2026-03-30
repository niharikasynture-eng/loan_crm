import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/auth';
import Organization from '@/models/Organization';
import Lead from '@/models/Lead';
import { notifyNewLead } from '@/app/api/leads/route';
import { sendPublicLeadWelcomeEmail } from '@/lib/email';

// GET /api/public/lead/[formToken] — Get org info for public form
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ formToken: string }> }
) {
  try {
    const { formToken } = await params;
    await connectDB();

    const org = await Organization.findOne({
      leadFormToken: formToken,
      status: { $in: ['approved', 'active'] },
    }).select('name slug settings').lean();

    if (!org) return apiError('Invalid or expired form link', 404);

    return apiSuccess({
      org: {
        name: org.name,
        slug: org.slug,
        leadSources: org.settings?.leadSources || ['Website', 'Referral', 'Other'],
      },
    });
  } catch (err: unknown) {
    return apiError('Failed to load form', 500);
  }
}

// POST /api/public/lead/[formToken] — Submit lead from public form
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ formToken: string }> }
) {
  try {
    const { formToken } = await params;
    await connectDB();

    const org = await Organization.findOne({
      leadFormToken: formToken,
      status: { $in: ['approved', 'active'] },
    });

    if (!org) return apiError('Invalid or expired form link', 404);

    const body = await req.json();
    const { name, email, phone, company, source, message } = body;

    if (!name) return apiError('Name is required');
    if (!email && !phone) return apiError('Email or phone is required');

    // 1. Create the lead record
    const lead = await Lead.create({
      organizationId: org._id,
      name: name.trim(),
      email: email?.trim().toLowerCase(),
      phone: phone?.trim(),
      company: company?.trim(),
      source: source || 'Website Form',
      status: 'new',
      notes: message || '',
      tags: ['public-form'],
    });

    // 2. INSTANT: Send welcome email to the lead (awaited — guarantees delivery feedback)
    let emailSent = false;
    if (email) {
      emailSent = await sendPublicLeadWelcomeEmail(
        email.trim().toLowerCase(),
        name.trim(),
        org.name
      );
      // Log the email as an activity
      const Activity = (await import('@/models/Activity')).default;
      await Activity.create({
        leadId: lead._id,
        organizationId: org._id,
        type: 'email',
        subject: `Thank you for showing interest in ${org.name}!`,
        notes: emailSent
          ? `Welcome email sent to ${email}.`
          : `Failed to send welcome email to ${email}. Check SMTP settings.`,
        status: emailSent ? 'completed' : 'failed',
        completedAt: new Date(),
      });
    }

    // 3. BACKGROUND: Notify org admins + managers (non-blocking)
    (async () => {
      try {
        await notifyNewLead(org._id.toString(), lead._id.toString(), name, undefined);
      } catch (err) {
        console.error('[AUTOMATION] Admin notify error:', err);
      }
    })();

    return apiSuccess(
      { leadId: lead._id, emailSent },
      'Thank you! We will be in touch soon.',
      201
    );
  } catch (err: unknown) {
    console.error('Public lead submit error:', err);
    return apiError('Failed to submit lead', 500);
  }
}
