import { NextRequest } from 'next/server';
import { v1DeprecatedResponse } from '@/lib/middleware/block-v1';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  return v1DeprecatedResponse();
}

export async function POST(_request: NextRequest) {
  return v1DeprecatedResponse();
}

export async function PUT(_request: NextRequest) {
  return v1DeprecatedResponse();
}

export async function PATCH(_request: NextRequest) {
  return v1DeprecatedResponse();
}

export async function DELETE(_request: NextRequest) {
  return v1DeprecatedResponse();
}

export async function HEAD(_request: NextRequest) {
  return v1DeprecatedResponse();
}

export async function OPTIONS(_request: NextRequest) {
  return v1DeprecatedResponse();
}
