"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { AppHeader } from "@/components/app-header"
import BottomNav from "@/components/bottom-nav"
import PageTransition from "@/components/page-transition"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Home, Save, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface Household {
  id: string;
  name: string;
  inviteCode: string;
}

export default function EditHouseholdPage() {
  const params = useParams();
  const id = params.id as string;
  
  const router = useRouter()
  const { data: session, status } = useSession()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [household, setHousehold] = useState<Household | null>(null)
  const [householdName, setHouseholdName] = useState("")
  
  // Verificar se o usuário está autenticado
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])
  
  // Carregar dados da residência
  useEffect(() => {
    if (session && session.user) {
      loadHouseholdDetails()
    }
  }, [session])
  
  const loadHouseholdDetails = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/households/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Residência não encontrada")
          router.push("/households")
          return
        }
        
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao carregar detalhes da residência")
      }
      
      const data = await response.json()
      setHousehold(data)
      setHouseholdName(data.name)
      setIsLoading(false)
    } catch (error) {
      console.error("Erro ao carregar detalhes da residência:", error)
      toast.error("Erro ao carregar detalhes da residência")
      setIsLoading(false)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!householdName.trim()) {
      toast.error("O nome da residência não pode estar vazio")
      return
    }
    
    try {
      setIsSaving(true)
      
      const response = await fetch(`/api/households/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: householdName.trim()
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao atualizar residência")
      }
      
      toast.success("Residência atualizada com sucesso")
      router.push(`/households/${id}`)
    } catch (error) {
      console.error("Erro ao atualizar residência:", error)
      toast.error("Erro ao atualizar residência")
    } finally {
      setIsSaving(false)
    }
  }
  
  return (
    <PageTransition>
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        
        <main className="flex-1 pb-20 pt-4">
          <div className="container max-w-md">
            <div className="mb-6 flex items-center">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => router.back()}
                className="mr-2"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">Editar Residência</h1>
            </div>
            
            {isLoading ? (
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full mb-4" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ) : household ? (
              <form onSubmit={handleSubmit}>
                <Card>
                  <CardHeader>
                    <CardTitle>Informações da Residência</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome da Residência</Label>
                      <Input
                        id="name"
                        type="text"
                        value={householdName}
                        onChange={(e) => setHouseholdName(e.target.value)}
                        placeholder="Nome da residência"
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit"
                      disabled={isSaving || householdName.trim() === household.name}
                    >
                      {isSaving ? (
                        <span className="flex items-center gap-1">
                          <span className="animate-spin h-4 w-4 border-2 border-b-transparent rounded-full"></span>
                          Salvando...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Save className="h-4 w-4 mr-1" />
                          Salvar
                        </span>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            ) : (
              <div className="text-center p-8">
                <p className="text-muted-foreground">Residência não encontrada</p>
                <Button
                  className="mt-4"
                  onClick={() => router.push("/households")}
                >
                  <Home className="mr-2 h-4 w-4" /> Voltar para Residências
                </Button>
              </div>
            )}
          </div>
        </main>
        
        <BottomNav />
      </div>
    </PageTransition>
  )
} 