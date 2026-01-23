import { NextRequest, NextResponse } from 'next/server';

interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

interface ApiSuccess<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

function getCorsOrigin(request: NextRequest): string {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
  const requestOrigin = request.headers.get('origin');
  
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  
  return allowedOrigins[0] || 'same-origin';
}

export class ApiResponse {
  static success<T>(data: T, status = 200, request?: NextRequest): NextResponse {
    return new NextResponse(
      JSON.stringify({ data } satisfies ApiSuccess<T>),
      {
        status,
        headers: {
          'Content-Type': 'application/json',
          ...(request && { 'Access-Control-Allow-Origin': getCorsOrigin(request) }),
        },
      }
    );
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    request?: NextRequest
  ): NextResponse {
    return new NextResponse(
      JSON.stringify({
        data,
        meta: { page, limit, total },
      } satisfies ApiSuccess<T[]>),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...(request && { 'Access-Control-Allow-Origin': getCorsOrigin(request) }),
        },
      }
    );
  }

  static error(message: string, status = 500, code?: string, details?: unknown, request?: NextRequest): NextResponse {
    const body: ApiError = { error: message };
    if (code) body.code = code;
    if (details) body.details = details;
    
    return new NextResponse(
      JSON.stringify(body),
      {
        status,
        headers: {
          'Content-Type': 'application/json',
          ...(request && { 'Access-Control-Allow-Origin': getCorsOrigin(request) }),
        },
      }
    );
  }

  static validationError(details: unknown, request?: NextRequest): NextResponse {
    return this.error('Validation failed', 400, 'VALIDATION_ERROR', details, request);
  }

  static unauthorized(message = 'Unauthorized', request?: NextRequest): NextResponse {
    return this.error(message, 401, 'UNAUTHORIZED', undefined, request);
  }

  static forbidden(message = 'Forbidden', request?: NextRequest): NextResponse {
    return this.error(message, 403, 'FORBIDDEN', undefined, request);
  }

  static notFound(message = 'Not found', request?: NextRequest): NextResponse {
    return this.error(message, 404, 'NOT_FOUND', undefined, request);
  }

  static json<T>(data: T, status = 200, request?: NextRequest): NextResponse {
    return new NextResponse(
      JSON.stringify(data),
      {
        status,
        headers: {
          'Content-Type': 'application/json',
          ...(request && { 'Access-Control-Allow-Origin': getCorsOrigin(request) }),
        },
      }
    );
  }
}
