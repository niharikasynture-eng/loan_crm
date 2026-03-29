import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let leadPhone = searchParams.get('leadPhone');

  console.log('📞 TWIML REQUEST RECEIVED:', { url: req.url, leadPhone });

  if (!leadPhone) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error: Lead number missing</Say></Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }

  // Ensure E.164 format for the Dial tag
  const cleanPhone = (p: string) => {
    const digits = p.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.startsWith('0') && digits.length === 11) return `+91${digits.slice(1)}`;
    return p.startsWith('+') ? p : `+${digits}`;
  };

  const formattedPhone = cleanPhone(leadPhone);
  console.log('🎯 DIALING LEAD:', formattedPhone);

  // TwiML to dial the lead and record the call
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Connecting you to the lead. Please wait.</Say>
    <Dial record="record-from-answer-dual">
        <Number>${formattedPhone}</Number>
    </Dial>
</Response>`.trim();

  console.log('📦 RETURNING TWIML:', twiml);

  return new Response(twiml, {
    headers: { 'Content-Type': 'text/xml' }
  });
}
