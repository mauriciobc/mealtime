"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Home, Lock, MoreVertical, Plus, Trash, Pencil, ExternalLink, Users, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/lib/context/AppContext";
import { useUserContext } from "@/lib/context/UserContext";
import { useLoading } from "@/lib/context/LoadingContext";
import { Household as HouseholdType, HouseholdMember } from "@/lib/types";
import { Loading } from "@/components/ui/loading";
import { PageHeader } from "@/components/page-header";
import PageTransition from "@/components/page-transition";
import BottomNav from "@/components/bottom-nav";

// Empty state component (modified slightly)
function EmptyHouseholdsState() {
  return (
     <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg bg-muted/50 mt-8">
       <Users className="h-12 w-12 text-muted-foreground mb-4" />
       <h3 className="text-lg font-semibold mb-2">Nenhuma Residência</h3>
       <p className="text-muted-foreground mb-6 max-w-md">
         Você ainda não faz parte de nenhuma residência. Crie uma nova ou peça um convite para participar de uma existente.
       </p>
       <div className="flex gap-4">
          <Button asChild>
             <Link href="/households/new" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>Criar Nova</span>
             </Link>
          </Button>
           {/* Add Join button if invite codes are implemented */}
           {/* <Button variant="outline" asChild>
               <Link href="/join">Entrar com Convite</Link>
           </Button> */}
       </div>
     </div>
   );
}

// Loading skeleton (keep as is or simplify)
function LoadingHouseholds() { 
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, index) => (
          <Card key={index} className="w-full">
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
 }

