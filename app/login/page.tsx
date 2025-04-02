"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/ui/page-transition";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

console.log("[Login] Página de login sendo carregada");

function useAuth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const redirectingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(false);

  useEffect(() => {
    console.log("[Auth] Hook useAuth inicializado");
    console.log("[Auth] Status da sessão:", status);
    console.log("[Auth] Session data:", session);
    
    // Check for error in URL
    const errorParam = searchParams.get("error");
    if (errorParam) {
      console.log("[Auth] Error from URL:", errorParam);
      if (errorParam === "CredentialsSignin") {
          setError("Email ou senha inválidos.");
      } else if (errorParam === "OAuthSignin") {
          setError("Erro ao iniciar autenticação com Google.");
      } else if (errorParam === "OAuthCallback") {
          setError("Erro ao processar resposta do Google.");
      } else {
          setError("Erro durante a autenticação.");
      }
      return;
    }
    
    if (status === "authenticated" && session?.user && !redirectingRef.current) {
      console.log("[Auth] Usuário autenticado, redirecionando...");
      redirectingRef.current = true;
      const callbackUrl = searchParams.get("callbackUrl");
      const targetUrl = callbackUrl || "/";
      console.log("[Auth] Redirecionando para:", targetUrl);
      router.replace(targetUrl);
    }
  }, [status, session, router, searchParams]);

  const loginWithGoogle = async () => {
    try {
      setIsLoadingGoogle(true);
      setError(null);
      console.log("[Auth] Iniciando login com Google");
      
      const callbackUrl = searchParams.get("callbackUrl") || "/";
      console.log("[Auth] Callback URL:", callbackUrl);
      
      await signIn("google", { 
        callbackUrl,
        redirect: true 
      }).catch(error => {
        console.error("[Auth] Error during Google sign-in:", error);
        throw error;
      });
    } catch (error) {
      console.error("[Auth] Erro no login com Google:", error);
      setError("Erro ao iniciar login com Google.");
    } finally {
      setIsLoadingGoogle(false);
    }
  };
  
  const loginWithCredentials = async (email: string, password: string) => {
    try {
      setIsLoadingCredentials(true);
      setError(null);
      console.log("[Auth] Iniciando login com credenciais", { email });

      const callbackUrl = searchParams.get("callbackUrl") || "/";
      console.log("[Auth] Callback URL for credentials:", callbackUrl);

      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });

      console.log("[Auth] Credentials signin result:", result);

      if (result?.ok && !result?.error) {
        console.log("[Auth] Login com credenciais bem-sucedido, aguardando atualização da sessão...");
      } else {
        console.log("[Auth] Falha no login com credenciais:", result?.error);
        setError(result?.error === "CredentialsSignin" ? "Email ou senha inválidos." : "Ocorreu um erro no login.");
      }
    } catch (error) {
      console.error("[Auth] Erro inesperado no login com credenciais:", error);
      setError("Ocorreu um erro inesperado durante o login.");
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  return { status, error, loginWithGoogle, isLoadingGoogle, loginWithCredentials, isLoadingCredentials, setError };
}

export default function LoginPage() {
  console.log("[Login] Componente LoginPage renderizando");
  const { status, error, loginWithGoogle, isLoadingGoogle, loginWithCredentials, isLoadingCredentials, setError } = useAuth();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries());
    console.log("[Login] URL parameters:", params);
  }, [searchParams]);

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        setError("Por favor, preencha o email e a senha.");
        return;
    }
    console.log("[Login] Tentando login com credenciais:", email);
    loginWithCredentials(email, password);
  };

  const isLoading = status === "loading" || isLoadingGoogle || isLoadingCredentials;

  return (
    <PageTransition>
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">MealTime</CardTitle>
            <CardDescription className="text-center">
              Entre com seu email e senha ou use o Google
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoadingCredentials ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...</>
                ) : (
                  "Entrar com Email"
                )}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou continue com
                </span>
              </div>
            </div>

            <Button
              onClick={() => {
                console.log("[Login] Botão de login Google clicado");
                loginWithGoogle();
              }}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              {isLoadingGoogle ? (
                 <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...</>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                    <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                  </svg>
                  Entrar com Google
                </>
              )}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-2 text-center text-sm text-muted-foreground">
             <div>
                Não tem uma conta?{' '}
                <Link href="/signup" className="underline hover:text-primary">
                  Registre-se
                </Link>
              </div>
              <div> 
                Ao entrar, você concorda com nossos{" "}
                <Link href="/terms" className="underline hover:text-primary">
                  Termos de Serviço
                </Link>{" "}
                e{" "}
                <Link href="/privacy" className="underline hover:text-primary">
                  Política de Privacidade
                </Link>
              </div>
          </CardFooter>
        </Card>
      </div>
    </PageTransition>
  );
} 