"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
import { getCats } from "@/lib/data";
import { CatType } from "@/lib/types";
import { PageTransition } from "@/components/ui/page-transition";
import { SimpleTimePicker } from "@/components/ui/simple-time-picker";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";

const formSchema = z.object({
  catId: z.string({
    required_error: "Por favor, selecione um gato",
  }),
  type: z.enum(["interval", "fixedTime"], {
    required_error: "Por favor, selecione um tipo de agendamento",
  }),
  interval: z.string().optional(),
  times: z.string().optional(),
});

export default function NewSchedulePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cats, setCats] = useState<CatType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimes, setSelectedTimes] = useState<(Date | undefined)[]>([undefined]);

  // Carregar a lista de gatos
  useEffect(() => {
    async function loadCats() {
      try {
        setIsLoading(true);
        const catsData = await getCats();
        setCats(catsData);
      } catch (error) {
        console.error("Erro ao carregar gatos:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadCats();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "interval",
      interval: "12",
      times: "",
    },
  });

  const watchType = form.watch("type");

  // Adicionar um novo horário
  const addTimeField = () => {
    setSelectedTimes([...selectedTimes, undefined]);
  };

  // Remover um horário
  const removeTimeField = (index: number) => {
    const newTimes = [...selectedTimes];
    newTimes.splice(index, 1);
    setSelectedTimes(newTimes);
  };

  // Atualizar um horário
  const updateTime = (index: number, date: Date | undefined) => {
    const newTimes = [...selectedTimes];
    newTimes[index] = date;
    setSelectedTimes(newTimes);
    
    // Atualizar o campo times no formulário com os horários formatados
    const times = newTimes
      .filter((d): d is Date => d !== undefined)
      .map(d => format(d, "HH:mm"));
    
    form.setValue("times", times.join(","));
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);

      // Validar os dados com base no tipo selecionado
      if (values.type === "interval" && (!values.interval || parseInt(values.interval) <= 0)) {
        toast({
          title: "Erro",
          description: "Por favor, informe um intervalo válido",
          variant: "destructive",
        });
        return;
      }

      if (values.type === "fixedTime" && (!values.times || values.times.trim() === "")) {
        toast({
          title: "Erro",
          description: "Por favor, adicione pelo menos um horário",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          catId: parseInt(values.catId),
          type: values.type,
          interval: values.type === "interval" ? parseInt(values.interval || "0") : 0,
          times: values.type === "fixedTime" ? values.times : "",
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao criar agendamento");
      }

      toast({
        title: "Sucesso",
        description: "Agendamento criado com sucesso!",
      });

      router.push("/schedules");
      router.refresh();
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao criar o agendamento",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex items-center p-4 border-b">
          <Link href="/schedules" className="flex items-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </div>

        <div className="flex-1 p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto"
          >
            <h1 className="text-2xl font-bold mb-6">Criar Novo Agendamento</h1>

            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-10 bg-muted rounded-md"></div>
                <div className="h-10 bg-muted rounded-md"></div>
                <div className="h-24 bg-muted rounded-md"></div>
                <div className="h-10 bg-muted rounded-md"></div>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="catId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gato</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um gato" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cats.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Agendamento</FormLabel>
                        <Tabs
                          defaultValue={field.value}
                          onValueChange={field.onChange}
                          className="w-full"
                        >
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="interval">Intervalo</TabsTrigger>
                            <TabsTrigger value="fixedTime">Horário Fixo</TabsTrigger>
                          </TabsList>
                          <TabsContent value="interval" className="mt-4">
                            <FormField
                              control={form.control}
                              name="interval"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Intervalo (horas)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      max="24"
                                      placeholder="Ex: 12"
                                      {...field}
                                      disabled={isSubmitting}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Alimentar o gato a cada X horas
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TabsContent>
                          <TabsContent value="fixedTime" className="mt-4">
                            <FormItem>
                              <FormLabel>Horários</FormLabel>
                              <div className="space-y-2">
                                {selectedTimes.map((time, index) => (
                                  <div key={index} className="flex items-center gap-2">
                                    <SimpleTimePicker
                                      value={time || new Date()}
                                      onChange={(newTime) => updateTime(index, newTime)}
                                      disabled={isSubmitting}
                                      use12HourFormat={false}
                                    />
                                    {index > 0 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeTimeField(index)}
                                        disabled={isSubmitting}
                                      >
                                        Remover
                                      </Button>
                                    )}
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={addTimeField}
                                  disabled={isSubmitting}
                                >
                                  Adicionar Horário
                                </Button>
                              </div>
                              <FormDescription>
                                Alimentar o gato em horários específicos do dia
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          </TabsContent>
                        </Tabs>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Criando..." : "Criar Agendamento"}
                  </Button>
                </form>
              </Form>
            )}
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
} 