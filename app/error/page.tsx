"use client";

import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Log the error for debugging
    console.error("[ErrorPage] Error occurred:", {
      message,
      timestamp: new Date().toISOString(),
      retryCount
    });
  }, [message, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
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
            disabled={retryCount >= 3}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {retryCount >= 3 ? "Muitas tentativas" : "Tentar Novamente"}
          </Button>
          
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Ir para Início
            </Button>
          </Link>
        </div>

        {retryCount > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Tentativas: {retryCount}/3
          </p>
        )}
      </div>
    </div>
  );
}
