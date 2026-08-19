const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, '');
  const from = process.env.SMTP_FROM || 'DealByte CRM <info@synturesolutions.com>';

  if (!host || !user || !pass) {
    console.warn('⚠️  [EMAIL] SMTP not configured — email was NOT sent.');
    console.log(`  → To: ${opts.to}`);
    console.log(`  → Subject: ${opts.subject}`);
    return;
  }

  try {
    const nodemailer = await import('nodemailer');
    const port = parseInt(process.env.SMTP_PORT || '587');
    const secure = process.env.SMTP_SECURE === 'true';

    const transporter = nodemailer.default.createTransport({
      host,
      port,
      secure, // false for port 587 (STARTTLS), true for port 465
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    console.log(`[EMAIL] Attempting SMTP send via ${host}:${port} to ${opts.to}...`);
    const info = await transporter.sendMail({ from, ...opts });
    console.log(`✅ [EMAIL SUCCESS] Sent to ${opts.to} | MessageId: ${info.messageId}`);
  } catch (err) {
    console.error(`❌ [EMAIL FAILURE] Failed to send to ${opts.to}:`, err);
  }
}

export async function sendPasswordResetEmail(
  email: string,
  userName: string,
  token: string
): Promise<void> {
  const resetUrl = `${APP_URL}/set-password/${token}`;
  await sendEmail({
    to: email,
    subject: `Reset Your DealByte CRM Password`,
    html: `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="width:48px;height:48px;background:#e0e7ff;color:#4f46e5;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:20px;font-weight:bold;">
            🔑
          </div>
          <h1 style="color:#0f172a;font-size:22px;font-weight:800;margin:0 0 6px;">Password Reset Request</h1>
          <p style="color:#64748b;font-size:14px;margin:0;">DealByte CRM Account Recovery</p>
        </div>
        <div style="color:#334155;font-size:14px;line-height:1.6;">
          <p>Hi <strong>${userName}</strong>,</p>
          <p>We received a request to reset the password for your account associated with <strong>${email}</strong>.</p>
          <p>Click the button below to set a new password. This link is valid for <strong>24 hours</strong>.</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${resetUrl}" 
               style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#ffffff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">
              Reset Password
            </a>
          </div>
          <p style="color:#64748b;font-size:12px;">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${resetUrl}" style="color:#4f46e5;">${resetUrl}</a></p>
          <hr style="border-color:#f1f5f9;margin:24px 0;"/>
          <p style="color:#94a3b8;font-size:12px;margin:0;">If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
      </div>
    `,
  });
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
    subject: `Your "${orgName}" account on DealByte CRM has been approved!`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
        <h1 style="color:#818cf8;margin-bottom:8px;">🎉 You're approved!</h1>
        <p>Hi <strong>${adminName}</strong>,</p>
        <p>Great news! Your organization <strong>${orgName}</strong> has been approved on DealByte CRM.</p>
        <p>Click the button below to set your password and get started. This link expires in <strong>24 hours</strong>.</p>
        <a href="${setPasswordUrl}" 
           style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#6366f1,#0ea5e9);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
          Set Your Password
        </a>
        <p style="color:#64748b;font-size:13px;">Or copy this link:<br/><a href="${setPasswordUrl}" style="color:#818cf8;">${setPasswordUrl}</a></p>
        <hr style="border-color:#334155;margin-top:32px;"/>
        <p style="color:#475569;font-size:12px;">If you didn't register for DealByte CRM, please ignore this email.</p>
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
    subject: `Update on your DealByte CRM application for "${orgName}"`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
        <h1 style="color:#f87171;margin-bottom:8px;">Application Update</h1>
        <p>Hi <strong>${adminName}</strong>,</p>
        <p>We've reviewed your application for <strong>${orgName}</strong> on DealByte CRM.</p>
        <p>Unfortunately, we are unable to approve your request at this time.</p>
        ${reason ? `<div style="background:#1e293b;padding:16px;border-radius:8px;border-left:4px solid #f87171;margin:16px 0;"><strong>Reason:</strong> ${reason}</div>` : ''}
        <p>You may <a href="${APP_URL}/register" style="color:#818cf8;">submit a new application</a> if you believe this was an error.</p>
        <hr style="border-color:#334155;margin-top:32px;"/>
        <p style="color:#475569;font-size:12px;">DealByte CRM Support</p>
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
  console.log(`[EMAIL] Sending welcome email to lead: ${email} for org: ${orgName}`);
  try {
    await sendEmail({
      to: email,
      subject: `Thank you for your interest in ${orgName}!`,
      html: `
        <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;padding:0;background:#f8fafc;">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#1a73e8,#1557b0);padding:40px 40px 32px;border-radius:12px 12px 0 0;text-align:center;">
            <div style="width:52px;height:52px;background:rgba(255,255,255,0.2);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
              <span style="font-size:24px;">📋</span>
            </div>
            <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 8px;">Thank You, ${firstName}!</h1>
            <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">We've received your inquiry</p>
          </div>
          <!-- Body -->
          <div style="background:#ffffff;padding:32px 40px;border:1px solid #e2e8f0;border-top:none;">
            <p style="color:#1a202c;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi <strong>${firstName}</strong>,</p>
            <p style="color:#4a5568;font-size:14px;line-height:1.7;margin:0 0 20px;">
              Thank you for showing interest in <strong style="color:#1a73e8;">${orgName}</strong>. 
              We've received your details and a member of our team will reach out to you shortly.
            </p>
            <div style="background:#f0f4f9;border-left:4px solid #1a73e8;border-radius:0 8px 8px 0;padding:16px 20px;margin:24px 0;">
              <p style="color:#1a73e8;font-size:13px;font-weight:700;margin:0 0 6px;">⏱ What happens next?</p>
              <p style="color:#4a5568;font-size:13px;margin:0;line-height:1.6;">Our sales team will review your inquiry and contact you within 24 hours to discuss how we can help you best.</p>
            </div>
          </div>
          <!-- Footer -->
          <div style="background:#f8fafc;padding:20px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;text-align:center;">
            <p style="color:#a0aec0;font-size:12px;margin:0;">© ${new Date().getFullYear()} ${orgName} · Powered by DealByte CRM</p>
          </div>
        </div>
      `,
    });
    console.log(`[EMAIL] ✅ Welcome email sent to ${email}`);
    return true;
  } catch (err) {
    console.error(`[EMAIL] ❌ Welcome email failed for ${email}:`, err);
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
        <p style="color:#64748b;font-size:12px;">Log in to the DealByte CRM dashboard to manage this lead.</p>
      </div>
    `,
  });
}

export async function sendDunningInvoiceEmail(
  toEmail: string,
  clientName: string,
  milestoneName: string,
  amount: number,
  dueDate: Date,
  packageName: string
): Promise<void> {
  const formattedDueDate = new Date(dueDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedAmount = (amount / 100000).toFixed(2);

  await sendEmail({
    to: toEmail,
    subject: `💳 Payment Reminder: ₹${formattedAmount} Lakhs due for ${packageName}`,
    html: `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;padding:0;background:#f8fafc;">
        <div style="background:linear-gradient(135deg,#4f46e5,#3b82f6);padding:32px 40px;border-radius:12px 12px 0 0;text-align:center;">
          <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
            <span style="font-size:24px;">💳</span>
          </div>
          <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 6px;">Payment Milestone Reminder</h1>
          <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:0;">Invoice Notice for ${packageName}</p>
        </div>
        <div style="background:#ffffff;padding:32px 40px;border:1px solid #e2e8f0;border-top:none;">
          <p style="color:#1e293b;font-size:15px;line-height:1.6;margin:0 0 16px;">Dear <strong>${clientName}</strong>,</p>
          <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
            This is a friendly notification regarding your upcoming payment milestone for <strong>${packageName}</strong>.
          </p>
          <div style="background:#f1f5f9;border-left:4px solid #4f46e5;border-radius:0 8px 8px 0;padding:20px;margin:24px 0;">
            <p style="margin:4px 0;font-size:13px;color:#64748b;">Milestone: <strong style="color:#0f172a;">${milestoneName}</strong></p>
            <p style="margin:4px 0;font-size:13px;color:#64748b;">Amount Due: <strong style="color:#4f46e5;font-size:16px;">₹${formattedAmount} Lakhs</strong></p>
            <p style="margin:4px 0;font-size:13px;color:#64748b;">Due Date: <strong style="color:#0f172a;">${formattedDueDate}</strong></p>
          </div>
          <p style="color:#64748b;font-size:13px;line-height:1.6;">
            Please ensure timely clearance to avoid any disruption to your active implementation delivery timeline.
          </p>
        </div>
        <div style="background:#f8fafc;padding:20px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">© ${new Date().getFullYear()} Enterprise Post-Sales Billing Department</p>
        </div>
      </div>
    `,
  });
}
