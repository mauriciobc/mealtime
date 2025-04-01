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
import { useGlobalState } from "@/lib/context/global-state";
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
  const { state, dispatch } = useGlobalState();
  const { data: session, status } = useSession();
  const [householdToDelete, setHouseholdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteHousehold = async (id: string) => {
     if (!id) return;
     setIsDeleting(true);
     const previousHouseholds = state.households;

    try {
      const response = await fetch(`/api/households/${id}`, { method: 'DELETE' });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.error || 'Erro ao excluir residência');
      }

      dispatch({ type: "DELETE_HOUSEHOLD", payload: { id } });

       if (String(state.currentUser?.householdId) === String(id)) {
           dispatch({ type: "SET_CURRENT_USER_HOUSEHOLD", payload: null });
       }


      toast.success("Residência excluída com sucesso");
      setHouseholdToDelete(null);

    } catch (error: any) {
      console.error("Erro ao excluir residência:", error);
      toast.error(`Erro ao excluir: ${error.message}`);
      
    } finally {
        setIsDeleting(false);
    }
  };

  const isAdmin = useCallback((household: HouseholdType) => {
     if (!state.currentUser?.id || !household?.members) return false;
     const currentUserMember = household.members.find(
       member => String(member.id) === String(state.currentUser!.id)
     );
     return currentUserMember?.role?.toLowerCase() === "admin";
  }, [state.currentUser]);

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

  if (status === "loading" || (status === "authenticated" && !state.currentUser)) {
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

  const householdsToDisplay = state.households || [];

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

                {householdsToDisplay.length === 0 ? (
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
                                    <CardTitle className="text-lg mb-1">{household.name}</CardTitle>
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1">
                                                <MoreVertical className="h-4 w-4" />
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
                                                                    {isDeleting ? "Excluindo..." : "Excluir"}
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