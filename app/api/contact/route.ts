import { createSign } from 'node:crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_NAME_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 3000;
const MAX_SERVICES = 30;
const MAX_ENQUIRIES_PER_PHONE = 3;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const SHEETS_DAY_MS = 24 * 60 * 60 * 1000;
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

type EnquiryBody = {
  name?: unknown;
  phone?: unknown;
  services?: unknown;
  message?: unknown;
  channel?: unknown;
};

type ServiceAccountTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function base64Url(input: string | Buffer): string {
  const bytes = typeof input === 'string' ? Buffer.from(input) : input;
  return bytes.toString('base64url');
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

function normalizePhone(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value).replace(/\D/g, '');
}

/**
 * Sheets numeric date/time values are timezone-less serials. This project stores
 * them as Dhaka wall time, so their differences can be compared with a similarly
 * shifted current time to enforce a rolling 24-hour window.
 */
function toDhakaSheetsSerial(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return null;

  const parsedMs = Date.parse(value);
  if (!Number.isFinite(parsedMs)) return null;
  return (parsedMs + DHAKA_OFFSET_MS) / SHEETS_DAY_MS + 25569;
}

// Serialize same-phone submissions handled by this Node.js process so two quick
// requests cannot both pass the sheet-history check before either one is appended.
// The sheet remains the persistent source of truth across process restarts.
const phoneSubmissionQueues = new Map<string, Promise<void>>();

async function acquirePhoneSubmissionLock(phone: string): Promise<() => void> {
  const previous = phoneSubmissionQueues.get(phone) ?? Promise.resolve();
  let releaseCurrent!: () => void;
  const current = new Promise<void>((resolve) => { releaseCurrent = resolve; });
  phoneSubmissionQueues.set(phone, current);
  await previous;

  return () => {
    releaseCurrent();
    if (phoneSubmissionQueues.get(phone) === current) phoneSubmissionQueues.delete(phone);
  };
}

async function getGoogleAccessToken(): Promise<string> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Google Sheets integration is not configured on the server.');
  }

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

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  });
  const tokenPayload = (await tokenResponse.json().catch(() => ({}))) as ServiceAccountTokenResponse;

  if (!tokenResponse.ok || !tokenPayload.access_token) {
    console.error('Google OAuth token request failed:', tokenPayload.error || tokenResponse.status);
    throw new Error('Could not authenticate with Google Sheets. Check the server credentials.');
  }

  return tokenPayload.access_token;
}

