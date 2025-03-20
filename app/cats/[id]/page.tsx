import { use } from "react"
import CatDetails from "@/app/components/cat-details"

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CatPage({ params }: PageProps) {
  return <CatDetails params={params} />
}
