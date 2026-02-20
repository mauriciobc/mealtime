"use client"

import React from "react"
import { useOnborda } from "onborda"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from "lucide-react"

export const TourCard = ({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
}: any) => {
  const { closeOnborda } = useOnborda()

  const handleFinish = () => {
    const tourName = localStorage.getItem("mealtime-current-tour") || ""
    const storageKey = tourName ? `mealtime-tour-seen-${tourName}` : "mealtime-tour-seen"
    localStorage.setItem(storageKey, "true")
    localStorage.removeItem("mealtime-current-tour")
    closeOnborda()
  }

  const handleNext = () => {
    if (currentStep === totalSteps - 1) {
      handleFinish()
    } else {
      nextStep()
    }
  }

  return (
    <Card className="min-w-[260px] w-[calc(100vw-2rem)] max-w-sm border-2 shadow-xl z-50 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-2xl shrink-0">{step.icon}</span>
          <CardTitle className="text-base font-bold truncate">{step.title}</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 rounded-full"
          onClick={handleFinish}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="min-w-0">
        <p className="text-sm text-muted-foreground break-words">{step.content}</p>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground flex items-center shrink-0">
          {currentStep + 1} de {totalSteps}
        </div>
        <div className="flex gap-2 flex-wrap">
          {currentStep > 0 && (
            <Button onClick={prevStep} size="sm" variant="outline">
              Voltar
            </Button>
          )}
          <Button onClick={handleNext} size="sm">
            {currentStep === totalSteps - 1 ? "Concluir" : "Próximo"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
