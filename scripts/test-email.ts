import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testEmail() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const from = process.env.SMTP_FROM;

  console.log('Testing SMTP with:');
  console.log(`- Host: ${host}`);
  console.log(`- User: ${user}`);
  console.log(`- Port: ${port}`);
  console.log(`- Pass length: ${pass?.length || 0}`);

  if (!host || !user || !pass) {
    console.error('❌ Missing SMTP environment variables in .env.local');
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });

  try {
    console.log('Attempting to verify transporter...');
    await transporter.verify();
    console.log('✅ Connection Successful!');

    console.log('Sending test email...');
    await transporter.sendMail({
      from,
      to: user, // Send to self
      subject: 'SalesCRM SMTP Test',
      text: 'If you are reading this, your SMTP configuration is working correctly!',
    });
    console.log('✅ Test Email Sent to', user);
  } catch (error: any) {
    console.error('❌ SMTP Error:', error.message);
    if (error.code === 'EAUTH') {
      console.error('  TIP: Check your App Password. Your regular Gmail password will NOT work.');
    }
  }
}

testEmail();
