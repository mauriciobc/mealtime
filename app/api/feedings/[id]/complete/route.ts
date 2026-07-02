import { v1DeprecatedResponse } from '@/lib/middleware/block-v1';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return v1DeprecatedResponse();
}

export async function POST() {
  return v1DeprecatedResponse();
}

export async function PUT() {
  return v1DeprecatedResponse();
}

export async function PATCH() {
  return v1DeprecatedResponse();
}

export async function DELETE() {
  return v1DeprecatedResponse();
}

export async function HEAD() {
  return v1DeprecatedResponse();
}

export async function OPTIONS() {
  return v1DeprecatedResponse();
}
