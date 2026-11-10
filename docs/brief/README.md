# Business Aid client briefs

The client brief form is served from **https://brief.thebizaid.com/the-shadow** by the existing Business Aid Next.js deployment. It is not a second Vercel project.

## Deployment

1. Deploy this merged repository to the same Vercel project that serves `thebizaid.com`.
2. In Vercel → Project → Settings → Domains, add `brief.thebizaid.com` to that same project. Keep `thebizaid.com` and `www.thebizaid.com` assigned as they already are.
3. At the DNS provider, create the DNS record Vercel requests for `brief`. Vercel commonly requests a CNAME to `cname.vercel-dns.com`; use the exact target shown in the project/domain screen.
4. In Vercel → Project → Settings → Environment Variables, add these server-side variables for Production (and Preview only if preview submissions are intended):
   - `SHEET_WEBHOOK_URL`: the Google Apps Script Web App `/exec` URL.
   - `SHEET_TOKEN`: the same long random token configured in the Apps Script project's Script Properties.
5. Redeploy after setting environment variables.

The root of `brief.thebizaid.com` redirects to `https://thebizaid.com`, matching the original Brief project's behavior. The form is at `/the-shadow`. In local development, open `http://localhost:3000/the-shadow` (the form host routing is enabled for localhost outside production).

## Google Sheets + Apps Script setup

1. Create a Google Sheet for client briefs.
2. Open Extensions → Apps Script and paste `google-apps-script.gs` from this directory.
3. In Apps Script → Project Settings → Script Properties, add:
   - `TOKEN`: a long random secret (at least 24 random bytes is recommended).
   - `NOTIFY_TO`: `info@thebizaid.com`.
4. Deploy → New deployment → Web app. Set **Execute as: Me** and **Who has access: Anyone**. Authorize it and copy the `/exec` URL.
5. Put that URL in Vercel as `SHEET_WEBHOOK_URL` and the same token in Vercel as `SHEET_TOKEN`.

The Apps Script URL and token are used only by the server-side route. They are not embedded in the client HTML or exposed as `NEXT_PUBLIC_` variables.

## Test checklist

- `https://thebizaid.com` still serves the Business Aid homepage.
- `https://brief.thebizaid.com/the-shadow` serves the Bengali discovery form.
- `https://brief.thebizaid.com/` redirects to `https://thebizaid.com`.
- Submit a test form and confirm the thank-you message, a new row in the `the-shadow-discovery` sheet tab, and a notification email at `info@thebizaid.com`.
- Remove the test row before sharing the form with the client.

The form intentionally sends `noindex, nofollow` directives. The main website's existing Google Sheets contact endpoint and configuration are separate and unchanged.
