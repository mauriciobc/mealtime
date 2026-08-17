import { NextRequest, NextResponse } from 'next/server';
import { isDeprecatedV1ApiPath, v1DeprecatedResponse } from '@/lib/middleware/block-v1';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(request: NextRequest) {
  if (isDeprecatedV1ApiPath(request.nextUrl.pathname)) {
    return v1DeprecatedResponse();
  }
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
export const OPTIONS = handle;
