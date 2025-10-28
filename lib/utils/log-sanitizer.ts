/**
 * Utilitário para sanitização de logs, removendo dados sensíveis
 * e garantindo que apenas informações seguras sejam registradas
 */

export interface SanitizedError {
  message: string;
  name?: string;
  code?: string | number;
  type?: string;
  requestId?: string;
  userId?: string;
  timestamp: string;
}

export interface SanitizedContext {
  [key: string]: unknown;
}

/**
 * Campos sensíveis que devem ser mascarados ou removidos dos logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'key',
  'auth',
  'credential',
  'session',
  'cookie',
  'authorization',
  'bearer',
  'access_token',
  'refresh_token',
  'api_key',
  'private_key',
  'ssn',
  'cpf',
  'cnpj',
  'credit_card',
  'card_number',
  'cvv',
  'pin',
  'otp',
  'verification_code',
  'stack', // Stack traces podem conter dados sensíveis
  'body', // Request body pode conter dados sensíveis
  'payload', // Payload pode conter dados sensíveis
  'data' // Dados podem conter informações sensíveis
];

/**
 * Mascara valores sensíveis com asteriscos
 */
function maskSensitiveValue(value: string): string {
  if (value.length <= 4) {
    return '*'.repeat(value.length);
  }
  return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
}

/**
 * Sanitiza um objeto removendo ou mascarando campos sensíveis
 */
export function sanitizeObject(obj: any, depth = 0): any {
  // Limitar profundidade para evitar loops infinitos
  if (depth > 5) {
    return '[Object - depth limit reached]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return obj;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Verificar se o campo é sensível
      const isSensitive = SENSITIVE_FIELDS.some(field => 
        lowerKey.includes(field) || field.includes(lowerKey)
      );

      if (isSensitive) {
        if (typeof value === 'string' && value.length > 0) {
          sanitized[key] = maskSensitiveValue(value);
        } else {
          sanitized[key] = '[REDACTED]';
        }
      } else {
        sanitized[key] = sanitizeObject(value, depth + 1);
      }
    }
    
    return sanitized;
  }

  return obj;
}

/**
 * Sanitiza um erro, extraindo apenas informações seguras
 */
export function sanitizeError(error: Error, context?: Record<string, unknown>): SanitizedError {
  const sanitized: SanitizedError = {
    message: error.message || 'Unknown error',
    timestamp: new Date().toISOString()
  };

  // Adicionar nome do erro se disponível
  if (error.name) {
    sanitized.name = error.name;
  }

  // Tentar extrair código de erro se disponível
  if ('code' in error && error.code) {
    sanitized.code = typeof error.code === 'string' || typeof error.code === 'number' ? error.code : String(error.code);
  }

  // Tentar extrair tipo de erro se disponível
  if ('type' in error && error.type) {
    sanitized.type = String(error.type);
  }

  // Adicionar identificadores de contexto se disponíveis
  if (context) {
    if (context.requestId) {
      sanitized.requestId = String(context.requestId);
    }
    if (context.userId) {
      sanitized.userId = String(context.userId);
    }
  }

  return sanitized;
}

/**
 * Sanitiza contexto de log removendo dados sensíveis
 */
export function sanitizeLogContext(context?: Record<string, unknown>): SanitizedContext {
  if (!context) {
    return {};
  }

  return sanitizeObject(context) as SanitizedContext;
}

/**
 * Gera um ID único para requisições (útil para rastreamento)
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extrai informações seguras de uma requisição para logging
 */
export function extractSafeRequestInfo(request: Request): Record<string, unknown> {
  return {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent') || '[UNKNOWN]',
    contentType: request.headers.get('content-type') || '[UNKNOWN]',
    timestamp: new Date().toISOString()
  };
}

