"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import BottomNav from "@/components/bottom-nav"

interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname === "/login" || pathname === "/signup"

  // Configurações do header baseadas no pathname
  const getHeaderProps = (): AppHeaderProps => {
    if (pathname === "/notifications") {
      return {
        title: "Notificações",
        showBackButton: true
      }
    }
    return {}
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      {!isAuthPage && <AppHeader {...getHeaderProps()} />}
      <main className="flex-1 pb-7">
        {children}
      </main>
      {!isAuthPage && <BottomNav />}
    </div>
  )
} 