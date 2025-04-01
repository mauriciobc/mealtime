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
import { getCats, getCatsByHouseholdId } from "@/lib/services/apiService"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { useGlobalState } from "@/lib/context/global-state"
import { CatCard } from "@/components/cat-card"
import { Loading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

export default function CatsPage() {
  const router = useRouter()
  const { state, dispatch } = useGlobalState()
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadCatsForHousehold() {
      if (status !== "authenticated" || !state.currentUser?.householdId) {
        return;
      }

      const currentHouseholdId = state.currentUser.householdId;
      setIsLoading(true);

      try {
        const response = await fetch(`/api/households/${currentHouseholdId}/cats`);
        if (!response.ok) {
          throw new Error(`Failed to fetch cats: ${response.statusText}`);
        }
        const cats: CatType[] = await response.json();

        dispatch({
          type: "SET_CATS",
          payload: cats,
        });

      } catch (error) {
        console.error("Erro ao buscar gatos:", error);
        toast.error("Não foi possível carregar a lista de gatos.");
        dispatch({ type: "SET_CATS", payload: [] });
      } finally {
        setIsLoading(false);
      }
    }

    loadCatsForHousehold();
  }, [status, state.currentUser, dispatch]);

  const handleDeleteCat = async (catId: string) => {
    const previousCats = state.cats;
    dispatch({ type: "DELETE_CAT", payload: Number(catId) });

    try {
      const response = await fetch(`/api/cats/${catId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete cat');
      }
      toast.success("Gato excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir gato:", error);
      toast.error("Erro ao excluir gato. Restaurando lista.");
      dispatch({ type: "SET_CATS", payload: previousCats });
    }
  };

  if (status === "loading" || (status === "authenticated" && !state.currentUser)) {
    return <Loading text="Carregando gatos..." />;
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return <Loading text="Redirecionando..." />;
  }

  if (status === "authenticated" && state.currentUser && !state.currentUser.householdId) {
    return (
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
           <div className="flex-1 p-4 pb-24">
              <PageHeader
                title="Meus Gatos"
                description="Gerencie seus gatos e seus perfis"
              />
             <EmptyState
                icon={Users}
                title="Sem Residência Associada"
                description="Você precisa criar ou juntar-se a uma residência para adicionar e gerenciar gatos."
                actionLabel="Ir para Configurações"
                actionHref="/settings"
             />
           </div>
           <BottomNav />
        </div>
      </PageTransition>
    );
  }

  if (isLoading) {
    return <Loading text="Carregando gatos..." />;
  }

  const catsToDisplay = state.cats;

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex-1 p-4 pb-24">
          <PageHeader
            title="Meus Gatos"
            description="Gerencie os perfis dos seus felinos"
            actionLabel="Adicionar Gato"
            actionHref="/cats/new"
          />

          {catsToDisplay.length === 0 ? (
            <EmptyState
              icon={CatIcon}
              title="Nenhum gato cadastrado"
              description="Você ainda não adicionou nenhum gato a esta residência. Que tal adicionar o primeiro?"
              actionLabel="Adicionar Meu Primeiro Gato"
              actionHref="/cats/new"
              variant="cat"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {catsToDisplay.map((cat: CatType) => (
                <CatCard
                  key={cat.id}
                  cat={cat}
                  onView={() => router.push(`/cats/${cat.id}`)}
                  onEdit={() => router.push(`/cats/${cat.id}/edit`)}
                  onDelete={() => handleDeleteCat(cat.id.toString())}
                />
              ))}
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </PageTransition>
  );
}
