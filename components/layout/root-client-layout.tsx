"use client"

import React from "react"
import dynamic from 'next/dynamic'
import { NotificationProvider } from "@/lib/context/NotificationContext"
import { SessionProvider } from "@/components/auth/session-provider"
import { Toaster } from "sonner"
import NotificationChecker from "@/components/notifications/notification-checker"
import { UserProvider } from "@/lib/context/UserContext"
import { ScheduleProvider } from "@/lib/context/ScheduleContext"
import { AnimationProvider } from "@/components/animation-provider"
import { ClientLayout } from "@/components/layout/client-layout"
import { DataProvider } from "@/components/data-provider"
import { AppProvider } from "@/lib/context/AppContext"
import { LoadingProvider } from "@/lib/context/LoadingContext"
import { UserDataLoader } from "@/components/data/user-data-loader"

const OnboardingTour = dynamic(() => import("@/components/ui/onboarding-tour").then(mod => ({ default: mod.OnboardingTour })), {
  ssr: false,
  loading: () => null
})

export function RootClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LoadingProvider>
        <UserProvider>
          <AppProvider>
            <ScheduleProvider>
              <NotificationProvider>
                <AnimationProvider>
                  <DataProvider>
                    <ClientLayout>
                      {children}
                    </ClientLayout>
                    <Toaster position="top-center" />
                    <NotificationChecker />
                    <OnboardingTour />
                  </DataProvider>
                  <UserDataLoader />
                </AnimationProvider>
              </NotificationProvider>
            </ScheduleProvider>
          </AppProvider>
        </UserProvider>
      </LoadingProvider>
    </SessionProvider>
  )
} 