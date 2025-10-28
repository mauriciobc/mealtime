import { NextResponse } from 'next/server';

/**
 * Adiciona headers de deprecation para rotas da API v1
 * 
 * Uso:
 * ```typescript
 * const response = NextResponse.json(data);
 * return addDeprecatedWarning(response);
 * ```
 */
export function addDeprecatedWarning(response: NextResponse): NextResponse {
  response.headers.set('X-API-Version', 'v1');
  response.headers.set('X-API-Deprecated', 'true');
  response.headers.set('X-API-Sunset-Date', '2025-07-28');
  response.headers.set('X-API-Migration-Guide', 'https://github.com/yourusername/mealtime/blob/main/docs/API-V2-MIGRATION-GUIDE.md');
  response.headers.set('Warning', '299 - "API v1 is deprecated. Please migrate to v2. See X-API-Migration-Guide header."');
  
  return response;
}

/**
 * Wrapper que adiciona automaticamente warnings de deprecation
 */
export function withDeprecatedWarning<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    const response = await handler(...args);
    return addDeprecatedWarning(response);
  }) as T;
}

