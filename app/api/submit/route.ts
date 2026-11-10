import { randomBytes } from 'node:crypto';
import { Buffer } from 'node:buffer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 300_000;
const ALLOWED_FORMS = new Set(['the-shadow-discovery']);
const ALLOWED_HOST = 'brief.thebizaid.com';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function json(body: JsonRecord, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

function getClientIp(request: Request): string {
  // Vercel supplies x-forwarded-for. This value is stored only as a diagnostic
  // field; it is not used for authentication, authorization, or rate limiting.
  return (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim().slice(0, 64);
}

export async function POST(request: Request): Promise<Response> {
  const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase();
  const isLocalDevelopment =
    process.env.NODE_ENV !== 'production' &&
    (host === 'localhost' || host === '127.0.0.1');

  if (host !== ALLOWED_HOST && !isLocalDevelopment) {
    return json({ ok: false, error: 'Not found' }, 404);
  }

  const webhookUrl = process.env.SHEET_WEBHOOK_URL;
  const sheetToken = process.env.SHEET_TOKEN;
  if (!webhookUrl || !sheetToken) {
    return json({ ok: false, error: 'Server not configured' }, 500);
  }

  let parsedWebhookUrl: URL;
  try {
    parsedWebhookUrl = new URL(webhookUrl);
  } catch {
    return json({ ok: false, error: 'Server not configured' }, 500);
  }
  if (
    parsedWebhookUrl.protocol !== 'https:' ||
    parsedWebhookUrl.hostname !== 'script.google.com' ||
    !/^\/macros\/s\/[^/]+\/exec\/?$/.test(parsedWebhookUrl.pathname)
  ) {
    return json({ ok: false, error: 'Server not configured' }, 500);
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return json({ ok: false, error: 'Expected JSON' }, 415);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return json({ ok: false, error: 'Bad data' }, 400);
  }

  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BYTES) {
    return json({ ok: false, error: 'Too large' }, 413);
  }

  let data: unknown;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, error: 'Bad data' }, 400);
  }

  if (!isRecord(data) || !isRecord(data.answers)) {
    return json({ ok: false, error: 'Bad data' }, 400);
  }

  // Apps Script expects each answer to contain string question and answer fields.
  // Reject malformed values before they reach the spreadsheet-writing script.
  const answersAreValid = Object.values(data.answers).every(
    (answer) => isRecord(answer) && typeof answer.q === 'string' && typeof answer.a === 'string',
  );
  if (!answersAreValid) {
    return json({ ok: false, error: 'Bad data' }, 400);
  }

  // Honeypot: bots fill the hidden website field. Return a success-shaped
  // response but do not forward the submission to Google Sheets.
  if (data.website) {
    return json({ ok: true });
  }

  if (typeof data.form !== 'string' || !ALLOWED_FORMS.has(data.form)) {
    return json({ ok: false, error: 'Unknown form' }, 400);
  }

  const receivedAt = new Date();
  const id = `${receivedAt.toISOString().replace(/[-:T]/g, '').slice(0, 14)}-${randomBytes(4).toString('hex')}`;
  const record = {
    token: sheetToken,
    id,
    form: data.form,
    received_at: receivedAt.toISOString(),
    client_time: String(data.submitted_at ?? '').slice(0, 40),
    ip: getClientIp(request),
    user_agent: (request.headers.get('user-agent') ?? '').slice(0, 300),
    answers: data.answers,
    summary: typeof data.summary === 'string' ? data.summary : '',
  };

  try {
    const response = await fetch(parsedWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(record),
      redirect: 'follow',
      cache: 'no-store',
    });

    const responseText = await response.text();
    let result: unknown = null;
    try {
      result = JSON.parse(responseText);
    } catch {
      // A non-JSON response is treated as a failed webhook call.
    }

    if (!response.ok || !isRecord(result) || result.ok !== true) {
      console.error('Brief Google Sheets webhook failed', response.status, responseText.slice(0, 300));
      return json({ ok: false, error: 'Could not save' }, 502);
    }

    return json({ ok: true, id });
  } catch (error) {
    console.error('Brief Google Sheets webhook error', error);
    return json({ ok: false, error: 'Could not save' }, 502);
  }
}

export async function GET(): Promise<Response> {
  return json({ ok: false, error: 'POST only' }, 405);
}

export async function PUT(): Promise<Response> {
  return json({ ok: false, error: 'POST only' }, 405);
}

export async function PATCH(): Promise<Response> {
  return json({ ok: false, error: 'POST only' }, 405);
}

export async function DELETE(): Promise<Response> {
  return json({ ok: false, error: 'POST only' }, 405);
}
