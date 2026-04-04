import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';
import Lead from '@/models/Lead';
import CallLog from '@/models/CallLog';
import Activity from '@/models/Activity';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const { leadId } = await params;

    const lead = await Lead.findOne({ _id: leadId, organizationId: auth.organizationId });
    
    if (!lead) return apiError('Lead not found', 404);
    if (!lead.phone) return apiError('Lead has no phone number', 400);

    const callLog = await CallLog.create({
      leadId: lead._id,
      organizationId: auth.organizationId,
      salesPersonId: auth.userId,
      status: 'initiated',
    });

    await Lead.updateOne(
      { _id: lead._id },
      { 
        $set: { 
          lastCalledAt: new Date(),
          ...(lead.status === 'new' ? { status: 'contacted' } : {}) 
        },
        $inc: { totalCalls: 1 }
      }
    );

    await Activity.create({
      organizationId: auth.organizationId,
      leadId: lead._id,
      type: 'call',
      notes: `Call started with ${lead.name} (${lead.phone})`,
      createdBy: auth.userId,
    });

    return apiSuccess({
      callLogId: callLog._id,
      phone: lead.phone,
      leadName: lead.name,
    }, 'Call initiated successfully');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403);
    console.error(err);
    return apiError('Failed to start call', 500);
  }
}
