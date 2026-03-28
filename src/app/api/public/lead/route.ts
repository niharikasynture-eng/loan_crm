import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Organization from '@/models/Organization';
import Lead from '@/models/Lead';

export async function POST(req: NextRequest) {
  try {
    const { orgSlug, name, email, phone, company, message } = await req.json();

    if (!orgSlug || !name || (!email && !phone)) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    // 1. Find the organization by slug
    const organization = await Organization.findOne({ slug: orgSlug, isActive: true });
    if (!organization) {
      return NextResponse.json({ message: 'Organization not found or inactive' }, { status: 404 });
    }

    // 2. Create the lead
    const newLead = await Lead.create({
      organizationId: organization._id,
      name,
      email,
      phone,
      company,
      source: 'Public Form',
      status: 'new',
      customFields: message ? { interest_message: message } : {},
    });

    return NextResponse.json({
      message: 'Lead submitted successfully',
      data: { id: newLead._id }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Public Lead Capture Error:', error);
    // Explicitly write to error_log.txt since this is a 500
    try {
      const fs = require('fs');
      const logData = `PUBLIC LEAD ERROR: ${error.message}\nSTACK: ${error.stack}\nTIME: ${new Date().toISOString()}\n`;
      fs.appendFileSync('error_log.txt', logData);
    } catch (e) {}
    
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
