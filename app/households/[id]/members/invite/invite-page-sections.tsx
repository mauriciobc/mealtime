"use client";

import { useRouter } from "next/navigation";
import BottomNav from "@/components/bottom-nav";
import PageTransition from "@/components/page-transition";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Copy, Check, Share2, ChevronLeft, Mail, AlertTriangle, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UseFormReturn } from 'react-hook-form';
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

export type EmailFormValues = { email: string };

export type InvitePageState = {
  household: HouseholdType | null | undefined;
  isAuthorized: boolean | undefined;
  isLoadingData: boolean;
  isSending: boolean;
  isCopied: boolean;
  isGenerating: boolean;
};

export type InvitePageAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_HOUSEHOLD'; household: HouseholdType | null; isAuthorized: boolean }
  | { type: 'LOAD_END' }
  | { type: 'SET_SENDING'; value: boolean }
  | { type: 'SET_COPIED'; value: boolean }
  | { type: 'SET_GENERATING'; value: boolean }
  | { type: 'UPDATE_HOUSEHOLD'; household: HouseholdType };

export const initialInvitePageState: InvitePageState = {
  household: undefined,
  isAuthorized: undefined,
  isLoadingData: true,
  isSending: false,
  isCopied: false,
  isGenerating: false,
};

export function invitePageReducer(state: InvitePageState, action: InvitePageAction): InvitePageState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, isLoadingData: true };
    case 'LOAD_HOUSEHOLD':
      return { ...state, household: action.household, isAuthorized: action.isAuthorized, isLoadingData: false };
    case 'LOAD_END':
      return { ...state, isLoadingData: false };
    case 'SET_SENDING':
      return { ...state, isSending: action.value };
    case 'SET_COPIED':
      return { ...state, isCopied: action.value };
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.value };
    case 'UPDATE_HOUSEHOLD':
      return { ...state, household: action.household };
    default:
      return state;
  }
}

export function InviteUserErrorView({ error, onBack }: { error: string; onBack: () => void }) {
  return (
    <PageTransition>
      <div className="p-4 text-center">
        <p className="text-destructive">Erro ao carregar dados do usuário: {error}. Tente recarregar a página.</p>
        <Button onClick={onBack} className="mt-4">Voltar</Button>
      </div>
    </PageTransition>
  );
}

export function InviteHouseholdErrorView({ error, onBack }: { error: string; onBack: () => void }) {
  return (
    <PageTransition>
      <div className="p-4 text-center">
        <p className="text-destructive">Erro ao carregar lista de residências: {error}. Tente recarregar a página.</p>
        <Button onClick={onBack} className="mt-4">Voltar</Button>
      </div>
    </PageTransition>
  );
}

export function InvitePageLoadingSkeleton() {
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

export function InvitePageDeniedView({ message }: { message: string }) {
  return (
    <PageTransition>
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex-1 flex items-center justify-center p-4">
           <Loading text={message} />
        </main>
        <BottomNav />
      </div>
    </PageTransition>
  );
}

type InviteEmailTabProps = {
  form: UseFormReturn<EmailFormValues>;
  isSending: boolean;
  onSubmit: (data: EmailFormValues) => void;
};

export function InviteEmailTab({ form, isSending, onSubmit }: InviteEmailTabProps) {
  return (
    <TabsContent value="email">
      <Card>
        <CardHeader>
          <CardTitle>Convidar por E-mail</CardTitle>
          <CardDescription>
            Digite o e-mail da pessoa que você deseja convidar. Ela receberá um link para entrar na residência.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
           <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0"> 
             <CardContent>
               <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="email">E-mail</FormLabel>
                      <FormControl>
                        <div className="relative">
                           <Mail className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                           <Input 
                             id="email"
                             type="email"
                             placeholder="nome@exemplo.com"
                             {...field}
                             className="pl-8"
                             disabled={isSending}
                           />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
             </CardContent>
             <CardFooter>
               <Button type="submit" disabled={isSending}>
                 {isSending ? <Loading text="Enviando..." size="sm" /> : <><UserPlus className="mr-2 h-4 w-4" /> Enviar Convite</>}
               </Button>
             </CardFooter>
           </form>
         </Form>
      </Card>
    </TabsContent>
  );
}

type InviteLinkTabProps = {
  household: HouseholdType;
  isCopied: boolean;
  isGenerating: boolean;
  onCopy: () => void;
  onShare: () => void;
  onRegenerate: () => void;
};

export function InviteLinkTab({
  household,
  isCopied,
  isGenerating,
  onCopy,
  onShare,
  onRegenerate,
}: InviteLinkTabProps) {
  return (
    <TabsContent value="link">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
             <span>Compartilhar Link</span>
             <Button 
               variant="outline"
               size="sm"
               onClick={onRegenerate}
               disabled={isGenerating}
               title="Gerar novo código de convite (invalida o anterior)"
             >
               {isGenerating ? <Loading text="Gerando..." size="sm" /> : <RefreshCw className="h-4 w-4" />}
               <span className="sr-only">Gerar Novo Código</span>
             </Button>
           </CardTitle>
          <CardDescription>
            Qualquer pessoa com este link poderá entrar na residência. Compartilhe com cuidado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {household?.inviteCode ? (
            <div className="flex items-center space-x-2 rounded-md border bg-muted px-3 py-2">
              <Label htmlFor="invite-link" className="sr-only">
                Link de Convite
              </Label>
              <Input
                id="invite-link"
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join?code=${household.inviteCode}`}
                readOnly
                className="flex-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                onClick={onCopy}
                disabled={isCopied}
                title="Copiar link"
                className="h-7 w-7"
               >
                 {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                 <span className="sr-only">{isCopied ? "Copiado" : "Copiar"}</span>
               </Button>
            </div>
          ) : (
             <div className="flex items-center justify-center rounded-md border border-dashed p-4 text-sm text-muted-foreground">
               <AlertTriangle className="mr-2 h-4 w-4" /> Nenhum código de convite ativo.
             </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
             onClick={onShare} 
             disabled={!household?.inviteCode} 
             className="w-full sm:w-auto"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Compartilhar
          </Button>
        </CardFooter>
      </Card>
    </TabsContent>
  );
}

type InvitePageMainViewProps = {
  householdId: string;
  household: HouseholdType;
  form: UseFormReturn<EmailFormValues>;
  isSending: boolean;
  isCopied: boolean;
  isGenerating: boolean;
  onSendInvite: (data: EmailFormValues) => void;
  onCopy: () => void;
  onShare: () => void;
  onRegenerate: () => void;
};

export function InvitePageMainView({
  householdId,
  household,
  form,
  isSending,
  isCopied,
  isGenerating,
  onSendInvite,
  onCopy,
  onShare,
  onRegenerate,
}: InvitePageMainViewProps) {
  const router = useRouter();

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
                aria-label="Voltar"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                 <h1 className="text-xl font-bold leading-tight">Convidar Membros</h1>
                 <p className="text-sm text-muted-foreground">Convide pessoas para {household?.name || "sua residência"}</p>
               </div>
            </div>

            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Via E-mail</TabsTrigger>
                <TabsTrigger value="link">Via Link</TabsTrigger>
              </TabsList>
              
              <InviteEmailTab form={form} isSending={isSending} onSubmit={onSendInvite} />
              <InviteLinkTab
                household={household}
                isCopied={isCopied}
                isGenerating={isGenerating}
                onCopy={onCopy}
                onShare={onShare}
                onRegenerate={onRegenerate}
              />
            </Tabs>
          </div>
        </main>
        <BottomNav />
      </div>
    </PageTransition>
  );
}
