"use client"

import { useReducer, useEffect } from "react"
import { useRouter } from "next/navigation"
import BottomNav from "@/components/bottom-nav"
import PageTransition from "@/components/page-transition"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Home, Save, ChevronLeft, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { useHousehold } from "@/lib/context/HouseholdContext"
import { useUserContext } from "@/lib/context/UserContext"
import { useLoading } from "@/lib/context/LoadingContext"
import { Household as HouseholdType } from "@/lib/types"
import { Loading } from "@/components/ui/loading"

interface EditHouseholdPageContentProps {
  params: { id: string };
}

type EditHouseholdState = {
  isLoadingData: boolean;
  isSaving: boolean;
  household: HouseholdType | null | undefined;
  householdName: string;
  isAuthorized: boolean | undefined;
};

type EditHouseholdAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_HOUSEHOLD'; household: HouseholdType | null; householdName: string; isAuthorized: boolean }
  | { type: 'LOAD_END' }
  | { type: 'SET_HOUSEHOLD_NAME'; value: string }
  | { type: 'SET_SAVING'; value: boolean };

const initialEditHouseholdState: EditHouseholdState = {
  isLoadingData: true,
  isSaving: false,
  household: undefined,
  householdName: "",
  isAuthorized: undefined,
};

function editHouseholdReducer(state: EditHouseholdState, action: EditHouseholdAction): EditHouseholdState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, isLoadingData: true };
    case 'LOAD_HOUSEHOLD':
      return {
        ...state,
        household: action.household,
        householdName: action.householdName,
        isAuthorized: action.isAuthorized,
        isLoadingData: false,
      };
    case 'LOAD_END':
      return { ...state, isLoadingData: false };
    case 'SET_HOUSEHOLD_NAME':
      return { ...state, householdName: action.value };
    case 'SET_SAVING':
      return { ...state, isSaving: action.value };
    default:
      return state;
  }
}

export default function EditHouseholdPageContent({ params }: EditHouseholdPageContentProps) {
  const householdId = params.id;
  const router = useRouter();
  const { state: householdState, dispatch: householdDispatch } = useHousehold();
  const { state: userState } = useUserContext();
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const { currentUser, isLoading: isLoadingUser, error: errorUser } = userState;
  const { households, isLoading: isLoadingHouseholds, error: errorHousehold } = householdState;
  
  const [state, dispatch] = useReducer(editHouseholdReducer, initialEditHouseholdState);
  const { isLoadingData, isSaving, household, householdName, isAuthorized } = state;

  const shouldLoadData = !isLoadingUser && !errorUser && currentUser && !errorHousehold;

  // Handle loading household data
  useEffect(() => {
    if (!shouldLoadData) return;

    const opId = "load-edit-household";
    addLoadingOperation({ id: opId, priority: 1, description: "Loading household data..."});
    dispatch({ type: 'LOAD_START' });

    if (isLoadingHouseholds) {
        console.log("EditHouseholdPage useEffect: HouseholdContext still loading, waiting...");
        return;
    }
    
    console.log(`EditHouseholdPage useEffect: Attempting to find household ${householdId}`);
    console.log(`EditHouseholdPage useEffect: Households available in context: ${households.length}`);
    const foundHousehold = households.find(h => String(h.id) === String(householdId));

    if (foundHousehold) {
      console.log(`EditHouseholdPage useEffect: Found household ${foundHousehold.id}`);
      const isOwner = String(foundHousehold.owner?.id) === String(currentUser.id);
      const isAdmin = isOwner || foundHousehold.members?.some(
        member => String(member.userId) === String(currentUser.id) && member.role?.toLowerCase() === 'admin'
      );
      console.log(`EditHouseholdPage useEffect: Is owner? ${isOwner}, Is admin member? ${isAdmin}`);
      dispatch({
        type: 'LOAD_HOUSEHOLD',
        household: foundHousehold,
        householdName: foundHousehold.name,
        isAuthorized: isAdmin,
      });
    } else {
      console.warn(`EditHouseholdPage useEffect: Household ${householdId} not found in context.`);
      dispatch({
        type: 'LOAD_HOUSEHOLD',
        household: null,
        householdName: "",
        isAuthorized: false,
      });
    }
    dispatch({ type: 'LOAD_END' });
    removeLoadingOperation(opId);
  }, [shouldLoadData, currentUser, households, householdId, isLoadingHouseholds, addLoadingOperation, removeLoadingOperation]);

  if (isLoadingUser) {
    return <Loading text="Verificando usuário..." />;
  }

  if (errorUser) {
    return (
      <PageTransition>
        <div className="p-4 text-center">
          <p className="text-destructive">Erro ao carregar dados do usuário: {errorUser}. Tente recarregar a página.</p>
          <Button onClick={() => router.back()} className="mt-4">Voltar</Button>
        </div>
      </PageTransition>
    );
  }

  if (!currentUser) {
    return <Loading text="Redirecionando para login..." />;
  }

  if (errorHousehold) {
     return (
       <PageTransition>
         <div className="p-4 text-center">
            <p className="text-destructive">Erro ao carregar lista de residências: {errorHousehold}. Tente recarregar a página.</p>
            <Button onClick={() => router.back()} className="mt-4">Voltar</Button>
         </div>
       </PageTransition>
     );
  }

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

    const opId = "save-household";
    addLoadingOperation({ id: opId, priority: 1, description: "Saving household..." });
    dispatch({ type: 'SET_SAVING', value: true });
    try {
      const response = await fetch(`/api/v2/households/${householdId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Falha ao atualizar a residência.");
      }

      householdDispatch({
        type: "SET_HOUSEHOLD",
        payload: { ...household, name: trimmedName },
      });
      householdDispatch({
        type: "SET_HOUSEHOLDS",
        payload: households.map(h => String(h.id) === String(household.id) ? { ...h, name: trimmedName } : h),
      });

      toast.success("Residência atualizada com sucesso!");
      router.push(`/households/${householdId}`);

    } catch (error: any) {
      console.error("Erro ao atualizar residência:", error);
      toast.error(`Erro ao atualizar: ${error.message}`);
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
      removeLoadingOperation(opId);
    }
  };

  if (isLoadingData) {
    return <Loading text="Carregando dados da residência..." />;
  }

  if (!household || isAuthorized === false) {
    const title = !household ? "Residência Não Encontrada" : "Acesso Negado";
    const description = !household
      ? "A residência que você está tentando editar não foi encontrada ou ainda não carregou."
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
                aria-label="Voltar"
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
                    onChange={(e) => dispatch({ type: 'SET_HOUSEHOLD_NAME', value: e.target.value })}
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
                      <Loading text="Salvando..." size="sm" />
                    ) : (
                       <><Save className="mr-2 h-4 w-4" /> Salvar Alterações</>
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