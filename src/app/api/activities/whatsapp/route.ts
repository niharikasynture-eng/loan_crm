import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Activity from '@/models/Activity';
import Lead from '@/models/Lead';
import { sendWhatsApp } from '@/lib/ultramsg';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { leadId, message } = body;

    if (!leadId || !message) {
      return NextResponse.json({ error: 'Missing leadId or message' }, { status: 400 });
    }

    await connectDB();
    const lead = await Lead.findById(leadId);
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    if (!lead.phone) return NextResponse.json({ error: 'Lead has no phone number' }, { status: 400 });

    // Send via Ultramsg
    try {
      await sendWhatsApp(lead.phone, message);
    } catch (err: any) {
      console.error('Ultramsg Error:', err.message);
      return NextResponse.json({ error: 'Failed to send WhatsApp message: ' + err.message }, { status: 500 });
    }

    // Log activity
    const activity = await Activity.create({
      leadId,
      type: 'whatsapp',
      notes: `Sent WhatsApp: ${message}`,
      createdBy: user.userId,
      organizationId: user.organizationId,
    });

    return NextResponse.json({ success: true, activity });
  } catch (err: any) {
    console.error('API Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
