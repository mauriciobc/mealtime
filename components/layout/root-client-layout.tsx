"use client"

import React from "react"
import { ClientLayout } from "@/components/layout/client-layout"
import { GlobalLoading } from "@/components/ui/global-loading"
import { Toaster } from "@/components/ui/sonner"
import { useReportWebVitals } from "next/web-vitals"
import { CoreProviders, DataProviders, UIProviders } from "./provider-groups"

export function RootClientLayout({ children }: { children: React.ReactNode }) {
  useReportWebVitals((metric) => {
    // console.log(metric); // Log web vitals if needed
  });

  return (
    <CoreProviders>
      <DataProviders>
        <UIProviders>
          <ClientLayout>
            {children}
          </ClientLayout>
          <Toaster richColors position="top-center" />
          <GlobalLoading />
        </UIProviders>
      </DataProviders>
    </CoreProviders>
  )
} 