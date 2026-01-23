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
    <Card className="w-[85vw] max-w-sm border-2 shadow-xl z-50">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{step.icon}</span>
          <CardTitle className="text-base font-bold">{step.title}</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full"
          onClick={handleFinish}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{step.content}</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground flex items-center">
          {currentStep + 1} de {totalSteps}
        </div>
        <div className="flex gap-2">
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
