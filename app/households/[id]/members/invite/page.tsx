"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppHeader } from "@/components/app-header";
import BottomNav from "@/components/bottom-nav";
import PageTransition from "@/components/page-transition";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Copy, Check, Share2, ChevronLeft, Mail } from "lucide-react";
import { useAppContext } from "@/lib/context/AppContext";
import { toast } from "sonner";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { v4 as uuidv4 } from "uuid";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Esquema de validação
const emailSchema = z.object({
  email: z.string().email("Digite um endereço de e-mail válido"),
});

type EmailFormValues = z.infer<typeof emailSchema>;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function HouseholdInvitePage({ params }: PageProps) {
  const resolvedParams = use(params)
  const router = useRouter();
  const { state, dispatch } = useAppContext();
  const { data: session, status } = useSession();
  const [household, setHousehold] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [isSending, setIsSending] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isGeneratingLink, setGeneratingLink] = useState(false);
  
  // Configurar o formulário de convite por email
  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  });

  useEffect(() => {
    if (status === 'authenticated') {
      loadHouseholdDetails();
      // Gerar um código de convite temporário para a UI (em produção, seria buscado da API)
      setInviteCode(uuidv4().substring(0, 8).toUpperCase());
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router, resolvedParams.id]);
  
  const loadHouseholdDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/households/${resolvedParams.id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Domicílio não encontrado");
          router.push("/households");
          return;
        }
        throw new Error('Falha ao carregar detalhes do domicílio');
      }
      
      const data = await response.json();
      setHousehold(data);
      setInviteCode(data.inviteCode);
    } catch (error) {
      console.error('Erro ao carregar detalhes do domicílio:', error);
      toast.error("Não foi possível carregar os detalhes do domicílio");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Verificar se o usuário tem permissão para convidar (é administrador)
  const currentUser = state.currentUser;
  const userRole = household?.members.find(
    (member: any) => member.id === currentUser?.id
  )?.role || "member";
  const isAdmin = userRole === "admin";
  
  useEffect(() => {
    if (!isLoading && household !== null) {
      if (!isAdmin) {
        toast.error("Apenas administradores podem convidar novos membros");
        router.push(`/households/${resolvedParams.id}`);
      }
    }
  }, [isLoading, household, isAdmin, resolvedParams.id, router]);
  
  const handleSendInvite = async (data: EmailFormValues) => {
    // Validar e-mail
    try {
      emailSchema.parse({ email: data.email });
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors: { email?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            formattedErrors[err.path[0] as keyof typeof formattedErrors] = err.message;
          }
        });
        setErrors(formattedErrors);
        return;
      }
    }
    
    setIsSending(true);
    
    try {
      // Em produção, seria uma chamada real à API
      // await fetch(`/api/households/${resolvedParams.id}/invite`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({ email: data.email }),
      // });
      
      // Simular sucesso
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`Convite enviado para ${data.email}`);
      setEmail("");
    } catch (error) {
      console.error("Erro ao enviar convite:", error);
      toast.error("Não foi possível enviar o convite");
    } finally {
      setIsSending(false);
    }
  };
  
  const copyInviteLink = async () => {
    const inviteUrl = `${window.location.origin}/join?code=${inviteCode}&household=${resolvedParams.id}`;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setIsCopied(true);
      toast.success("Link copiado para a área de transferência");
      
      // Resetar o estado após 3 segundos
      setTimeout(() => setIsCopied(false), 3000);
    } catch (error) {
      console.error("Erro ao copiar para o clipboard:", error);
      toast.error("Não foi possível copiar o link");
    }
  };
  
  const shareInvite = async () => {
    const inviteUrl = `${window.location.origin}/join?code=${inviteCode}&household=${resolvedParams.id}`;
    const text = `Junte-se ao meu domicílio "${household?.name}" no aplicativo MealTime!`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Convite para MealTime",
          text: text,
          url: inviteUrl,
        });
        toast.success("Convite compartilhado");
      } else {
        // Fallback para copiar
        await copyInviteLink();
      }
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
      
      // Alguns navegadores lançam erro quando o usuário cancela o compartilhamento
      if (error instanceof Error && error.name !== "AbortError") {
        toast.error("Não foi possível compartilhar o convite");
      }
    }
  };

  const generateInviteLink = async () => {
    try {
      setGeneratingLink(true);
      
      // Em produção:
      // await fetch(`/api/households/${resolvedParams.id}/invite`, {
      //  method: 'POST',
      //  headers: {
      //    'Content-Type': 'application/json',
      //  },
      // });
      // ... existing code ...
    } catch (error) {
      // ... existing code ...
    }
  };

  if (isLoading || !household) {
    return (
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
          <AppHeader title="Carregando..." showBackButton />
          <div className="flex-1 p-4 flex items-center justify-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
          <BottomNav />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader title="Convidar Membros" showBackButton />
        
        <div className="flex-1 p-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Convidar para {household.name}</h1>
            <p className="text-muted-foreground">
              Convide amigos e familiares para gerenciar este domicílio
            </p>
          </div>
          
          <Tabs defaultValue="email" className="mb-6">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="email">Por E-mail</TabsTrigger>
              <TabsTrigger value="link">Link de Convite</TabsTrigger>
            </TabsList>
            
            <TabsContent value="email" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Convidar por E-mail</CardTitle>
                  <CardDescription>
                    Envie um convite por e-mail para novos membros
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSendInvite)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-mail do Convidado</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="amigo@exemplo.com"
                                {...field}
                                type="email"
                                className={errors.email ? "border-destructive" : ""}
                              />
                            </FormControl>
                            {errors.email && (
                              <FormMessage>{errors.email}</FormMessage>
                            )}
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit" className="w-full" disabled={isSending}>
                        <Mail className="mr-2 h-4 w-4" />
                        {isSending ? "Enviando..." : "Enviar Convite"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="link" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Link de Convite</CardTitle>
                  <CardDescription>
                    Compartilhe este link com quem você deseja convidar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                    <code className="text-sm font-mono overflow-hidden overflow-ellipsis">
                      {inviteCode}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={copyInviteLink}
                      className="h-8 w-8"
                    >
                      {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={copyInviteLink}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Link
                    </Button>
                    
                    <Button
                      className="flex-1"
                      onClick={shareInvite}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Compartilhar
                    </Button>
                  </div>
                  
                  <Separator />
                  
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2">O código expira em 7 dias.</p>
                    <p>
                      Qualquer pessoa com este código poderá se juntar ao seu domicílio.
                      Compartilhe apenas com pessoas de confiança.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <BottomNav />
      </div>
    </PageTransition>
  );
} 