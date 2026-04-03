export async function sendWhatsApp(to: string, body: string) {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;

  if (!instanceId || !token) {
    throw new Error('Ultramsg credentials missing');
  }

  // Clean phone number
  const cleanPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`; // Default to India
    return digits;
  };

  const response = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      token,
      to: cleanPhone(to),
      body,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to send WhatsApp message via Ultramsg');
  }

  return data;
}
