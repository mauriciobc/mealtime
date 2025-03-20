"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
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
import { AppHeader } from "@/components/app-header";
import PageTransition from "@/components/page-transition";
import { useGlobalState } from "@/lib/context/global-state";
import { toast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";

// Definindo a interface para o gato
interface CatType {
  id: number;
  name: string;
  photoUrl: string | null;
}

const formSchema = z.object({
  catId: z.string({
    required_error: "Por favor, selecione um gato",
  }),
  portionSize: z.string().optional(),
  notes: z.string().optional(),
});

export default function NewFeedingPage() {
  const router = useRouter();
  const { state } = useGlobalState();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cats, setCats] = useState<CatType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar a lista de gatos
  useEffect(() => {
    async function loadCats() {
      try {
        setIsLoading(true);
        
        // Verificar se temos residências do usuário
        if (!state.households || state.households.length === 0) {
          console.error("Nenhuma residência encontrada");
          toast({
            title: "Atenção",
            description: "Não foi possível identificar sua residência",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        // Usar a primeira residência como padrão (ou implementar seleção de residência)
        const householdId = state.households[0].id;
        
        // Usar a API específica para o formulário de alimentação com o parâmetro householdId
        const response = await fetch(`/api/feedings/cats?householdId=${householdId}`);
        if (!response.ok) {
          throw new Error('Falha ao carregar gatos');
        }
        const catsData = await response.json();
        
        if (catsData.length === 0) {
          toast({
            title: "Atenção",
            description: "Não encontramos gatos cadastrados na sua residência",
            variant: "destructive",
          });
        }
        
        setCats(catsData);
      } catch (error) {
        console.error("Erro ao carregar gatos:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar a lista de gatos",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadCats();
  }, [state.households]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      portionSize: "",
      notes: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);

      // Obter o ID do usuário da sessão
      const userId = session?.user?.id;

      if (!userId) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch("/api/feedings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          catId: parseInt(values.catId),
          userId,
          portionSize: values.portionSize ? parseFloat(values.portionSize) : null,
          notes: values.notes,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao registrar alimentação");
      }

      toast({
        title: "Sucesso",
        description: "Alimentação registrada com sucesso!",
      });

      router.push("/feedings");
      router.refresh();
    } catch (error) {
      console.error("Erro ao registrar alimentação:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao registrar a alimentação",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex-1 p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto"
          >
            <h1 className="text-2xl font-bold mb-6">Registrar Nova Alimentação</h1>

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
                    name="portionSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Ex: 0.5"
                            {...field}
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
                        <FormLabel>Observações (opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Adicione observações sobre esta alimentação"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Registrando..." : "Registrar Alimentação"}
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