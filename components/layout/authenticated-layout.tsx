"use client";

import React from "react";
import { AppHeader } from "@/components/app-header";
import BottomNav from "@/components/bottom-nav";
import { AnimationProvider } from "@/components/animation-provider";

export interface AuthenticatedLayoutHeaderProps {
  title?: string;
  showBackButton?: boolean;
}

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  headerTitle?: string;
  showBackButton?: boolean;
}

export function AuthenticatedLayout({
  children,
  headerTitle,
  showBackButton,
}: AuthenticatedLayoutProps) {
  return (
    <AnimationProvider>
      <div className="relative flex min-h-screen flex-col">
        <AppHeader title={headerTitle} showBackButton={showBackButton} />
        <main className="flex-1 pb-16">
          {children}
        </main>
        <BottomNav />
      </div>
    </AnimationProvider>
  );
}
