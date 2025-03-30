"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, PlusCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/loading";
import { useGlobalState } from "@/lib/context/global-state";
import { Schedule } from "@/lib/types";
import { ScheduleItem } from "@/components/schedule-item";
import { Button } from "@/components/ui/button";
import { FeedingTimeline } from "@/components/feeding-timeline";
import Link from "next/link";
import { motion } from "framer-motion";
import { getNextScheduledTime } from "@/lib/utils/dateUtils";

export default function SchedulesPage() {
  const router = useRouter();
  const { state, dispatch } = useGlobalState();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleDeleteSchedule = (scheduleId: string) => {
    dispatch({
      type: "DELETE_SCHEDULE",
      payload: scheduleId,
    });
  };

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

  // Transformar agendamentos em eventos do timeline
  const timelineEvents = state.schedules
    .filter(schedule => schedule.enabled)
    .map(schedule => {
      const nextTime = getNextScheduledTime(schedule);
      return {
        id: String(schedule.id),
        date: nextTime || new Date(),
        title: `Alimentação - ${schedule.cat?.name || 'Gato'}`,
        description: schedule.type === 'interval' 
          ? `A cada ${schedule.interval} horas`
          : `Horários: ${schedule.times}`,
        status: "pending" as const
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="container mx-auto px-4 py-8">
      {isLoading ? (
        <Loading />
      ) : state.schedules.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Sem agendamentos"
          description={
            state.cats.length === 0
              ? "Cadastre seus gatos primeiro para poder criar agendamentos."
              : "Você ainda não criou nenhum agendamento. Crie o primeiro agendamento para receber lembretes de alimentação."
          }
          actionLabel={
            state.cats.length === 0
              ? "Cadastrar Gato"
              : "Criar Primeiro Agendamento"
          }
          actionHref={state.cats.length === 0 ? "/cats/new" : "/schedules/new"}
          variant="schedule"
        />
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-medium">Agendamentos Ativos</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/schedules/history" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Ver Histórico</span>
              </Link>
            </Button>
          </div>

          <motion.div 
            className="space-y-4 mt-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {state.schedules
              .filter(schedule => schedule.enabled)
              .sort((a, b) => {
                const aTime = getNextScheduledTime(a);
                const bTime = getNextScheduledTime(b);
                return (aTime?.getTime() || 0) - (bTime?.getTime() || 0);
              })
              .map((schedule: Schedule) => (
                <motion.div key={schedule.id} variants={itemVariants}>
                  <ScheduleItem
                    schedule={schedule}
                    onView={() => router.push(`/schedules/${schedule.id}`)}
                    onEdit={() => router.push(`/schedules/${schedule.id}/edit`)}
                    onDelete={() => handleDeleteSchedule(String(schedule.id))}
                  />
                </motion.div>
              ))}
          </motion.div>

          <div className="mt-8">
            <h2 className="text-xl font-medium mb-4">Próximas Alimentações</h2>
            <FeedingTimeline events={timelineEvents} />
          </div>
        </>
      )}
    </div>
  );
} 