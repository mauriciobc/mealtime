import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import prisma from "@/lib/prisma"
import { pageMetadata } from "@/lib/metadata"
import CatDetailsClient from "./client"
import PageTransition from "@/components/page-transition"
import { GlobalLoading } from "@/components/ui/global-loading"

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  try {
    const cat = await prisma.cats.findUnique({
      where: { id },
      select: { name: true },
    })
    if (cat?.name) {
      return pageMetadata(cat.name, `Perfil e histórico de alimentação de ${cat.name}.`)
    }
  } catch {
    // fall through to default
  }
  return pageMetadata("Detalhes do gato", "Perfil e histórico de alimentação do gato.")
}

export default async function CatPage({ params }: PageProps) {
  // Await params first (required in Next.js 16)
  const resolvedParams = await params
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/login")
  }

  // Let the client component handle data fetching via useFeeding hook
  return (
    <PageTransition>
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <GlobalLoading mode="spinner" text="Carregando..." />
        </div>
      }>
        <CatDetailsClient id={resolvedParams.id} />
      </Suspense>
    </PageTransition>
  )
} 