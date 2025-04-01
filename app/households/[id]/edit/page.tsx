"use client"

import { useState, useEffect, use, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import BottomNav from "@/components/bottom-nav"
import PageTransition from "@/components/page-transition"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Home, Save, ChevronLeft, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { useGlobalState } from "@/lib/context/global-state"
import { Household as HouseholdType } from "@/lib/types"
import { Loading } from "@/components/ui/loading"

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditHouseholdPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const householdId = resolvedParams.id;
  const router = useRouter();
  const { data: session, status } = useSession();
  const { state, dispatch } = useGlobalState();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [household, setHousehold] = useState<HouseholdType | null | undefined>(undefined);
  const [householdName, setHouseholdName] = useState("");
  const [isAuthorized, setIsAuthorized] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (status === "authenticated" && state.currentUser && state.households) {
      const foundHousehold = state.households.find(h => String(h.id) === String(householdId));
      setHousehold(foundHousehold || null);

      if (foundHousehold) {
        setHouseholdName(foundHousehold.name);
        const isAdmin = foundHousehold.members?.some(
          member => String(member.userId) === String(state.currentUser!.id) && member.role?.toLowerCase() === 'admin'
        );
        setIsAuthorized(isAdmin);
      } else {
        setIsAuthorized(false);
      }
      setIsLoading(false);
    } else if (status === "unauthenticated") {
       setIsLoading(false);
       setIsAuthorized(false);
    } else {
       setIsLoading(true);
    }
  }, [status, state.currentUser, state.households, householdId]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthorized || !household) {
       toast.error("Você não tem permissão para editar esta residência.");
       return;
    }

    const trimmedName = householdName.trim();
    if (!trimmedName) {
      toast.error("O nome da residência não pode estar vazio.");
      return;
    }
    
    if (trimmedName === household.name) {
       toast.info("Nenhuma alteração detectada no nome.");
       return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/households/${householdId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Falha ao atualizar a residência.");
      }

      dispatch({
        type: "UPDATE_HOUSEHOLD",
        payload: { ...household, name: trimmedName },
      });

      toast.success("Residência atualizada com sucesso!");
      router.push(`/households/${householdId}`);

    } catch (error: any) {
      console.error("Erro ao atualizar residência:", error);
      toast.error(`Erro ao atualizar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || household === undefined) {
    return (
      <PageTransition>
        <div className="flex min-h-screen flex-col bg-background">
          <main className="flex-1 pb-20 pt-4">
            <div className="container max-w-md">
              <div className="mb-6 flex items-center">
                <Skeleton className="h-9 w-9 mr-2 rounded-full" />
                <Skeleton className="h-7 w-48" />
              </div>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-10 w-full mb-4" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            </div>
          </main>
          <BottomNav />
        </div>
      </PageTransition>
    );
  }

  if (!household || isAuthorized === false) {
    const title = !household ? "Residência Não Encontrada" : "Acesso Negado";
    const description = !household
      ? "A residência que você está tentando editar não foi encontrada."
      : "Você não tem permissão para editar esta residência.";
    
    return (
      <PageTransition>
        <div className="flex min-h-screen flex-col bg-background">
          <main className="flex-1 pb-20 pt-4 flex items-center justify-center">
            <Card className="w-full max-w-md text-center p-6">
              <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <CardTitle className="text-xl mb-2 text-destructive">{title}</CardTitle>
              <p className="text-muted-foreground mb-6">{description}</p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/households")}
              >
                <Home className="mr-2 h-4 w-4" /> Voltar para Minhas Residências
              </Button>
            </Card>
          </main>
          <BottomNav />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex-1 pb-20 pt-4">
          <div className="container max-w-md">
            <div className="mb-6 flex items-center">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => router.push(`/households/${householdId}`)} 
                className="mr-2"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold">Editar Residência</h1>
            </div>
            
            <form onSubmit={handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Nome da Residência</CardTitle>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="name" className="sr-only">Nome da Residência</Label>
                  <Input
                    id="name"
                    type="text"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    placeholder="Digite o nome da residência"
                    required
                    disabled={isSaving}
                  />
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/households/${householdId}`)}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isSaving || !householdName.trim() || householdName.trim() === household.name}
                  >
                    {isSaving ? (
                      <span className="flex items-center gap-1.5">
                        <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></span>
                        Salvando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Save className="h-4 w-4" />
                        Salvar Alterações
                      </span>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </div>
        </main>
        <BottomNav />
      </div>
    </PageTransition>
  );
} 