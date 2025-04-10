"use client"

import React from "react"
import dynamic from 'next/dynamic'
import { usePathname } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import BottomNav from "@/components/bottom-nav"
import { NotificationProvider } from "@/lib/context/NotificationContext"
import { Toaster } from "sonner"
import NotificationChecker from "@/components/notifications/notification-checker"
import { UserProvider } from "@/lib/context/UserContext"
import { ScheduleProvider } from "@/lib/context/ScheduleContext"
import { AnimationProvider } from "@/components/animation-provider"
import { HouseholdProvider } from "@/lib/context/HouseholdContext"
import { CatsProvider } from "@/lib/context/CatsContext"
import { FeedingProvider } from "@/lib/context/FeedingContext"

interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
}

const OnboardingTour = dynamic(() => import("@/components/ui/onboarding-tour").then(mod => ({ default: mod.OnboardingTour })), {
  ssr: false,
  loading: () => null
})

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname === "/login" || pathname === "/signup"

  const getHeaderProps = (): AppHeaderProps => {
    if (pathname === "/notifications") {
      return {
        title: "Notificações",
        showBackButton: true
      }
    }
    return {}
  }

  const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => (
    <UserProvider>
      <HouseholdProvider>
        <CatsProvider>
          <ScheduleProvider>
            <FeedingProvider>
              <NotificationProvider>
                <AnimationProvider>
                  <div className="relative flex min-h-screen flex-col">
                    <AppHeader {...getHeaderProps()} />
                    <main className="flex-1 pb-16">
                      {children}
                    </main>
                    <BottomNav />
                    <Toaster position="top-center" />
                    <NotificationChecker />
                    <OnboardingTour />
                  </div>
                </AnimationProvider>
              </NotificationProvider>
            </FeedingProvider>
          </ScheduleProvider>
        </CatsProvider>
      </HouseholdProvider>
    </UserProvider>
  );

  if (isAuthPage) {
    return (
       <div className="relative flex min-h-screen flex-col">
         <main className="flex-1">
           {children}
         </main>
       </div>
     );
  } else {
    return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
  }
} 