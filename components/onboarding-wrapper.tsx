"use client"

import React, { useEffect, useState, createContext, useContext } from "react"
import { usePathname } from "next/navigation"
import { Onborda, OnbordaProvider, useOnborda } from "onborda"
import { onboardingSteps } from "@/config/onboarding"
import { TourCard } from "@/components/tour-card"

const OnboardingTourContext = createContext<string | null>(null)

export function useOnboardingTour() {
  return useContext(OnboardingTourContext)
}

function getTourForPath(pathname: string): string | null {
  if (pathname === "/weight") {
    return "weight-page"
  }
  return "first-visit"
}

function OnbordaTrigger() {
  const pathname = usePathname()
  const { startOnborda, isOnbordaVisible } = useOnborda()
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!hasMounted) return

    const tourName = getTourForPath(pathname)
    if (!tourName) return

    const storageKey = `mealtime-tour-seen-${tourName}`
    const seen = localStorage.getItem(storageKey)
    const isAuthPage = pathname === "/login" || pathname === "/signup"

    if (seen !== "true" && !isAuthPage && !isOnbordaVisible) {
      localStorage.setItem("mealtime-current-tour", tourName)
      const timer = setTimeout(() => {
        startOnborda(tourName)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [pathname, startOnborda, isOnbordaVisible, hasMounted])

  return null
}

export function OnboardingWrapper({ children }: { children: React.ReactNode }) {
  return (
    <OnbordaProvider>
      <Onborda
        steps={onboardingSteps}
        cardComponent={TourCard}
        shadowOpacity="0.8"
      >
        <OnbordaTrigger />
        {children}
      </Onborda>
    </OnbordaProvider>
  )
}
