"use client";

import React, { Suspense, ComponentType, ErrorBoundary } from 'react';
import { useLazyComponent } from '@/lib/hooks/useLazyComponent';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface LazyComponentProps {
  importFn: () => Promise<{ default: ComponentType<any> }>;
  fallback?: ComponentType;
  errorFallback?: ComponentType<{ error: Error; retry: () => void }>;
  className?: string;
  retryDelay?: number;
  maxRetries?: number;
  children?: React.ReactNode;
}

interface ErrorFallbackProps {
  error: Error;
  retry: () => void;
}

function DefaultErrorFallback({ error, retry }: ErrorFallbackProps) {
  return (
    <Alert variant="destructive" className="m-4">
      <AlertDescription className="flex items-center justify-between">
        <span>Erro ao carregar componente: {error.message}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={retry}
          className="ml-2"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function DefaultFallback() {
  return (
    <div className="space-y-2 p-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function LazyComponent({
  importFn,
  fallback: Fallback = DefaultFallback,
  errorFallback: ErrorFallback = DefaultErrorFallback,
  className,
  retryDelay = 1000,
  maxRetries = 3,
  children
}: LazyComponentProps) {
  const Component = useLazyComponent(importFn, {
    fallback: Fallback,
    errorBoundary: ErrorFallback,
    retryDelay,
    maxRetries
  });

  if (!Component) {
    return <Fallback />;
  }

  return (
    <div className={cn("lazy-component", className)}>
      <Suspense fallback={<Fallback />}>
        <ErrorBoundary fallback={ErrorFallback}>
          <Component>
            {children}
          </Component>
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}

// Hook para lazy loading com intersection observer
export function useLazyComponentWithIntersection<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    rootMargin?: string;
    threshold?: number;
    fallback?: ComponentType;
    errorFallback?: ComponentType<{ error: Error; retry: () => void }>;
    retryDelay?: number;
    maxRetries?: number;
  } = {}
) {
  const {
    rootMargin = '50px',
    threshold = 0.1,
    fallback: Fallback = DefaultFallback,
    errorFallback: ErrorFallback = DefaultErrorFallback,
    retryDelay = 1000,
    maxRetries = 3
  } = options;

  const { Component, ref, isVisible } = useLazyComponentWithIntersection(importFn, {
    rootMargin,
    threshold,
    fallback: Fallback,
    errorBoundary: ErrorFallback,
    retryDelay,
    maxRetries
  });

  return {
    Component,
    ref,
    isVisible,
    Fallback,
    ErrorFallback
  };
}

// Componente para lazy loading de páginas inteiras
export function LazyPage({
  importFn,
  fallback,
  errorFallback,
  className
}: LazyComponentProps) {
  return (
    <LazyComponent
      importFn={importFn}
      fallback={fallback}
      errorFallback={errorFallback}
      className={cn("min-h-screen", className)}
    />
  );
}

// Componente para lazy loading de modais
export function LazyModal({
  importFn,
  fallback,
  errorFallback,
  className
}: LazyComponentProps) {
  return (
    <LazyComponent
      importFn={importFn}
      fallback={fallback}
      errorFallback={errorFallback}
      className={cn("modal-content", className)}
    />
  );
}