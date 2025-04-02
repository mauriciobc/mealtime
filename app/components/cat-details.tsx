"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Edit, 
  ArrowLeft, 
  Calendar, 
  Weight, 
  FileText, 
  Clock, 
  AlarmClock,
  Utensils,
  MoreHorizontal,
  Share2,
  Trash2,
  AlertTriangle,
  Ban,
  Users
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
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
import PageTransition from "@/components/page-transition"
import { format } from "date-fns"
import { useAppContext } from "@/lib/context/AppContext"
import { useLoading } from "@/lib/context/LoadingContext"
import { useFeeding } from "@/hooks/use-feeding"
import { getAgeString } from "@/lib/utils/dateUtils"
import { toast } from "sonner"
import { ptBR } from "date-fns/locale"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { FeedingForm } from "./feeding-form"
import { CatType, FeedingLog, Schedule } from "@/lib/types"
import { FeedingHistory } from "./feeding-history"
import { Loading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"

interface CatDetailsProps {
  params: { id: number };
}

export default function CatDetails({ params }: CatDetailsProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { state: appState, dispatch: appDispatch } = useAppContext()
  const { addLoadingOperation, removeLoadingOperation } = useLoading()
  const { 
    cat, 
    logs, 
    nextFeedingTime, 
    formattedNextFeedingTime, 
    formattedTimeDistance, 
    isLoading: isFeedingLoading, 
    error,
    handleMarkAsFed 
  } = useFeeding(params.id)
  const [isClient, setIsClient] = useState(false)
  const [isProcessingDelete, setIsProcessingDelete] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Handle authentication with useEffect to avoid setState during render
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  // Handle authentication states
  if (status === "loading" || status === "unauthenticated") {
    return <Loading text="Carregando..." />
  }
  
  if (isFeedingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading text="Carregando perfil do gato..." />
      </div>
    )
  }
  
  if (error || !cat) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <Ban className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Gato Não Encontrado</h2>
        <p className="text-muted-foreground mb-4">Não foi possível encontrar um gato com este ID ou você não tem permissão para vê-lo.</p>
        <Button onClick={() => router.push("/cats")} variant="outline">Voltar para Gatos</Button>
      </div>
    )
  }

  // Função para excluir o gato
  const handleDelete = async () => {
    const opId = `delete-cat-${params.id}`;
    addLoadingOperation({ id: opId, description: `Excluindo ${cat?.name || 'gato'}...`, priority: 1 });
    setIsProcessingDelete(true);
    const previousCats = appState.cats;

    appDispatch({ type: "DELETE_CAT", payload: params.id });

    try {
      const response = await fetch(`/api/cats/${params.id}`, { method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao excluir o gato no servidor');
      }

      toast.success(`${cat.name} foi excluído`);
      router.push("/cats");

    } catch (error: any) {
      console.error("Erro ao excluir gato:", error);
      toast.error(`Falha ao excluir o gato: ${error.message}`);
      appDispatch({ type: "SET_CATS", payload: previousCats });
    } finally {
      setIsProcessingDelete(false);
      setShowDeleteDialog(false);
      removeLoadingOperation(opId);
    }
  }

  return (
    <PageTransition>
      <div className="bg-background min-h-screen pb-4">
        <div className="container max-w-md mx-auto p-4">
          {/* Status Bar Spacer */}
          <div className="h-6"></div>
          
          {/* Top Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Link href="/cats" className="flex items-center text-sm font-medium">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar para gatos
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <Share2 className="h-4 w-4" />
                <span className="sr-only">Compartilhar</span>
              </Button>
              <Link href={`/cats/${cat.id}/edit`}>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Editar</span>
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Mais opções</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/cats/${cat.id}/edit`} className="cursor-pointer">
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Gato
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        className="text-red-600 focus:text-red-600" 
                        onSelect={(e) => e.preventDefault()}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Gato
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso excluirá permanentemente {cat.name} e todos os seus registros de alimentação.
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessingDelete}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive hover:bg-destructive/90"
                          disabled={isProcessingDelete}
                        >
                          {isProcessingDelete ? <Loading text="Excluindo..." size="sm" /> : "Excluir"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Profile Header */}
          <div className="bg-card text-card-foreground rounded-xl p-5 mb-4 shadow-sm">
            <div className="flex items-center">
              <Avatar className="h-20 w-20 mr-4">
                <AvatarImage src={cat.photoUrl || ""} alt={cat.name} />
                <AvatarFallback>{cat.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              
              <div>
                <h1 className="text-2xl font-bold">{cat.name}</h1>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  {cat.birthdate && (
                    <Badge className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{isClient ? getAgeString(cat.birthdate) : "Carregando..."}</span>
                    </Badge>
                  )}
                  
                  {cat.weight && (
                    <Badge className="flex items-center gap-1">
                      <Weight className="h-3 w-3" />
                      <span>{cat.weight} kg</span>
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {/* Next Feeding Info */}
            {nextFeedingTime && (
              <div className="mt-4 bg-card rounded-xl p-4 flex items-center justify-between border shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <AlarmClock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">Próxima alimentação</p>
                    <p className="text-xs text-muted-foreground">
                      {isClient && nextFeedingTime ? (
                        <>
                          {formattedNextFeedingTime}
                          {" "}
                          <span className="text-muted-foreground/60">({formattedTimeDistance})</span>
                        </>
                      ) : (
                        "Carregando..."
                      )}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => handleMarkAsFed()}
                  className="shadow-none"
                >
                  Alimentar agora
                </Button>
              </div>
            )}
          </div>
          
          {/* Tabs */}
          <Tabs defaultValue="info" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>
            
            <TabsContent value="info" className="space-y-4">
              {/* Informações Básicas */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cat.birthdate && (
                    <div className="flex items-start">
                      <Calendar className="h-5 w-5 mr-2 mt-0.5" />
                      <div>
                        <p className="font-medium">Data de Nascimento</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(cat.birthdate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {cat.weight && (
                    <div className="flex items-start">
                      <Weight className="h-5 w-5 mr-2 mt-0.5" />
                      <div>
                        <p className="font-medium">Peso</p>
                        <p className="text-sm text-muted-foreground">{cat.weight} kg</p>
                      </div>
                    </div>
                  )}
                  
                  {cat.restrictions && (
                    <div className="flex items-start">
                      <FileText className="h-5 w-5 mr-2 mt-0.5" />
                      <div>
                        <p className="font-medium">Restrições Alimentares</p>
                        <p className="text-sm text-muted-foreground">{cat.restrictions}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Alimentação */}
              <Card>
                <CardHeader>
                  <CardTitle>Alimentação</CardTitle>
                </CardHeader>
                <CardContent>
                  <FeedingForm catId={cat.id} onMarkAsFed={handleMarkAsFed} />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Alimentação</CardTitle>
                </CardHeader>
                <CardContent>
                  <FeedingHistory logs={logs} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageTransition>
  );
} 