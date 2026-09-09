import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/auth';
import Organization from '@/models/Organization';
import Lead from '@/models/Lead';
import Deal from '@/models/Deal';
import Booking from '@/models/Booking';
import { notifyNewLead } from '@/app/api/leads/route';
import { sendPublicLeadWelcomeEmail } from '@/lib/email';
import { getAutoAssignedAgent } from '@/lib/lead-routing';

// GET /api/public/form/[slug] — Get org info for slug-based public form
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await connectDB();

    let org = await Organization.findOne({
      slug: slug.toLowerCase(),
      status: { $in: ['active', 'approved'] },
    }).select('name slug logo phone email settings').lean();

    if (!org) {
      // Fallback: match by slug prefix or name in case slug has an auto-generated suffix
      org = await Organization.findOne({
        $or: [
          { slug: { $regex: `^${slug.toLowerCase()}`, $options: 'i' } },
          { name: { $regex: `^${slug.toLowerCase()}`, $options: 'i' } },
        ],
        status: { $in: ['active', 'approved'] },
      }).select('name slug logo phone email settings').lean();
    }

    if (!org) return apiError('Organization not found or inactive', 404);

    return apiSuccess({
      org: {
        name: org.name,
        slug: org.slug,
        phone: (org as any).phone || '',
        email: (org as any).email || '',
        leadSources: (org as any).settings?.leadSources || ['Instagram', 'Campaign', 'Website', 'Referral'],
      },
    });
  } catch (err: unknown) {
    return apiError('Failed to load form', 500);
  }
}

// POST /api/public/form/[slug] — Submit lead from campaign / public form
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await connectDB();

    let org = await Organization.findOne({
      slug: slug.toLowerCase(),
      status: { $in: ['active', 'approved'] },
    });

    if (!org) {
      org = await Organization.findOne({
        $or: [
          { slug: { $regex: `^${slug.toLowerCase()}`, $options: 'i' } },
          { name: { $regex: `^${slug.toLowerCase()}`, $options: 'i' } },
        ],
        status: { $in: ['active', 'approved'] },
      });
    }

    if (!org) return apiError('Organization not found or inactive', 404);

    const body = await req.json();
    const {
      name,
      phone,
      email,
      address,
      industry, // What loan they want
      value, // Desired loan amount
      source,
      notes,
      message,
      campaign,
      utm_source,
      utm_campaign,
    } = body;

    if (!name || !name.trim()) return apiError('Applicant name is required', 400);
    if (!phone && !email) return apiError('Mobile / Contact number is required', 400);

    const finalSource = source || utm_source || 'Instagram / Campaign';
    const finalIndustry = industry || 'Home Loan / Housing Loan';
    const finalValue = value ? Number(value) : 0;
    const finalNotes = notes || message || (campaign ? `Campaign: ${campaign}` : '');

    const tags = ['public-form', 'campaign-inquiry'];
    if (finalSource.toLowerCase().includes('insta')) tags.push('instagram');
    if (utm_campaign || campaign) tags.push(utm_campaign || campaign);

    // Determine auto-assigned agent
    const assignedAgentId = await getAutoAssignedAgent(org._id);

    // 1. Create the lead record in Sales CRM
    const lead = await Lead.create({
      organizationId: org._id,
      name: name.trim(),
      phone: phone?.trim(),
      email: email?.trim().toLowerCase() || undefined,
      address: address?.trim() || undefined,
      industry: finalIndustry,
      value: finalValue,
      company: org.name,
      source: finalSource,
      status: 'new',
      pipelineStage: 'new',
      assignedTo: assignedAgentId || undefined,
      assignedAt: assignedAgentId ? new Date() : undefined,
      notes: finalNotes,
      tags,
    });

    // 2. Create Deal entry for CRM pipeline
    const deal = await Deal.create({
      organizationId: org._id,
      leadId: lead._id,
      title: `${name.trim()} - ${finalIndustry}`,
      value: finalValue,
      stage: 'new',
      assignedTo: assignedAgentId || undefined,
      position: 0,
    });

    // 3. Auto-create Booking record for Loan Operations (/post-sales) so Operator can process it
    try {
      await Booking.create({
        organizationId: org._id,
        leadId: lead._id,
        dealId: deal._id,
        salesPersonId: assignedAgentId || org._id,
        unitNumber: `${name.trim()} - ${finalIndustry}`,
        projectName: `${finalIndustry} (${name.trim()})`,
        totalAmount: finalValue,
        bookingDate: new Date(),
        status: 'documentation',
        loanDetails: {
          loanType: finalIndustry.toLowerCase().includes('personal')
            ? 'personal_loan'
            : finalIndustry.toLowerCase().includes('business')
            ? 'business_loan'
            : finalIndustry.toLowerCase().includes('property') || finalIndustry.toLowerCase().includes('lap')
            ? 'lap'
            : 'home_loan',
          selectedBank: 'HDFC Bank',
          sanctionAmount: finalValue,
          disbursedAmount: 0,
          verificationStatus: 'pending',
        },
        documents: [
          { name: 'PAN & Aadhaar KYC', docType: 'KYC Document', status: 'pending' },
          { name: 'Income / Salary Proof', docType: 'Income Proof', status: 'pending' },
          { name: 'Bank Statement (6 Months)', docType: 'Bank Statement', status: 'pending' },
        ],
        paymentMilestones: [],
        handoverChecklist: [],
      });
    } catch (bookingErr) {
      console.error('Failed to create booking for campaign inquiry:', bookingErr);
    }

    // 4. INSTANT: Send welcome email to lead if email provided
    let emailSent = false;
    if (email && email.includes('@')) {
      emailSent = await sendPublicLeadWelcomeEmail(
        email.trim().toLowerCase(),
        name.trim(),
        org.name
      );
    }

    // 5. BACKGROUND: Notify org admins, managers, and Loan Operators
    (async () => {
      try {
        await notifyNewLead(
          org._id.toString(),
          lead._id.toString(),
          name.trim(),
          assignedAgentId || undefined,
          { tags: ['campaign-inquiry'] }
        );
      } catch (e) {
        console.error('[AUTOMATION] Notify lead error:', e);
      }
    })();

    return apiSuccess(
      { leadId: lead._id, emailSent },
      'Loan application received successfully! Our loan specialist will connect with you shortly.',
      201
    );
  } catch (err: unknown) {
    console.error('Public lead submission error:', err);
    return apiError('Failed to submit loan application', 500);
  }
}
