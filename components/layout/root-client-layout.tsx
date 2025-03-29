"use client"

import React from "react"
import dynamic from 'next/dynamic'
import { NotificationProvider } from "@/lib/context/NotificationContext"
import { SessionProvider } from "@/components/auth/session-provider"
import { Toaster } from "sonner"
import NotificationChecker from "@/components/notifications/notification-checker"
import { GlobalStateProvider } from "@/lib/context/global-state"
import { AnimationProvider } from "@/components/animation-provider"
import { ClientLayout } from "@/components/layout/client-layout"
import { DataProvider } from "@/components/data-provider"

const OnboardingTour = dynamic(() => import("@/components/ui/onboarding-tour").then(mod => mod.OnboardingTour), {
  ssr: false,
  loading: () => null
})

export function RootClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <GlobalStateProvider>
      <SessionProvider>
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
          </AnimationProvider>
        </NotificationProvider>
      </SessionProvider>
    </GlobalStateProvider>
  )
} 