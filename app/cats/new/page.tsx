"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useGlobalState } from "@/lib/context/global-state";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/image-upload";
import { Loading } from "@/components/ui/loading";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "O nome do gato deve ter pelo menos 2 caracteres.",
  }),
  photoUrl: z.string().optional(),
  birthdate: z.date().optional(),
  weight: z.string().optional(),
  portion: z.string().optional().refine((val) => {
    if (!val) return true;
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, {
    message: "A porção deve ser um número positivo.",
  }),
  restrictions: z.string().optional(),
  notes: z.string().optional(),
  feeding_interval: z.string().min(1, {
    message: "O intervalo de alimentação é obrigatório.",
  }).refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1 && num <= 24;
  }, {
    message: "O intervalo deve estar entre 1 e 24 horas.",
  }),
});

export default function NewCatPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: session, status } = useSession();
  const { state, dispatch } = useGlobalState();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      photoUrl: "",
      restrictions: "",
      notes: "",
      feeding_interval: "8",
      portion: "",
    },
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      toast.error("Você precisa estar conectado para adicionar um gato");
      router.push("/login");
    }
  }, [status, router]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!state.currentUser?.householdId) {
       toast.error("Você precisa pertencer a um domicílio para adicionar um gato.");
       return;
    }

    const currentHouseholdId = state.currentUser.householdId;

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/cats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          weight: values.weight ? parseFloat(values.weight) : undefined,
          householdId: currentHouseholdId,
          feeding_interval: parseInt(values.feeding_interval),
          portion: values.portion ? parseFloat(values.portion) : undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Erro do servidor:", errorData);
        throw new Error(errorData.error || "Falha ao adicionar gato");
      }

      const newCat = await response.json();
      
      dispatch({
        type: "ADD_CAT",
        payload: newCat,
      });

      toast.success("Gato adicionado com sucesso!");
      router.push("/cats");
    } catch (error) {
      console.error("Erro ao criar perfil de gato:", error);
      toast.error("Erro ao adicionar gato. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "loading" || (status === "authenticated" && !state.currentUser)) {
     return (
        <div className="container max-w-md py-6 pb-28 flex justify-center items-center min-h-[300px]">
          <Loading text="Carregando..." />
        </div>
     );
  }

   if (status === "authenticated" && state.currentUser && !state.currentUser.householdId) {
     return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="container max-w-md py-6 pb-28"
        >
          <h1 className="text-2xl font-bold mb-6">Adicionar Novo Gato</h1>
          <div className="bg-secondary border border-border rounded-md p-6 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Nenhum domicílio encontrado</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Você precisa pertencer a um domicílio para adicionar um gato.
                Crie ou junte-se a um domicílio nas configurações.
              </p>
              <Button
                onClick={() => router.push("/settings")}
              >
                Ir para Configurações
              </Button>
            </div>
        </motion.div>
     );
   }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container max-w-md py-6 pb-28"
    >
      <h1 className="text-2xl font-bold mb-6">Adicionar Novo Gato</h1>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do gato" {...field} id={field.name} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          <FormField
            control={form.control}
            name="photoUrl"
            render={({ field }) => (
                <FormItem>
                  <FormLabel>Foto</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value || ""}
                      onChange={field.onChange}
                      type="cat"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          <FormField
            control={form.control}
            name="birthdate"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Nascimento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: ptBR })
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder="Ex: 4.5" {...field} id={field.name}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="feeding_interval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intervalo Alimentação (horas)</FormLabel>
                  <FormControl>
                     <Input type="number" min="1" max="24" placeholder="Ex: 8" {...field} id={field.name}/>
                  </FormControl>
                   <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="portion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Porção por Refeição (ex: gramas)</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" placeholder="Ex: 50" {...field} id={field.name}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="restrictions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Restrições Alimentares</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Alguma restrição alimentar? (opcional)"
                      {...field}
                      id={field.name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações Adicionais</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas sobre comportamento, saúde, etc. (opcional)"
                      {...field}
                       id={field.name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Adicionando..." : "Adicionar Gato"}
          </Button>
        </form>
      </Form>
    </motion.div>
  );
} 