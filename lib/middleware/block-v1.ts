import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** API prefixes that remain active (not deprecated v1). */
export const ACTIVE_NON_V1_API_PREFIXES = [
  '/api/v2/',
  '/api/auth/',
  '/api/health',
  '/api/monitoring/',
  '/api/csp-violation/',
] as const;

export function isDeprecatedV1ApiPath(pathname: string): boolean {
  if (!pathname.startsWith('/api/')) return false;
  for (const allowed of ACTIVE_NON_V1_API_PREFIXES) {
    const exact = allowed.endsWith('/') ? allowed.slice(0, -1) : allowed;
    if (pathname === exact || pathname.startsWith(allowed)) {
      return false;
    }
  }
  return true;
}

export function v1DeprecatedResponse() {
  return NextResponse.json(
    { error: 'API v1 deprecated. Use /api/v2/*' },
    { status: 410 }
  );
}

type RouteHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse> | NextResponse;

export function withV1Blocked(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    void handler;
    void request;
    void context;
    return v1DeprecatedResponse();
  };
}
