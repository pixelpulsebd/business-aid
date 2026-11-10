import { createSign, randomBytes } from 'node:crypto';
import { Buffer } from 'node:buffer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 300_000;
const MAX_ANSWERS = 100;
const ANSWERS_SHEET_TAB = 'the-shadow';
const SUMMARY_SHEET_TAB = 'the-shadow-summary';
const ALLOWED_FORM = 'the-shadow-discovery';
const ALLOWED_HOST = 'brief.thebizaid.com';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const SHEETS_DAY_MS = 24 * 60 * 60 * 1000;
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

type JsonRecord = Record<string, unknown>;
type Answer = { q: string; a: string };
type Answers = Record<string, Answer>;
type GoogleTokenResponse = { access_token?: string; error?: string; error_description?: string };
type SheetMetadata = {
  properties?: { timeZone?: string };
  sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>;
};
type SheetRef = { sheetId: number; title: string };
type SheetCell = { userEnteredValue?: { stringValue?: string; numberValue?: number } };

type SubmissionRecord = {
  id: string;
  form: string;
  receivedAt: Date;
  clientTime: string;
  ip: string;
  userAgent: string;
  answers: Answers;
  summary: string;
};

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

function base64Url(input: string | Buffer): string {
  return (typeof input === 'string' ? Buffer.from(input) : input).toString('base64url');
}

