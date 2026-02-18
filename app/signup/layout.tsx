import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Cadastro", "Crie sua conta MealTime.");

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      {children}
    </div>
  )
} 