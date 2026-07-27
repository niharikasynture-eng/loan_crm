import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Organization from '@/models/Organization';
import Lead from '@/models/Lead';
import { sendPublicLeadWelcomeEmail } from '@/lib/email';
import { sendSMS } from '@/lib/twilio';

export async function POST(req: NextRequest) {
  try {
    const { 
      orgSlug, name, email, phone, company, message,
      project_id, budget, preferred_location, property_type, preferred_configuration 
    } = await req.json();

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
      project_id,
      budget,
      preferred_location,
      property_type,
      preferred_configuration,
      customFields: message ? { interest_message: message } : {},
    });

    // 3. Automated Notifications
    console.log(`[AUTOMATION] Processing notifications for lead: ${name} (${email})`);
    
    // A. Send Email to Lead (Welcome) - WE AWAIT THIS NOW for "instant" feedback
    let emailSuccess = false;
    if (email) {
      console.log(`[AUTOMATION] Sending welcome email to: ${email}`);
      emailSuccess = await sendPublicLeadWelcomeEmail(email, name, organization.name);
      
      const Activity = (await import('@/models/Activity')).default;
      await Activity.create({
        leadId: newLead._id,
        organizationId: organization._id,
        type: 'email',
        subject: `Thank you for showing interest in our ${organization.name}!`,
        notes: emailSuccess 
          ? `Automated welcome email sent successfully to ${email}.`
          : `FAILED to send automated welcome email to ${email}. Check SMTP settings.`,
        status: emailSuccess ? 'completed' : 'failed',
        completedAt: new Date(),
      });
    }

    // 4. Background Notifications (for Admin and SMS)
    (async () => {
      try {
        const { sendAdminNewLeadAlert } = await import('@/lib/email');
        const Activity = (await import('@/models/Activity')).default;
        
        // B. Send Email to Admin (Notification) - DISABLED AS PER USER REQUEST
        /* 
        if (organization.email) {
          try {
            await sendAdminNewLeadAlert(organization.email, name, email, phone, organization.name);
          } catch (adminErr) {
            console.error('Admin Notification Error:', adminErr);
          }
        }
        */
        
        // C. Send SMS to Lead
        if (phone) {
          const smsBody = `Hi ${name.split(' ')[0]}, thank you for your interest in ${organization.name}. We will reach out to you shortly!`;
          try {
            await sendSMS(phone, smsBody);
            await Activity.create({
              leadId: newLead._id,
              organizationId: organization._id,
              type: 'sms',
              notes: `Automated welcome SMS sent to ${phone}.`,
              status: 'completed',
              completedAt: new Date(),
            });
          } catch (smsErr) {
            console.error('SMS Automation Error:', smsErr);
          }
        }
      } catch (err) {
        console.error('Automation Background Error:', err);
      }
    })();

    return NextResponse.json({
      message: 'Lead submitted successfully',
      data: { id: newLead._id, emailSent: emailSuccess }
    }, { status: 201 });

  } catch (error: any) {
    console.error('[PUBLIC LEAD ERROR]', error.message, error.stack);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
