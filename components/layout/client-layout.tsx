"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useUserContext } from "@/lib/context/UserContext";
import { GlobalLoading } from "@/components/ui/global-loading";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isApiDocsPage = pathname === "/api-docs";
  const isUserDocsPage = pathname.startsWith("/docs");

  const { state: { isLoading: profileLoading, currentUser: _currentUser }, authLoading } = useUserContext();

  if (authLoading || profileLoading) {
    return <GlobalLoading mode="overlay" />;
  }

  const headerProps =
    pathname === "/notifications"
      ? { headerTitle: "Notificações" as const, showBackButton: true as const }
      : {};

  // Página de documentação da API - layout limpo sem navegação
  if (isApiDocsPage) {
    return (
      <div className="relative flex min-h-screen flex-col">
        <main className="flex-1">
          {children}
        </main>
      </div>
    );
  }

  // Páginas de documentação do usuário - layout limpo sem navegação
  if (isUserDocsPage) {
    return (
      <div className="relative flex min-h-screen flex-col">
        <main className="flex-1">
          {children}
        </main>
      </div>
    );
  }

  if (isAuthPage) {
    return (
      <div className="relative flex min-h-screen flex-col">
        <main className="flex-1">
          {children}
        </main>
      </div>
    );
  }

  return (
    <AuthenticatedLayout {...headerProps}>
      {children}
    </AuthenticatedLayout>
  );
} 