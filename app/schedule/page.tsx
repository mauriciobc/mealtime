"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Search, Filter, Clock, Calendar, Repeat, AlarmClock, Edit, Trash2, Users, AlertTriangle } from "lucide-react"
import Link from "next/link"
import PageTransition from "@/components/page-transition"
import BottomNav from "@/components/bottom-nav"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Schedule as ScheduleType } from "@/lib/types"
import { useScheduleContext } from "@/lib/context/ScheduleContext"
import { useUserContext } from "@/lib/context/UserContext"
import { useLoading } from "@/lib/context/LoadingContext"
import { useSession } from "next-auth/react"
import { PageHeader } from "@/components/page-header"
import { Loading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"

export default function SchedulePage() {
  const router = useRouter()
  const { state: scheduleState, dispatch: scheduleDispatch } = useScheduleContext()
  const { state: userState } = useUserContext()
  const { addLoadingOperation, removeLoadingOperation } = useLoading()
  const { data: session, status } = useSession()
  const { schedules, isLoading, error } = scheduleState
  const { currentUser } = userState
  
  const [searchTerm, setSearchTerm] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  
  const handleDeleteSchedule = async (id: string) => {
    const opId = `delete-schedule-${id}`; 
    addLoadingOperation({ id: opId, priority: 1, description: "Excluindo agendamento..." });
    setIsDeleting(true)
    const previousSchedules = scheduleState.schedules

    scheduleDispatch({ type: "DELETE_SCHEDULE", payload: id })

    try {
      const response = await fetch(`/api/schedules/${id}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        scheduleDispatch({ type: "SET_SCHEDULES", payload: previousSchedules });
        throw new Error(errorData.error || "Falha ao excluir agendamento")
      }
      
      toast.success("Agendamento excluído com sucesso.")
    } catch (error: any) { 
      console.error("Erro ao excluir agendamento:", error)
      toast.error(`Erro: ${error.message || "Ocorreu um erro ao excluir."}`)
      if (previousSchedules) { 
          scheduleDispatch({ type: "SET_SCHEDULES", payload: previousSchedules });
      } else {
          console.warn("Could not revert schedule deletion state: previous state unknown.");
      }
    } finally {
      setIsDeleting(false)
      removeLoadingOperation(opId);
    }
  }
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  }
  
  const formatScheduleText = (schedule: ScheduleType) => {
    if (schedule.type === 'interval') {
      return `A cada ${schedule.interval} horas`
    } else if (schedule.type === 'fixedTime') {
      const times = Array.isArray(schedule.times) ? schedule.times : schedule.times?.split(',') || [];
      return `Horários fixos: ${times.join(', ')}`
    }
    return "Agendamento personalizado"
  }
  
  const getScheduleIcon = (type: string) => {
    if (type === 'interval') {
      return <Repeat className="h-4 w-4" />
    } else if (type === 'fixedTime') {
      return <AlarmClock className="h-4 w-4" />
    }
    return <Calendar className="h-4 w-4" />
  }

  const filteredSchedules = useMemo(() => {
      if (!schedules) return [];
      if (!searchTerm) return schedules;
      
      const lowerSearchTerm = searchTerm.toLowerCase();
      return schedules.filter(schedule => 
           schedule.cat?.name?.toLowerCase().includes(lowerSearchTerm) ||
           formatScheduleText(schedule).toLowerCase().includes(lowerSearchTerm)
      );
  }, [schedules, searchTerm]);

  if (status === "loading" || (status === "authenticated" && (isLoading || !currentUser))) {
    return (
        <PageTransition>
            <div className="flex flex-col min-h-screen bg-background">
                <div className="p-4 pb-24">
                    <PageHeader title="Agendamentos" description="Gerencie seus agendamentos" />
                     <div className="space-y-4 mt-6">
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <Skeleton className="h-12 w-12 rounded-full" />
                              <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-3 w-1/2" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                </div>
                <BottomNav />
            </div>
        </PageTransition>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return <Loading text="Redirecionando para login..." />;
  }
  
  if (error) {
      return (
         <PageTransition>
            <div className="flex flex-col min-h-screen bg-background">
               <div className="p-4 pb-24">
                   <PageHeader title="Agendamentos" description="Erro ao carregar" />
                   <EmptyState title="Erro" description={error} icon={AlertTriangle} />
               </div>
               <BottomNav />
            </div>
         </PageTransition>
      );
  }

  if (status === "authenticated" && currentUser && !currentUser.householdId) {
    return (
        <PageTransition>
            <div className="flex flex-col min-h-screen bg-background">
                <div className="p-4 pb-24">
                    <PageHeader title="Agendamentos" description="Gerencie seus agendamentos" />
                    <EmptyState
                      icon={Users}
                      title="Sem Residência Associada"
                      description="Você precisa criar ou juntar-se a uma residência para ver e criar agendamentos."
                      actionLabel="Ir para Configurações"
                      actionHref="/settings"
                      className="mt-6"
                    />
                </div>
                <BottomNav />
            </div>
        </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="p-4 pb-24">
           <PageHeader
              title="Agendamentos"
              description="Gerencie os horários de alimentação programados"
              actionIcon={<PlusCircle className="h-4 w-4" />}
              actionLabel="Novo Agendamento"
              actionHref="/schedules/new"
            />
          
          <div className="flex items-center gap-2 mb-6 mt-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por gato ou tipo..."
                className="w-full rounded-md border border-input bg-background pl-10 pr-4 py-2 text-sm h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {isLoading ? ( 
            <div className="space-y-4">
                 {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                        </CardContent>
                    </Card>
                 ))}
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-6">
                {searchTerm ? "Nenhum agendamento encontrado para sua busca." : "Nenhum agendamento configurado."} 
              </p>
              <Button asChild>
                  <Link href="/schedules/new">Criar Agendamento</Link>
              </Button>
            </div>
          ) : (
            <motion.div 
              className="space-y-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredSchedules.map((schedule) => (
                <motion.div key={schedule.id} variants={itemVariants}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {schedule.cat ? (
                          <Avatar>
                            <AvatarImage src={schedule.cat.photoUrl || ""} alt={schedule.cat.name} />
                            <AvatarFallback>
                              {schedule.cat.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                         ) : (
                           <Avatar><AvatarFallback>?</AvatarFallback></Avatar>
                         )}
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{schedule.cat?.name || "Gato Desconhecido"}</h3>
                              <div className="flex items-center gap-1 mt-1">
                                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                  {getScheduleIcon(schedule.type)}
                                  <span>{schedule.type === 'interval' ? 'Intervalo' : schedule.type === 'fixedTime' ? 'Horário Fixo' : 'Personalizado'}</span>
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-2">
                                {formatScheduleText(schedule)}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/schedules/${schedule.id}`)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-red-600 cursor-pointer"
                                  onClick={() => handleDeleteSchedule(String(schedule.id))} 
                                  disabled={isDeleting} 
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {schedule.overrideUntil && (
                            <p className="text-xs text-amber-600 mt-1">
                              Sobreposição ativa até {format(new Date(schedule.overrideUntil), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
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

