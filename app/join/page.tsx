"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut, signIn } from "next-auth/react";
import BottomNav from "@/components/bottom-nav";
import PageTransition from "@/components/page-transition";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHouseholdContext } from "@/lib/context/HouseholdContext";
import { useUserContext } from "@/lib/context/UserContext";
import { useLoading } from "@/lib/context/LoadingContext";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Loading } from "@/components/ui/loading";
import { Loader2 } from "lucide-react";

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update: updateSession } = useSession();
  const { state: householdState, dispatch: householdDispatch } = useHouseholdContext();
  const { state: userState, dispatch: userDispatch } = useUserContext();
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const { currentUser } = userState;

  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setInviteCode(code);
    }
  }, [searchParams]);

  const handleJoinHousehold = async () => {
    if (!inviteCode.trim()) {
      toast.error("Por favor, insira um código de convite");
      return;
    }
    
    if (status !== "authenticated" || !currentUser) {
        toast.error("Você precisa estar autenticado para entrar em um domicílio.");
        return;
    }

    const opId = "join-household";
    addLoadingOperation({ id: opId, description: "Entrando no domicílio...", priority: 1 });
    setIsLoading(true);

    try {
      const response = await fetch("/api/households/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao entrar no domicílio");
      }

      const joinedHousehold = data.household;
      const updatedUser = data.user;

      if (!joinedHousehold || !updatedUser) {
          console.error("API response missing household or user data:", data);
          throw new Error("Resposta inválida do servidor após entrar no domicílio.");
      }

      householdDispatch({ type: "ADD_HOUSEHOLD", payload: joinedHousehold });
      
      userDispatch({ type: "SET_USER", payload: updatedUser });

      await updateSession({ user: updatedUser });
      
      toast.success("Você entrou no domicílio com sucesso!");
      router.push(`/households`); 
    } catch (error: any) {
      console.error("Erro ao entrar no domicílio:", error);
      toast.error(error.message || "Ocorreu um erro ao tentar entrar no domicílio.");
    } finally {
      setIsLoading(false);
      removeLoadingOperation(opId);
    }
  };

  if (status === "loading") {
      return (
         <PageTransition>
            <div className="flex flex-col min-h-screen bg-background">
               <div className="p-4 pb-24">
                 <Loading text="Carregando..." />
               </div>
            </div>
         </PageTransition>
      );
  }

  if (status === "unauthenticated") {
    router.push("/login?callbackUrl=/join");
    return <Loading text="Redirecionando para login..." />;
  }
  
  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
         <div className="p-4 pb-24">
           <PageHeader 
             title="Entrar em um Domicílio" 
             description="Use um código de convite para entrar em um domicílio existente"
             showBackButton 
           />
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Código de Convite</CardTitle>
              <CardDescription>
                Insira o código de convite que você recebeu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Código de Convite</Label>
                  <Input
                    id="inviteCode"
                    placeholder="Digite o código de convite"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="font-mono"
                    disabled={isLoading}
                  />
                </div>
                
                <Button
                  className="w-full"
                  onClick={handleJoinHousehold}
                  disabled={isLoading || !inviteCode.trim()}
                >
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</> : "Entrar no Domicílio"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <BottomNav />
      </div>
    </PageTransition>
  );
} 