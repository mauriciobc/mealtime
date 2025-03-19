"use client";

import { useState, useEffect } from "react";
import { format, addHours, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { getSchedules, getCats } from "@/lib/data";

interface UpcomingFeeding {
  id: string;
  catId: number;
  catName: string;
  catPhoto: string | null;
  nextFeeding: Date;
  isOverdue: boolean;
}

export default function FeedingSchedule() {
  const [upcomingFeedings, setUpcomingFeedings] = useState<UpcomingFeeding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUpcomingFeedings() {
      try {
        setIsLoading(true);
        
        // Carregar agendamentos e gatos
        const schedules = await getSchedules();
        const cats = await getCats();
        
        // Mapear gatos por ID para fácil acesso
        const catsMap = new Map();
        cats.forEach(cat => {
          catsMap.set(cat.id, cat);
        });
        
        // Calcular próximas alimentações
        const now = new Date();
        const upcoming: UpcomingFeeding[] = [];
        
        schedules.forEach(schedule => {
          const cat = catsMap.get(schedule.catId);
          if (!cat) return;
          
          let nextFeeding: Date;
          
          if (schedule.type === 'interval') {
            // Para agendamentos baseados em intervalo
            const interval = schedule.interval;
            nextFeeding = addHours(now, interval);
          } else if (schedule.type === 'fixedTime') {
            // Para agendamentos baseados em horários fixos
            const times = schedule.times.split(',');
            // Implementação simplificada - em um app real, precisaríamos calcular o próximo horário
            const nextTime = times[0]; // Usando o primeiro horário como exemplo
            const [hours, minutes] = nextTime.split(':').map(Number);
            
            nextFeeding = new Date();
            nextFeeding.setHours(hours, minutes, 0, 0);
            
            // Se o horário já passou hoje, agendar para amanhã
            if (isBefore(nextFeeding, now)) {
              nextFeeding.setDate(nextFeeding.getDate() + 1);
            }
          } else {
            // Fallback para um horário futuro
            nextFeeding = addHours(now, 4);
          }
          
          upcoming.push({
            id: `${schedule.id}-${cat.id}`,
            catId: cat.id,
            catName: cat.name,
            catPhoto: cat.photoUrl,
            nextFeeding,
            isOverdue: isBefore(nextFeeding, now)
          });
        });
        
        // Ordenar por horário mais próximo
        upcoming.sort((a, b) => a.nextFeeding.getTime() - b.nextFeeding.getTime());
        
        // Limitar a 5 itens
        setUpcomingFeedings(upcoming.slice(0, 5));
      } catch (error) {
        console.error("Erro ao carregar próximas alimentações:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadUpcomingFeedings();
  }, []);
  
  const handleFeedNow = (catId: number) => {
    router.push(`/feedings/new?catId=${catId}`);
  };
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/3 bg-muted rounded"></div>
                  <div className="h-3 w-1/2 bg-muted rounded"></div>
                </div>
                <div className="h-8 w-20 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (upcomingFeedings.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-muted-foreground">
            Nenhuma alimentação programada.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <motion.div 
      className="space-y-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1 }}
    >
      {upcomingFeedings.map((feeding, index) => (
        <motion.div
          key={feeding.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className={feeding.isOverdue ? "border-red-200" : ""}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={feeding.catPhoto || ""} alt={feeding.catName} />
                  <AvatarFallback>
                    {feeding.catName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium">{feeding.catName}</h3>
                  <p className="text-xs flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {feeding.isOverdue 
                      ? "Atrasado" 
                      : format(feeding.nextFeeding, "'Às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant={feeding.isOverdue ? "destructive" : "outline"}
                  onClick={() => handleFeedNow(feeding.catId)}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Alimentar
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
} 