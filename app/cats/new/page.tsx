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
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/image-upload";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "O nome do gato deve ter pelo menos 2 caracteres.",
  }),
  photoUrl: z.string().optional(),
  birthdate: z.date().optional(),
  weight: z.string().optional(),
  restrictions: z.string().optional(),
  notes: z.string().optional(),
});

export default function NewCatPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: session, status } = useSession();
  const [isLoadingHousehold, setIsLoadingHousehold] = useState(true);
  const [household, setHousehold] = useState<{ id: number, name: string } | null>(null);
  const { dispatch } = useGlobalState();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      photoUrl: "",
      restrictions: "",
      notes: "",
    },
  });

  // Redirecionar para login se o usuário não estiver autenticado
  useEffect(() => {
    if (status === "unauthenticated") {
      toast.error("Você precisa estar conectado para adicionar um gato");
      router.push("/login");
    }
  }, [status, router]);

  // Buscar informações do domicílio do usuário
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      setIsLoadingHousehold(false);
      return;
    }

    async function loadUserHousehold() {
      try {
        setIsLoadingHousehold(true);
        const response = await fetch(`/api/users/${session.user.id}`);
        
        if (!response.ok) {
          throw new Error("Erro ao buscar informações do usuário");
        }
        
        const userData = await response.json();
        
        if (userData.household) {
          setHousehold({
            id: userData.household.id,
            name: userData.household.name
          });
        } else {
          setHousehold(null);
        }
      } catch (error) {
        console.error("Erro ao buscar informações do domicílio:", error);
        toast.error("Não foi possível verificar seu domicílio");
      } finally {
        setIsLoadingHousehold(false);
      }
    }
    
    loadUserHousehold();
  }, [session, status]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);
      
      if (!household) {
        toast.error("Você precisa pertencer a um domicílio para adicionar um gato.");
        return;
      }
      
      const response = await fetch("/api/cats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          weight: values.weight ? parseFloat(values.weight) : undefined,
          householdId: household.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Erro do servidor:", errorData);
        throw new Error(errorData.error || "Falha ao adicionar gato");
      }

      const newCat = await response.json();
      
      // Adicionar o gato ao estado global
      dispatch({
        type: "ADD_CAT",
        payload: newCat,
      });

      toast.success("Gato adicionado com sucesso!");
      router.push("/cats");
      router.refresh();
    } catch (error) {
      console.error("Erro ao criar perfil de gato:", error);
      toast.error("Erro ao adicionar gato. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container max-w-md py-6"
    >
      <h1 className="text-2xl font-bold mb-6">Adicionar Novo Gato</h1>
      
      {status === "loading" || isLoadingHousehold ? (
        <div className="flex justify-center py-10">
          <div className="animate-pulse h-8 w-8 rounded-full bg-muted"></div>
        </div>
      ) : status === "authenticated" && !household ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-yellow-800">
          <h3 className="font-medium mb-2">Nenhum domicílio encontrado</h3>
          <p className="text-sm">
            Você precisa pertencer a um domicílio para adicionar um gato. 
            Crie ou junte-se a um domicílio nas configurações.
          </p>
          <Button 
            className="mt-4 w-full" 
            variant="outline"
            onClick={() => router.push("/households")}
          >
            Ir para Domicílios
          </Button>
        </div>
      ) : (
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
                          date > new Date() || date < new Date("1990-01-01")
                        }
                        locale={ptBR}
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
                      step="0.01" 
                      placeholder="Ex: 4.5" 
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
              name="restrictions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Restrições Alimentares</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Liste quaisquer restrições alimentares" 
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
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Outras informações importantes" 
                      {...field} 
                      id={field.name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Adicionando..." : "Adicionar Gato"}
            </Button>
          </form>
        </Form>
      )}
    </motion.div>
  );
} 