'use client'

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FallbackProps } from 'react-error-boundary'

interface ErrorWithDigest extends Error {
  digest?: string;
}

const isDevelopment = process.env.NODE_ENV === 'development'

const hasDigest = (error: Error): error is ErrorWithDigest => {
  return 'digest' in error;
}

const sanitizeErrorMessage = (error: Error): string => {
  // Verifica se a mensagem está vazia
  if (!error.message || error.message.trim() === '') {
    return 'Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.'
  }

  if (isDevelopment) {
    return error.message
  }
  
  // Mensagens genéricas para erros comuns
  if (error.message.includes('Failed to fetch')) {
    return 'Não foi possível conectar ao servidor. Por favor, verifique sua conexão.'
  }
  
  if (error.message.includes('unauthorized') || error.message.includes('forbidden')) {
    return 'Você não tem permissão para acessar este recurso.'
  }
  
  // Mensagem padrão para outros erros
  return 'Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.'
}

export default function ErrorPage({ error, resetErrorBoundary }: FallbackProps) {
  useEffect(() => {
    if (!error) return;

    if (isDevelopment) {
      // Log detalhado apenas em desenvolvimento
      console.error('[ErrorPage]', {
        message: error.message,
        digest: hasDigest(error) ? error.digest : undefined,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
    } else {
      // Log sanitizado em produção
      console.error('[ErrorPage]', {
        message: sanitizeErrorMessage(error),
        timestamp: new Date().toISOString()
      })
    }
  }, [error])

  if (!error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro Desconhecido</AlertTitle>
          <AlertDescription>Ocorreu um erro inesperado. Por favor, tente novamente.</AlertDescription>
        </Alert>
        <Button
          onClick={resetErrorBoundary}
          className="mt-6"
          variant="default"
        >
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Alert variant="destructive" role="alert" aria-live="assertive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Algo deu errado!</AlertTitle>
        <AlertDescription>{sanitizeErrorMessage(error)}</AlertDescription>
      </Alert>
      <Button
        onClick={resetErrorBoundary}
        className="mt-6"
        variant="default"
      >
        Tentar novamente
      </Button>
    </div>
  )
} 