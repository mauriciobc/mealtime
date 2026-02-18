import { Suspense } from 'react';
import { pageMetadata } from '@/lib/metadata';
import { CatsList } from '@/components/cats/CatsList';
import { AddCatButton } from '@/components/cats/add-cat-button';
import { ErrorBoundary } from '@/lib/context/ErrorContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { GlobalLoading } from '@/components/ui/global-loading';

export const metadata = pageMetadata("Gatos do lar", "Gerencie os gatos desta residência.");

interface CatsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CatsPage({ params }: CatsPageProps) {
  const resolvedParams = await params;
  const isLoading = false; // Replace with actual loading logic

  if (isLoading) {
    return <GlobalLoading mode="spinner" text="Carregando gatos..." />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Cats</h1>
        <AddCatButton householdId={resolvedParams.id} />
      </div>

      <ErrorBoundary
        fallback={
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Something went wrong loading the cats. Please try again later.
            </AlertDescription>
          </Alert>
        }
      >
        <Suspense 
          fallback={
            <div className="flex justify-center items-center min-h-[200px]">
              <GlobalLoading mode="spinner" text="Carregando lista de gatos..." />
            </div>
          }
        >
          <CatsList householdId={resolvedParams.id} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
} 