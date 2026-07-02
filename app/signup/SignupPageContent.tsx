"use client";

import { useReducer } from "react";
import { createClient } from '@/utils/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { toast } from "sonner";

import { Icons } from "@/components/icons";
import { getSiteOrigin } from '@/utils/getSiteOrigin';
import { GlobalLoading } from "@/components/ui/global-loading";

interface SignupPageContentProps {
  redirectTo: string;
}

type SignupState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  isLoadingCredentials: boolean;
  isLoadingGoogle: boolean;
  showPassword: boolean;
  showConfirmPassword: boolean;
};

type SignupAction =
  | { type: 'SET_FIELD'; field: 'name' | 'email' | 'password' | 'confirmPassword'; value: string }
  | { type: 'SET_LOADING_CREDENTIALS'; value: boolean }
  | { type: 'SET_LOADING_GOOGLE'; value: boolean }
  | { type: 'TOGGLE_SHOW_PASSWORD' }
  | { type: 'TOGGLE_SHOW_CONFIRM_PASSWORD' };

const initialSignupState: SignupState = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  isLoadingCredentials: false,
  isLoadingGoogle: false,
  showPassword: false,
  showConfirmPassword: false,
};

function signupReducer(state: SignupState, action: SignupAction): SignupState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_LOADING_CREDENTIALS':
      return { ...state, isLoadingCredentials: action.value };
    case 'SET_LOADING_GOOGLE':
      return { ...state, isLoadingGoogle: action.value };
    case 'TOGGLE_SHOW_PASSWORD':
      return { ...state, showPassword: !state.showPassword };
    case 'TOGGLE_SHOW_CONFIRM_PASSWORD':
      return { ...state, showConfirmPassword: !state.showConfirmPassword };
    default:
      return state;
  }
}

export default function SignupPageContent({ redirectTo }: SignupPageContentProps) {
  const supabase = createClient();
  const [state, dispatch] = useReducer(signupReducer, initialSignupState);
  const {
    name,
    email,
    password,
    confirmPassword,
    isLoadingCredentials,
    isLoadingGoogle,
    showPassword,
    showConfirmPassword,
  } = state;

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    dispatch({ type: 'SET_LOADING_CREDENTIALS', value: true });

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getSiteOrigin()}/api/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
        data: {
          full_name: name,
        }
      },
    });

    dispatch({ type: 'SET_LOADING_CREDENTIALS', value: false });

    if (signUpError) {
      toast.error(signUpError.message || "Erro ao criar conta.");
    } else {
      toast.success("Conta criada com sucesso! Por favor, verifique seu email para confirmar sua conta.");
    }
  };

  const handleGoogleSignup = async () => {
    dispatch({ type: 'SET_LOADING_GOOGLE', value: true });

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${getSiteOrigin()}/api/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
      },
    });

    dispatch({ type: 'SET_LOADING_GOOGLE', value: false });

    if (oauthError) {
      toast.error(oauthError.message || "Erro ao iniciar signup com Google.");
    }
  };

  const isProcessing = isLoadingCredentials || isLoadingGoogle;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">MealTime</CardTitle>
            <CardDescription className="text-center">
              Crie sua conta para começar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'name', value: e.target.value })}
                  required
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'email', value: e.target.value })}
                  required
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'password', value: e.target.value })}
                    required
                    disabled={isProcessing}
                    className="pr-10 w-full"
                  />
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'TOGGLE_SHOW_PASSWORD' })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground focus:outline-none z-10"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    disabled={isProcessing}
                  >
                    {showPassword ? (
                      <EyeOff className="h-full w-full" />
                    ) : (
                      <Eye className="h-full w-full" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirme sua senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirme sua senha"
                    value={confirmPassword}
                    onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'confirmPassword', value: e.target.value })}
                    required
                    disabled={isProcessing}
                    className="pr-10 w-full"
                  />
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'TOGGLE_SHOW_CONFIRM_PASSWORD' })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground focus:outline-none z-10"
                    aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    disabled={isProcessing}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-full w-full" />
                    ) : (
                      <Eye className="h-full w-full" />
                    )}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isLoadingCredentials ? (
                  <>
                    <GlobalLoading mode="spinner" size="sm" />
                    Carregando...
                  </>
                ) : (
                  "Criar conta com Email"
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
              onClick={handleGoogleSignup}
              disabled={isProcessing}
              className="w-full"
              variant="outline"
            >
              {isLoadingGoogle ? (
                <>
                  <GlobalLoading mode="spinner" size="sm" />
                  Carregando...
                </>
              ) : (
                <>
                  <Icons.google className="h-5 w-5 shrink-0" />
                  Criar conta com Google
                </>
              )}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-2 text-center text-sm text-muted-foreground">
            <div>
              Já tem uma conta?{' '}
              <Link href="/login" className="underline hover:text-primary">
                Entre aqui
              </Link>
            </div>
            <div>
              Ao criar uma conta, você concorda com nossos{" "}
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
  );
}
