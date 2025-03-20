"use client"

import { useState, useEffect, use } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AppHeader } from "@/components/app-header"
import BottomNav from "@/components/bottom-nav"
import PageTransition from "@/components/page-transition"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
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
  X
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useGlobalState } from "@/lib/context/global-state"
import { CatType } from "@/lib/types"
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
import { getCatsByHouseholdId } from "@/lib/services/apiService"

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  isCurrentUser: boolean;
  joinedAt?: Date;
}

interface Cat {
  id: number;
  name: string;
  photoUrl: string | null;
}

interface Household {
  id: string;
  name: string;
  inviteCode: string;
  members: Member[];
  cats: string[];
  catGroups: any[];
}

// Função utilitária para converter a Household local para o formato esperado pelo contexto
const mapToHouseholdType = (household: Household): any => {
  return {
    ...household,
    members: household.members.map(member => ({
      userId: member.id,
      role: member.role === 'admin' ? 'Admin' : 'Member',
      joinedAt: member.joinedAt || new Date(),
    })),
    cats: household.cats,
  };
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function HouseholdDetailsPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const router = useRouter();
  const { data: session, status } = useSession();
  const { state, dispatch } = useGlobalState();
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [cats, setCats] = useState<CatType[]>([])
  const [activeTab, setActiveTab] = useState('members')
  
  // Estados para diálogos de confirmação
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null)
  const [memberToPromote, setMemberToPromote] = useState<string | null>(null)
  const [memberToDemote, setMemberToDemote] = useState<string | null>(null)
  const [catToDelete, setCatToDelete] = useState<number | null>(null)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)

  // Verificar se o usuário está autenticado
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Carregar dados da residência
  useEffect(() => {
    if (session && session.user) {
      loadHouseholdDetails();
    }
  }, [session, resolvedParams.id]);

  const loadHouseholdDetails = async () => {
    try {
      setIsLoading(true)
      
      // Validar o ID
      if (!resolvedParams.id || isNaN(Number(resolvedParams.id))) {
        console.error("ID de residência inválido:", resolvedParams.id)
        toast.error("ID de residência inválido")
        router.push("/households")
        return
      }
      
      // Tentar primeiro fazer uma chamada à API real
      try {
        const response = await fetch(`/api/households/${resolvedParams.id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("Dados da residência carregados via API:", data);
          
          // Mapear os dados
          const mappedHousehold = {
            ...data,
            members: (data.members || []).map((member: any) => ({
              id: member.id,
              role: member.role === 'Admin' ? 'admin' : 'member',
              name: member.name || '',
              email: member.email || '',
              isCurrentUser: member.id === session?.user?.id?.toString()
            }))
          }
          
          setHousehold(mappedHousehold as unknown as Household);
          
          // Buscar gatos do domicílio usando a API específica
          try {
            const catData = await getCatsByHouseholdId(resolvedParams.id);
            if (catData && catData.length > 0) {
              console.log("Gatos carregados via API:", catData);
              setCats(catData);
              
              // Atualizar o estado global com os gatos filtrados
              dispatch({
                type: "SET_CATS",
                payload: catData,
              });
            }
          } catch (catError) {
            console.error("Erro ao carregar gatos do domicílio:", catError);
          }
          
          return;
        }
      } catch (apiError) {
        console.error("Erro ao carregar via API:", apiError);
        // Continuar para o fallback com dados mockados
      }
      
      // Verificar se temos dados de households no estado
      if (!state.households || state.households.length === 0) {
        console.error("Não há households disponíveis no estado")
        toast.error("Erro ao carregar dados. Tente novamente mais tarde.")
        router.push("/households")
        return
      }
      
      console.log("Buscando household com ID:", resolvedParams.id)
      console.log("Households disponíveis:", state.households)
      
      // Tentativa mais robusta de encontrar o household
      const foundHousehold = state.households.find((h: any) => {
        if (!h || !h.id) return false
        return String(h.id) === String(resolvedParams.id)
      })
      
      if (foundHousehold) {
        console.log("Household encontrado:", foundHousehold)
        
        // Mapear os membros para incluir as propriedades necessárias
        const mappedHousehold = {
          ...foundHousehold,
          members: (foundHousehold.members || []).map((member: any) => ({
            id: member.userId,
            role: member.role === 'Admin' ? 'admin' : 'member',
            joinedAt: member.joinedAt,
            name: member.name || '',
            email: member.email || '',
            isCurrentUser: member.userId === session?.user?.id?.toString()
          }))
        }
        setHousehold(mappedHousehold as unknown as Household)
        
        // Buscar gatos associados ao domicílio
        const householdId = String(foundHousehold.id)
        const householdCats = state.cats.filter((cat: CatType) => {
          return cat.householdId && String(cat.householdId) === householdId
        })
        
        console.log("Gatos encontrados para o household:", householdCats)
        setCats(householdCats as any[])
      } else {
        // Se não encontrar o domicílio, voltar para a lista
        console.error("Domicílio não encontrado. ID:", resolvedParams.id)
        toast.error("Domicílio não encontrado")
        router.push("/households")
      }
    } catch (error) {
      console.error("Erro ao carregar detalhes do domicílio:", error)
      toast.error("Não foi possível carregar os detalhes do domicílio")
    } finally {
      setIsLoading(false)
    }
  }

  const copyInviteCode = async () => {
    if (!household) return
    
    try {
      await navigator.clipboard.writeText(household.inviteCode)
      toast.success("Código copiado para a área de transferência")
    } catch (error) {
      console.error("Erro ao copiar código:", error)
      toast.error("Não foi possível copiar o código de convite")
    }
  }

  const leaveHousehold = async () => {
    if (!household || !session?.user?.id) return
    
    try {
      // Em produção, seria uma chamada real à API
      // await fetch(`/api/households/${household.id}/members/${session.user.id}`, {
      //   method: "DELETE"
      // });
      
      if (dispatch) {
        // Atualização do estado global
        const updatedHousehold = {
          ...household,
          members: household.members.filter(m => m.id !== session.user.id.toString()),
          catGroups: household.catGroups || []
        }
        
        // Converter para o formato esperado pelo contexto
        const householdForDispatch = mapToHouseholdType(updatedHousehold);
        
        dispatch({
          type: "UPDATE_HOUSEHOLD",
          payload: householdForDispatch
        })
      }
      
      toast.success("Você saiu do domicílio")
      router.push("/households")
    } catch (error) {
      console.error("Erro ao sair do domicílio:", error)
      toast.error("Não foi possível sair do domicílio")
    } finally {
      setShowLeaveDialog(false)
    }
  }

  const removeMember = async (memberId: string) => {
    if (!household) return
    
    try {
      // Em produção, seria uma chamada real à API
      // await fetch(`/api/households/${household.id}/members/${memberId}`, {
      //   method: "DELETE"
      // });
      
      if (dispatch) {
        // Atualização do estado global
        const updatedHousehold = {
          ...household,
          members: household.members.filter(m => m.id !== memberId),
          catGroups: household.catGroups || []
        }
        
        // Converter para o formato esperado pelo contexto
        const householdForDispatch = mapToHouseholdType(updatedHousehold);
        
        dispatch({
          type: "UPDATE_HOUSEHOLD",
          payload: householdForDispatch
        })
        
        // Atualização do estado local
        setHousehold(updatedHousehold)
      }
      
      toast.success("Membro removido com sucesso")
    } catch (error) {
      console.error("Erro ao remover membro:", error)
      toast.error("Não foi possível remover o membro")
    } finally {
      setMemberToRemove(null)
    }
  }

  const changeMemberRole = async (memberId: string, newRole: 'admin' | 'member') => {
    if (!household) return
    
    try {
      // Em produção, seria uma chamada real à API
      // await fetch(`/api/households/${household.id}/members/${memberId}`, {
      //   method: "PATCH",
      //   headers: {
      //     "Content-Type": "application/json"
      //   },
      //   body: JSON.stringify({ role: newRole })
      // });
      
      if (dispatch) {
        // Atualização do estado global
        const updatedHousehold = {
          ...household,
          members: household.members.map(m => 
            m.id === memberId ? { ...m, role: newRole } : m
          ),
          catGroups: household.catGroups || []
        }
        
        // Converter para o formato esperado pelo contexto
        const householdForDispatch = mapToHouseholdType(updatedHousehold);
        
        dispatch({
          type: "UPDATE_HOUSEHOLD",
          payload: householdForDispatch
        })
        
        // Atualização do estado local
        setHousehold(updatedHousehold)
      }
      
      toast.success(`Membro ${newRole === 'admin' ? 'promovido' : 'rebaixado'} com sucesso`)
    } catch (error) {
      console.error(`Erro ao ${newRole === 'admin' ? 'promover' : 'rebaixar'} membro:`, error)
      toast.error(`Não foi possível ${newRole === 'admin' ? 'promover' : 'rebaixar'} o membro`)
    } finally {
      setMemberToPromote(null)
      setMemberToDemote(null)
    }
  }

  const deleteCat = async (catId: number) => {
    if (!household) return
    
    try {
      // Em produção, seria uma chamada real à API
      // await fetch(`/api/cats/${catId}`, {
      //   method: "DELETE"
      // });
      
      if (dispatch) {
        // Atualização do estado global
        dispatch({
          type: "DELETE_CAT",
          payload: catId
        })
        
        // Atualização do estado local
        setCats(prev => prev.filter(c => c.id !== catId))
      }
      
      toast.success("Gato removido com sucesso")
    } catch (error) {
      console.error("Erro ao remover gato:", error)
      toast.error("Não foi possível remover o gato")
    } finally {
      setCatToDelete(null)
    }
  }

  const isCurrentUserAdmin = () => {
    if (!household) return false
    const currentUser = household.members.find(member => member.isCurrentUser)
    return currentUser?.role === 'admin'
  }

  const formatMemberRole = (role: string) => {
    switch (role.toLowerCase()) {
      case "admin":
        return "Administrador"
      case "member":
        return "Membro"
      default:
        return role
    }
  }

  if (isLoading) {
    return (
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
          <div className="flex-1 p-4">
            <Skeleton className="h-10 w-48 mb-4" />
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-6 w-3/4 mb-6" />
            
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-32 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48 mt-1" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48 mt-1" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <BottomNav />
        </div>
      </PageTransition>
    )
  }
  
  if (loadError) {
    return (
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
          <div className="flex-1 p-4">
            <Card>
              <CardHeader>
                <CardTitle>Erro ao carregar detalhes da residência</CardTitle>
                <CardDescription>
                  {loadError}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/households">Voltar para Domicílios</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <BottomNav />
        </div>
      </PageTransition>
    )
  }

  if (!household) {
    return (
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
          <div className="flex-1 p-4">
            <Card>
              <CardHeader>
                <CardTitle>Residência não encontrada</CardTitle>
                <CardDescription>
                  Não foi possível encontrar a residência solicitada.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/households">Voltar para Domicílios</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <BottomNav />
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex-1 p-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{household.name}</h1>
            <p className="text-muted-foreground">
              {household.members.length} {household.members.length === 1 ? 'membro' : 'membros'} • 
              {cats.length} {cats.length === 1 ? 'gato' : 'gatos'}
            </p>
          </div>
          
          <Tabs 
            defaultValue="members" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="mb-6"
          >
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="members">Membros</TabsTrigger>
              <TabsTrigger value="cats">Gatos</TabsTrigger>
              <TabsTrigger value="settings">Configurações</TabsTrigger>
            </TabsList>
            
            <TabsContent value="members" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">
                  Membros ({household.members.length})
                </h2>
                {isCurrentUserAdmin() && (
                  <Button 
                    size="sm"
                    onClick={() => router.push(`/households/${household.id}/members/invite`)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Convidar
                  </Button>
                )}
              </div>
              
              {household.members.map(member => (
                <div 
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-card rounded-lg border"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback>
                        {member.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center">
                        <p className="font-medium">
                          {member.name}
                          {member.isCurrentUser && (
                            <span className="text-xs text-muted-foreground ml-2">
                              (Você)
                            </span>
                          )}
                        </p>
                        <Badge 
                          variant={member.role === 'admin' ? 'default' : 'outline'}
                          className="ml-2"
                        >
                          {formatMemberRole(member.role)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  
                  {isCurrentUserAdmin() && !member.isCurrentUser && (
                    <div className="flex space-x-1">
                      {member.role === 'member' ? (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setMemberToPromote(member.id)}
                          title="Promover a Administrador"
                        >
                          <Crown className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setMemberToDemote(member.id)}
                          title="Rebaixar a Membro"
                        >
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive"
                        onClick={() => setMemberToRemove(member.id)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>
            
            <TabsContent value="cats" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">
                  Gatos ({cats.length})
                </h2>
                <Button 
                  size="sm"
                  onClick={() => router.push(`/households/${household.id}/cats/new`)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Adicionar Gato
                </Button>
              </div>
              
              {cats.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">
                    Nenhum gato registrado neste domicílio.
                  </p>
                  <Button 
                    variant="link" 
                    onClick={() => router.push(`/households/${household.id}/cats/new`)}
                  >
                    Adicionar um gato
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cats.map(cat => (
                    <Card key={cat.id} className="overflow-hidden">
                      <CardHeader className="flex flex-row items-center justify-between p-4">
                        <CardTitle className="text-base">{cat.name}</CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => setCatToDelete(cat.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Button
                          variant="ghost"
                          className="w-full justify-start rounded-none"
                          onClick={() => router.push(`/cats/${cat.id}`)}
                        >
                          Ver Detalhes
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Configurações do Domicílio</h2>
                
                <div className="p-4 bg-card rounded-lg border space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-1">Nome do Domicílio</p>
                      <p className="bg-muted p-2 rounded">{household.name}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-1">Código de Convite</p>
                      <div className="flex">
                        <code className="bg-muted p-2 rounded flex-1 font-mono">
                          {household.inviteCode}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="ml-2"
                          onClick={copyInviteCode}
                        >
                          <CopyCheck className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {isCurrentUserAdmin() && (
                    <>
                      <div className="pt-4 border-t">
                        <Button 
                          variant="outline"
                          onClick={() => router.push(`/households/${household.id}/edit`)}
                        >
                          Editar Domicílio
                        </Button>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <h3 className="text-sm font-medium mb-2">Zona de Perigo</h3>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                              Excluir Domicílio
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Domicílio</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir este domicílio? Esta ação não pode ser desfeita.
                                Todos os gatos e programações associados serão excluídos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground"
                                onClick={() => {
                                  // Implementar lógica de exclusão do domicílio
                                }}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <BottomNav />
        
        {/* Diálogo de confirmação para sair do domicílio */}
        <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sair do Domicílio</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja sair deste domicílio? Você perderá o acesso a todos os gatos e dados associados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={leaveHousehold}
              >
                Sair
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Diálogo de confirmação para remover membro */}
        <AlertDialog open={memberToRemove !== null} onOpenChange={(open) => !open && setMemberToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover Membro</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover este membro do domicílio? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={() => memberToRemove && removeMember(memberToRemove)}
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Diálogo de confirmação para promover membro */}
        <AlertDialog open={memberToPromote !== null} onOpenChange={(open) => !open && setMemberToPromote(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Promover a Administrador</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja promover este membro a administrador? Ele terá acesso total ao domicílio.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => memberToPromote && changeMemberRole(memberToPromote, 'admin')}
              >
                Promover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Diálogo de confirmação para rebaixar membro */}
        <AlertDialog open={memberToDemote !== null} onOpenChange={(open) => !open && setMemberToDemote(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rebaixar a Membro</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja rebaixar este administrador a membro regular?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => memberToDemote && changeMemberRole(memberToDemote, 'member')}
              >
                Rebaixar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Diálogo de confirmação para excluir gato */}
        <AlertDialog open={catToDelete !== null} onOpenChange={(open) => !open && setCatToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Gato</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este gato? Todos os registros de alimentação serão excluídos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={() => catToDelete && deleteCat(catToDelete)}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageTransition>
  )
}
