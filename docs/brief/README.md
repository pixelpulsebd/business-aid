# Business Aid · The Shadow questionnaire

The questionnaire is served from **https://brief.thebizaid.com/the-shadow** by the existing Business Aid Next.js deployment. It is not a separate Vercel project.

## Questionnaire experience

The questionnaire uses a contained, four-stage flow so respondents always know where they are:

1. **Intro** — explains the purpose, estimated time, autosave behavior, and the Start action. The questions are not shown until the respondent clicks **Start**.
2. **Segmented Q/A** — displays one of the 14 topic-based segments at a time. The sticky progress panel shows the current segment name and position, answered count for that segment, and overall answers completed out of 79. Previous and Next controls keep navigation inside the questionnaire.
3. **Final submit page** — appears after Next on the last segment. It shows the overall answer count, allows the respondent to return to the final segment, and provides the explicit Submit action. Required questions are validated before sending.
4. **Submission complete** — appears only after the API confirms that the submission was saved. It confirms success and provides links to the Business Aid website, WhatsApp, and email.

Answers autosave in the respondent's browser, including the current segment, so they can leave and resume on the same browser. Optional questions can remain unanswered; the existing required questions remain enforced. If submission fails, the final page stays available for retry and offers a copyable response summary.

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
- The intro is the only visible stage on first load; clicking Start opens the first saved/current segment.
- The 14 segments navigate forward and backward without losing answers, and the sticky status shows current segment and answered count out of 79.
- Next on the final segment opens the final submit page; Previous returns to the final segment.
- The success page appears only after the API confirms a successful save and exposes the website, WhatsApp, and email links.
- A test submission creates a row in the `the-shadow` tab in the same spreadsheet file as `Enquiries`.
- Confirm that the existing `Enquiries` tab continues to receive main-site enquiries normally.