function columnNumberToLetters(columnNumber: number): string {
  let value = columnNumber;
  let result = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function getClientIp(request: Request): string {
  return (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim().slice(0, 64);
}

function validateAnswers(value: unknown): Answers | null {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value);
  if (entries.length === 0 || entries.length > MAX_ANSWERS) return null;

  const answers: Answers = {};
  for (const [id, rawAnswer] of entries) {
    if (!/^\d{1,2}\.\d{1,2}$/.test(id) || !isRecord(rawAnswer)) return null;
    if (typeof rawAnswer.q !== 'string' || typeof rawAnswer.a !== 'string') return null;
    if (rawAnswer.q.length > 500 || rawAnswer.a.length > 12_000) return null;
    answers[id] = { q: rawAnswer.q, a: rawAnswer.a };
  }
  return answers;
}

async function getGoogleAccessToken(): Promise<string> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) throw new Error('Google Sheets service account is not configured.');

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: GOOGLE_SHEETS_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsignedToken = `${header}.${claims}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const assertion = `${unsignedToken}.${signer.sign(privateKey, 'base64url')}`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => ({}))) as GoogleTokenResponse;
  if (!response.ok || !payload.access_token) {
    console.error('Brief Google OAuth token request failed:', payload.error || response.status);
    throw new Error('Could not authenticate with Google Sheets.');
  }
  return payload.access_token;
}

async function sheetsRequest(url: string, accessToken: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(url, { ...init, headers, cache: 'no-store' });
}

async function getOrCreateSheet(
  spreadsheetUrl: string,
  accessToken: string,
  title: string,
): Promise<SheetRef> {
  const metadataUrl = new URL(spreadsheetUrl);
  metadataUrl.searchParams.set('fields', 'properties(timeZone),sheets(properties(sheetId,title))');
  const metadataResponse = await sheetsRequest(metadataUrl.toString(), accessToken);
  if (!metadataResponse.ok) {
    const details = await metadataResponse.text().catch(() => '');
    console.error('Brief spreadsheet metadata lookup failed:', metadataResponse.status, details.slice(0, 700));
    throw new Error('Could not access the configured response spreadsheet.');
  }

  const metadata = (await metadataResponse.json()) as SheetMetadata;
  const existing = metadata.sheets?.find((sheet) => sheet.properties?.title === title);
  if (typeof existing?.properties?.sheetId === 'number') {
    return { sheetId: existing.properties.sheetId, title };
  }

  const createResponse = await sheetsRequest(`${spreadsheetUrl}:batchUpdate`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      requests: [{
        addSheet: {
          properties: {
            title,
            gridProperties: { frozenRowCount: 1 },
          },
        },
      }],
    }),
  });
  const createPayload = (await createResponse.json().catch(() => ({}))) as {
    replies?: Array<{ addSheet?: { properties?: { sheetId?: number; title?: string } } }>;
    error?: { message?: string };
  };
  const createdProperties = createPayload.replies?.[0]?.addSheet?.properties;
  if (!createResponse.ok || typeof createdProperties?.sheetId !== 'number') {
    // A concurrent first submission may have created this tab after the metadata lookup.
    if (createPayload.error?.message?.toLowerCase().includes('already exists')) {
      const retryMetadata = await sheetsRequest(metadataUrl.toString(), accessToken);
      if (retryMetadata.ok) {
        const retry = (await retryMetadata.json()) as SheetMetadata;
        const sheet = retry.sheets?.find((item) => item.properties?.title === title);
        if (typeof sheet?.properties?.sheetId === 'number') return { sheetId: sheet.properties.sheetId, title };
      }
    }
    console.error(`Brief ${title} sheet creation failed:`, createResponse.status, createPayload.error?.message || 'unknown error');
    throw new Error(`Could not create the ${title} response tab.`);
  }
  return { sheetId: createdProperties.sheetId, title: createdProperties.title || title };
}

async function readHeader(
  spreadsheetUrl: string,
  accessToken: string,
  sheetTab: string,
): Promise<string[]> {
  const range = `'${sheetTab}'!1:1`;
  const endpoint = new URL(`${spreadsheetUrl}/values/${encodeURIComponent(range)}`);
  const response = await sheetsRequest(endpoint.toString(), accessToken);
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.error(`Brief ${sheetTab} header read failed:`, response.status, details.slice(0, 700));
    throw new Error(`Could not read the ${sheetTab} response headers.`);
  }
  const payload = (await response.json()) as { values?: unknown[][] };
  return (payload.values?.[0] ?? []).map((value) => String(value ?? ''));
}

async function writeHeader(
  spreadsheetUrl: string,
  accessToken: string,
  sheetTab: string,
  headers: string[],
): Promise<void> {
  const lastColumn = columnNumberToLetters(headers.length);
  const range = `'${sheetTab}'!A1:${lastColumn}1`;
  const endpoint = new URL(`${spreadsheetUrl}/values/${encodeURIComponent(range)}`);
  endpoint.searchParams.set('valueInputOption', 'RAW');
  const response = await sheetsRequest(endpoint.toString(), accessToken, {
    method: 'PUT',
    body: JSON.stringify({ majorDimension: 'ROWS', values: [headers] }),
  });
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.error(`Brief ${sheetTab} header update failed:`, response.status, details.slice(0, 700));
    throw new Error(`Could not prepare the ${sheetTab} response columns.`);
  }
}

function toSheetCell(value: unknown): SheetCell {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { userEnteredValue: { numberValue: value } };
  }
  if (value === null || value === undefined || value === '') return {};
  return { userEnteredValue: { stringValue: String(value) } };
}

function createRow(headers: string[], valuesByHeader: Record<string, unknown>): SheetCell[] {
  return headers.map((header) => toSheetCell(valuesByHeader[header]));
}

async function appendSubmission(
  spreadsheetUrl: string,
  accessToken: string,
  answersSheet: SheetRef,
  summarySheet: SheetRef,
  answersHeaders: string[],
  summaryHeaders: string[],
  data: SubmissionRecord,
): Promise<void> {
  const dhakaTimestamp = (data.receivedAt.getTime() + DHAKA_OFFSET_MS) / SHEETS_DAY_MS + 25569;
  const answerValues: Record<string, unknown> = {
    Received: dhakaTimestamp,
    'Submission ID': data.id,
    Form: data.form,
    'Client Submitted At': data.clientTime,
    IP: data.ip,
    Device: data.userAgent,
  };
  Object.entries(data.answers).forEach(([id, answer]) => {
    answerValues[`${id} ${answer.q}`] = answer.a;
  });

  const summaryValues: Record<string, unknown> = {
    Received: dhakaTimestamp,
    'Submission ID': data.id,
    Form: data.form,
    'Client Submitted At': data.clientTime,
    'Full summary': data.summary,
  };

  // Append both rows in one spreadsheets.batchUpdate call. Google Sheets applies a
  // batchUpdate atomically, avoiding a saved detail row without its corresponding summary.
  const response = await sheetsRequest(`${spreadsheetUrl}:batchUpdate`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          appendCells: {
            sheetId: answersSheet.sheetId,
            rows: [{ values: createRow(answersHeaders, answerValues) }],
            fields: 'userEnteredValue',
          },
        },
        {
          appendCells: {
            sheetId: summarySheet.sheetId,
            rows: [{ values: createRow(summaryHeaders, summaryValues) }],
            fields: 'userEnteredValue',
          },
        },
        {
          updateSpreadsheetProperties: {
            properties: { timeZone: 'Asia/Dhaka' },
            fields: 'timeZone',
          },
        },
        ...[answersSheet, summarySheet].map((sheet) => ({
          repeatCell: {
            range: { sheetId: sheet.sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true }, wrapStrategy: 'WRAP' } },
            fields: 'userEnteredFormat.textFormat.bold,userEnteredFormat.wrapStrategy',
          },
        })),
        ...[answersSheet, summarySheet].map((sheet) => ({
          repeatCell: {
            range: { sheetId: sheet.sheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 },
            cell: { userEnteredFormat: { numberFormat: { type: 'DATE_TIME', pattern: 'yyyy-mm-dd hh:mm:ss AM/PM' } } },
            fields: 'userEnteredFormat.numberFormat',
          },
        })),
      ],
    }),
  });
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.error('Brief response and summary append failed:', response.status, details.slice(0, 900));
    throw new Error('Could not save the questionnaire response and summary.');
  }
}

export async function POST(request: Request): Promise<Response> {
  const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase();
  const isLocalDevelopment = process.env.NODE_ENV !== 'production' && (host === 'localhost' || host === '127.0.0.1');
  if (host !== ALLOWED_HOST && !isLocalDevelopment) return json({ ok: false, error: 'Not found' }, 404);

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) return json({ ok: false, error: 'Expected JSON' }, 415);

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return json({ ok: false, error: 'Bad data' }, 400);
  }
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BYTES) return json({ ok: false, error: 'Too large' }, 413);

  let data: unknown;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, error: 'Bad data' }, 400);
  }
  if (!isRecord(data)) return json({ ok: false, error: 'Bad data' }, 400);
  if (typeof data.form !== 'string' || data.form !== ALLOWED_FORM) return json({ ok: false, error: 'Unknown form' }, 400);

  // Honeypot: return success to automated submissions without forwarding them.
  if (data.website) return json({ ok: true });

  const answers = validateAnswers(data.answers);
  if (!answers) return json({ ok: false, error: 'Invalid answers' }, 400);
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    console.error('Missing GOOGLE_SHEETS_SPREADSHEET_ID for Brief submission.');
    return json({ ok: false, error: 'Server not configured' }, 503);
  }

  const receivedAt = new Date();
  const id = `${receivedAt.toISOString().replace(/[-:T]/g, '').slice(0, 14)}-${randomBytes(4).toString('hex')}`;
  const record: SubmissionRecord = {
    id,
    form: ALLOWED_FORM,
    receivedAt,
    clientTime: String(data.submitted_at ?? '').slice(0, 80),
    ip: getClientIp(request),
    userAgent: (request.headers.get('user-agent') ?? '').slice(0, 300),
    answers,
    summary: typeof data.summary === 'string' ? data.summary.slice(0, 60_000) : '',
  };

  try {
    const accessToken = await getGoogleAccessToken();
    const spreadsheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`;
    const [answersSheet, summarySheet] = await Promise.all([
      getOrCreateSheet(spreadsheetUrl, accessToken, ANSWERS_SHEET_TAB),
      getOrCreateSheet(spreadsheetUrl, accessToken, SUMMARY_SHEET_TAB),
    ]);

    const [existingAnswerHeaders, existingSummaryHeaders] = await Promise.all([
      readHeader(spreadsheetUrl, accessToken, ANSWERS_SHEET_TAB),
      readHeader(spreadsheetUrl, accessToken, SUMMARY_SHEET_TAB),
    ]);

    const requiredAnswerHeaders = [
      'Received', 'Submission ID', 'Form', 'Client Submitted At', 'IP', 'Device',
      ...Object.entries(answers).map(([questionId, answer]) => `${questionId} ${answer.q}`),
    ];
    const answerHeaders = [...existingAnswerHeaders];
    requiredAnswerHeaders.forEach((header) => {
      if (!answerHeaders.includes(header)) answerHeaders.push(header);
    });

    const requiredSummaryHeaders = [
      'Received', 'Submission ID', 'Form', 'Client Submitted At', 'Full summary',
    ];
    const summaryHeaders = [...existingSummaryHeaders];
    requiredSummaryHeaders.forEach((header) => {
      if (!summaryHeaders.includes(header)) summaryHeaders.push(header);
    });

    if (answerHeaders.length !== existingAnswerHeaders.length || existingAnswerHeaders.length === 0) {
      await writeHeader(spreadsheetUrl, accessToken, ANSWERS_SHEET_TAB, answerHeaders);
    }
    if (summaryHeaders.length !== existingSummaryHeaders.length || existingSummaryHeaders.length === 0) {
      await writeHeader(spreadsheetUrl, accessToken, SUMMARY_SHEET_TAB, summaryHeaders);
    }

    await appendSubmission(
      spreadsheetUrl,
      accessToken,
      answersSheet,
      summarySheet,
      answerHeaders,
      summaryHeaders,
      record,
    );
    return json({ ok: true, id });
  } catch (error) {
    console.error('Brief submission failed:', error instanceof Error ? error.message : 'Unknown error');
    return json({ ok: false, error: 'Could not save' }, 502);
  }
}

export async function GET(): Promise<Response> { return json({ ok: false, error: 'POST only' }, 405); }
export async function PUT(): Promise<Response> { return json({ ok: false, error: 'POST only' }, 405); }
export async function PATCH(): Promise<Response> { return json({ ok: false, error: 'POST only' }, 405); }
export async function DELETE(): Promise<Response> { return json({ ok: false, error: 'POST only' }, 405); }
