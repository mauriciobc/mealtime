import { Suspense } from "react"
import { notFound } from "next/navigation"
import CatDetails from "@/app/components/cat-details"

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function CatPage({ params }: PageProps) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id);
  
  if (isNaN(id)) {
    notFound();
  }

  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <CatDetails params={{ id: id }} />
    </Suspense>
  )
}
