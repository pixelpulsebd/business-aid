/**
 * Business Aid · Form responses → Google Sheet + email
 *
 * Setup (5 min):
 * 1. Create a Google Sheet, e.g. "Business Aid – Client Briefs".
 * 2. Extensions → Apps Script → paste this whole file → Save.
 * 3. Project Settings (gear) → Script Properties → Add:
 *      TOKEN      = same long random string as SHEET_TOKEN on Vercel
 *      NOTIFY_TO  = info@thebizaid.com   (comma-separate for more)
 * 4. Deploy → New deployment → type "Web app"
 *      Execute as: Me      Who has access: Anyone
 *    Authorize, then copy the URL ending in /exec → Vercel env SHEET_WEBHOOK_URL.
 * 5. After editing this code later: Deploy → Manage deployments → Edit → New version.
 *
 * Each form gets its own tab (e.g. "the-shadow-discovery"); one row per submission,
 * one column per question.
 */

function doPost(e) {
  const props = PropertiesService.getScriptProperties();
  let data;
  try {
    data = JSON.parse(e.postData.contents || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'bad json' });
  }
  if (!data.token || data.token !== props.getProperty('TOKEN')) {
    return json_({ ok: false, error: 'unauthorized' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tabName = String(data.form || 'responses').slice(0, 90);
    const sheet = ss.getSheetByName(tabName) || ss.insertSheet(tabName);

    const answers = data.answers || {};
    const ids = Object.keys(answers);
    const fixed = ['Received', 'Submission ID', 'IP', 'Device'];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(fixed.concat(ids.map(id => id + ' ' + answers[id].q), ['Full summary']));
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold').setWrap(true);
    }

    // Match answers to existing header columns so rows stay aligned if questions change.
    const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = new Array(header.length).fill('');
    row[0] = new Date(data.received_at || Date.now());
    row[1] = data.id || '';
    row[2] = data.ip || '';
    row[3] = data.user_agent || '';
    ids.forEach(id => {
      const label = id + ' ' + answers[id].q;
      let col = header.indexOf(label);
      if (col === -1) { // new question → add a column before "Full summary"
        const sumCol = header.indexOf('Full summary');
        const at = sumCol === -1 ? header.length : sumCol;
        sheet.insertColumnBefore(at + 1);
        sheet.getRange(1, at + 1).setValue(label).setFontWeight('bold');
        header.splice(at, 0, label);
        row.splice(at, 0, '');
        col = at;
      }
      row[col] = answers[id].a || '';
    });
    const sumCol = header.indexOf('Full summary');
    if (sumCol !== -1) row[sumCol] = data.summary || '';
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }

  const to = props.getProperty('NOTIFY_TO');
  if (to) {
    MailApp.sendEmail({
      to: to,
      subject: 'নতুন ব্রিফ জমা: ' + (data.form || '') + ' (' + (data.id || '') + ')',
      body: (data.summary || '') + '\n\nGoogle Sheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
    });
  }
  return json_({ ok: true });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
