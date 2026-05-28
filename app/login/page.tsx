import { pageMetadata } from "@/lib/metadata";
import LoginPageContent from "./LoginPageContent";

export const metadata = pageMetadata("Entrar", "Faça login na sua conta MealTime.");

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string; callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirectTo ?? params.callbackUrl ?? "/";
  return <LoginPageContent redirectTo={redirectTo} />;
}
