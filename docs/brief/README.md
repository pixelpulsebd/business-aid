# Business Aid · The Shadow questionnaire

The questionnaire is served from **https://brief.thebizaid.com/the-shadow** by the existing Business Aid Next.js deployment. It is not a separate Vercel project.

## Questionnaire experience

- The 79 questions are split into 14 short, topic-based segments using the existing question groups.
- A sticky progress panel stays visible while the respondent scrolls. It shows the current segment, segment position, answers completed in that segment, and total answered out of 79.
- Previous and Next controls stay available in the sticky panel.
- Answers continue to autosave in the respondent's browser, so they can leave and return on the same browser.
- The form can be submitted with unanswered optional questions; the existing required questions remain enforced.

## Deployment

1. Deploy this repository to the same Vercel project that serves `thebizaid.com`.
2. In Vercel → Project → Settings → Domains, add `brief.thebizaid.com` to that same project. Keep the existing main-domain assignments.
3. At the DNS provider, create the DNS record Vercel requests for `brief`. Use the exact target displayed in Vercel.
4. Confirm that the following existing server-side environment variables are set in Vercel for Production:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_SHEETS_SPREADSHEET_ID`
   - `GOOGLE_SHEETS_RANGE` (optional; defaults to `Enquiries!A:F` for the main-site enquiry form)
5. Redeploy after updating code or environment variables.

The root of `brief.thebizaid.com` redirects to `https://thebizaid.com`. In local development, open `http://localhost:3000/the-shadow`.

## Response spreadsheet

The Shadow responses are written directly through the Google Sheets API into the **same spreadsheet file** used by the main website enquiries. The destination is a separate tab named exactly **`the-shadow`**; the existing `Enquiries` tab and its column layout are not modified.

The `the-shadow` tab is created automatically the first time a valid questionnaire submission is received if it does not already exist. It contains one row per submission, with submission metadata, one column per question, and a full-text summary column. The same service account already used by the enquiry form must have Editor access to the spreadsheet.

No separate spreadsheet, Google Apps Script deployment, webhook URL, or additional secret is required for The Shadow questionnaire. The old `SHEET_WEBHOOK_URL` and `SHEET_TOKEN` variables are no longer used by this version.

## Test checklist

- `https://thebizaid.com` still serves the main Business Aid website.
- `https://brief.thebizaid.com/the-shadow` serves the questionnaire.
- The 14 segments navigate forward and backward without losing answers.
- The sticky status shows the current segment and answered count out of 79.
- A test submission creates a row in the `the-shadow` tab in the same spreadsheet file as `Enquiries`.
- Confirm that the existing `Enquiries` tab continues to receive main-site enquiries normally.
