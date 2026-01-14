"use client";

import React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactQueryProvider } from "@/lib/providers/react-query-provider";
import { ErrorProvider, ErrorBoundary } from "@/lib/context/ErrorContext";
import { UserProvider } from "@/lib/context/UserContext";
import { HouseholdProvider } from "@/lib/context/HouseholdContext";
import { CatsProvider } from "@/lib/context/CatsContext";
import { WeightProvider } from "@/lib/context/WeightContext";
import { FeedingProvider } from "@/lib/context/FeedingContext";
import { ScheduleProvider } from "@/lib/context/ScheduleContext";
import { LoadingProvider } from "@/lib/context/LoadingContext";
import { NotificationProvider } from "@/lib/context/NotificationContext";
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

export const DataProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <LoadingProvider>
      <UserProvider>
        <HouseholdProvider>
          <CatsProvider>
            <WeightProvider>
              <FeedingProvider>
                <ScheduleProvider>
                  {children}
                </ScheduleProvider>
              </FeedingProvider>
            </WeightProvider>
          </CatsProvider>
        </HouseholdProvider>
      </UserProvider>
    </LoadingProvider>
  );
};

export const UIProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <NotificationProvider>
      <OnboardingWrapper>
        {children}
      </OnboardingWrapper>
    </NotificationProvider>
  );
};
