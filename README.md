# Business Aid — Website

A responsive Next.js + TypeScript homepage for Business Aid, serving e-commerce/F-commerce owners, entrepreneurs, individuals seeking income-tax support, and businesses needing RJSC registration or compliance assistance.

## Homepage structure

1. **Header** — responsive navigation with the Our Work link and a dark/light appearance toggle. The first visit follows the operating-system color preference; a manual choice is saved in browser local storage.
2. **Hero** — clear business positioning, a short audience-focused description, and the featured 8× growth result from the supplied client-work brief.
3. **Services** — the selected service detail is on the left; the E-commerce and Legal Aid categories and the active category's service submenu are on the right on desktop. On smaller screens the layout stacks for readability.
   - **E-commerce:** SEO & AEO, Content Creation, Media Buying, and Business Strategy.
   - **Legal Aid:** Income Tax, RJSC Registration & Compliance, and Audit Assistance.
4. **EZsell** — an embedded, scrollable EZsell website preview on the left. The product introduction, key benefits, and links to the EZsell website and Facebook page appear on the right.
5. **Selected Work** — restored client references, filterable by service, with a continuously moving partner-logo marquee at the bottom; positioned between EZsell and Contact.
6. **Contact Us** — phone and email links, office address, and a form with two separate actions: submit the enquiry to the Google Sheets API or prepare it in WhatsApp.
7. **Footer** — Business Aid contact details and utility links.

Section headings are kept to one line on desktop where space permits. All descriptions render in full without CSS line-clamping; concise copy generally occupies two lines on desktop and wraps naturally on small screens to avoid clipping.


## Client Brief subdomain

The The Shadow discovery brief from the companion `brief-thebizaid` project is now integrated into this Next.js deployment and is served at **https://brief.thebizaid.com/the-shadow**. The main homepage remains at **https://thebizaid.com**.

- `proxy.ts` routes only requests for `brief.thebizaid.com` to the isolated brief files; the subdomain root redirects to the main domain.
- `public/brief-site/the-shadow/` contains the static brief and its image asset.
- `app/api/submit/route.ts` writes the questionnaire directly to the Google Sheets spreadsheet already used by the main-site enquiries.
- The questionnaire is divided into 14 guided segments, with persistent progress, answered-question counts, and Previous/Next navigation.
- `docs/brief/README.md` contains the questionnaire and deployment notes.

Both forms use `GOOGLE_SHEETS_SPREADSHEET_ID`. Main-site enquiries continue to use the existing `Enquiries` tab; The Shadow detailed answers use the `the-shadow` tab, while the response summary is stored separately in `the-shadow-summary`. Both tabs are created automatically when the first valid questionnaire response arrives. No separate Apps Script deployment or Brief-specific webhook secret is needed. For deployment, add `brief.thebizaid.com` to the **same Vercel project** as `thebizaid.com` and configure the `brief` DNS record using the target Vercel displays. Follow [`docs/brief/README.md`](docs/brief/README.md) for the complete setup and test checklist. Do not deploy the old Brief folder as a separate project.

## Run locally

```bash
npm install
npm run dev
```

Before starting locally, copy `.env.example` to `.env.local` and fill in the Google Sheets values. Then open `http://localhost:3000`.

## Premium motion & polish layer

The animation and visual refinement lives in two additive files, so the original design system in `app/globals.css` is untouched:

- `app/premium.css` — imported after `globals.css` in `app/layout.tsx`; wins by cascade order. Contains the easing/shadow tokens, scroll-reveal states, hero choreography, nav glass + gliding pill, button depth/sweeps, card spotlight, services/work/EZsell/contact refinements, WhatsApp button, and the reduced-motion block (last section).
- `components/Motion.tsx` — `<MotionRoot />` (mounted in `app/page.tsx`) plus the `rv()` helper. One small client controller handles: scroll reveal (IntersectionObserver + MutationObserver for content that mounts later), the top scroll-progress bar, hero parallax, pointer spotlight on cards, magnetic buttons, and pausing off-screen SVG loops.

### Using the reveal system

```tsx
<div data-reveal="group">…</div>      {/* children stagger in */}
<div {...rv(120, 'left')}>…</div>      {/* delay in ms; 'up' | 'fade' | 'left' | 'right' | 'scale' */}
<div data-glow>…</div>                  {/* pointer-following spotlight on a card */}
```

Reveal states are gated behind `html.js` (added by the inline script in `layout.tsx` before first paint), so the page is fully visible without JavaScript. Under `prefers-reduced-motion`, everything is shown immediately and nothing moves. Only `transform`, `translate`, `scale` and `opacity` are animated.

### Also fixed in this pass

