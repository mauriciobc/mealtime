"use client"

import React from "react"
// Removed imports start
// import dynamic from 'next/dynamic'
// import { NotificationProvider } from "@/lib/context/NotificationContext"
import { SessionProvider } from "@/components/auth/session-provider"
// import { Toaster } from "sonner"
// import NotificationChecker from "@/components/notifications/notification-checker"
// import { UserProvider } from "@/lib/context/UserContext"
// import { ScheduleProvider } from "@/lib/context/ScheduleContext"
// import { AnimationProvider } from "@/components/animation-provider"
import { ClientLayout } from "@/components/layout/client-layout"
import { LoadingProvider } from "@/lib/context/LoadingContext"
import { GlobalLoading } from "@/components/ui/global-loading"
// import { HouseholdProvider } from "@/lib/context/HouseholdContext"
// import { CatsProvider } from "@/lib/context/CatsContext"
// import { FeedingProvider } from "@/lib/context/FeedingContext"
import { AppProvider } from "@/lib/context/AppContext"
// Removed imports end

// Removed dynamic import
// const OnboardingTour = dynamic(() => import("@/components/ui/onboarding-tour").then(mod => ({ default: mod.OnboardingTour })), {
//   ssr: false,
//   loading: () => null
// })

export function RootClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider> { /* SessionProvider remains global */ }
      <AppProvider> { /* AppProvider remains global */ }
        <LoadingProvider> { /* LoadingProvider remains global */ }
          <GlobalLoading /> { /* GlobalLoading remains */ }
          { /* ClientLayout now handles conditional loading of other providers/components */ }
          <ClientLayout>
            {children}
          </ClientLayout>
          { /* Moved Toaster, NotificationChecker, OnboardingTour to ClientLayout */ }
        </LoadingProvider>
      </AppProvider>
    </SessionProvider>
  )
} 