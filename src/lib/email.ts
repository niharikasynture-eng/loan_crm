// Email utility — uses nodemailer if SMTP configured, otherwise logs to console
// Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in .env.local

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'SalesCRM <noreply@salescrm.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    // No SMTP configured — log to console for dev
    console.log('📧 [EMAIL - Console Fallback]');
    console.log(`  To: ${opts.to}`);
    console.log(`  Subject: ${opts.subject}`);
    console.log(`  Body (preview): ${opts.html.replace(/<[^>]+>/g, ' ').substring(0, 200)}...`);
    return;
  }

  try {
    // Dynamic import to avoid issues if nodemailer not available
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transporter.sendMail({ from: SMTP_FROM, ...opts });
  } catch (err) {
    console.error('Email send failed:', err);
    // Don't throw — email failure should not break the request
  }
}

export async function sendOrgApprovalEmail(
  email: string,
  orgName: string,
  adminName: string,
  token: string
): Promise<void> {
  const setPasswordUrl = `${APP_URL}/set-password/${token}`;
  await sendEmail({
    to: email,
    subject: `Your "${orgName}" account on SalesCRM has been approved!`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
        <h1 style="color:#818cf8;margin-bottom:8px;">🎉 You're approved!</h1>
        <p>Hi <strong>${adminName}</strong>,</p>
        <p>Great news! Your organization <strong>${orgName}</strong> has been approved on SalesCRM.</p>
        <p>Click the button below to set your password and get started. This link expires in <strong>24 hours</strong>.</p>
        <a href="${setPasswordUrl}" 
           style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#6366f1,#0ea5e9);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
          Set Your Password
        </a>
        <p style="color:#64748b;font-size:13px;">Or copy this link:<br/><a href="${setPasswordUrl}" style="color:#818cf8;">${setPasswordUrl}</a></p>
        <hr style="border-color:#334155;margin-top:32px;"/>
        <p style="color:#475569;font-size:12px;">If you didn't register for SalesCRM, please ignore this email.</p>
      </div>
    `,
  });
}

export async function sendOrgRejectionEmail(
  email: string,
  orgName: string,
  adminName: string,
  reason: string
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `Update on your SalesCRM application for "${orgName}"`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
        <h1 style="color:#f87171;margin-bottom:8px;">Application Update</h1>
        <p>Hi <strong>${adminName}</strong>,</p>
        <p>We've reviewed your application for <strong>${orgName}</strong> on SalesCRM.</p>
        <p>Unfortunately, we are unable to approve your request at this time.</p>
        ${reason ? `<div style="background:#1e293b;padding:16px;border-radius:8px;border-left:4px solid #f87171;margin:16px 0;"><strong>Reason:</strong> ${reason}</div>` : ''}
        <p>You may <a href="${APP_URL}/register" style="color:#818cf8;">submit a new application</a> if you believe this was an error.</p>
        <hr style="border-color:#334155;margin-top:32px;"/>
        <p style="color:#475569;font-size:12px;">SalesCRM Support</p>
      </div>
    `,
  });
}

export async function sendLeadAssignedEmail(
  email: string,
  salesPersonName: string,
  leadName: string,
  leadId: string
): Promise<void> {
  const leadUrl = `${APP_URL}/leads/${leadId}`;
  await sendEmail({
    to: email,
    subject: `New lead assigned to you: ${leadName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
        <h1 style="color:#818cf8;margin-bottom:8px;">📋 New Lead Assigned</h1>
        <p>Hi <strong>${salesPersonName}</strong>,</p>
        <p>A new lead has been assigned to you: <strong>${leadName}</strong></p>
        <a href="${leadUrl}" 
           style="display:inline-block;margin:20px 0;padding:12px 24px;background:linear-gradient(135deg,#6366f1,#0ea5e9);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
          View Lead
        </a>
      </div>
    `,
  });
}

export async function sendPublicLeadWelcomeEmail(
  email: string,
  leadName: string,
  orgName: string
): Promise<boolean> {
  const firstName = leadName.split(' ')[0];
  try {
    await sendEmail({
      to: email,
      subject: `Thank you for showing interest in our ${orgName}!`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e293b; font-size: 24px; font-weight: 800; margin-bottom: 10px;">Interest Received!</h1>
            <div style="height: 4px; width: 60px; background: linear-gradient(to right, #6366f1, #0ea5e9); margin: 0 auto; border-radius: 2px;"></div>
          </div>
          
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi <strong>${firstName}</strong>,</p>
          
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            Thank you for showing interest in our organization <strong>${orgName}</strong> through our Sales CRM portal. 
            We’re excited to help you streamline your sales process and convert more leads into customers.
          </p>
          
          <div style="margin-top: 40px; padding: 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h3 style="color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">What happens next?</h3>
            <p style="color: #64748b; font-size: 14px; margin: 0;">Our sales representatives will reach out to you within the next 24 hours to discuss how we can best support your needs.</p>
          </div>
          
          <p style="margin-top: 40px; color: #94a3b8; font-size: 13px; text-align: center;">© ${new Date().getFullYear()} ${orgName}. All rights reserved.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('Welcome Email Error:', err);
    return false;
  }
}

export async function sendAdminNewLeadAlert(
  adminEmail: string,
  leadName: string,
  leadEmail: string,
  leadPhone: string,
  orgName: string
): Promise<void> {
  await sendEmail({
    to: adminEmail,
    subject: `🔔 New Lead Received: ${leadName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
        <h2 style="color:#818cf8;margin-bottom:16px;">New Lead Captured</h2>
        <p>A new lead has just filled out the public form for <strong>${orgName}</strong>.</p>
        <div style="background:#1e293b;padding:16px;border-radius:8px;border:1px solid #334155;margin:16px 0;">
          <p style="margin:4px 0;"><strong>Name:</strong> ${leadName}</p>
          <p style="margin:4px 0;"><strong>Email:</strong> ${leadEmail}</p>
          <p style="margin:4px 0;"><strong>Phone:</strong> ${leadPhone || 'Not provided'}</p>
        </div>
        <p style="color:#64748b;font-size:12px;">Log in to the SalesCRM dashboard to manage this lead.</p>
      </div>
    `,
  });
}
