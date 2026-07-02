import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