export async function POST(request: Request) {
  let body: EnquiryBody;
  try {
    body = (await request.json()) as EnquiryBody;
  } catch {
    return NextResponse.json({ success: false, message: 'Please submit a valid enquiry form.' }, { status: 400 });
  }

  const name = asTrimmedString(body.name);
  const phone = typeof body.phone === 'string' ? body.phone : '';
  const message = asTrimmedString(body.message);
  const services = Array.isArray(body.services)
    ? body.services.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, MAX_SERVICES)
    : [];
  const channel = body.channel === 'whatsapp' ? 'WhatsApp draft' : 'Website enquiry';

  if (!name || !phone || !services.length || !message) {
    return NextResponse.json({ success: false, message: 'Please complete every field and choose at least one service.' }, { status: 400 });
  }
  if (name.length > MAX_NAME_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ success: false, message: 'One or more fields are longer than allowed.' }, { status: 400 });
  }
  if (!/^0\d{10}$/.test(phone)) {
    return NextResponse.json({ success: false, message: 'Phone number must contain exactly 11 digits and start with 0.' }, { status: 400 });
  }

  const releasePhoneLock = await acquirePhoneSubmissionLock(normalizePhone(phone));
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const range = process.env.GOOGLE_SHEETS_RANGE || 'Enquiries!A:F';
    if (!spreadsheetId) {
      console.error('Missing GOOGLE_SHEETS_SPREADSHEET_ID environment variable.');
      return NextResponse.json({ success: false, message: 'Enquiry submission is not configured yet. Please contact us on WhatsApp.' }, { status: 503 });
    }

    try {
      const accessToken = await getGoogleAccessToken();
      const spreadsheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`;

      // Resolve the destination tab so its timestamp column can be formatted explicitly.
      const metadataUrl = new URL(spreadsheetUrl);
      metadataUrl.searchParams.set('fields', 'properties(timeZone),sheets(properties(sheetId,title))');
      const metadataResponse = await fetch(metadataUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });

      if (!metadataResponse.ok) {
        const details = await metadataResponse.text().catch(() => '');
        console.error('Google Sheets metadata lookup failed:', metadataResponse.status, details.slice(0, 1000));
        return NextResponse.json({ success: false, message: 'We could not access the enquiry spreadsheet. Please check its configuration.' }, { status: 502 });
      }

      const metadata = (await metadataResponse.json()) as {
        sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>;
      };
      const rawTabName = range.includes('!') ? range.slice(0, range.lastIndexOf('!')).trim() : '';
      const tabName = rawTabName.startsWith("'") && rawTabName.endsWith("'")
        ? rawTabName.slice(1, -1).replace(/''/g, "'")
        : rawTabName;
      const targetSheet = tabName
        ? metadata.sheets?.find((sheet) => sheet.properties?.title === tabName)
        : metadata.sheets?.[0];
      const sheetId = targetSheet?.properties?.sheetId;
      const actualTabName = targetSheet?.properties?.title;
      const a1Range = range.includes('!') ? range.slice(range.lastIndexOf('!') + 1) : range;
      const startColumnLetters = a1Range.match(/^\$?([A-Z]+)/i)?.[1]?.toUpperCase() || 'A';
      const timestampColumnIndex = startColumnLetters
        .split('')
        .reduce((index, letter) => index * 26 + letter.charCodeAt(0) - 64, 0) - 1;

      if (typeof sheetId !== 'number' || !actualTabName) {
        console.error('Could not resolve target Google Sheets tab for range:', range);
        return NextResponse.json({ success: false, message: 'The configured enquiry sheet tab could not be found.' }, { status: 500 });
      }

      // Enforce a rolling 24-hour limit per phone number using persistent enquiry
      // history in Sheets. The per-phone queue above serializes same-process requests.
      const escapedTabName = actualTabName.replace(/'/g, "''");
      const baseColumnNumber = startColumnLetters
        .split('')
        .reduce((column, letter) => column * 26 + letter.charCodeAt(0) - 64, 0);
      const rateLimitRange = `'${escapedTabName}'!${columnNumberToLetters(baseColumnNumber)}2:${columnNumberToLetters(baseColumnNumber + 2)}`;
      const historyUrl = new URL(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(rateLimitRange)}`,
      );
      historyUrl.searchParams.set('valueRenderOption', 'UNFORMATTED_VALUE');
      const historyResponse = await fetch(historyUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });

      if (!historyResponse.ok) {
        const details = await historyResponse.text().catch(() => '');
        console.error('Google Sheets enquiry history lookup failed:', historyResponse.status, details.slice(0, 1000));
        return NextResponse.json({ success: false, message: 'We could not verify your enquiry limit right now. Please try again shortly.' }, { status: 502 });
      }

      const history = (await historyResponse.json()) as { values?: unknown[][] };
      const nowDhakaSerial = (Date.now() + DHAKA_OFFSET_MS) / SHEETS_DAY_MS + 25569;
      const cutoffDhakaSerial = nowDhakaSerial - RATE_LIMIT_WINDOW_MS / SHEETS_DAY_MS;
      const submittedPhone = normalizePhone(phone);
      const recentMatchingTimes = (history.values ?? [])
        .filter((row) => normalizePhone(row[2]) === submittedPhone)
        .map((row) => toDhakaSheetsSerial(row[0]))
        .filter((serial): serial is number => serial !== null && serial > cutoffDhakaSerial && serial <= nowDhakaSerial);

      if (recentMatchingTimes.length >= MAX_ENQUIRIES_PER_PHONE) {
        const oldestRecentSerial = Math.min(...recentMatchingTimes);
        const retryAfterSeconds = Math.max(1, Math.ceil((oldestRecentSerial + 1 - nowDhakaSerial) * 24 * 60 * 60));
        const availableAt = new Date(Date.now() + retryAfterSeconds * 1000).toLocaleString('en-GB', {
          timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short',
        });
        return NextResponse.json(
          {
            success: false,
            code: 'ENQUIRY_LIMIT_REACHED',
            message: `You have reached the limit of ${MAX_ENQUIRIES_PER_PHONE} enquiries per phone number in 24 hours. Please try again after ${availableAt} Bangladesh time.`,
          },
          { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
        );
      }

      // Store the timestamp as a numeric Sheets date/time serial representing Dhaka wall time.
      // Google Sheets serial dates are timezone-less numbers, so shift the UTC instant by +06:00.
      const dhakaTimestampMs = Date.now() + 6 * 60 * 60 * 1000;
      const sheetsDateTime = dhakaTimestampMs / 86400000 + 25569;

      // Keep the spreadsheet timezone and timestamp column consistent for future submissions.
      const formattingResponse = await fetch(`${spreadsheetUrl}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              updateSpreadsheetProperties: {
                properties: { timeZone: 'Asia/Dhaka' },
                fields: 'timeZone',
              },
            },
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 1,
                  startColumnIndex: timestampColumnIndex,
                  endColumnIndex: timestampColumnIndex + 1,
                },
                cell: {
                  userEnteredFormat: {
                    numberFormat: {
                      type: 'DATE_TIME',
                      pattern: 'yyyy-mm-dd hh:mm:ss AM/PM',
                    },
                  },
                },
                fields: 'userEnteredFormat.numberFormat',
              },
            },
          ],
        }),
        cache: 'no-store',
      });

      if (!formattingResponse.ok) {
        const details = await formattingResponse.text().catch(() => '');
        console.error('Google Sheets date/time formatting failed:', formattingResponse.status, details.slice(0, 1000));
        return NextResponse.json({ success: false, message: 'We could not configure date and time formatting in the enquiry spreadsheet.' }, { status: 502 });
      }

      // A full A1 range makes append work even when the optional range has no tab prefix.
      const appendRange = range.includes('!')
        ? range
        : `'${actualTabName.replace(/'/g, "''")}'!${range}`;
      const endpoint = new URL(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(appendRange)}:append`,
      );
      endpoint.searchParams.set('valueInputOption', 'RAW');
      endpoint.searchParams.set('insertDataOption', 'INSERT_ROWS');

      const sheetResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          majorDimension: 'ROWS',
          values: [[sheetsDateTime, name, phone, services.join(', '), message, channel]],
        }),
        cache: 'no-store',
      });

      if (!sheetResponse.ok) {
        const details = await sheetResponse.text().catch(() => '');
        console.error('Google Sheets append failed:', sheetResponse.status, details.slice(0, 1000));
        return NextResponse.json({ success: false, message: 'We could not save your enquiry. Please try again or use WhatsApp.' }, { status: 502 });
      }

      return NextResponse.json({
        success: true,
        message: channel === 'WhatsApp draft'
          ? 'Your enquiry is ready for WhatsApp. Review it there and press Send.'
          : 'Thank you. Your enquiry has been sent successfully.',
      });
    } catch (error) {
      console.error('Contact form submission failed:', error instanceof Error ? error.message : 'Unknown error');
      return NextResponse.json({ success: false, message: 'We could not send your enquiry. Please try again or use WhatsApp.' }, { status: 500 });
    }
  } finally {
    releasePhoneLock();
  }
}
