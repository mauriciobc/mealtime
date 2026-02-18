import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import LoginPageContent from "./LoginPageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

export const metadata = pageMetadata("Entrar", "Faça login na sua conta MealTime.");

export default function LoginPage() {
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <LoginPageContent />
    </Suspense>
  );
}