export default function HouseholdsPage() {
  const router = useRouter();
  const { state: appState, dispatch: appDispatch } = useAppContext();
  const { state: userState, dispatch: userDispatch } = useUserContext();
  const { addLoadingOperation, removeLoadingOperation, state: loadingState } = useLoading();
  const { households } = appState;
  const { currentUser } = userState;
  const { data: session, status } = useSession();
  const [householdToDelete, setHouseholdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Only fetch if authenticated, user is loaded, and households are not yet loaded
    if (status === "authenticated" && currentUser && households.length === 0) {
        const fetchHouseholds = async () => {
            const opId = "fetch-households";
            addLoadingOperation({ id: opId, priority: 1, description: "Carregando residências..." });
            try {
                const response = await fetch('/api/households'); // Fetch from the correct endpoint
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || "Falha ao carregar residências");
                }
                const fetchedHouseholds: HouseholdType[] = await response.json();
                
                // Ensure owner data is included (or handle potentially missing data)
                // You might need to adjust the API endpoint or parsing if owner isn't included
                console.log("Fetched households:", fetchedHouseholds); 
                
                appDispatch({ type: "SET_HOUSEHOLDS", payload: fetchedHouseholds });
            } catch (error: any) {
                console.error("Error fetching households:", error);
                toast.error(`Erro ao carregar residências: ${error.message}`);
                // Optionally dispatch an error to context
                // appDispatch({ type: "SET_ERROR", payload: error.message || "Failed to load households" });
            } finally {
                removeLoadingOperation(opId);
            }
        };
        
        fetchHouseholds(); // Call the fetch function
    }
  }, [status, currentUser, households.length, appDispatch, addLoadingOperation, removeLoadingOperation]);

  const handleDeleteHousehold = async (id: string) => {
     if (!id) return;
     const opId = `delete-household-${id}`;
     addLoadingOperation({ id: opId, priority: 1, description: "Deleting household..." });
     setIsDeleting(true);
     const previousHouseholds = households; // From appState

    try {
      const response = await fetch(`/api/households/${id}`, { method: 'DELETE' });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.error || 'Erro ao excluir residência');
      }

      // Dispatch deletion to AppContext
      appDispatch({ type: "DELETE_HOUSEHOLD", payload: id });

      // Dispatch update to UserContext if the deleted household was the primary one
      // This logic needs careful handling - what should be the new primary?
      // Simplest might be to set primaryHousehold to null or the first available one.
      if (String(currentUser?.householdId) === String(id)) { // Assuming householdId is primary
          // Find a new primary or set to null
          const nextPrimary = previousHouseholds.find(h => String(h.id) !== String(id))?.id || null;
          userDispatch({ 
              type: "SET_CURRENT_USER", 
              // Assuming user object structure allows setting householdId directly
              payload: currentUser ? { ...currentUser, householdId: nextPrimary } : null 
          });
          // Consider adding a more specific action like SET_PRIMARY_HOUSEHOLD in UserContext
      }

      toast.success("Residência excluída com sucesso");
      setHouseholdToDelete(null);

    } catch (error: any) {
      console.error("Erro ao excluir residência:", error);
      toast.error(`Erro ao excluir: ${error.message}`);
      // Rollback optimistic delete (by setting households back - less ideal)
      // appDispatch({ type: "SET_HOUSEHOLDS", payload: previousHouseholds });
    } finally {
        setIsDeleting(false);
        removeLoadingOperation(opId);
    }
  };

  const isAdmin = useCallback((household: HouseholdType): boolean => {
     if (!currentUser?.id || !household?.members) return false;
     // Check if the current user is listed as an admin in the household members
     const currentUserMember = household.members.find(
       member => String(member.userId) === String(currentUser.id)
     );
     return currentUserMember?.role?.toLowerCase() === "admin";
  }, [currentUser]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  if (status === "loading" || (status === "authenticated" && !currentUser)) {
     return (
         <PageTransition>
            <div className="flex flex-col min-h-screen bg-background">
                <div className="p-4 pb-24">
                    <LoadingHouseholds />
                </div>
            </div>
         </PageTransition>
     );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return <Loading text="Redirecionando..." />;
  }

  const householdsToDisplay = households || [];
  const isGloballyLoading = loadingState.isGlobalLoading;

  return (
     <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
            <div className="p-4 pb-24">
                <PageHeader
                    title="Minhas Residências"
                    description="Gerencie as residências onde você cuida dos seus gatos"
                    actionIcon={<Plus className="h-4 w-4" />}
                    actionLabel="Nova Residência"
                    actionHref="/households/new"
                />

                {isGloballyLoading && householdsToDisplay.length === 0 ? (
                    <LoadingHouseholds />
                ) : householdsToDisplay.length === 0 ? (
                    <EmptyHouseholdsState />
                ) : (
                    <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6"
                    >
                    {householdsToDisplay.map((household) => (
                        <motion.div key={household.id} variants={itemVariants}>
                        <Card className="overflow-hidden flex flex-col h-full">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg mb-1 truncate" title={household.name}>{household.name}</CardTitle>
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1 flex-shrink-0">
                                                <MoreVertical className="h-4 w-4" />
                                                <span className="sr-only">Opções</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => router.push(`/households/${household.id}`)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                <span>Gerenciar</span>
                                            </DropdownMenuItem>
                                             {isAdmin(household) && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                     <AlertDialog onOpenChange={(open) => !open && setHouseholdToDelete(null)}>
                                                         <AlertDialogTrigger asChild>
                                                             <DropdownMenuItem
                                                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                                onSelect={(e) => { e.preventDefault(); setHouseholdToDelete(String(household.id)); }}
                                                            >
                                                                <Trash className="mr-2 h-4 w-4" />
                                                                <span>Excluir Residência</span>
                                                            </DropdownMenuItem>
                                                         </AlertDialogTrigger>
                                                         {householdToDelete === String(household.id) && (
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Tem certeza que deseja excluir a residência "{household.name}"? Esta ação é irreversível e removerá todos os gatos e dados associados.
                                                                </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                <AlertDialogCancel onClick={() => setHouseholdToDelete(null)} disabled={isDeleting}>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleDeleteHousehold(String(household.id))}
                                                                    disabled={isDeleting}
                                                                    className="bg-destructive hover:bg-destructive/90"
                                                                >
                                                                    {isDeleting ? <Loading text="Excluindo..." size="sm"/> : "Excluir"}
                                                                </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                         )}
                                                    </AlertDialog>
                                                </>
                                             )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                 <CardDescription className="text-xs flex items-center gap-2">
                                     <span>{household.members?.length || 0} {household.members?.length === 1 ? 'membro' : 'membros'}</span>
                                      ·
                                     <span>{household.cats?.length || 0} {household.cats?.length === 1 ? 'gato' : 'gatos'}</span>
                                     {isAdmin(household) && (
                                        <Badge variant="outline" className="ml-auto text-xs bg-primary/10 text-primary border-primary/20 px-1.5 py-0.5">
                                            <Lock className="h-2.5 w-2.5 mr-1" /> Admin
                                        </Badge>
                                     )}
                                </CardDescription>
                            </CardHeader>
                            <CardFooter className="pt-4 mt-auto">
                                <Button variant="outline" size="sm" className="w-full" asChild>
                                    <Link href={`/households/${household.id}`}>
                                        Ver Detalhes <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                        </motion.div>
                    ))}
                    </motion.div>
                )}
             </div>
             <BottomNav />
        </div>
     </PageTransition>
  );
} 