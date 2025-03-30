import { Suspense } from "react"
import CatDetails from "@/app/components/cat-details"

interface PageProps {
  params: { id: string };
}

export default function CatPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <CatDetails params={Promise.resolve(params)} />
    </Suspense>
  )
}
