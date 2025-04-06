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
  AlertTriangle,
  Plus,
  Lock,
  MoreVertical
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { toast } from "sonner"
import { useAppContext } from "@/lib/context/AppContext"
import { useUserContext } from "@/lib/context/UserContext"
import { useLoading } from "@/lib/context/LoadingContext"
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
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { CatCard } from "@/components/cat-card"

interface PageProps {
  params: Promise<{ id: string }>;
}

const formatMemberRole = (role?: string) => {
  if (!role) return 'Membro';
  return role.toLowerCase() === 'admin' ? 'Administrador' : 'Membro';
};

export default function HouseholdDetailsPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const router = useRouter();
  const { data: session, status } = useSession();
  const { state: appState, dispatch: appDispatch } = useAppContext();
  const { state: userState, dispatch: userDispatch } = useUserContext();
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const { households, cats: allCats } = appState;
  const { currentUser } = userState;
  const householdId = resolvedParams.id;
  
  const [isLoadingData, setIsLoadingData] = useState(true);
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
    const opId = `load-household-${householdId}`;
    addLoadingOperation({ id: opId, priority: 1, description: "Loading household details..." });
    setIsLoadingData(true);
    setLoadError(null);
    setHousehold(undefined); // Reset household state while loading

    const checkAccess = () => {
      // 1. Handle unauthenticated state - redirect immediately
      if (status === "unauthenticated") {
        router.replace("/login");
        removeLoadingOperation(opId);
        return; 
      }

      // 2. Wait until authenticated AND user data is loaded AND households list is populated
      if (status === "loading" || !currentUser || households.length === 0) {
        // Still waiting for necessary data
        return; 
      }

      // --- At this point, status is 'authenticated', currentUser exists, and households list is ready ---

      const foundHousehold = households.find(h => String(h.id) === String(householdId));

      // 3. Handle household not found
      if (!foundHousehold) {
        setLoadError("Residência não encontrada.");
        setHousehold(null);
        setCats([]);
        toast.error("Residência não encontrada."); // Keep toast for immediate feedback
        setIsLoadingData(false); // Stop loading indicator
        removeLoadingOperation(opId); // Remove loading operation
        router.replace("/households"); // Redirect back to households list
        return;
      }

      // 4. Check membership/ownership
      const isOwner = String(foundHousehold.owner?.id) === String(currentUser.id);
      const isMember = foundHousehold.members?.some(m => String(m.userId) === String(currentUser.id));

      // 5. Handle unauthorized access
      if (!isOwner && !isMember) {
        setLoadError("Você não é membro desta residência.");
        setHousehold(null);
        setCats([]);
        toast.error("Você não é membro desta residência."); // Keep toast
        setIsLoadingData(false); // Stop loading indicator
        removeLoadingOperation(opId); // Remove loading operation
        router.replace("/households"); // Redirect back to households list
        return;
      }

      // 6. Access granted!
      setHousehold(foundHousehold);
      const householdCats = allCats.filter(cat => String(cat.householdId) === String(householdId));
      setCats(householdCats);
      setLoadError(null); // Clear potential previous errors
      setIsLoadingData(false); // Stop loading indicator
      removeLoadingOperation(opId); // Remove loading operation
    };

    // Initial check
    checkAccess();

    // Set up an interval to retry if data isn't ready
    const retryInterval = setInterval(() => {
      if (isLoadingData && status === "authenticated" && currentUser) {
        checkAccess();
      }
    }, 500);

    // Cleanup function
    return () => {
      clearInterval(retryInterval);
      removeLoadingOperation(opId);
    };

  }, [status, currentUser, households, householdId, allCats, router, addLoadingOperation, removeLoadingOperation, isLoadingData]);

  const isCurrentUserAdmin = useCallback(() => {
    if (!household || !currentUser) return false;
    
    // Check if user is the owner
    if (household.owner?.id === currentUser.id) return true;
    
    // Check if user is an admin member
    const currentUserMember = household.members?.find(
      member => String(member.userId) === String(currentUser.id)
    );
    return currentUserMember?.role?.toLowerCase() === 'admin';
  }, [household, currentUser]);

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
    if (!household || !currentUser) return;
    const opId = "leave-household";
    addLoadingOperation({ id: opId, priority: 1, description: "Leaving household..." });
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/households/${household.id}/members/${currentUser.id}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.error || 'Falha ao sair da residência');
      }

      appDispatch({ 
        type: "REMOVE_HOUSEHOLD_MEMBER", 
        payload: { 
          householdId: String(household.id), 
          memberId: String(currentUser.id) 
        } 
      });
      
      userDispatch({ 
           type: "SET_CURRENT_USER", 
           payload: currentUser ? { ...currentUser, householdId: null } : null
      });

      toast.success("Você saiu da residência.");
      router.push("/households");

    } catch (error: any) {
      console.error("Erro ao sair da residência:", error);
      toast.error(`Erro ao sair: ${error.message}`);
    } finally {
      setShowLeaveDialog(false);
      setIsProcessing(false);
      removeLoadingOperation(opId);
    }
  };

  const removeMember = async (memberIdToRemove: string) => {
    if (!household || !memberIdToRemove || !isCurrentUserAdmin()) {
        toast.error("Ação inválida ou não permitida.");
        return;
    }
    const opId = `remove-member-${memberIdToRemove}`;
    addLoadingOperation({ id: opId, priority: 1, description: `Removing member...` });
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/households/${household.id}/members/${memberIdToRemove}`, {
        method: "DELETE"
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.error || 'Falha ao remover membro');
      }

      appDispatch({ 
        type: "REMOVE_HOUSEHOLD_MEMBER", 
        payload: { householdId: String(household.id), memberId: memberIdToRemove } 
      });

      toast.success("Membro removido com sucesso.");

    } catch (error: any) {
      console.error("Erro ao remover membro:", error);
      toast.error(`Erro ao remover: ${error.message}`);
    } finally {
      setMemberToRemove(null);
      setIsProcessing(false);
      removeLoadingOperation(opId);
    }
  };

  const changeMemberRole = async (memberIdToChange: string, newRole: 'Admin' | 'Member') => {
    if (!household || !memberIdToChange || !isCurrentUserAdmin()) {
       toast.error("Ação inválida ou não permitida.");
       return;
    }
    
    const admins = household.members?.filter(m => m.role?.toLowerCase() === 'admin');
    const memberBeingChanged = household.members?.find(m => String(m.userId) === memberIdToChange);
    const memberIsAdmin = memberBeingChanged?.role?.toLowerCase() === 'admin';

    if (memberIsAdmin && admins?.length === 1 && newRole === 'Member') {
       toast.error("Não é possível rebaixar o último administrador.");
       setMemberToDemote(null);
       return;
    }
    
    const opId = `change-role-${memberIdToChange}`;
    addLoadingOperation({ id: opId, priority: 1, description: `Updating role...` });
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/households/${household.id}/members/${memberIdToChange}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.error || 'Falha ao alterar cargo do membro');
      }
      
      const updatedMemberData = await response.json(); 

      appDispatch({ 
        type: "UPDATE_HOUSEHOLD_MEMBER", 
        payload: { 
          householdId: String(household.id), 
          member: { 
             id: memberBeingChanged?.id,
             userId: memberIdToChange, 
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
      removeLoadingOperation(opId);
    }
  };

  const deleteCat = async (catIdToDelete: number) => {
    if (!household || !catIdToDelete || !isCurrentUserAdmin()) {
       toast.error("Ação inválida ou não permitida.");
       return;
    }
    const catIdStr = String(catIdToDelete);
    const opId = `delete-cat-from-household-${catIdStr}`;
    addLoadingOperation({ id: opId, priority: 1, description: `Removing cat...` });
    setIsProcessing(true);
    const previousCats = allCats;
    
    appDispatch({ type: "DELETE_CAT", payload: catIdToDelete });

    try {
      const response = await fetch(`/api/cats/${catIdStr}`, {
        method: "DELETE"
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.error || 'Falha ao remover gato');
      }

      toast.success("Gato removido com sucesso.");

    } catch (error: any) {
      console.error("Erro ao remover gato:", error);
      toast.error(`Erro ao remover gato: ${error.message}`);
      appDispatch({ type: "SET_CATS", payload: previousCats });
    } finally {
      setCatToDelete(null);
      setIsProcessing(false);
      removeLoadingOperation(opId);
    }
  };

   const deleteHousehold = async () => {
      if (!household || !isCurrentUserAdmin()) {
         toast.error("Ação inválida ou não permitida.");
         return;
      }
      const opId = `delete-household-${household.id}`;
      addLoadingOperation({ id: opId, priority: 1, description: `Deleting household...` });
      setIsProcessing(true);
      const previousHouseholds = households;
      const previousUser = currentUser;
      
      appDispatch({ type: "SET_HOUSEHOLDS", payload: households.filter(h => String(h.id) !== String(household.id)) });
      if (String(currentUser?.householdId) === String(household.id)) {
        userDispatch({
          type: "SET_CURRENT_USER",
          payload: currentUser ? { ...currentUser, householdId: null } : null
        });
      }

      try {
         const response = await fetch(`/api/households/${household.id}`, { method: 'DELETE' });

         if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Erro ao excluir residência no servidor');
         }

         toast.success("Residência excluída com sucesso");
         router.push("/households"); 

      } catch (error: any) {
         console.error("Erro ao excluir residência:", error);
         toast.error(`Erro ao excluir: ${error.message}`);
         appDispatch({ type: "SET_HOUSEHOLDS", payload: previousHouseholds });
         if (String(previousUser?.householdId) === String(household.id)) {
             userDispatch({ type: "SET_CURRENT_USER", payload: previousUser });
         }
      } finally {
         setShowDeleteHouseholdDialog(false);
         setIsProcessing(false);
         removeLoadingOperation(opId);
      }
   };

  if (isLoadingData) {
    return (
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
          <main className="flex-1 p-4 pb-24">
            <div className="mb-6 flex items-center">
               <Skeleton className="h-8 w-8 mr-2 rounded-md" />
               <Skeleton className="h-7 w-48" />
            </div>
            <div className="mb-4">
               <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <Card>
               <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
               <CardContent className="space-y-4">
                   <Skeleton className="h-10 w-full" />
                   <Skeleton className="h-10 w-full" />
                   <Skeleton className="h-10 w-full" />
               </CardContent>
            </Card>
          </main>
          <BottomNav />
        </div>
      </PageTransition>
    );
  }
  
  if (loadError) {
    return (
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
          <main className="flex-1 p-4 pb-24 flex items-center justify-center">
             <EmptyState 
                icon={AlertTriangle}
                title="Erro ao Carregar Residência"
                description={loadError || "Não foi possível carregar os dados desta residência."}
                actionLabel="Voltar para Residências"
                actionHref="/households"
              />
          </main>
          <BottomNav />
        </div>
      </PageTransition>
    );
  }

  if (!household) {
      return (
          <PageTransition>
              <div className="flex flex-col min-h-screen bg-background">
                  <main className="flex-1 p-4 pb-24 flex items-center justify-center">
                      <EmptyState 
                          icon={AlertTriangle}
                          title="Erro Inesperado"
                          description="Não foi possível exibir os detalhes da residência."
                          actionLabel="Voltar para Residências"
                          actionHref="/households"
                      />
                  </main>
                  <BottomNav />
              </div>
          </PageTransition>
      );
  }
  
  const isAdmin = isCurrentUserAdmin();

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <main className="flex-1 p-4 pb-24">
          <div className="mb-6 flex items-center justify-between">
             <div className="flex items-center">
               <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => router.push('/households')} 
                  className="mr-2"
                  aria-label="Voltar para Residências"
               >
                  <ChevronLeft className="h-5 w-5" />
               </Button>
               <div>
                  <h1 className="text-xl font-bold truncate" title={household.name}>{household.name}</h1>
                   <p className="text-xs text-muted-foreground">
                      Criada em {format(new Date(household.createdAt || Date.now()), "dd/MM/yyyy", { locale: ptBR })} por {household.owner?.name || 'Desconhecido'}
                   </p>
               </div>
             </div>
              <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="flex-shrink-0">
                         <Settings className="h-4 w-4" />
                         <span className="sr-only">Opções da Residência</span>
                      </Button>
                  </DropdownMenuTrigger>
                 <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Opções da Residência</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {isAdmin && (
                        <DropdownMenuItem onClick={() => router.push(`/households/${householdId}/edit`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar Nome
                        </DropdownMenuItem>
                    )}
                     <DropdownMenuItem onClick={() => router.push(`/households/${householdId}/members/invite`)} disabled={!isAdmin}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Convidar Membros
                        {!isAdmin && <Lock className="ml-auto h-3 w-3 text-muted-foreground" />} 
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                     <AlertDialog onOpenChange={setShowLeaveDialog}>
                       <AlertDialogTrigger asChild>
                          <DropdownMenuItem 
                             className="text-destructive focus:text-destructive focus:bg-destructive/10"
                             onSelect={(e) => e.preventDefault()}
                           >
                             <LogOut className="mr-2 h-4 w-4" />
                             Sair da Residência
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                           <AlertDialogHeader>
                             <AlertDialogTitle>Sair da Residência?</AlertDialogTitle>
                             <AlertDialogDescription>
                               Tem certeza que deseja sair de "{household.name}"? Você perderá o acesso aos gatos e dados associados.
                             </AlertDialogDescription>
                           </AlertDialogHeader>
                           <AlertDialogFooter>
                             <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
                             <AlertDialogAction onClick={leaveHousehold} disabled={isProcessing}>
                               {isProcessing ? <Loading text="Saindo..." size="sm"/> : "Confirmar Saída"}
                             </AlertDialogAction>
                           </AlertDialogFooter>
                         </AlertDialogContent>
                      </AlertDialog>
                      
                     {isAdmin && (
                       <AlertDialog onOpenChange={setShowDeleteHouseholdDialog}>
                         <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                               className="text-destructive focus:text-destructive focus:bg-destructive/10 mt-1"
                               onSelect={(e) => e.preventDefault()}
                             >
                               <Trash2 className="mr-2 h-4 w-4" />
                               Excluir Residência
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                           <AlertDialogContent>
                             <AlertDialogHeader>
                               <AlertDialogTitle>Excluir Residência?</AlertDialogTitle>
                               <AlertDialogDescription>
                                 Tem certeza que deseja excluir PERMANENTEMENTE "{household.name}"? Todos os membros, gatos e dados serão perdidos.
                               </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                               <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
                               <AlertDialogAction onClick={deleteHousehold} disabled={isProcessing} className="bg-destructive hover:bg-destructive/90">
                                 {isProcessing ? <Loading text="Excluindo..." size="sm"/> : "Confirmar Exclusão"}
                               </AlertDialogAction>
                             </AlertDialogFooter>
                           </AlertDialogContent>
                        </AlertDialog>
                     )}
                 </DropdownMenuContent>
             </DropdownMenu>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="members" disabled={isProcessing}>
                 <Users className="mr-2 h-4 w-4" /> Membros ({household.members?.length || 0})
               </TabsTrigger>
              <TabsTrigger value="cats" disabled={isProcessing}>
                 <Cat className="mr-2 h-4 w-4" /> Gatos ({cats.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Membros da Residência</CardTitle>
                  {household.inviteCode && isAdmin && (
                      <CardDescription className="text-xs flex items-center gap-2 pt-1">
                         <span>Código de Convite: <code>{household.inviteCode}</code></span>
                         <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyInviteCode} title="Copiar código">
                            <CopyCheck className="h-3 w-3" />
                         </Button>
                      </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                   {household.members && household.members.length > 0 ? (
                      <ul className="space-y-3">
                        {[...(household.members || [])]
                          .sort((a, b) => {
                             const roleA = a.role?.toLowerCase();
                             const roleB = b.role?.toLowerCase();
                             if (roleA === 'admin' && roleB !== 'admin') return -1;
                             if (roleA !== 'admin' && roleB === 'admin') return 1;
                             return (a.name || '').localeCompare(b.name || '');
                          })
                          .map((member) => (
                           <li key={member.id || member.userId} className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/50">
                             <div className="flex items-center gap-3 flex-grow min-w-0">
                               <Avatar className="h-9 w-9">
                                 <AvatarImage src={member.avatar || undefined} alt={member.name || 'User'} />
                                 <AvatarFallback>{member.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                               </Avatar>
                               <div className="min-w-0">
                                 <p className="text-sm font-medium truncate">{member.name || "Usuário Desconhecido"}</p>
                                 <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                               </div>
                             </div>
                              <div className="flex items-center flex-shrink-0 gap-1">
                                 <Badge variant={member.role?.toLowerCase() === 'admin' ? "default" : "secondary"} className="capitalize">
                                    {formatMemberRole(member.role)}
                                 </Badge>
                                 {isAdmin && String(member.userId) !== String(currentUser?.id) && (
                                     <DropdownMenu>
                                         <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                               <MoreVertical className="h-4 w-4" />
                                               <span className="sr-only">Ações para {member.name}</span>
                                            </Button>
                                         </DropdownMenuTrigger>
                                         <DropdownMenuContent align="end">
                                             <DropdownMenuLabel>Gerenciar {member.name}</DropdownMenuLabel>
                                             <DropdownMenuSeparator />
                                             {member.role?.toLowerCase() === 'member' ? (
                                                 <AlertDialog onOpenChange={(open) => !open && setMemberToPromote(null)}>
                                                     <AlertDialogTrigger asChild>
                                                         <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setMemberToPromote(member); }}>
                                                             <ShieldCheck className="mr-2 h-4 w-4" /> Promover a Admin
                                                         </DropdownMenuItem>
                                                     </AlertDialogTrigger>
                                                     {memberToPromote?.id === member.id && (
                                                         <AlertDialogContent>
                                                             <AlertDialogHeader><AlertDialogTitle>Promover a Admin?</AlertDialogTitle></AlertDialogHeader>
                                                             <AlertDialogDescription>Deseja conceder permissões de administrador para {member.name}?</AlertDialogDescription>
                                                             <AlertDialogFooter>
                                                                 <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
                                                                 <AlertDialogAction onClick={() => changeMemberRole(String(member.userId), 'Admin')} disabled={isProcessing}>
                                                                     {isProcessing ? <Loading text="Promovendo..." size="sm"/> : "Promover"}
                                                                 </AlertDialogAction>
                                                             </AlertDialogFooter>
                                                         </AlertDialogContent>
                                                     )}
                                                 </AlertDialog>
                                             ) : (
                                                 <AlertDialog onOpenChange={(open) => !open && setMemberToDemote(null)}>
                                                     <AlertDialogTrigger asChild>
                                                          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setMemberToDemote(member); }}>
                                                             <ShieldX className="mr-2 h-4 w-4" /> Rebaixar para Membro
                                                         </DropdownMenuItem>
                                                     </AlertDialogTrigger>
                                                     {memberToDemote?.id === member.id && (
                                                         <AlertDialogContent>
                                                             <AlertDialogHeader><AlertDialogTitle>Rebaixar para Membro?</AlertDialogTitle></AlertDialogHeader>
                                                             <AlertDialogDescription>Deseja remover as permissões de administrador de {member.name}?</AlertDialogDescription>
                                                             <AlertDialogFooter>
                                                                 <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
                                                                 <AlertDialogAction onClick={() => changeMemberRole(String(member.userId), 'Member')} disabled={isProcessing}>
                                                                     {isProcessing ? <Loading text="Rebaixando..." size="sm"/> : "Rebaixar"}
                                                                 </AlertDialogAction>
                                                             </AlertDialogFooter>
                                                         </AlertDialogContent>
                                                     )}
                                                 </AlertDialog>
                                             )}
                                            <DropdownMenuSeparator />
                                             <AlertDialog onOpenChange={(open) => !open && setMemberToRemove(null)}>
                                                 <AlertDialogTrigger asChild>
                                                      <DropdownMenuItem
                                                         className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                         onSelect={(e) => { e.preventDefault(); setMemberToRemove(member); }}
                                                      >
                                                         <UserMinus className="mr-2 h-4 w-4" /> Remover da Residência
                                                     </DropdownMenuItem>
                                                 </AlertDialogTrigger>
                                                 {memberToRemove?.id === member.id && (
                                                     <AlertDialogContent>
                                                         <AlertDialogHeader><AlertDialogTitle>Remover {member.name}?</AlertDialogTitle></AlertDialogHeader>
                                                         <AlertDialogDescription>Tem certeza que deseja remover {member.name} desta residência?</AlertDialogDescription>
                                                         <AlertDialogFooter>
                                                             <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
                                                             <AlertDialogAction onClick={() => removeMember(String(member.userId))} disabled={isProcessing} className="bg-destructive hover:bg-destructive/90">
                                                                 {isProcessing ? <Loading text="Removendo..." size="sm"/> : "Remover Membro"}
                                                             </AlertDialogAction>
                                                         </AlertDialogFooter>
                                                     </AlertDialogContent>
                                                 )}
                                             </AlertDialog>
                                         </DropdownMenuContent>
                                     </DropdownMenu>
                                 )}
                              </div>
                           </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro encontrado.</p>
                    )}
                </CardContent>
                 {isAdmin && (
                   <CardFooter className="border-t pt-4">
                       <Button variant="outline" className="w-full" onClick={() => router.push(`/households/${householdId}/members/invite`)}>
                         <UserPlus className="mr-2 h-4 w-4" /> Convidar Novo Membro
                       </Button>
                   </CardFooter>
                 )}
              </Card>
            </TabsContent>

            <TabsContent value="cats" className="mt-4">
               <Card>
                  <CardHeader>
                      <CardTitle className="text-lg">Gatos na Residência</CardTitle>
                      <CardDescription>Gatos gerenciados nesta residência.</CardDescription>
                  </CardHeader>
                  <CardContent>
                     {cats.length > 0 ? (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           {cats.map((cat) => (
                             <CatCard 
                               key={cat.id} 
                               cat={cat} 
                               onView={() => router.push(`/cats/${cat.id}`)}
                               onEdit={() => router.push(`/cats/${cat.id}/edit`)}
                               onDelete={() => setCatToDelete(cat)} 
                               showAdminActions={isAdmin}
                             />
                           ))}
                         </div>
                     ) : (
                         <div className="pt-4">
                           <EmptyState
                             icon={Cat}
                             title="Nenhum Gato Adicionado"
                             description="Adicione o primeiro gato desta residência."
                             actionLabel="Adicionar Gato"
                             actionHref={`/cats/new?householdId=${householdId}`}
                            />
                          </div>
                     )}
                  </CardContent>
                   {isAdmin && (
                     <CardFooter className="border-t pt-4">
                         <Button variant="outline" className="w-full" onClick={() => router.push(`/cats/new?householdId=${householdId}`)}>
                           <Plus className="mr-2 h-4 w-4" /> Adicionar Gato à Residência
                         </Button>
                     </CardFooter>
                   )}
               </Card>
            </TabsContent>
          </Tabs>
        </main>

        {catToDelete && (
           <AlertDialog open={!!catToDelete} onOpenChange={(open) => !open && setCatToDelete(null)}>
             <AlertDialogContent>
                <AlertDialogHeader>
                   <AlertDialogTitle>Remover {catToDelete.name}?</AlertDialogTitle>
                   <AlertDialogDescription>
                      Tem certeza que deseja remover {catToDelete.name} desta residência? Seus dados e agendamentos associados serão perdidos.
                   </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                   <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
                   <AlertDialogAction onClick={() => deleteCat(catToDelete.id)} disabled={isProcessing} className="bg-destructive hover:bg-destructive/90">
                     {isProcessing ? <Loading text="Removendo..." size="sm"/> : "Remover Gato"}
                   </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
           </AlertDialog>
        )}

        <BottomNav />
      </div>
    </PageTransition>
  )
}
