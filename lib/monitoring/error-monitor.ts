import { ErrorReport } from '@/types/monitoring';
import { logger } from './logger';

class ErrorMonitor {
  private static instance: ErrorMonitor;
  private errors: ErrorReport[] = [];
  private errorCallbacks: ((error: ErrorReport) => void)[] = [];

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupWindowErrorHandler();
      this.setupUnhandledRejectionHandler();
    }
  }

  static getInstance(): ErrorMonitor {
    if (!ErrorMonitor.instance) {
      ErrorMonitor.instance = new ErrorMonitor();
    }
    return ErrorMonitor.instance;
  }

  private setupWindowErrorHandler(): void {
    window.onerror = (message, source, lineno, colno, error) => {
      this.reportError(error || new Error(String(message)), {
        source: 'window.onerror',
        severity: 'high',
        context: { source, lineno, colno }
      });
    };
  }

  private setupUnhandledRejectionHandler(): void {
    window.onunhandledrejection = (event) => {
      this.reportError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
          source: 'unhandledRejection',
          severity: 'high',
          context: { type: 'promise_rejection' }
        }
      );
    };
  }

  reportError(error: Error, options: Partial<Omit<ErrorReport, 'message' | 'timestamp' | 'stack'>> = {}): void {
    const errorReport: ErrorReport = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      severity: options.severity || 'medium',
      source: options.source || 'application',
      userId: options.userId,
      sessionId: options.sessionId,
      context: {
        ...options.context,
        errorName: error.name
      }
    };

    this.errors.push(errorReport);
    this.notifyErrorCallbacks(errorReport);
    
    // Convertendo ErrorReport para um objeto compatível com LogContext
    const logContext: Record<string, unknown> = {
      ...errorReport,
      error_type: error.name,
      error_message: error.message,
      error_stack: error.stack,
    };

    logger.logError(error, logContext);

    // Se for um erro crítico, tenta enviar imediatamente
    if (errorReport.severity === 'critical') {
      this.sendErrorToServer(errorReport).catch(err => {
        logger.error('Falha ao enviar erro crítico para o servidor', { 
          error_message: err instanceof Error ? err.message : String(err)
        });
      });
    }
  }

  private async sendErrorToServer(error: ErrorReport): Promise<void> {
    try {
      const response = await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(error),
      });

      if (!response.ok) {
        throw new Error(`Falha ao enviar erro: ${response.statusText}`);
      }
    } catch (err) {
      // Apenas loga, não re-tenta para evitar loop infinito
      logger.error('Falha ao enviar erro para o servidor', { 
        error_message: err instanceof Error ? err.message : String(err)
      });
    }
  }

  onError(callback: (error: ErrorReport) => void): void {
    this.errorCallbacks.push(callback);
  }

  private notifyErrorCallbacks(error: ErrorReport): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        logger.error('Erro no callback de erro', { 
          error_message: err instanceof Error ? err.message : String(err)
        });
      }
    });
  }

  getErrors(): ErrorReport[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }

  // Limpa erros antigos para evitar consumo excessivo de memória
  pruneOldErrors(maxAge: number = 24 * 60 * 60 * 1000): void { // Padrão: 24 horas
    const now = new Date().getTime();
    this.errors = this.errors.filter(error => {
      const errorTime = new Date(error.timestamp).getTime();
      return now - errorTime <= maxAge;
    });
  }
}

export const errorMonitor = ErrorMonitor.getInstance(); 