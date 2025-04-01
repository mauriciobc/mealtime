"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, PlusCircle, Users } from "lucide-react";
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
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import PageTransition from "@/components/page-transition";
import BottomNav from "@/components/bottom-nav";

export default function SchedulesPage() {
  const router = useRouter();
  const { state, dispatch } = useGlobalState();
  const { data: session, status } = useSession();

  const handleDeleteSchedule = async (scheduleId: string) => {
    const previousSchedules = state.schedules;
    dispatch({ type: "DELETE_SCHEDULE", payload: { id: scheduleId } });

    try {
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Falha ao excluir agendamento: ${response.statusText}`);
      }
      toast.success("Agendamento excluído com sucesso!");
    } catch (error: any) {
      console.error("Erro ao deletar agendamento:", error);
      toast.error(`Erro ao excluir: ${error.message}`);
      dispatch({ type: "SET_SCHEDULES", payload: previousSchedules });
    }
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

  if (status === "loading" || (status === "authenticated" && !state.currentUser)) {
    return <Loading text="Carregando agendamentos..." />;
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return <Loading text="Redirecionando..." />;
  }

  if (status === "authenticated" && state.currentUser && !state.currentUser.householdId) {
    return (
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
          <div className="p-4 pb-24">
            <PageHeader
              title="Agendamentos"
              description="Gerencie os horários de alimentação programados"
            />
            <EmptyState
              icon={Users}
              title="Sem Residência Associada"
              description="Você precisa criar ou juntar-se a uma residência para ver e criar agendamentos."
              actionLabel="Ir para Configurações"
              actionHref="/settings"
            />
          </div>
          <BottomNav />
        </div>
      </PageTransition>
    );
  }

  const schedulesToDisplay = state.schedules;

  const timelineEvents = schedulesToDisplay
    .filter(schedule => schedule.enabled)
    .map(schedule => {
      const nextTime = getNextScheduledTime(schedule);
      const cat = state.cats.find(c => c.id === schedule.catId);
      return {
        id: String(schedule.id),
        date: nextTime || new Date(),
        title: `Alimentação - ${cat?.name || 'Gato Desconhecido'}`,
        description: schedule.type === 'interval'
          ? `A cada ${schedule.interval} horas`
          : `Horário fixo: ${schedule.times}`,
        status: "pending" as const
      };
    })
    .filter(event => event.date)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

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
            showActionButton={!!state.currentUser?.householdId}
          />

          {schedulesToDisplay.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={Clock}
                title="Sem agendamentos criados"
                description={
                  state.cats.length === 0
                    ? "Cadastre seus gatos primeiro para poder criar agendamentos."
                    : "Você ainda não criou nenhum agendamento para esta residência."
                }
                actionLabel={
                  state.cats.length === 0
                    ? "Cadastrar Gato"
                    : "Criar Primeiro Agendamento"
                }
                actionHref={state.cats.length === 0 ? "/cats/new" : "/schedules/new"}
                variant="schedule"
              />
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold mt-6 mb-3">Agendamentos Ativos</h2>
              <motion.div
                className="space-y-3"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {schedulesToDisplay
                  .filter(schedule => schedule.enabled)
                  .sort((a, b) => {
                    const aTime = getNextScheduledTime(a);
                    const bTime = getNextScheduledTime(b);
                    return (aTime?.getTime() || Infinity) - (bTime?.getTime() || Infinity);
                  })
                  .map((schedule: Schedule) => (
                    <motion.div key={schedule.id} variants={itemVariants}>
                      <ScheduleItem
                        schedule={schedule}
                        onDelete={() => handleDeleteSchedule(String(schedule.id))}
                        catName={state.cats.find(c => c.id === schedule.catId)?.name}
                      />
                    </motion.div>
                  ))}
              </motion.div>

              {timelineEvents.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-lg font-semibold mb-4">Próximas Alimentações Agendadas</h2>
                  <FeedingTimeline events={timelineEvents.slice(0, 5)} />
                </div>
              )}
            </>
          )}
        </div>
        <BottomNav />
      </div>
    </PageTransition>
  );
} 