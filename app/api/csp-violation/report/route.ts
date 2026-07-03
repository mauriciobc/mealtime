import type { NextRequest } from 'next/server';

/**
 * CSP Violation Report Endpoint
 * =============================
 * Receives Content-Security-Policy violation reports from browsers.
 *
 * Phase 1 (Report-Only): Logs to console for analysis.
 * Phase 2 (Active CSP): May forward to Sentry/Datadog if needed.
 *
 * The browser POSTs JSON with Content-Type: application/csp-report.
 * We respond 204 — the browser does not expect a response body.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/report-uri
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Log structured violation for later analysis
    // In production, consider forwarding to an error-tracking service
    console.log('[CSP-VIOLATION]', {
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get('user-agent'),
      referer: req.headers.get('referer'),
      violation: body,
    });

    return new Response(null, { status: 204 });
  } catch {
    // Silently ignore malformed reports
    return new Response(null, { status: 204 });
  }
}

// Browsers may preflight or HEAD-check the endpoint
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Allow': 'POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function HEAD() {
  return new Response(null, { status: 204 });
}
