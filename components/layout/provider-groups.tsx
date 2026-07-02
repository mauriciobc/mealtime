"use client";

import React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactQueryProvider } from "@/lib/providers/react-query-provider";
import { ErrorProvider, ErrorBoundary } from "@/lib/context/ErrorContext";
import { UserProvider } from "@/lib/context/UserContext";
import { LoadingProvider } from "@/lib/context/LoadingContext";
import { NotificationProvider } from "@/lib/context/NotificationContext";
import { HapticsProvider } from "@/lib/context/HapticsContext";
import { OnboardingWrapper } from "@/components/onboarding-wrapper";

export const CoreProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ReactQueryProvider>
        <ErrorProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </ErrorProvider>
      </ReactQueryProvider>
    </ThemeProvider>
  );
};

/** Auth + global loading only — domain data via React Query hooks in lib/hooks/domain */
export const DataProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <LoadingProvider>
      <UserProvider>
        {children}
      </UserProvider>
    </LoadingProvider>
  );
};

export const UIProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <NotificationProvider>
      <HapticsProvider>
        <OnboardingWrapper>
          {children}
        </OnboardingWrapper>
      </HapticsProvider>
    </NotificationProvider>
  );
};
