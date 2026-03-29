export async function initiateCall(agentPhone: string, leadPhone: string, twimlUrl: string) {
  const accountSid = process.env.TWILIO_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_NUMBER;

  if (!accountSid || !authToken || !twilioNumber) {
    throw new Error('Missing Twilio credentials in environment variables');
  }

  // Helper to clean phone numbers (intent-based cleaning)
  const cleanPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    // If it's 10 digits, it might be Indian or US. 
    // For Twilio, E.164 is required. We'll assume the input might already have country code or needs it.
    // If it starts with '0' or is 10 digits, we'll prefix with +91 (since CRM context was India)
    // or just ensure it starts with +
    if (digits.length === 10) return `+91${digits}`;
    if (digits.startsWith('0') && digits.length === 11) return `+91${digits.slice(1)}`;
    return digits.startsWith('+') ? digits : `+${digits}`;
  };

  const params = new URLSearchParams();
  params.append('From', twilioNumber);
  params.append('To', cleanPhone(agentPhone));
  params.append('Url', twimlUrl);
  params.append('StatusCallback', `${process.env.NEXT_PUBLIC_APP_URL}/api/calls/webhook`);
  params.append('Record', 'true');

  const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error('Twilio Error:', data);
    throw new Error(data.message || 'Failed to initiate call via Twilio');
  }

  return { sid: data.sid };
}

export async function sendSMS(to: string, body: string) {
  const accountSid = process.env.TWILIO_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_NUMBER;

  if (!accountSid || !authToken || !twilioNumber) {
    throw new Error('Missing Twilio credentials in environment variables');
  }

  const cleanPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    return digits.startsWith('+') ? digits : `+${digits}`;
  };

  const params = new URLSearchParams();
  params.append('From', twilioNumber);
  params.append('To', cleanPhone(to));
  params.append('Body', body);

  const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error('Twilio SMS Error:', data);
    throw new Error(data.message || 'Failed to send SMS via Twilio');
  }

  return { sid: data.sid };
}
