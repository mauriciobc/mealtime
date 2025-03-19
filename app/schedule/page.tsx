"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Search, Filter, Clock, Calendar, Repeat, AlarmClock, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import PageTransition from "@/components/page-transition"
import { AppHeader } from "@/components/app-header"
import BottomNav from "@/components/bottom-nav"
import { motion } from "framer-motion"
import { getSchedules } from "@/lib/data"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"

// Definindo a interface para o agendamento
interface ScheduleType {
  id: number
  catId: number
  type: string
  interval: number
  times: string
  overrideUntil: Date | null
  createdAt: Date
  updatedAt: Date
  cat: {
    id: number
    name: string
    photoUrl: string | null
  }
}

export default function SchedulePage() {
  const router = useRouter()
  const [schedules, setSchedules] = useState<ScheduleType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    async function loadSchedules() {
      try {
        setIsLoading(true)
        const data = await getSchedules()
        setSchedules(data)
      } catch (error) {
        console.error("Erro ao carregar agendamentos:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadSchedules()
  }, [])
  
  const handleDeleteSchedule = async (id: number) => {
    try {
      const response = await fetch(`/api/schedules/${id}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        throw new Error("Falha ao excluir agendamento")
      }
      
      // Atualizar a lista de agendamentos
      setSchedules(schedules.filter(schedule => schedule.id !== id))
      
      toast({
        title: "Agendamento excluído",
        description: "O agendamento foi excluído com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao excluir agendamento:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao excluir o agendamento.",
        variant: "destructive",
      })
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
  
  // Função para formatar o texto do agendamento
  const formatScheduleText = (schedule: ScheduleType) => {
    if (schedule.type === 'interval') {
      return `A cada ${schedule.interval} horas`
    } else if (schedule.type === 'fixedTime') {
      const times = schedule.times.split(',')
      return `Horários fixos: ${times.join(', ')}`
    }
    return "Agendamento personalizado"
  }
  
  // Função para obter o ícone do tipo de agendamento
  const getScheduleIcon = (type: string) => {
    if (type === 'interval') {
      return <Repeat className="h-4 w-4" />
    } else if (type === 'fixedTime') {
      return <AlarmClock className="h-4 w-4" />
    }
    return <Calendar className="h-4 w-4" />
  }

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader title="Agendamentos" />
        
        <div className="p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Agendamentos de Alimentação</h1>
            <Link href="/schedule/new">
              <Button className="flex items-center gap-2">
                <PlusCircle size={16} />
                <span>Novo</span>
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar agendamentos..."
                className="w-full rounded-md border border-input pl-10 py-2 text-sm"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter size={18} />
            </Button>
          </div>
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-muted"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-1/3 bg-muted rounded"></div>
                        <div className="h-3 w-1/2 bg-muted rounded"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-6">
                Nenhum agendamento encontrado.
              </p>
              <Link href="/schedule/new">
                <Button>Criar primeiro agendamento</Button>
              </Link>
            </div>
          ) : (
            <motion.div 
              className="space-y-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {schedules.map((schedule) => (
                <motion.div key={schedule.id} variants={itemVariants}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={schedule.cat.photoUrl || ""} alt={schedule.cat.name} />
                          <AvatarFallback>
                            {schedule.cat.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{schedule.cat.name}</h3>
                              <div className="flex items-center gap-1 mt-1">
                                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                  {getScheduleIcon(schedule.type)}
                                  <span>{schedule.type === 'interval' ? 'Intervalo' : 'Horário Fixo'}</span>
                                </Badge>
                              </div>
                              <p className="text-sm mt-2">
                                {formatScheduleText(schedule)}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/schedule/${schedule.id}`)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleDeleteSchedule(schedule.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {schedule.overrideUntil && (
                            <p className="text-xs text-amber-600 mt-1">
                              Sobreposição ativa até {format(new Date(schedule.overrideUntil), "dd/MM/yyyy", { locale: ptBR })}
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
  )
}

