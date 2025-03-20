import type { Metadata } from 'next'
import "@/app/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { fontSans } from "@/lib/fonts"
import { RootClientLayout } from "@/components/layout/root-client-layout"

export const metadata: Metadata = {
  title: "MealTime - Gerenciamento de Alimentação para Gatos",
  description: "Gerencie a alimentação dos seus gatos de forma colaborativa",
  generator: 'MealTime App'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <RootClientLayout>
            {children}
          </RootClientLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}