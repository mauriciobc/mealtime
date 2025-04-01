"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useGlobalState } from "@/lib/context/global-state"
import { ArrowLeft } from "lucide-react"
import PageTransition from "@/components/page-transition"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Household } from "@/lib/types"
import { useSession } from "next-auth/react"
import { Loading } from "@/components/ui/loading"

export default function CreateHouseholdPage() {
  const { state, dispatch } = useGlobalState()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [householdName, setHouseholdName] = useState("")

  const handleCreateHousehold = async () => {
    if (!householdName.trim()) {
      toast.error("Por favor, insira um nome para a residência")
      return
    }

    if (status !== "authenticated" || !state.currentUser) {
        toast.error("Você precisa estar logado para criar uma residência.");
        return;
    }

    setIsCreating(true)

    try {
      const response = await fetch("/api/households", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: householdName.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
         throw new Error(result.error || "Falha ao criar residência");
      }
      
      const newHousehold: Household = result.household;

      if (!newHousehold) {
          throw new Error("Resposta inválida do servidor ao criar residência.");
      }

      dispatch({ type: "ADD_HOUSEHOLD", payload: newHousehold });

      const updatedUserHouseholds = [...(state.currentUser.households || []), newHousehold.id];
      const primaryHousehold = state.currentUser.primaryHousehold || newHousehold.id;
      
      dispatch({ 
        type: "SET_CURRENT_USER", 
        payload: { 
            ...state.currentUser, 
            households: updatedUserHouseholds,
            primaryHousehold: primaryHousehold
        } 
      });

      dispatch({ type: "SET_CURRENT_USER_HOUSEHOLD", payload: newHousehold.id });

      toast.success("Residência criada com sucesso!")
      router.push(`/households`)

    } catch (error: any) {
      console.error("Erro ao criar residência:", error)
      toast.error(`Falha ao criar residência: ${error.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  if (status === "loading" || (status === "authenticated" && !state.currentUser)) {
    return <Loading text="Carregando..." />;
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return <Loading text="Redirecionando..." />;
  }

  return (
    <PageTransition>
      <div className="bg-background min-h-screen">
        <div className="container max-w-md mx-auto p-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors mb-6 group"
          >
            <ArrowLeft className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform" />
            <span>Voltar</span>
          </button>

          <header className="mb-8">
            <h1 className="text-2xl font-bold">Criar Nova Residência</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Crie uma nova residência para gerenciar gatos e membros
            </p>
          </header>

          <div className="bg-card p-6 rounded-lg shadow-sm mb-8 border">
            <form onSubmit={(e) => {
              e.preventDefault()
              handleCreateHousehold()
            }}>
              <div className="mb-6">
                <Label htmlFor="householdName" className="block mb-2 text-sm font-medium">Nome da Residência</Label>
                <Input
                  id="householdName"
                  type="text"
                  placeholder="Ex: Casa da Família Silva"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  className="w-full"
                  required
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Este será o nome exibido para todos os membros da residência
                </p>
              </div>

              <div className="mb-6 border-t pt-4">
                <h3 className="text-sm font-medium mb-2">Como criador(a), você irá:</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Ser designado(a) como admin da residência</li>
                  <li>Poder adicionar e remover membros</li>
                  <li>Poder gerenciar gatos e programações</li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isCreating || !householdName.trim() || status !== 'authenticated'}
              >
                {isCreating ? "Criando..." : "Criar Residência"}
              </Button>
            </form>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>
              Você poderá adicionar membros após criar a residência, compartilhando o código de convite.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
