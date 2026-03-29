import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi" language="en-IN">Hello! This is an automated message from your service provider. Your account status is now updated. Thank you!</Say>
</Response>`.trim();

  return new Response(twiml, {
    headers: { 'Content-Type': 'text/xml' }
  });
}
