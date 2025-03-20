"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { AppHeader } from "@/components/ui/app-header"
import { BottomNav } from "@/components/ui/bottom-nav"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname === "/login" || pathname === "/signup"

  return (
    <div className="relative flex min-h-screen flex-col">
      {!isAuthPage && <AppHeader />}
      <div className="flex-1">
        {children}
      </div>
      {!isAuthPage && <BottomNav />}
    </div>
  )
} 