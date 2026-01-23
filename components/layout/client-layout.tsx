"use client"

import React, { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import BottomNav from "@/components/bottom-nav"
import { AnimationProvider } from "@/components/animation-provider"
import { useUserContext } from "@/lib/context/UserContext"
import { GlobalLoading } from "@/components/ui/global-loading"

interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isAuthPage = pathname === "/login" || pathname === "/signup"
  const isApiDocsPage = pathname === "/api-docs"

  const { state: { isLoading: profileLoading, currentUser }, authLoading } = useUserContext();

  // Handle redirection for authenticated users on auth pages
  useEffect(() => {
    if (!authLoading && !profileLoading && currentUser && isAuthPage) {
      const searchParams = new URLSearchParams(window.location.search);
      const redirectTo = searchParams.get("redirectTo") || "/";
      router.replace(redirectTo);
    }
  }, [authLoading, profileLoading, currentUser, isAuthPage, router, pathname]);

  if (authLoading || profileLoading) {
    return <GlobalLoading mode="overlay" />;
  }

  const getHeaderProps = (): AppHeaderProps => {
    if (pathname === "/notifications") {
      return {
        title: "Notificações",
        showBackButton: true
      }
    }
    return {}
  }

  const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => {
    return (
      <AnimationProvider>
        <div className="relative flex min-h-screen flex-col">
          <AppHeader {...getHeaderProps()} />
          <main className="flex-1 pb-16">
            {children}
          </main>
          <BottomNav />
        </div>
      </AnimationProvider>
    );
  };

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