export async function triggerPromoCall(phone: string, name: string, organizationName: string) {
  const apiKey = process.env.BLAND_API_KEY;

  if (!apiKey) {
    throw new Error('BLAND_API_KEY is not configured in .env.local');
  }

  // Formatting for E.164 if needed
  const cleanPhone = (p: string) => {
    const digits = p.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.startsWith('0') && digits.length === 11) return `+91${digits.slice(1)}`;
    return p.startsWith('+') ? p : `+${digits}`;
  };

  const formattedPhone = cleanPhone(phone);

  const response = await fetch('https://api.bland.ai/v1/calls', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone_number: formattedPhone,
      task: `Hi ${name.split(' ')[0]}, this is a quick thank you call from ${organizationName}! We received your interest in our Sales CRM and will reach out to you very soon for a full demo. Have a great day!`,
      voice: 'maya', // Professional female voice
      language: 'en',
      wait_for_greeting: true,
      record: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('BLAND API ERROR RAW:', errorBody);
    let errorMessage = 'Failed to trigger Bland AI call';
    try {
      const parsed = JSON.parse(errorBody);
      errorMessage = parsed.message || parsed.error || errorMessage;
    } catch (e) {
      errorMessage = errorBody || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json();
}
