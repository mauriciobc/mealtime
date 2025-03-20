"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  Trash2
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
import { useGlobalState } from "@/lib/context/global-state"
import { useFeeding } from "@/hooks/use-feeding"
import { getAgeString } from "@/lib/utils/dateUtils"
import { deleteCat } from "@/lib/services/apiService"
import { toast } from "sonner"
import { notFound } from "next/navigation"
import { ptBR } from "date-fns/locale"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { FeedingForm } from "@/components/feeding-form"
import { CatType } from "@/lib/types"

// Interface para agendamentos (schedules)
interface Schedule {
  id: string;
  type: string;
  times: string;
  interval?: number;
  overrideUntil?: Date;
}

export default function CatDetails({ id }: { id: string }) {
  const router = useRouter()
  const { state, dispatch } = useGlobalState()
  const { 
    cat, 
    logs, 
    nextFeedingTime, 
    formattedNextFeedingTime, 
    formattedTimeDistance, 
    isLoading, 
    handleMarkAsFed 
  } = useFeeding(id)
  const [isClient, setIsClient] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando perfil do gato...</p>
      </div>
    )
  }
  
  if (!cat) {
    notFound()
  }

  // Função para excluir o gato
  const handleDelete = async () => {
    setIsDeleting(true)
    
    try {
      await deleteCat(id, state.cats)
      
      // Atualizar o estado local
      dispatch({
        type: "DELETE_CAT",
        payload: { id }
      })
      
      toast.success(`${cat.name} foi excluído`)
      router.push("/cats")
    } catch (error) {
      console.error("Erro ao excluir gato:", error)
      toast.error("Falha ao excluir o gato")
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  // Cast para incluir schedules, já que o tipo CatType não tem essa propriedade
  const catWithSchedules = cat as CatType & { schedules?: Schedule[] };

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
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive hover:bg-destructive/90"
                          disabled={isDeleting}
                        >
                          {isDeleting ? "Excluindo..." : "Excluir"}
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
              <div className="mt-4 bg-primary/10 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center">
                  <AlarmClock className="h-5 w-5 text-primary mr-2" />
                  <div>
                    <p className="text-sm font-medium text-primary-foreground/90">Próxima alimentação</p>
                    <p className="text-xs text-primary-foreground/70">
                      {isClient && nextFeedingTime ? (
                        <>
                          {formattedNextFeedingTime}
                          {" "}
                          ({formattedTimeDistance})
                        </>
                      ) : (
                        "Carregando..."
                      )}
                    </p>
                  </div>
                </div>
                <Button 
                  className="py-1 px-3 text-sm"
                  onClick={() => handleMarkAsFed()}
                >
                  <Utensils className="h-3 w-3 mr-1" />
                  Alimentar agora
                </Button>
              </div>
            )}
          </div>
          
          {/* Tabs Section */}
          <Tabs defaultValue="feeding">
            <TabsList className="grid grid-cols-2 mb-4 bg-muted/50">
              <TabsTrigger value="feeding">Alimentação</TabsTrigger>
              <TabsTrigger value="schedules">Programação</TabsTrigger>
            </TabsList>
            
            {/* Feeding Tab */}
            <TabsContent value="feeding" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Registrar Alimentação</CardTitle>
                </CardHeader>
                <CardContent>
                  <FeedingForm catId={cat.id} />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Histórico de Alimentação</CardTitle>
                </CardHeader>
                <CardContent>
                  {logs.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium mb-1">Nenhum registro de alimentação</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Comece a registrar alimentações para ver o histórico aqui
                      </p>
                      <Button
                        onClick={() => handleMarkAsFed()}
                        className="gap-2"
                      >
                        <Utensils className="h-4 w-4" />
                        Registrar alimentação agora
                      </Button>
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-4">
                        {logs.map((log) => {
                          const feederName = "Usuário do Sistema";
                          
                          return (
                            <div key={log.id} className="flex items-start gap-3 pb-3 border-b">
                              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium">
                                  {format(new Date(log.timestamp), "PPp", { locale: ptBR })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Alimentado por: {feederName}
                                </p>
                                {log.portionSize && (
                                  <Badge variant="outline" className="mt-1">
                                    {log.portionSize} porções
                                  </Badge>
                                )}
                                {log.notes && (
                                  <p className="text-xs mt-1">{log.notes}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <ScrollBar />
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Schedules Tab */}
            <TabsContent value="schedules" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Agendamentos</CardTitle>
                    <Button size="sm" asChild>
                      <Link href={`/cats/${cat.id}/schedules/new`}>
                        Adicionar
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {catWithSchedules.schedules && catWithSchedules.schedules.length > 0 ? (
                    <div className="space-y-4">
                      {catWithSchedules.schedules.map((schedule: Schedule) => (
                        <Card key={schedule.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-medium">
                                  {schedule.type === "fixed" ? "Horário Fixo" : "Intervalo"}
                                </h3>
                                {schedule.type === "fixed" ? (
                                  <p className="text-sm">
                                    Horários: {schedule.times.split(",").join(", ")}
                                  </p>
                                ) : (
                                  <p className="text-sm">
                                    A cada {schedule.interval} horas
                                  </p>
                                )}
                                {schedule.overrideUntil && (
                                  <Badge variant="secondary" className="mt-2">
                                    Temporário até {format(new Date(schedule.overrideUntil), "PP", { locale: ptBR })}
                                  </Badge>
                                )}
                              </div>
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/cats/${cat.id}/schedules/${schedule.id}/edit`}>
                                  <Edit className="h-3 w-3 mr-1" />
                                  Editar
                                </Link>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="mb-4">Nenhum agendamento configurado</p>
                      <Button asChild>
                        <Link href={`/cats/${cat.id}/schedules/new`}>
                          Criar Agendamento
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageTransition>
  )
} 