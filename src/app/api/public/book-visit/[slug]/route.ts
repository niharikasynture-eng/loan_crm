import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/auth';
import Organization from '@/models/Organization';
import Project from '@/models/Project';
import Lead from '@/models/Lead';
import SiteVisit from '@/models/SiteVisit';
import { getAutoAssignedAgent } from '@/lib/lead-routing';
import { triggerIntentStageMovement } from '@/lib/intent-stage-mover';
import { sendEmail } from '@/lib/email';

// GET /api/public/book-visit/[slug] — Fetch org & projects for site visit booking
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
    }).select('name slug email phone').lean();

    if (!org) {
      org = await Organization.findOne({
        $or: [
          { slug: { $regex: `^${slug.toLowerCase()}`, $options: 'i' } },
          { name: { $regex: `^${slug.toLowerCase()}`, $options: 'i' } },
        ],
        status: { $in: ['active', 'approved'] },
      }).select('name slug email phone').lean();
    }

    if (!org) return apiError('Organization not found or inactive', 404);

    const projects = await Project.find({
      organizationId: org._id,
    })
      .select('name location type description status')
      .lean();

    return apiSuccess({
      org: {
        id: org._id,
        name: org.name,
        slug: org.slug,
      },
      projects,
    });
  } catch (err: unknown) {
    return apiError('Failed to load booking details', 500);
  }
}

// POST /api/public/book-visit/[slug] — Submit self-service site visit booking
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
    const { name, email, phone, company, projectId, visitDate, visitTime, remarks } = body;

    if (!name) return apiError('Name is required');
    if (!phone && !email) return apiError('Phone or Email is required');
    if (!visitDate) return apiError('Visit date is required');

    // 1. Find or Create Lead
    let lead = null;
    if (phone) {
      lead = await Lead.findOne({ organizationId: org._id, phone: phone.trim() });
    }
    if (!lead && email) {
      lead = await Lead.findOne({ organizationId: org._id, email: email.trim().toLowerCase() });
    }

    let assignedAgentId = lead?.assignedTo?.toString();
    if (!assignedAgentId) {
      assignedAgentId = (await getAutoAssignedAgent(org._id)) || undefined;
    }

    if (lead) {
      if (name && name.trim() !== lead.name) {
        lead.name = name.trim();
        await lead.save();
      }
    } else {
      lead = await Lead.create({
        organizationId: org._id,
        name: name.trim(),
        email: email?.trim().toLowerCase(),
        phone: phone?.trim(),
        company: company?.trim(),
        source: 'Self-Service Booking',
        status: 'qualified',
        pipelineStage: 'qualified',
        assignedTo: assignedAgentId || undefined,
        assignedAt: assignedAgentId ? new Date() : undefined,
        tags: ['site-visit', 'self-service'],
      });
    }

    // 2. Find Project (or pick first available)
    let project = null;
    if (projectId) {
      project = await Project.findById(projectId);
    }
    if (!project) {
      project = await Project.findOne({ organizationId: org._id });
    }

    // 3. Create SiteVisit Record
    const visit = await SiteVisit.create({
      organizationId: org._id,
      lead_id: lead._id,
      project_id: project?._id || lead._id, // fallback if no project in db
      sales_user_id: assignedAgentId || lead.createdBy || org._id,
      visit_date: new Date(visitDate),
      visit_time: visitTime || '10:00 AM',
      status: 'Scheduled',
      remarks: remarks || 'Scheduled via Client Self-Service Page',
      createdBy: assignedAgentId || lead.createdBy || org._id,
    });

    // 4. Trigger Intent-Based Stage Movement Engine
    await triggerIntentStageMovement({
      organizationId: org._id,
      leadId: lead._id,
      eventType: 'site_visit_scheduled',
      eventData: {
        visitDate,
        visitTime: visitTime || '10:00 AM',
        projectName: project?.name,
        notes: remarks,
      },
    });

    // 5. Send Confirmation Email to Client
    if (email) {
      const visitDateFormatted = new Date(visitDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      await sendEmail({
        to: email.trim().toLowerCase(),
        subject: `🗓️ Site Visit Confirmed with ${org.name}!`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
            <h2 style="color:#818cf8;margin-bottom:16px;">🎉 Site Visit Confirmed!</h2>
            <p>Hi <strong>${name.split(' ')[0]}</strong>,</p>
            <p>Your property site visit with <strong>${org.name}</strong> has been successfully booked.</p>
            <div style="background:#1e293b;padding:20px;border-radius:10px;border-left:4px solid #6366f1;margin:20px 0;">
              <p style="margin:6px 0;"><strong>Date:</strong> ${visitDateFormatted}</p>
              <p style="margin:6px 0;"><strong>Time Slot:</strong> ${visitTime || '10:00 AM'}</p>
              ${project ? `<p style="margin:6px 0;"><strong>Project:</strong> ${project.name} (${project.location})</p>` : ''}
            </div>
            <p style="color:#94a3b8;font-size:13px;">Our sales team will get in touch with you shortly to coordinate transportation and entry details.</p>
          </div>
        `,
      });
    }

    return apiSuccess(
      { visitId: visit._id, leadId: lead._id },
      'Site Visit successfully booked!',
      201
    );
  } catch (err: unknown) {
    console.error('Public site visit booking error:', err);
    return apiError('Failed to book site visit', 500);
  }
}
