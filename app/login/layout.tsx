import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Entrar", "Faça login na sua conta MealTime.");

export default function LoginLayout({
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