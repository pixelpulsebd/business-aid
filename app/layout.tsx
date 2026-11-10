import type { Metadata, Viewport } from 'next';
import { Quicksand, Lato } from 'next/font/google';
import './globals.css';
import './premium.css';

const display = Quicksand({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-display' });
const body = Lato({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'Business Aid | Where business gets better',
  description: 'E-commerce growth (SEO & AEO, content, media buying, strategy) and Legal Aid (income tax, RJSC, audit) under one roof in Dhaka.',
  metadataBase: new URL('https://thebizaid.com'),
  applicationName: 'Business Aid',
  manifest: '/business-aid-app-v3.webmanifest',
  icons: {
    icon: [
      { url: '/business-aid-favicon-v3.ico', type: 'image/x-icon', sizes: 'any' },
      { url: '/business-aid-icon-32-v3.png', type: 'image/png', sizes: '32x32' },
      { url: '/business-aid-app-icon-192-v3.png', type: 'image/png', sizes: '192x192' },
      { url: '/business-aid-app-icon-512-v3.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/business-aid-favicon-v3.ico',
    apple: [
      { url: '/business-aid-apple-touch-icon-v3.png', type: 'image/png', sizes: '180x180' },
    ],
  },
  appleWebApp: {
    capable: true,
    title: 'Business Aid',
    statusBarStyle: 'default',
  },
};
export const viewport: Viewport = { themeColor: '#3F8B84' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
              document.documentElement.classList.add('js');
              var key = 'business-aid-theme';
              var theme = null;
              try { theme = window.localStorage.getItem(key); } catch (_) {}
              if (theme !== 'dark' && theme !== 'light') {
                theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              }
              document.documentElement.dataset.theme = theme;
            })();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
