import { pageMetadata } from "@/lib/metadata";
import SignupPageContent from "./SignupPageContent";

export const metadata = pageMetadata("Cadastro", "Crie sua conta MealTime.");

interface SignupPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirectTo ?? "/";
  return <SignupPageContent redirectTo={redirectTo} />;
}
