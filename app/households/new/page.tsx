"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

// Schema para validação do formulário
const formSchema = z.object({
  name: z.string()
    .min(3, { message: "O nome deve ter pelo menos 3 caracteres" })
    .max(50, { message: "O nome não pode ter mais de 50 caracteres" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewHouseholdPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Configurar o formulário com validação
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });
  
  // Verificar se o usuário está autenticado
  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }
  
  // Função para criar um novo domicílio
  const onSubmit = async (values: FormValues) => {
    if (status !== 'authenticated') {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para criar um domicílio',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    setErrorMessage("");
    
    try {
      const response = await fetch('/api/households', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        setErrorMessage(responseData.error || 'Erro ao criar domicílio');
        throw new Error(responseData.error || 'Erro ao criar domicílio');
      }
      
      toast({
        title: 'Sucesso',
        description: `Domicílio ${responseData.name} criado com sucesso!`,
      });
      
      // Redirecionar para a página de detalhes do domicílio
      setTimeout(() => {
        router.push(`/households/${responseData.id}`);
      }, 500); // Pequeno atraso para garantir que a toast seja vista
    } catch (error) {
      console.error('Erro ao criar domicílio:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao criar o domicílio',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container max-w-md mx-auto p-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4 pl-0"
          onClick={() => router.back()}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">Novo Domicílio</h1>
        <p className="text-muted-foreground mt-1">
          Crie um novo domicílio para gerenciar seus gatos com sua família ou amigos.
        </p>
      </div>
      
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Domicílio</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ex: Minha Casa, Apartamento da Família" 
                    {...field} 
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
            {isSubmitting ? 'Criando...' : 'Criar Domicílio'}
          </Button>
        </form>
      </Form>
    </div>
  );
} 