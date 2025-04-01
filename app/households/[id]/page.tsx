"use client"

import { useState, useEffect, use, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import BottomNav from "@/components/bottom-nav"
import PageTransition from "@/components/page-transition"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Home, 
  Users, 
  Cat, 
  CalendarClock,
  UserPlus, 
  Settings,
  Pencil,
  Trash2,
  LogOut,
  ShieldCheck,
  ShieldX,
  ChevronLeft,
  CopyCheck,
  UserMinus,
  Crown,
  ArrowUpDown,
  X,
  UserCheck,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useGlobalState } from "@/lib/context/global-state"
import { CatType, Household as HouseholdType, HouseholdMember } from "@/lib/types"
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
} from "@/components/ui/alert-dialog"
import React from "react"
import { Loading } from "@/components/ui/loading"
import { Label } from "@/components/ui/label"
import { AppHeader } from "@/components/app-header"

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function HouseholdDetailsPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const router = useRouter();
  const { data: session, status } = useSession();
  const { state, dispatch } = useGlobalState();
  const householdId = resolvedParams.id;
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [household, setHousehold] = useState<HouseholdType | null | undefined>(undefined);
  const [cats, setCats] = useState<CatType[]>([])
  const [activeTab, setActiveTab] = useState('members')
  
  const [memberToRemove, setMemberToRemove] = useState<HouseholdMember | null>(null)
  const [memberToPromote, setMemberToPromote] = useState<HouseholdMember | null>(null)
  const [memberToDemote, setMemberToDemote] = useState<HouseholdMember | null>(null)
  const [catToDelete, setCatToDelete] = useState<CatType | null>(null)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [showDeleteHouseholdDialog, setShowDeleteHouseholdDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (state.households && householdId) {
      const foundHousehold = state.households.find(h => String(h.id) === String(householdId));
      setHousehold(foundHousehold || null);
      
      if (foundHousehold) {
        const householdCats = state.cats.filter(cat => String(cat.householdId) === String(householdId));
        setCats(householdCats);
      } else {
        setCats([]);
      }
    }
  }, [state.households, state.cats, householdId]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const isCurrentUserAdmin = useCallback(() => {
    if (!household || !state.currentUser) return false;
    const currentUserMember = household.members.find(
      member => String(member.userId) === String(state.currentUser!.id)
    );
    return currentUserMember?.role?.toLowerCase() === 'admin';
  }, [household, state.currentUser]);

  const copyInviteCode = async () => {
    if (!household?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(household.inviteCode);
      toast.success("Código de convite copiado!");
    } catch (error) {
      console.error("Erro ao copiar código:", error);
      toast.error("Não foi possível copiar o código.");
    }
  };

  const leaveHousehold = async () => {
    if (!household || !state.currentUser) return;
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/households/${household.id}/members/${state.currentUser.id}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.error || 'Falha ao sair da residência');
      }

      dispatch({ 
        type: "REMOVE_HOUSEHOLD_MEMBER", 
        payload: { 
          householdId: String(household.id), 
          memberId: String(state.currentUser.id) 
        } 
      });

      toast.success("Você saiu da residência.");
      router.push("/households");

    } catch (error: any) {
      console.error("Erro ao sair da residência:", error);
      toast.error(`Erro ao sair: ${error.message}`);
    } finally {
      setShowLeaveDialog(false);
      setIsProcessing(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!household || !memberId) return;
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/households/${household.id}/members/${memberId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.error || 'Falha ao remover membro');
      }

      dispatch({ 
        type: "REMOVE_HOUSEHOLD_MEMBER", 
        payload: { householdId: String(household.id), memberId: String(memberId) } 
      });

      toast.success("Membro removido com sucesso.");

    } catch (error: any) {
      console.error("Erro ao remover membro:", error);
      toast.error(`Erro ao remover: ${error.message}`);
    } finally {
      setMemberToRemove(null);
      setIsProcessing(false);
    }
  };

  const changeMemberRole = async (memberId: string, newRole: 'Admin' | 'Member') => {
    if (!household || !memberId) return;
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/households/${household.id}/members/${memberId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.error || 'Falha ao alterar cargo do membro');
      }
      
      const updatedData = await response.json(); 

      dispatch({ 
        type: "UPDATE_HOUSEHOLD_MEMBER", 
        payload: { 
          householdId: String(household.id), 
          member: { 
            id: String(memberId), 
            role: newRole 
          } 
        } 
      });

      toast.success(`Cargo do membro atualizado para ${newRole}.`);

    } catch (error: any) {
      console.error(`Erro ao alterar cargo:`, error);
      toast.error(`Erro ao alterar cargo: ${error.message}`);
    } finally {
      setMemberToPromote(null);
      setMemberToDemote(null);
      setIsProcessing(false);
    }
  };

  const deleteCat = async (catId: string | number) => {
    if (!household || !catId) return;
    const catIdStr = String(catId);
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/cats/${catIdStr}`, {
        method: "DELETE"
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.error || 'Falha ao remover gato');
      }

      dispatch({ type: "DELETE_CAT", payload: Number(catIdStr) });

      toast.success("Gato removido com sucesso.");

    } catch (error: any) {
      console.error("Erro ao remover gato:", error);
      toast.error(`Erro ao remover gato: ${error.message}`);
    } finally {
      setCatToDelete(null);
      setIsProcessing(false);
    }
  };

  const deleteHousehold = async () => {
    if (!household) return;
    setIsProcessing(true);
    try {
        const response = await fetch(`/api/households/${household.id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Falha ao excluir residência');
        }

        dispatch({ type: 'DELETE_HOUSEHOLD', payload: String(household.id) });

        toast.success('Residência excluída com sucesso.');
        router.push('/households');

    } catch (error: any) {
        console.error('Erro ao excluir residência:', error);
        toast.error(`Erro ao excluir: ${error.message}`);
    } finally {
        setShowDeleteHouseholdDialog(false);
        setIsProcessing(false);
    }
  };

  if (status === "loading" || (status === "authenticated" && !state.currentUser) || household === undefined) {
    return (
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
          <div className="flex-1 p-4">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-6 w-3/4 mb-6" />
             <div className="space-y-4">
               <Skeleton className="h-40 w-full rounded-lg" />
               <Skeleton className="h-40 w-full rounded-lg" />
             </div>
          </div>
          <BottomNav />
        </div>
      </PageTransition>
    );
  }
  
  if (status === "unauthenticated") {
    return <Loading text="Redirecionando para login..." />;
  }

  if (household === null) {
    return (
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
           <AppHeader title="Erro" />
          <div className="flex-1 p-4 flex items-center justify-center">
            <Card className="w-full max-w-md text-center">
              <CardHeader>
                 <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
                <CardTitle className="text-destructive">Residência Não Encontrada</CardTitle>
                <CardDescription>
                  A residência que você está tentando acessar não foi encontrada ou você não tem permissão para vê-la.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/households">Voltar para Minhas Residências</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
          <BottomNav />
        </div>
      </PageTransition>
    );
  }

  const formatMemberRole = (role?: string) => {
    if (!role) return 'Membro';
    const lowerRole = role.toLowerCase();
    if (lowerRole === "admin") return "Admin";
    if (lowerRole === "member") return "Membro";
    return role;
  };

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex-1 p-4 pb-24">
          
           <div className="flex items-center mb-6">
             <Button variant="ghost" size="icon" className="mr-2" onClick={() => router.push('/households')}>
                <ChevronLeft className="h-5 w-5" />
             </Button>
             <div>
                <h1 className="text-xl font-bold leading-tight">{household.name}</h1>
                <p className="text-xs text-muted-foreground">
                  {household.members?.length || 0} {household.members?.length === 1 ? 'membro' : 'membros'} • 
                  {cats.length || 0} {cats.length === 1 ? 'gato' : 'gatos'}
                </p>
             </div>
           </div>
          
          <Tabs 
            defaultValue="members" 
            value={activeTab} 
            onValueChange={setActiveTab}
          >
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="members"><Users className="h-4 w-4 mr-1.5"/>Membros</TabsTrigger>
              <TabsTrigger value="cats"><Cat className="h-4 w-4 mr-1.5"/>Gatos</TabsTrigger>
              <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1.5"/>Ajustes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="members" className="space-y-3">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-base font-semibold">
                  Membros ({household.members?.length || 0})
                </h2>
                {isCurrentUserAdmin() && (
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => household.inviteCode && copyInviteCode()}
                    title="Copiar código de convite"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Convidar (Copiar Código)
                  </Button>
                )}
              </div>
              
              {household.members?.map(member => {
                 const isCurrent = String(member.userId) === String(state.currentUser?.id);
                 const memberName = isCurrent ? state.currentUser?.name : `Membro ${member.userId}`;
                 
                 return (
                  <div 
                    key={member.userId}
                    className="flex items-center justify-between p-3 bg-card rounded-lg border"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-9 w-9">
                         <AvatarImage 
                           src={isCurrent ? state.currentUser?.avatar : undefined} 
                           alt={memberName} 
                         />
                        <AvatarFallback>
                          {memberName ? memberName.slice(0, 2).toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center">
                          <p className="text-sm font-medium">
                             {memberName}
                          </p>
                           <Badge 
                            variant={member.role?.toLowerCase() === 'admin' ? 'default' : 'secondary'}
                            className="ml-2 text-xs px-1.5 py-0.5 rounded"
                           > 
                            {member.role?.toLowerCase() === 'admin' && <Crown className="h-3 w-3 mr-1"/>}
                             {formatMemberRole(member.role)}
                           </Badge>
                        </div>
                         {isCurrent && state.currentUser?.email && (
                           <p className="text-xs text-muted-foreground">{state.currentUser.email}</p>
                         )}
                      </div>
                    </div>
                    
                    {isCurrentUserAdmin() && !isCurrent && (
                      <div className="flex items-center space-x-0.5">
                        {member.role?.toLowerCase() === 'member' ? (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            onClick={() => setMemberToPromote(member)}
                            title="Promover a Admin"
                          >
                            <Crown className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:bg-muted/50"
                            onClick={() => setMemberToDemote(member)}
                            title="Rebaixar para Membro"
                          >
                             <UserCheck className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => setMemberToRemove(member)}
                          title="Remover Membro"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                 );
              })}
            </TabsContent>
            
            <TabsContent value="cats" className="space-y-3">
               <div className="flex justify-between items-center mb-3">
                 <h2 className="text-base font-semibold">
                   Gatos ({cats.length})
                 </h2>
                 <Button 
                   size="sm"
                   variant="outline"
                   onClick={() => router.push(`/cats/new?householdId=${household.id}`)}
                 >
                   <Cat className="mr-2 h-4 w-4" />
                   Adicionar Gato
                 </Button>
               </div>
               
               {cats.length === 0 ? (
                 <div className="text-center py-10 border border-dashed rounded-lg bg-muted/30">
                   <Cat className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                   <p className="text-sm text-muted-foreground mb-3">
                     Nenhum gato registrado nesta residência ainda.
                   </p>
                   <Button 
                     variant="default"
                     size="sm"
                     onClick={() => router.push(`/cats/new?householdId=${household.id}`)}
                   >
                     Adicionar Primeiro Gato
                   </Button>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   {cats.map(cat => (
                     <Card key={cat.id} className="overflow-hidden border">
                        <Link href={`/cats/${cat.id}`} className="block hover:bg-muted/30 transition-colors">
                         <CardHeader className="flex flex-row items-center space-x-3 p-3">
                            <Avatar className="h-10 w-10">
                               <AvatarImage src={cat.photoUrl || undefined} alt={cat.name} />
                               <AvatarFallback>{cat.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                               <CardTitle className="text-sm font-medium leading-tight">{cat.name}</CardTitle>
                               {cat.breed && (
                                  <CardDescription className="text-xs">{cat.breed}</CardDescription>
                               )}
                            </div>
                         </CardHeader>
                        </Link>
                       <CardFooter className="p-2 border-t bg-card flex justify-end">
                         <Button
                           variant="ghost"
                           size="icon"
                           className="h-7 w-7 text-destructive hover:bg-destructive/10"
                           onClick={() => setCatToDelete(cat)}
                           title="Remover Gato"
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       </CardFooter>
                     </Card>
                   ))}
                 </div>
               )}
             </TabsContent>
            
            <TabsContent value="settings" className="space-y-6">
              <Card className="border">
                 <CardHeader>
                    <CardTitle className="text-base">Informações</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                     <div>
                       <Label className="text-xs text-muted-foreground">Nome da Residência</Label>
                       <p className="font-medium">{household.name}</p>
                     </div>
                     
                     <div>
                       <Label className="text-xs text-muted-foreground">Código de Convite</Label>
                       <div className="flex items-center justify-between bg-muted rounded-md p-2 pl-3 mt-1">
                         <code className="text-sm font-mono mr-2">
                           {household.inviteCode}
                         </code>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="h-7 w-7"
                           onClick={copyInviteCode}
                           title="Copiar Código"
                         >
                           <CopyCheck className="h-4 w-4" />
                         </Button>
                       </div>
                     </div>
                 </CardContent>
                  {isCurrentUserAdmin() && (
                      <CardFooter className="border-t p-3">
                         <Button 
                           variant="outline"
                           size="sm"
                           onClick={() => router.push(`/households/${household.id}/edit`)}
                         >
                           <Pencil className="mr-2 h-4 w-4" />
                           Editar Residência
                         </Button>
                      </CardFooter>
                  )}
              </Card>
              
               <Card className="border border-destructive/50 bg-destructive/5">
                  <CardHeader>
                     <CardTitle className="text-base text-destructive">Zona de Perigo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                     {!isCurrentUserAdmin() && (
                        <div>
                           <p className="text-sm font-medium mb-1">Sair da Residência</p>
                           <p className="text-xs text-muted-foreground mb-2">Você perderá o acesso a esta residência e seus dados.</p>
                           <Button 
                              variant="outline"
                              className="border-destructive text-destructive hover:bg-destructive/10"
                              size="sm"
                              onClick={() => setShowLeaveDialog(true)}
                           >
                              <LogOut className="mr-2 h-4 w-4" />
                              Sair desta Residência
                           </Button>
                        </div>
                     )}
                     
                     {isCurrentUserAdmin() && (
                       <div>
                           <p className="text-sm font-medium mb-1">Excluir Residência</p>
                           <p className="text-xs text-muted-foreground mb-2">Esta ação é irreversível e excluirá todos os membros, gatos, agendamentos e outros dados associados.</p>
                           <Button 
                              variant="destructive"
                              size="sm"
                              onClick={() => setShowDeleteHouseholdDialog(true)}
                           >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir Permanentemente
                           </Button>
                        </div>
                     )}
                  </CardContent>
               </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <BottomNav />
        
        <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sair da Residência?</AlertDialogTitle>
              <AlertDialogDescription>
                 <p>Tem certeza que deseja sair de "{household.name}"? Você perderá o acesso a todos os gatos e dados associados. Esta ação não pode ser desfeita.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={leaveHousehold}
                disabled={isProcessing}
              >
                 {isProcessing ? "Saindo..." : "Confirmar Saída"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <AlertDialog open={memberToRemove !== null} onOpenChange={(open) => !open && setMemberToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover Membro?</AlertDialogTitle>
              <AlertDialogDescription>
                 Tem certeza que deseja remover {memberToRemove ? `Membro ${memberToRemove.userId}` : 'este membro'} de "{household.name}"? Eles perderão o acesso.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => memberToRemove && removeMember(String(memberToRemove.userId))}
                disabled={isProcessing}
              >
                 {isProcessing ? "Removendo..." : "Confirmar Remoção"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={memberToPromote !== null} onOpenChange={(open) => !open && setMemberToPromote(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Promover a Admin?</AlertDialogTitle>
              <AlertDialogDescription>
                 Tem certeza que deseja promover {memberToPromote ? `Membro ${memberToPromote.userId}` : 'este membro'} a Administrador em "{household.name}"? Eles terão permissões completas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => memberToPromote && changeMemberRole(String(memberToPromote.userId), 'Admin')}
                disabled={isProcessing}
              >
                 {isProcessing ? "Promovendo..." : "Confirmar Promoção"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={memberToDemote !== null} onOpenChange={(open) => !open && setMemberToDemote(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rebaixar para Membro?</AlertDialogTitle>
              <AlertDialogDescription>
                 Tem certeza que deseja rebaixar {memberToDemote ? `Membro ${memberToDemote.userId}` : 'este admin'} para Membro regular em "{household.name}"? Suas permissões de admin serão removidas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => memberToDemote && changeMemberRole(String(memberToDemote.userId), 'Member')}
                disabled={isProcessing}
              >
                 {isProcessing ? "Rebaixando..." : "Confirmar Rebaixamento"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={catToDelete !== null} onOpenChange={(open) => !open && setCatToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Gato?</AlertDialogTitle>
              <AlertDialogDescription>
                 Tem certeza que deseja excluir "{catToDelete?.name}"? Todos os registros de alimentação associados a ele também serão excluídos. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => catToDelete && deleteCat(catToDelete.id)}
                disabled={isProcessing}
              >
                 {isProcessing ? "Excluindo..." : "Confirmar Exclusão"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

         <AlertDialog open={showDeleteHouseholdDialog} onOpenChange={setShowDeleteHouseholdDialog}>
           <AlertDialogContent>
             <AlertDialogHeader>
               <AlertDialogTitle>Excluir Residência?</AlertDialogTitle>
               <AlertDialogDescription>
                  Tem certeza que deseja excluir permanentemente "{household.name}"? Esta ação é <span className="font-bold">irreversível</span> e removerá todos os membros, gatos, agendamentos e outros dados associados.
               </AlertDialogDescription>
             </AlertDialogHeader>
             <AlertDialogFooter>
               <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
               <AlertDialogAction
                 className="bg-destructive hover:bg-destructive/90"
                 onClick={deleteHousehold}
                 disabled={isProcessing}
               >
                  {isProcessing ? "Excluindo..." : "Confirmar Exclusão Permanente"}
               </AlertDialogAction>
             </AlertDialogFooter>
           </AlertDialogContent>
         </AlertDialog>
      </div>
    </PageTransition>
  )
}
