import { Suspense } from "react"
import { notFound } from "next/navigation"
import { cache } from "react"
import CatDetailsClient from "@/app/cats/[id]/client"

// Um wrapper usando cache do React para conseguir o ID do parâmetro
const getCatId = cache(async (params: { id: string }) => {
  return params.id;
});

// Server Component para lidar com o params
export default async function CatPage({ params }: { params: { id: string } }) {
  // Recupera o ID usando um wrapper em cache
  const id = await getCatId(params);
  
  if (!id) {
    notFound();
  }
  
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <CatDetailsClient id={id} />
    </Suspense>
  );
}
