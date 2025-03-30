"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageTransition } from "@/components/ui/page-transition";

console.log("[Login] Página de login sendo carregada");

function useAuth() {
  const router = useRouter();
  const { status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const redirectingRef = useRef(false);

  useEffect(() => {
    console.log("[Auth] Hook useAuth inicializado");
    console.log("[Auth] Status da sessão:", status);
    
    if (status === "authenticated" && !redirectingRef.current) {
      console.log("[Auth] Usuário autenticado, redirecionando...");
      redirectingRef.current = true;
      router.replace("/");
    }
  }, [status, router]);

  const login = async (email: string, password: string) => {
    console.log("[Auth] Função login chamada");
    
    if (!email || !password) {
      console.log("[Auth] Email ou senha não fornecidos");
      setError("Por favor, preencha todos os campos");
      return false;
    }

    if (loading) {
      console.log("[Auth] Login já em andamento, ignorando chamada");
      return false;
    }

    try {
      console.log("[Auth] Iniciando processo de login");
      setLoading(true);
      setError("");
      
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      
      console.log("[Auth] Resultado do login:", result);
      
      if (!result?.ok) {
        console.log("[Auth] Login falhou:", result?.error);
        setError(result?.error || "Email ou senha inválidos");
        return false;
      }

      console.log("[Auth] Login bem-sucedido");
      return true;
    } catch (error) {
      console.error("[Auth] Erro no login:", error);
      setError("Ocorreu um erro durante o login");
      return false;
    } finally {
      console.log("[Auth] Finalizando processo de login");
      setLoading(false);
    }
  };

  return { loading, error, login };
}

export default function LoginPage() {
  console.log("[Login] Componente LoginPage renderizando");
  
  const { loading, error, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[Login] Formulário submetido");
    
    if (formRef.current?.checkValidity()) {
      const success = await login(email, password);
      console.log("[Login] Resultado do login:", success);
    }
  }, [email, password, login]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  return (
    <PageTransition>
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">MealTime</CardTitle>
            <CardDescription className="text-center">
              Entre na sua conta para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <a href="#" className="text-sm text-primary">
                    Esqueceu a senha?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm">
              Não tem uma conta?{" "}
              <a
                href="/signup"
                className="underline text-primary"
              >
                Criar conta
              </a>
            </div>
          </CardFooter>
        </Card>
      </div>
    </PageTransition>
  );
} 