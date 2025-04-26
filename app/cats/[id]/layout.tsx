'use client';

import { createClient } from '@/utils/supabase/client';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorPage from '@/app/error';
import { GlobalLoading } from '@/components/ui/global-loading';
import { Suspense } from 'react';
import { GlobalLoading as ServerGlobalLoading } from "@/components/ui/global-loading";
import { notFound } from 'next/navigation';

export default async function CatPageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient();
  const { data: { user: supabaseUser }, error: authError } = await (await supabase).auth.getUser();

  if (authError || !supabaseUser) {
    console.error("CatPageLayout: Unauthorized access attempt.");
    notFound();
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorPage}>
      <Suspense fallback={<GlobalLoading mode="overlay" text="Carregando..." />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
} 