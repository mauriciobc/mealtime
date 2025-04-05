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
import { LoadingProvider } from "@/lib/context/LoadingContext"
import { GlobalLoading } from "@/components/ui/global-loading"
import { HouseholdProvider } from "@/lib/context/HouseholdContext"
import { CatsProvider } from "@/lib/context/CatsContext"
import { FeedingProvider } from "@/lib/context/FeedingContext"
import { AppProvider } from "@/lib/context/AppContext"

const OnboardingTour = dynamic(() => import("@/components/ui/onboarding-tour").then(mod => ({ default: mod.OnboardingTour })), {
  ssr: false,
  loading: () => null
})

export function RootClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppProvider>
        <LoadingProvider>
          <GlobalLoading />
          <UserProvider>
            <HouseholdProvider>
              <CatsProvider>
                <ScheduleProvider>
                  <FeedingProvider>
                    <NotificationProvider>
                      <AnimationProvider>
                        <ClientLayout>
                          {children}
                        </ClientLayout>
                        <Toaster position="top-center" />
                        <NotificationChecker />
                        <OnboardingTour />
                      </AnimationProvider>
                    </NotificationProvider>
                  </FeedingProvider>
                </ScheduleProvider>
              </CatsProvider>
            </HouseholdProvider>
          </UserProvider>
        </LoadingProvider>
      </AppProvider>
    </SessionProvider>
  )
} 