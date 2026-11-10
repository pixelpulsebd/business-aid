import { NextResponse, type NextRequest } from 'next/server';

const BRIEF_HOST = 'brief.thebizaid.com';
const BRIEF_PUBLIC_PREFIX = '/brief-site';
const BRIEF_PAGE_PREFIX = '/the-shadow';

function withBriefSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

function notFound(): NextResponse {
  return withBriefSecurityHeaders(
    new NextResponse('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    }),
  );
}

/**
 * Serve the client brief only on brief.thebizaid.com. The main website keeps
 * its existing route tree and cannot access the private static asset prefix.
 */
export function proxy(request: NextRequest) {
  const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase();
  const pathname = request.nextUrl.pathname;

  const isLocalDevelopment =
    process.env.NODE_ENV !== 'production' &&
    (host === 'localhost' || host === '127.0.0.1' || host === 'brief.localhost');

  if (host !== BRIEF_HOST && !isLocalDevelopment) {
    if (pathname === BRIEF_PUBLIC_PREFIX || pathname.startsWith(`${BRIEF_PUBLIC_PREFIX}/`)) {
      return notFound();
    }
    return NextResponse.next();
  }

  // Preserve the standalone Brief project's original root-domain redirect.
  if (pathname === '/') {
    return withBriefSecurityHeaders(NextResponse.redirect('https://thebizaid.com', 307));
  }

  // The form itself is a standalone static HTML document. Rewrite its clean
  // public URL to the private asset location without changing the browser URL.
  if (pathname === BRIEF_PAGE_PREFIX || pathname === `${BRIEF_PAGE_PREFIX}/`) {
    const destination = request.nextUrl.clone();
    destination.pathname = `${BRIEF_PUBLIC_PREFIX}${BRIEF_PAGE_PREFIX}/index.html`;
    return withBriefSecurityHeaders(NextResponse.rewrite(destination));
  }

  // The form references its logo using /the-shadow/business-aid-logo.webp.
  // Keep that URL intact and serve the corresponding private asset instead.
  if (pathname.startsWith(`${BRIEF_PAGE_PREFIX}/`)) {
    const destination = request.nextUrl.clone();
    destination.pathname = `${BRIEF_PUBLIC_PREFIX}${pathname}`;
    return withBriefSecurityHeaders(NextResponse.rewrite(destination));
  }

  // /api/submit is handled by app/api/submit/route.ts and is intentionally
  // retained so the original form JavaScript does not need a new endpoint URL.
  if (pathname === '/api/submit') {
    return withBriefSecurityHeaders(NextResponse.next());
  }

  return notFound();
}

export const config = {
  matcher: '/:path*',
};
