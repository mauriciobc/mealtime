"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Cat as CatIcon, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CatType } from "@/lib/types";
import { PageTransition } from "@/components/ui/page-transition";
import { SimpleTimePicker } from "@/components/ui/simple-time-picker";
import { toast } from "sonner";
import { format } from "date-fns";
import { useScheduleContext } from "@/lib/context/ScheduleContext";
import { useAppContext } from "@/lib/context/AppContext";
import { useUserContext } from "@/lib/context/UserContext";
import { useLoading } from "@/lib/context/LoadingContext";
import { useSession } from "next-auth/react";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { Switch } from "@/components/ui/switch";

const formSchema = z.object({
  catId: z.string({ required_error: "Selecione um gato." }),
  type: z.enum(["interval", "fixedTime"], { required_error: "Selecione um tipo." }),
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
        return data.times && data.times.split(',').every(t => /^\d{2}:\d{2}$/.test(t.trim()));
    }
    return true;
}, {
    message: "Formato de horário inválido. Use HH:mm, separado por vírgulas.",
    path: ["times"],
});

export default function NewSchedulePage() {
  const router = useRouter();
  const { state: appState } = useAppContext();
  const { state: userState } = useUserContext();
  const { dispatch: scheduleDispatch } = useScheduleContext();
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const { data: session, status } = useSession();
  const { cats } = appState;
  const { currentUser } = userState;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTimes, setSelectedTimes] = useState<(Date | undefined)[]>([undefined]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      catId: undefined,
      type: "interval",
      interval: "8",
      times: "08:00",
      enabled: true,
    },
  });

  const watchType = form.watch("type");

  useEffect(() => {
    if (watchType === 'fixedTime') {
        const timesString = selectedTimes
            .filter((d): d is Date => d instanceof Date)
            .map(d => format(d, "HH:mm"))
            .sort()
            .join(", ");
        form.setValue("times", timesString, { shouldValidate: true });
    } else {
         form.setValue("times", undefined, { shouldValidate: false });
        setSelectedTimes([undefined]);
    }
  }, [selectedTimes, watchType, form]);

  const addTimeField = useCallback(() => {
    if (selectedTimes.length < 5) {
        setSelectedTimes(prev => [...prev, undefined]);
    } else {
        toast.warning("Limite de 5 horários por agendamento.");
    }
  }, [selectedTimes]);

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
    const householdCats = cats;
    if (!householdCats.some(cat => String(cat.id) === values.catId)) {
         toast.error("Erro: Gato selecionado não pertence à sua residência.");
         return;
    }

    const opId = "create-schedule";
    addLoadingOperation({ id: opId, priority: 1, description: "Creating schedule..." });
    setIsSubmitting(true);
    
    const currentUserId = currentUser.id;
    const currentHouseholdId = currentUser.householdId;

    const payload = {
      catId: parseInt(values.catId),
      userId: currentUserId,
      householdId: currentHouseholdId,
      type: values.type,
      interval: values.type === "interval" ? parseInt(values.interval!) : null,
      times: values.type === "fixedTime" ? values.times?.split(',').map(t => t.trim()).filter(t => t) : [],
      enabled: values.enabled,
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    };

    if (payload.type === 'interval' && (payload.interval === null || isNaN(payload.interval) || payload.interval < 1)) {
        toast.error("Intervalo inválido.");
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
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Falha ao criar agendamento");
      }

      const newSchedule = await response.json();

      scheduleDispatch({ type: "ADD_SCHEDULE", payload: newSchedule });

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

  if (status === "loading" || (status === "authenticated" && !currentUser)) {
    return <Loading text="Carregando..." />;
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return <Loading text="Redirecionando..." />;
  }

  if (status === "authenticated" && currentUser && !currentUser.householdId) {
     return (
       <PageTransition>
         <div className="container max-w-md mx-auto py-6 pb-28">
             <PageHeader title="Novo Agendamento" backHref="/schedules" />
             <div className="mt-6">
                <EmptyState
                    icon={Users}
                    title="Sem Residência Associada"
                    description="Associe-se a uma residência para criar agendamentos."
                    actionLabel="Ir para Configurações"
                    actionHref="/settings"
                 />
             </div>
         </div>
       </PageTransition>
     );
  }

  const householdCats = cats;

   if (householdCats.length === 0) {
        return (
           <PageTransition>
             <div className="container max-w-md mx-auto py-6 pb-28">
                 <PageHeader title="Novo Agendamento" backHref="/schedules" />
                 <div className="mt-6">
                    <EmptyState
                        icon={CatIcon}
                        title="Nenhum Gato Cadastrado"
                        description="Cadastre pelo menos um gato antes de criar agendamentos."
                        actionLabel="Cadastrar Gato"
                        actionHref="/cats/new"
                     />
                 </div>
             </div>
           </PageTransition>
        );
    }

  return (
    <PageTransition>
        <div className="container max-w-md mx-auto py-6 pb-28">
           <PageHeader title="Novo Agendamento" backHref="/schedules" />

           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="mt-6"
           >
             <Form {...form}>
               <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                 <FormField
                   control={form.control}
                   name="catId"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Para Qual Gato?</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                         <FormControl>
                           <SelectTrigger>
                             <SelectValue placeholder="Selecione um gato" />
                           </SelectTrigger>
                         </FormControl>
                         <SelectContent>
                           {householdCats.map((cat: CatType) => (
                             <SelectItem key={cat.id} value={String(cat.id)}>
                               {cat.name}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                       <FormMessage />
                     </FormItem>
                   )}
                 />

                 <Separator />

                 <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                       <FormItem className="space-y-3">
                          <FormLabel>Tipo de Agendamento</FormLabel>
                          <FormControl>
                             <Tabs
                                value={field.value}
                                onValueChange={(value) => {
                                   field.onChange(value as "interval" | "fixedTime");
                                }}
                                className="w-full"
                             >
                                <TabsList className="grid w-full grid-cols-2">
                                   <TabsTrigger value="interval" disabled={isSubmitting}>Intervalo Fixo</TabsTrigger>
                                   <TabsTrigger value="fixedTime" disabled={isSubmitting}>Horário Fixo</TabsTrigger>
                                </TabsList>
                                <TabsContent value="interval" className="pt-4">
                                   <FormField
                                      control={form.control}
                                      name="interval"
                                      render={({ field: intervalField }) => (
                                         <FormItem>
                                            <FormLabel>Intervalo (em horas)</FormLabel>
                                            <FormControl>
                                               <Input 
                                                 type="number" 
                                                 placeholder="Ex: 8" 
                                                 min="1" 
                                                 max="48" 
                                                 {...intervalField} 
                                                 value={intervalField.value || ''}
                                                 disabled={isSubmitting}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                               Alimente a cada X horas. Mínimo 1, máximo 48.
                                            </FormDescription>
                                            <FormMessage />
                                         </FormItem>
                                      )}
                                    />
                                </TabsContent>
                                <TabsContent value="fixedTime" className="pt-4 space-y-4">
                                   <FormLabel>Horários Específicos</FormLabel>
                                   {selectedTimes.map((time, index) => (
                                      <div key={index} className="flex items-center space-x-2">
                                         <SimpleTimePicker 
                                            date={time} 
                                            setDate={(date) => updateTime(index, date)} 
                                            disabled={isSubmitting}
                                          />
                                         {selectedTimes.length > 1 && (
                                            <Button 
                                                type="button"
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => removeTimeField(index)}
                                                disabled={isSubmitting}
                                                aria-label="Remover horário"
                                            >
                                                &times;
                                            </Button>
                                          )}
                                      </div>
                                    ))}
                                    {selectedTimes.length < 5 && (
                                       <Button 
                                          type="button" 
                                          variant="outline" 
                                          size="sm" 
                                          onClick={addTimeField}
                                          disabled={isSubmitting}
                                        >
                                          Adicionar Horário
                                        </Button>
                                    )}
                                     <FormField
                                        control={form.control}
                                        name="times"
                                        render={({ field: timesField }) => (
                                           <Input type="hidden" {...timesField} />
                                        )}
                                      />
                                      <FormMessage>{form.formState.errors.times?.message}</FormMessage>
                                      <FormDescription>
                                         Selecione até 5 horários fixos para alimentação diária.
                                      </FormDescription>
                                </TabsContent>
                             </Tabs>
                          </FormControl>
                          <FormMessage />
                       </FormItem>
                    )}
                 />

                 <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                             Ativar Agendamento
                          </FormLabel>
                          <FormDescription>
                             Desative para pausar este agendamento sem excluí-lo.
                          </FormDescription>
                        </div>
                        <FormControl>
                           <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isSubmitting}
                           />
                        </FormControl>
                      </FormItem>
                    )}
                 />

                 <div className="pt-4">
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? <Loading text="Salvando..." size="sm" /> : "Salvar Agendamento"}
                    </Button>
                 </div>
               </form>
             </Form>
           </motion.div>
        </div>
    </PageTransition>
  );
} 