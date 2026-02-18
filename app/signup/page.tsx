import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import SignupPageContent from "./SignupPageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

export const metadata = pageMetadata("Cadastro", "Crie sua conta MealTime.");

export default function SignupPage() {
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <SignupPageContent />
    </Suspense>
  );
}