- Hero illustration: the dashed ring and the growth line were missing `fill="none"` and rendered as solid black shapes.
- Dark mode: primary buttons used white text on the light dark-mode teal (weak contrast); they now use a deeper teal gradient.

## Main files

- `app/page.tsx` — homepage section order.
- `app/layout.tsx` — metadata, fonts, root layout, and pre-render theme initialization to avoid a light-mode flash when dark mode is preferred.
- `app/premium.css` — motion, depth and polish layered on top of `globals.css`.
- `components/Motion.tsx` — scroll reveal, progress bar, pointer effects.
- `app/globals.css` — design tokens, responsive layouts, light/dark contrast styles, animations, typography, and iframe styling.
- `components/Sections.tsx` — header, hero, services, EZsell, selected work, contact, footer, and WhatsApp action.
- `components/Scenes.tsx` — SVG illustrations.
- `lib/data.ts` — service names, client-work data, filters, and contact information.

## Editing content

Edit `SERVICES`, `WORK_TAGS`, `CLIENTS`, and `CONTACT` in `lib/data.ts`. Service descriptions and EZsell benefit copy are in `components/Sections.tsx`.

## Notes

- **Google Sheets contact form and enquiry limit:** the `Send enquiry` action POSTs to `app/api/contact/route.ts`, which validates the fields, checks the configured Google Sheet's submission history, and allows at most **3 enquiries per phone number in any rolling 24-hour period**. A fourth enquiry using the same phone number receives HTTP `429` with a retry time in Bangladesh time. The check is server-side and uses the persistent timestamp/phone records in the enquiry sheet; a per-phone in-process queue serializes quick duplicate requests. Do not delete recent rows if you need the rate limit to remain accurate. Google Sheets does not provide an atomic check-and-append transaction, so deployments running multiple server instances can still have a narrow race under truly simultaneous requests; strict cross-instance enforcement requires a transactional/shared rate-limit store. Both regular website submissions and the `Send enquiry on WhatsApp` draft action count toward the limit. WhatsApp drafts are recorded with source `WhatsApp draft`, then opened with a prefilled message; the user must still press Send in WhatsApp. This limit governs the website's enquiry actions and cannot prevent someone from independently messaging the business outside the website. Timestamps are stored as real Sheets date/time values in Bangladesh time (GMT+6 / `Asia/Dhaka`), and the timestamp column is formatted as `yyyy-mm-dd hh:mm:ss AM/PM`. The route also sets the spreadsheet timezone to `Asia/Dhaka`.
- **Required server environment variables:** copy `.env.example` values into your hosting provider’s server-side environment settings (never expose these values with a `NEXT_PUBLIC_` prefix): `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, and `GOOGLE_SHEETS_SPREADSHEET_ID`. `GOOGLE_SHEETS_RANGE` is optional and defaults to `Enquiries!A:F`.
- In Google Cloud, enable the Google Sheets API and create a service account. Share the destination spreadsheet with the service account email as an **Editor**, and ensure the selected tab (default `Enquiries`) exists. Add these column headers in row 1 before the first submission: `Timestamp`, `Name`, `Phone`, `Services`, `Message`, `Source`. Keep recent data rows intact because they are used to enforce the rolling phone-number limit. New enquiries are appended to the next available row. Do not commit a real private key or production `.env` file.
- The header theme toggle follows `prefers-color-scheme` unless the visitor has saved a manual choice. A manual choice is stored under `business-aid-theme`; the theme initialization script applies the correct mode before page content renders. Partner logo artwork is intentionally kept on a neutral light panel in dark mode to preserve original brand colors.
- The header and footer use the Business Aid mark stored at `public/business-aid-mark.png`. Partner logos are loaded first from the supplied files in `public/client-logo/`; remote site icons are only fallbacks. The Selected Work marquee reuses the same local marks and pauses on hover/focus; reduced-motion preferences disable the animation.
- The EZsell iframe relies on `ezsell.xyz` allowing embedding via its security headers. If embedding is blocked, visitors can use the visible link to open the full site in a new tab.
- Client names and results are reference content from the supplied framework. Confirm permission and the accuracy of specific outcomes before publication.

## Selected Work cards

Each Selected Work card uses a horizontal split layout: a tinted brand-logo panel on the left and business information on the right. The right panel presents the website link, a plain-language business type description, and service-category pills. Desktop cards use a 3:1 width-to-height ratio; on narrow screens the same left-logo/right-details layout is retained with a taller card for readability. Partner logos use the supplied local image assets first and retain remote icon and readable text fallbacks if a local image cannot be loaded. Koya Bazar is included and marked as receiving all seven Business Aid service categories.
