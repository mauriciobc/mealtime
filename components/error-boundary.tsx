'use client';

import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorId: ''
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substring(7)
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: ''
    });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          
          <h2 className="text-xl font-semibold mb-2">Algo deu errado</h2>
          
          <p className="text-muted-foreground mb-4 max-w-md">
            Ocorreu um erro inesperado. Nossa equipe foi notificada e estamos trabalhando para resolver o problema.
          </p>
          
          {this.state.error && process.env.NODE_ENV === 'development' && (
            <div className="bg-muted p-4 rounded-lg mb-4 text-left max-w-md w-full">
              <p className="font-mono text-sm text-red-500 mb-2">
                {this.state.error.message}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                Error ID: {this.state.errorId}
              </p>
            </div>
          )}
          
          <div className="flex gap-3">
            <Button onClick={this.handleReset} variant="outline">
              Tentar novamente
            </Button>
            <Button onClick={this.handleReload}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Recarregar página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
