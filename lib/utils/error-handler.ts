import { toast } from 'sonner';

export interface AppError extends Error {
  code?: string;
  details?: unknown;
  context?: string;
}

export class AppError extends Error {
  constructor(message: string, public code?: string, public details?: unknown, public context?: string) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown, context?: string) {
    super(message, 'VALIDATION_ERROR', details, context);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, details?: unknown, context?: string) {
    super(message, 'NETWORK_ERROR', details, context);
    this.name = 'NetworkError';
  }
}

export class AuthError extends AppError {
  constructor(message: string, details?: unknown, context?: string) {
    super(message, 'AUTH_ERROR', details, context);
    this.name = 'AuthError';
  }
}

export async function handleAsyncError<T>(
  operation: () => Promise<T>,
  options: {
    context?: string;
    errorMessage?: string;
    successMessage?: string;
    onSuccess?: (result: T) => void;
    onError?: (error: AppError) => void;
  } = {}
): Promise<T | null> {
  const {
    context = 'Operação',
    errorMessage = 'Ocorreu um erro durante a operação',
    successMessage,
    onSuccess,
    onError
  } = options;

  try {
    const result = await operation();
    
    if (successMessage) {
      toast.success(successMessage);
    }
    
    if (onSuccess) {
      onSuccess(result);
    }
    
    return result;
  } catch (error) {
    let appError: AppError;
    
    if (error instanceof AppError) {
      appError = error;
    } else if (error instanceof Error) {
      appError = new AppError(error.message, 'UNKNOWN_ERROR', error, context);
    } else {
      appError = new AppError(
        typeof error === 'string' ? error : errorMessage,
        'UNKNOWN_ERROR',
        error,
        context
      );
    }

    console.error(`[${context}] Error:`, appError);
    
    toast.error(appError.message);
    
    if (onError) {
      onError(appError);
    }
    
    return null;
  }
}

export function handleError(error: unknown, context: string = 'Operação'): AppError {
  if (error instanceof AppError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR', error, context);
  }
  
  return new AppError(
    typeof error === 'string' ? error : 'Ocorreu um erro inesperado',
    'UNKNOWN_ERROR',
    error,
    context
  );
} 