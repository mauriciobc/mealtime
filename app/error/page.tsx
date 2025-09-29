"use client";

import { useSearchParams, usePathname } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const RETRY_STORAGE_KEY = "mealtime_error_retry_count";
const MAX_RETRY_ATTEMPTS = 3;

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const message = searchParams.get("message");
  const [retryCount, setRetryCount] = useState(0);

  // Função para obter o contador de retry do sessionStorage
  const getRetryCountFromStorage = (): number => {
    try {
      const stored = sessionStorage.getItem(RETRY_STORAGE_KEY);
      if (stored === null) return 0;
      
      const parsed = parseInt(stored, 10);
      return isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, MAX_RETRY_ATTEMPTS));
    } catch {
      return 0;
    }
  };

  // Função para salvar o contador de retry no sessionStorage
  const saveRetryCountToStorage = (count: number): void => {
    try {
      sessionStorage.setItem(RETRY_STORAGE_KEY, count.toString());
    } catch {
      // Ignora erros de storage (modo privado, etc.)
    }
  };

  // Função para limpar o contador de retry
  const clearRetryCount = (): void => {
    try {
      sessionStorage.removeItem(RETRY_STORAGE_KEY);
    } catch {
      // Ignora erros de storage
    }
  };

  // Hidrata o estado do contador na montagem do componente
  useEffect(() => {
    const storedCount = getRetryCountFromStorage();
    setRetryCount(storedCount);
  }, []);

  // Limpa o contador quando há navegação bem-sucedida (não erro)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Se não estamos na página de erro, limpa o contador
      if (!window.location.pathname.includes('/error')) {
        clearRetryCount();
      }
    };

    // Limpa o contador quando o usuário navega para fora da página de erro
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !window.location.pathname.includes('/error')) {
        clearRetryCount();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Limpa o contador quando o pathname muda e não inclui mais '/error'
  useEffect(() => {
    if (!pathname.includes('/error')) {
      clearRetryCount();
    }
  }, [pathname]);

  // Limpa o contador quando o componente é desmontado
  useEffect(() => {
    return () => {
      clearRetryCount();
    };
  }, []);

  useEffect(() => {
    // Log the error for debugging
    console.error("[ErrorPage] Error occurred:", {
      message,
      timestamp: new Date().toISOString(),
      retryCount
    });
  }, [message, retryCount]);

  const handleRetry = () => {
    const newCount = retryCount + 1;
    setRetryCount(newCount);
    saveRetryCountToStorage(newCount);
    window.location.reload();
  };

  const getErrorMessage = () => {
    switch (message) {
      case "redirect-loop-detected":
        return {
          title: "Loop de Redirecionamento Detectado",
          description: "Foi detectado um loop de redirecionamento. Isso pode acontecer devido a problemas de autenticação ou configuração."
        };
      default:
        return {
          title: "Erro Inesperado",
          description: "Ocorreu um erro inesperado. Por favor, tente novamente."
        };
    }
  };

  const errorInfo = getErrorMessage();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {errorInfo.title}
          </h1>
          <p className="text-muted-foreground">
            {errorInfo.description}
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>O que fazer?</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>1. Tente recarregar a página</p>
            <p>2. Limpe os cookies do site</p>
            <p>3. Tente fazer login novamente</p>
            <p>4. Se o problema persistir, entre em contato com o suporte</p>
          </AlertDescription>
        </Alert>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleRetry} 
            className="flex-1"
            disabled={retryCount >= MAX_RETRY_ATTEMPTS}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {retryCount >= MAX_RETRY_ATTEMPTS ? "Muitas tentativas" : "Tentar Novamente"}
          </Button>
          
          <Button variant="outline" asChild className="flex-1">
            <Link href="/" className="w-full flex items-center justify-center">
              <Home className="h-4 w-4 mr-2" />
              Ir para Início
            </Link>
          </Button>
        </div>

        {retryCount > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Tentativas: {retryCount}/{MAX_RETRY_ATTEMPTS}
          </p>
        )}
      </div>
    </div>
  );
}
