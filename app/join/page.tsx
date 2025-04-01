"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut, signIn } from "next-auth/react";
import { AppHeader } from "@/components/app-header";
import BottomNav from "@/components/bottom-nav";
import PageTransition from "@/components/page-transition";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/lib/context/AppContext";
import { toast } from "sonner";

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { state, dispatch } = useAppContext();
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if there's an invite code in the URL
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

      // Atualizar o estado global com o novo domicílio
      dispatch({ type: "SET_HOUSEHOLDS", payload: [...state.households, data] });

      // Se o usuário não tiver um domicílio primário, definir este como primário
      if (!state.currentUser?.primaryHousehold) {
        dispatch({
          type: "SET_CURRENT_USER",
          payload: {
            ...state.currentUser,
            primaryHousehold: data.id,
          },
        });
      }

      // Forçar atualização da sessão
      await signOut({ redirect: false });
      await signIn("credentials", {
        email: session?.user?.email,
        password: "", // A senha não é necessária para reautenticação
        redirect: false,
      });

      toast.success("Você entrou no domicílio com sucesso!");
      router.push(`/households/${data.id}`);
    } catch (error) {
      console.error("Erro ao entrar no domicílio:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao entrar no domicílio");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader title="Entrar em um Domicílio" showBackButton />
        
        <div className="flex-1 p-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Entrar em um Domicílio</h1>
            <p className="text-muted-foreground">
              Use um código de convite para entrar em um domicílio existente
            </p>
          </div>
          
          <Card>
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
                  />
                </div>
                
                <Button
                  className="w-full"
                  onClick={handleJoinHousehold}
                  disabled={isLoading || !inviteCode.trim()}
                >
                  {isLoading ? "Entrando..." : "Entrar no Domicílio"}
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