"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Edit, 
  Plus, 
  Calendar, 
  Weight, 
  FileWarning, 
  Clock, 
  Trash2,
  ChevronRight,
  Cat as CatIcon,
  Users,
  PlusCircle
} from "lucide-react"
import Link from "next/link"
import { AnimatedCard } from "@/components/ui/animated-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import BottomNav from "@/components/bottom-nav"
import PageTransition from "@/components/page-transition"
import { motion } from "framer-motion"
import { CatType } from "@/lib/types"
import { getAgeString, getScheduleText } from "@/lib/utils/dateUtils"
import { AnimatedButton } from "@/components/ui/animated-button"
import { AppHeader } from "@/components/app-header"
import { useRouter } from "next/navigation"
import { getCats } from "@/lib/data"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { useGlobalState } from "@/lib/context/global-state"
import { CatCard } from "@/components/cat-card"
import { Loading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"

export default function CatsPage() {
  const router = useRouter()
  const { state, dispatch } = useGlobalState()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleDeleteCat = (catId: string) => {
    dispatch({
      type: "DELETE_CAT",
      payload: { id: catId },
    })
  }

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex-1 p-4 pb-24">
          <PageHeader
            title="Meus Gatos"
            description="Gerencie seus gatos e seus perfis"
            actionLabel="Adicionar Gato"
            actionHref="/cats/new"
          />
          
          {isLoading ? (
            <Loading />
          ) : state.cats.length === 0 ? (
            <EmptyState
              icon={CatIcon}
              title="Nenhum gato cadastrado"
              description="Você ainda não adicionou nenhum gato. Adicione seu primeiro gato para começar a registrar as alimentações."
              actionLabel="Adicionar Meu Primeiro Gato"
              actionHref="/cats/new"
              variant="cat"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {state.cats.map((cat: CatType) => (
                <CatCard
                  key={cat.id}
                  cat={cat}
                  onView={() => router.push(`/cats/${cat.id}`)}
                  onEdit={() => router.push(`/cats/${cat.id}/edit`)}
                  onDelete={() => handleDeleteCat(cat.id)}
                />
              ))}
            </div>
          )}
        </div>
        
        <BottomNav />
      </div>
    </PageTransition>
  )
}

function formatAge(birthdate: string | Date) {
  const birth = new Date(birthdate)
  const now = new Date()
  
  const years = now.getFullYear() - birth.getFullYear()
  const months = now.getMonth() - birth.getMonth()
  
  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    return `${years - 1} anos e ${months + 12} meses`
  }
  
  if (years === 0) {
    return `${months} meses`
  }
  
  return `${years} anos e ${months} meses`
}
