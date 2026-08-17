import { NextResponse } from 'next/server';

export function v2Ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function v2Err(
  error: string,
  status: number,
  details?: unknown
): NextResponse {
  const body: { success: false; error: string; details?: unknown } = {
    success: false,
    error,
  };
  if (details !== undefined) {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}
