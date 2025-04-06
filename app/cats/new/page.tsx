"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useAppContext } from "@/lib/context/AppContext";
import { useUserContext } from "@/lib/context/UserContext";
import { useLoading } from "@/lib/context/LoadingContext";

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
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "O nome do gato deve ter pelo menos 2 caracteres.",
  }),
  photoUrl: z.string().optional(),
  birthdate: z.date().optional(),
  weight: z.string().optional().refine((val) => !val || !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Peso deve ser um número positivo.",
  }),
  portion: z.string().optional().refine((val) => !val || !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Porção deve ser um número positivo.",
  }),
  restrictions: z.string().optional(),
  notes: z.string().optional(),
  feedingInterval: z.string().min(1, {
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
  const { dispatch: appDispatch } = useAppContext();
  const { state: userState } = useUserContext();
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const { currentUser } = userState;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      photoUrl: "",
      birthdate: undefined,
      weight: "",
      portion: "",
      restrictions: "",
      notes: "",
      feedingInterval: "8",
    },
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      toast.error("Você precisa estar conectado para adicionar um gato");
      router.push("/login");
    }
  }, [status, router]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser?.householdId) {
       toast.error("Você precisa pertencer a um domicílio para adicionar um gato.");
       return;
    }

    const currentHouseholdId = currentUser.householdId;
    const opId = "create-cat";
    addLoadingOperation({ id: opId, priority: 1, description: "Adding cat..." });
    setIsSubmitting(true);

    try {
      const payload = {
        ...values,
        birthdate: values.birthdate ? values.birthdate.toISOString() : null,
        weight: values.weight ? parseFloat(values.weight) : null,
        portion_size: values.portion ? parseFloat(values.portion) : null,
        feedingInterval: parseInt(values.feedingInterval),
        householdId: currentHouseholdId,
      };

      const response = await fetch("/api/cats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Erro do servidor:", errorData);
        throw new Error(errorData.error || "Falha ao adicionar gato");
      }

      const newCat = await response.json();
      
      appDispatch({
        type: "ADD_CAT",
        payload: newCat,
      });

      toast.success("Gato adicionado com sucesso!");
      router.push("/cats");
    } catch (error: any) {
      console.error("Erro ao criar perfil de gato:", error);
      toast.error(`Erro ao adicionar gato: ${error.message || "Tente novamente."}`);
    } finally {
      setIsSubmitting(false);
      removeLoadingOperation(opId);
    }
  }

  if (status === "loading" || (status === "authenticated" && !currentUser)) {
     return (
        <div className="container max-w-md py-6 pb-28 flex justify-center items-center min-h-[300px]">
          <Loading text="Carregando..." />
        </div>
     );
  }

   if (status === "authenticated" && currentUser && !currentUser.householdId) {
     return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="container max-w-md py-6 pb-28"
        >
          <PageHeader title="Adicionar Novo Gato" />
          <div className="mt-6">
            <EmptyState 
              icon={Users}
              title="Nenhum domicílio encontrado"
              description="Você precisa pertencer a um domicílio para adicionar um gato. Crie ou junte-se a um domicílio nas configurações."
              actionLabel="Ir para Configurações"
              actionHref="/settings"
             />
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
      <PageHeader title="Adicionar Novo Gato" />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do gato" {...field} id="name" required disabled={isSubmitting}/>
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
                          disabled={isSubmitting}
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
                        captionLayout="dropdown-buttons"
                        fromYear={1990}
                        toYear={new Date().getFullYear()}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1990-01-01")
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
                    <Input 
                        type="number" 
                        step="0.1" 
                        placeholder="Ex: 4.5" 
                        {...field} 
                        id="weight"
                        disabled={isSubmitting}
                     />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="feedingInterval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intervalo Ideal Entre Refeições (horas) *</FormLabel>
                  <FormControl>
                     <Input 
                        type="number" 
                        min="1" 
                        max="24" 
                        placeholder="Ex: 8" 
                        {...field} 
                        id="feedingInterval"
                        required 
                        disabled={isSubmitting}
                     />
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
                  <FormLabel>Porção Recomendada (gramas)</FormLabel>
                  <FormControl>
                    <Input 
                        type="number" 
                        step="1" 
                        placeholder="Ex: 50" 
                        {...field} 
                        id="portion"
                        disabled={isSubmitting}
                    />
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
                      placeholder="Ex: Alergia a frango, sensível a grãos"
                      className="resize-none"
                      {...field}
                      id="restrictions"
                      disabled={isSubmitting}
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
                      placeholder="Ex: Prefere comer no quarto, só come ração úmida"
                      className="resize-none"
                      {...field}
                      id="notes"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loading text="Adicionando..." size="sm" /> : "Adicionar Gato"}
          </Button>
        </form>
      </Form>
    </motion.div>
  );
} 