"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import BottomNav from "@/components/bottom-nav";
import PageTransition from "@/components/page-transition";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Copy, Check, Share2, ChevronLeft, Mail, AlertTriangle, RefreshCw } from "lucide-react";
import { useGlobalState } from "@/lib/context/global-state";
import { toast } from "sonner";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Household as HouseholdType } from "@/lib/types";
import { Loading } from "@/components/ui/loading";

const emailSchema = z.object({
  email: z.string().email("Digite um endereço de e-mail válido"),
});

type EmailFormValues = z.infer<typeof emailSchema>;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function HouseholdInvitePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const householdId = resolvedParams.id;
  const router = useRouter();
  const { state, dispatch } = useGlobalState();
  const { data: session, status } = useSession();
  
  const [household, setHousehold] = useState<HouseholdType | null | undefined>(undefined);
  const [isAuthorized, setIsAuthorized] = useState<boolean | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isSending, setIsSending] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (status === "authenticated" && state.currentUser && state.households) {
      const foundHousehold = state.households.find(h => String(h.id) === String(householdId));
      setHousehold(foundHousehold || null);

      if (foundHousehold) {
        const isAdmin = foundHousehold.members?.some(
          member => String(member.userId) === String(state.currentUser!.id) && member.role?.toLowerCase() === 'admin'
        );
        setIsAuthorized(isAdmin);
        if (!isAdmin) {
           toast.error("Apenas administradores podem convidar membros.");
           router.replace(`/households/${householdId}`); 
        }
      } else {
        setIsAuthorized(false);
        toast.error("Residência não encontrada.");
        router.replace('/households');
      }
      setIsLoading(false);
    } else if (status === "unauthenticated") {
       setIsLoading(false);
       setIsAuthorized(false);
       router.replace("/login");
    } else {
       setIsLoading(true); 
    }
  }, [status, state.currentUser, state.households, householdId, router]);
  
  const handleSendInvite = async (data: EmailFormValues) => {
    if (!isAuthorized || !household) return;
    
    setIsSending(true);
    try {
      const response = await fetch(`/api/households/${householdId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (!response.ok) {
         throw new Error(result.error || "Falha ao enviar convite por e-mail.");
      }
      
      toast.success(`Convite enviado para ${data.email}`);
      form.reset();

    } catch (error: any) {
      console.error("Erro ao enviar convite:", error);
      toast.error(`Erro ao enviar: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const copyInviteLink = async () => {
    if (!household?.inviteCode) {
       toast.error("Código de convite não disponível.");
       return;
    }
    const inviteUrl = `${window.location.origin}/join?code=${household.inviteCode}`;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setIsCopied(true);
      toast.success("Link de convite copiado!");
      setTimeout(() => setIsCopied(false), 3000);
    } catch (error) {
      console.error("Erro ao copiar link:", error);
      toast.error("Não foi possível copiar o link.");
    }
  };

  const shareInvite = async () => {
     if (!household?.inviteCode || !household?.name) return;
     
    const inviteUrl = `${window.location.origin}/join?code=${household.inviteCode}`;
    const text = `Olá! Gostaria de te convidar para participar da minha residência "${household.name}" no MealTime. Use este link para entrar:`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Convite para ${household.name} - MealTime`,
          text: text,
          url: inviteUrl,
        });
      } else {
         copyInviteLink();
         toast.info("API de compartilhamento não suportada. Link copiado!");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
         console.error("Erro ao compartilhar:", error);
         toast.error("Não foi possível compartilhar o convite.");
      }
    }
  };

   const regenerateInviteCode = async () => {
     if (!isAuthorized || !household) return;
     setIsGenerating(true);
     try {
       const response = await fetch(`/api/households/${householdId}/invite-code`, {
          method: "PATCH", 
        });

        const result = await response.json();

        if (!response.ok) {
           throw new Error(result.error || "Falha ao gerar novo código de convite.");
        }
       
       const newCode = result.inviteCode; 
       const updatedHousehold = { ...household, inviteCode: newCode };

       dispatch({ type: "UPDATE_HOUSEHOLD", payload: updatedHousehold });

       toast.success("Novo código de convite gerado!");

     } catch (error: any) {
       console.error("Erro ao gerar novo código:", error);
       toast.error(`Erro: ${error.message}`);
     } finally {
       setIsGenerating(false);
     }
   };

  if (isLoading || household === undefined) {
    return (
      <PageTransition>
        <div className="flex min-h-screen flex-col bg-background">
           <main className="flex-1 pb-20 pt-4">
             <div className="container max-w-md">
                <div className="mb-6 flex items-center">
                 <Skeleton className="h-9 w-9 mr-2 rounded-full" />
                 <Skeleton className="h-7 w-48" />
               </div>
               
               <Card>
                 <CardHeader>
                   <Skeleton className="h-6 w-3/4 mb-2" />
                   <Skeleton className="h-4 w-full" />
                 </CardHeader>
                 <CardContent className="space-y-4">
                   <Skeleton className="h-10 w-full" />
                   <Skeleton className="h-10 w-full" />
                 </CardContent>
                  <CardFooter>
                     <Skeleton className="h-10 w-24" />
                  </CardFooter>
               </Card>
             </div>
           </main>
           <BottomNav />
        </div>
      </PageTransition>
    );
  }

   if (!household || isAuthorized === false) {
      return (
         <PageTransition>
           <div className="flex min-h-screen flex-col bg-background">
             <main className="flex-1 flex items-center justify-center p-4">
                <Loading text={!household ? "Redirecionando... Residência não encontrada." : "Redirecionando... Acesso negado."} />
             </main>
             <BottomNav />
           </div>
         </PageTransition>
      );
   }

  return (
    <PageTransition>
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex-1 pb-24 pt-4">
          <div className="container max-w-md">
            <div className="mb-6 flex items-center">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => router.push(`/households/${householdId}`)}
                className="mr-2"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                 <h1 className="text-xl font-bold leading-tight">Convidar Membros</h1>
                 <p className="text-xs text-muted-foreground">Para "{household.name}"</p>
              </div>
            </div>

            <Tabs defaultValue="link" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="link">Compartilhar Link</TabsTrigger>
                <TabsTrigger value="email">Enviar por E-mail</TabsTrigger>
              </TabsList>
              
              <TabsContent value="link">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Link de Convite</CardTitle>
                    <CardDescription>
                      Compartilhe este link com as pessoas que você deseja convidar para "{household.name}".
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between bg-muted rounded-md p-2 pl-3">
                      <code className="text-sm font-mono mr-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
                        {`${window.location.origin}/join?code=${household.inviteCode}`}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 flex-shrink-0"
                        onClick={copyInviteLink}
                        title="Copiar Link"
                        disabled={isGenerating}
                      >
                        {isCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                     <Button 
                        className="w-full" 
                        onClick={shareInvite}
                        disabled={isGenerating}
                     > 
                       <Share2 className="mr-2 h-4 w-4" />
                        Compartilhar Link
                     </Button>
                  </CardContent>
                  <CardFooter className="border-t pt-4 flex justify-between items-center">
                     <p className="text-xs text-muted-foreground">O código expira?</p>
                     <Button 
                       variant="outline"
                       size="sm"
                       onClick={regenerateInviteCode}
                       disabled={isGenerating}
                     >
                        {isGenerating ? (
                           <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></span> 
                        ) : (
                           <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                       Gerar Novo Código
                     </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="email">
                 <Card>
                   <Form {...form}>
                     <form onSubmit={form.handleSubmit(handleSendInvite)} className="space-y-0">
                       <CardHeader>
                         <CardTitle className="text-base">Convidar por E-mail</CardTitle>
                         <CardDescription>
                           Enviaremos um convite por e-mail para o endereço fornecido.
                         </CardDescription>
                       </CardHeader>
                       <CardContent>
                         <FormField
                           control={form.control}
                           name="email"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Endereço de E-mail</FormLabel>
                               <FormControl>
                                 <Input 
                                    type="email" 
                                    placeholder="nome@exemplo.com" 
                                    {...field} 
                                    disabled={isSending}
                                 />
                               </FormControl>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                       </CardContent>
                       <CardFooter className="border-t pt-4">
                         <Button type="submit" disabled={isSending} className="w-full">
                           {isSending ? (
                              <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></span> 
                           ) : (
                              <Mail className="mr-2 h-4 w-4" />
                           )}
                           {isSending ? "Enviando Convite..." : "Enviar Convite por E-mail"}
                         </Button>
                       </CardFooter>
                     </form>
                   </Form>
                 </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
        <BottomNav />
      </div>
    </PageTransition>
  );
} 