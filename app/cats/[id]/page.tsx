"use client"

import React, { useState, useEffect, useContext } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Edit, 
  ArrowLeft, 
  Calendar, 
  Weight, 
  FileText, 
  Clock, 
  PieChart,
  Bell,
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
import { motion } from "framer-motion"
import { format, formatDistanceToNow } from "date-fns"
import { useGlobalState } from "@/lib/context/global-state"
import { useFeeding } from "@/hooks/use-feeding"
import { getAgeString } from "@/lib/utils/dateUtils"
import { deleteCat } from "@/lib/services/apiService"
import { toast } from "sonner"
import { getCatById } from "@/lib/data"
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

// Main component
export default function CatDetailPage({ params }: { params: { id: string } }) {
  // No cliente, podemos acessar params diretamente sem React.use()
  const { id } = params;
  
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
        <p>Loading cat profile...</p>
      </div>
    )
  }
  
  if (!cat) {
    notFound()
  }

  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true)
    
    try {
      await deleteCat(id, state.cats)
      
      // Update local state
      dispatch({
        type: "DELETE_CAT",
        payload: { id }
      })
      
      toast.success(`${cat.name} has been deleted`)
      router.push("/cats")
    } catch (error) {
      console.error("Error deleting cat:", error)
      toast.error("Failed to delete cat")
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  // Cast para incluir schedules, já que o tipo CatType não tem essa propriedade
  const catWithSchedules = cat as CatType & { schedules?: Schedule[] };

  return (
    <PageTransition>
      <div className="bg-gray-50 min-h-screen pb-4">
        <div className="container max-w-md mx-auto p-4">
          {/* Status Bar Spacer */}
          <div className="h-6"></div>
          
          {/* Top Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Link href="/cats" className="flex items-center text-sm font-medium">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to cats
            </Link>
            <div className="flex items-center gap-2">
              <Button className="h-8 w-8 rounded-full p-0">
                <Share2 className="h-4 w-4" />
                <span className="sr-only">Share</span>
              </Button>
              <Link href={`/cats/${cat.id}/edit`}>
                <Button className="h-8 w-8 rounded-full p-0">
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-8 w-8 rounded-full p-0">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/cats/${cat.id}/edit`} className="cursor-pointer">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Cat
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
                        Delete Cat
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete {cat.name} and all their feeding records.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-red-600 hover:bg-red-700"
                          disabled={isDeleting}
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Profile Header */}
          <div className="bg-white rounded-xl p-5 mb-4 shadow-sm">
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
                      <span>{isClient ? getAgeString(cat.birthdate) : "Loading..."}</span>
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
              <div className="mt-4 bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center">
                  <AlarmClock className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Next feeding</p>
                    <p className="text-xs text-blue-700">
                      {isClient && nextFeedingTime ? (
                        <>
                          {formattedNextFeedingTime}
                          {" "}
                          ({formattedTimeDistance})
                        </>
                      ) : (
                        "Loading..."
                      )}
                    </p>
                  </div>
                </div>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 py-1 px-3 text-sm"
                  onClick={() => handleMarkAsFed()}
                >
                  <Utensils className="h-3 w-3 mr-1" />
                  Feed now
                </Button>
              </div>
            )}
          </div>
          
          {/* Tabs Section */}
          <Tabs defaultValue="feeding">
            <TabsList className="grid grid-cols-2 mb-4">
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
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                        <FileText className="h-6 w-6 text-gray-400" />
                      </div>
                      <h3 className="font-medium mb-1">No feeding logs yet</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Start logging feedings to see history here
                      </p>
                      <Button
                        onClick={() => handleMarkAsFed()}
                        className="gap-2"
                      >
                        <Utensils className="h-4 w-4" />
                        Log feeding now
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

function formatAge(birthdate: string | Date) {
  const birth = new Date(birthdate);
  const now = new Date();
  
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  
  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    return `${years - 1} anos e ${months + 12} meses`;
  }
  
  if (years === 0) {
    return `${months} meses`;
  }
  
  return `${years} anos e ${months} meses`;
}
