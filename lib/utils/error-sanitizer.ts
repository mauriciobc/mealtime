/**
 * Error Sanitizer Utility
 * 
 * Provides secure error handling by sanitizing error messages and preventing
 * sensitive information leakage in production environments.
 */

interface SanitizedError {
  success: false;
  error: string;
  details?: string;
  errorId?: string;
}

/**
 * Lista de padrões que indicam informações sensíveis que devem ser removidas
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /authorization/i,
  /bearer/i,
  /database/i,
  /connection/i,
  /credentials/i,
  /auth/i,
];

/**
 * Verifica se uma mensagem contém informações potencialmente sensíveis
 */
function containsSensitiveInfo(message: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Sanitiza uma mensagem de erro removendo informações sensíveis
 */
function sanitizeMessage(message: string): string {
  if (containsSensitiveInfo(message)) {
    return 'An error occurred during processing';
  }
  return message;
}

/**
 * Gera um ID único para o erro (útil para correlacionar logs)
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitiza um erro para resposta ao cliente
 * 
 * Em produção:
 * - Remove stack traces
 * - Remove detalhes sensíveis
 * - Retorna apenas mensagens genéricas
 * 
 * Em desenvolvimento:
 * - Mantém informações úteis para debug
 * - Inclui mensagens de erro (sanitizadas)
 * - Fornece um errorId para correlação com logs
 * 
 * @param error - O erro a ser sanitizado
 * @param genericMessage - Mensagem genérica a ser mostrada em produção
 * @returns Objeto de erro sanitizado
 */
export function sanitizeError(
  error: unknown,
  genericMessage: string = 'An internal error occurred'
): SanitizedError {
  const isProduction = process.env.NODE_ENV === 'production';
  const errorId = generateErrorId();

  // Base response para produção
  const baseResponse: SanitizedError = {
    success: false,
    error: genericMessage,
  };

  // Se estiver em produção, retorna apenas a mensagem genérica
  if (isProduction) {
    return {
      ...baseResponse,
      errorId, // ID para correlacionar com logs do servidor
    };
  }

  // Em desenvolvimento, inclui mais detalhes (sanitizados)
  let details = 'Unknown error';

  if (error instanceof Error) {
    // Sanitiza a mensagem de erro
    details = sanitizeMessage(error.message);
    
    // Adiciona informações do tipo de erro se útil
    if (error.name && error.name !== 'Error') {
      details = `${error.name}: ${details}`;
    }
  } else if (typeof error === 'string') {
    details = sanitizeMessage(error);
  } else {
    details = sanitizeMessage(String(error));
  }

  return {
    ...baseResponse,
    details,
    errorId,
  };
}

/**
 * Wrapper para erros de validação (400)
 * Estes podem ser mais específicos pois geralmente vêm da nossa validação
 */
export function sanitizeValidationError(
  error: unknown,
  defaultMessage: string = 'Invalid request'
): SanitizedError {
  const isProduction = process.env.NODE_ENV === 'production';

  if (error instanceof Error) {
    // Erros de validação podem ser mais específicos
    return {
      success: false,
      error: isProduction ? defaultMessage : error.message,
      ...((!isProduction) && { details: error.message }),
    };
  }

  return {
    success: false,
    error: defaultMessage,
  };
}

/**
 * Sanitiza erros de banco de dados (Prisma, etc.)
 * Estes são particularmente sensíveis pois podem expor estrutura do BD
 */
export function sanitizeDatabaseError(
  error: unknown,
  operationDescription: string = 'database operation'
): SanitizedError {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    return {
      success: false,
      error: `Failed to complete ${operationDescription}`,
      errorId: generateErrorId(),
    };
  }

  // Em desenvolvimento, fornece informações úteis mas sem expor demais
  let details = 'Database error occurred';
  
  if (error instanceof Error) {
    // Remove detalhes muito específicos do Prisma/DB
    const message = error.message
      .replace(/\/[^\/]+\/[^\/]+\/prisma/g, '[prisma]') // Remove paths
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]') // Remove IPs
      .replace(/:\d{4,5}\b/g, ':[PORT]'); // Remove portas
    
    details = message;
  }

  return {
    success: false,
    error: `Failed to complete ${operationDescription}`,
    details,
    errorId: generateErrorId(),
  };
}

