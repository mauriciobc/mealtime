"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { v2Post } from "@/lib/api/v2-client";
import { format } from "date-fns";
import { useScheduleContext } from "@/lib/context/ScheduleContext";
import { useCats } from "@/lib/context/CatsContext";
import { useUserContext } from "@/lib/context/UserContext";
import { useLoading } from "@/lib/context/LoadingContext";
import { Loading } from "@/components/ui/loading";
import {
  NewScheduleEmptyState,
  NewScheduleErrorView,
  NewScheduleFormSection,
  type ScheduleFormType,
} from "./new-schedule-page-sections";

const formSchema = z.object({
  catId: z.string({ message: "Selecione um gato." }).uuid({ message: "ID do gato inválido." }),
  type: z.enum(["interval", "fixedTime"], { message: "Selecione um tipo." }),
  interval: z.string().optional(),
  times: z.string().optional(),
  enabled: z.boolean().default(true),
}).refine(data => {
    if (data.type === 'interval') {
        const intervalNum = parseInt(data.interval || "0");
        return data.interval && !isNaN(intervalNum) && intervalNum >= 1 && intervalNum <= 48;
    }
    return true;
}, {
    message: "Intervalo deve ser entre 1 e 48 horas.",
    path: ["interval"],
}).refine(data => {
    if (data.type === 'fixedTime') {
        return data.times && data.times.split(',').every(t => /^([01]\d|2[0-3]):([0-5]\d)$/.test(t.trim()));
    }
    return true;
}, {
    message: "Pelo menos um horário fixo no formato HH:mm é necessário.",
    path: ["times"],
});

export default function NewSchedulePageContent() {
  const router = useRouter();
  const { state: userState } = useUserContext();
  const { state: catsState } = useCats();
  const { dispatch: scheduleDispatch, state: scheduleState } = useScheduleContext();
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const { cats, isLoading: isLoadingCats, error: errorCats } = catsState;
  const { currentUser, isLoading: isLoadingUser, error: errorUser } = userState;
  const { error: errorSchedules } = scheduleState;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTimes, setSelectedTimes] = useState<(Date | undefined)[]>([undefined]);

  const isLoading = isLoadingCats || isLoadingUser;
  const combinedError = errorCats || errorUser || errorSchedules;

  const form = useForm<ScheduleFormType>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      catId: "" as any,
      type: "interval",
      interval: "8",
      times: "",
      enabled: true,
    },
  });

  const watchType = form.watch("type");

  useEffect(() => {
    if (watchType !== 'fixedTime') {
      if (selectedTimes.length !== 1 || selectedTimes[0] !== undefined) {
        setSelectedTimes([undefined]);
      }
      if (form.getValues('times') !== '') {
        form.setValue('times', '', { shouldValidate: false });
      }
    }
  }, [watchType, selectedTimes, form]);

  useEffect(() => {
    if (watchType === 'fixedTime') {
      const timesString = selectedTimes
        .filter((d): d is Date => d instanceof Date)
        .map(d => format(d, "HH:mm"))
        .sort()
        .join(", ");
      if (form.getValues('times') !== timesString) {
        form.setValue('times', timesString, { shouldValidate: true });
      }
    }
  }, [selectedTimes, watchType, form]);

  const addTimeField = useCallback(() => {
    if (selectedTimes.length < 5) {
        setSelectedTimes(prev => [...prev, undefined]);
    } else {
        toast.warning("Limite de 5 horários por agendamento.");
    }
  }, [selectedTimes.length]);

  const removeTimeField = useCallback((index: number) => {
    setSelectedTimes(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateTime = useCallback((index: number, date: Date | undefined) => {
    setSelectedTimes(prev => {
        const newTimes = [...prev];
        newTimes[index] = date;
        return newTimes;
    });
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser?.id || !currentUser?.householdId) {
      toast.error("Erro: Usuário ou residência não identificados.");
      return;
    }

    const selectedCat = cats.find(cat => cat.id === values.catId);
    if (!selectedCat || selectedCat.householdId !== currentUser.householdId) {
        toast.error("Erro: Gato selecionado inválido ou não pertence à sua residência.");
        return;
    }

    const opId = "create-schedule";
    addLoadingOperation({ id: opId, priority: 1, description: "Criando agendamento..." });
    setIsSubmitting(true);
    
    const payload = {
      catId: values.catId,
      type: values.type,
      interval: values.type === "interval" ? parseInt(values.interval!) : null,
      times: values.type === "fixedTime" ? values.times?.split(',').map(t => t.trim()).filter(t => t) : [],
      enabled: values.enabled,
    };

    if (payload.type === 'interval' && (payload.interval === null || isNaN(payload.interval) || payload.interval < 1 || payload.interval > 48)) {
        toast.error("Intervalo deve ser entre 1 e 48 horas.");
        setIsSubmitting(false);
        removeLoadingOperation(opId);
        return;
    }
     if (payload.type === 'fixedTime' && (!payload.times || payload.times.length === 0)) {
        toast.error("Pelo menos um horário fixo é necessário.");
        setIsSubmitting(false);
        removeLoadingOperation(opId);
        return;
    }

    try {
      if (!currentUser?.id) {
        toast.error("Erro de autenticação. Tente novamente.");
        throw new Error("User ID missing for create schedule request");
      }

      const newSchedule = await v2Post<Record<string, unknown>>("/api/v2/schedules", payload);

      scheduleDispatch({ type: "ADD_SCHEDULE", payload: newSchedule as unknown as import("@/lib/types").Schedule });

      toast.success("Agendamento criado com sucesso!");
      router.push("/schedules");

    } catch (error: any) {
      console.error("Erro ao criar agendamento:", error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsSubmitting(false);
      removeLoadingOperation(opId);
    }
  }

  if (isLoading) {
    return <Loading text="Carregando dados..." />;
  }

  if (combinedError) {
     return <NewScheduleErrorView error={combinedError} onBack={() => router.back()} />;
  }

  if (!currentUser) {
    return <Loading text="Redirecionando para login..." />;
  }

  if (!currentUser.householdId) {
     return <NewScheduleEmptyState variant="no-household" onBack={() => router.back()} />;
  }

  const householdCats = cats.filter(cat => String(cat.householdId) === String(currentUser.householdId));

   if (householdCats.length === 0) {
        return <NewScheduleEmptyState variant="no-cats" onBack={() => router.back()} />;
    }

  const selectedCatId = form.watch("catId");
  const selectedCat = householdCats.find(cat => String(cat.id) === String(selectedCatId));

  return (
    <NewScheduleFormSection
      form={form}
      householdCats={householdCats}
      selectedCat={selectedCat}
      selectedTimes={selectedTimes}
      isSubmitting={isSubmitting}
      onBack={() => router.back()}
      onSubmit={onSubmit}
      addTimeField={addTimeField}
      removeTimeField={removeTimeField}
      updateTime={updateTime}
    />
  );
}
