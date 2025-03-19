import type React from "react"
import "@/app/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AnimationProvider } from "@/components/animation-provider"
import { AppProvider } from "@/lib/context/AppContext"
import { NotificationProvider } from "@/lib/context/NotificationContext"
import { SessionProvider } from "@/components/auth/session-provider"
import { Toaster } from "sonner"
import NotificationChecker from "@/components/notifications/notification-checker"
import { GlobalStateProvider } from "@/lib/context/global-state"
import { cn } from "@/lib/utils"
import { fontSans } from "@/lib/fonts"
import { OnboardingTour } from "@/components/ui/onboarding-tour"
import { AppHeader } from "@/components/ui/app-header"
import { BottomNav } from "@/components/ui/bottom-nav"

export const metadata = {
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
          <GlobalStateProvider>
            <SessionProvider>
              <AppProvider>
                <NotificationProvider>
                  <AnimationProvider>
                    <div className="relative flex min-h-screen flex-col">
                      <AppHeader />
                      <div className="flex-1">{children}</div>
                      <BottomNav />
                    </div>
                  </AnimationProvider>
                  <Toaster position="top-center" />
                  <NotificationChecker />
                  <OnboardingTour />
                </NotificationProvider>
              </AppProvider>
            </SessionProvider>
          </GlobalStateProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}