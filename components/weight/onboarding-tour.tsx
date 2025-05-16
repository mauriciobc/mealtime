"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card"; // For styling individual tour steps

interface OnboardingTourProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onComplete?: () => void; // Callback for when the tour is finished
}

const tourSteps = [
  {
    title: "Welcome to Weight Tracking!",
    description: "Let\'s quickly walk through the key features to help you get started with monitoring your cat\'s weight.",
    // image?: string, // Optional image for the step
  },
  {
    title: "The Dashboard Overview",
    description: "At the top, select your cat. You\'ll then see their current status, weight goals, and a trend chart.",
  },
  {
    title: "Logging New Weights",
    description: "Use the '+' button at the bottom right to quickly log a new weight measurement for the selected cat.",
  },
  {
    title: "Tracking Progress",
    description: "The chart visualizes weight trends over time. Milestones help you track progress towards specific targets.",
  },
  {
    title: "Viewing History",
    description: "The recent history list shows all logged weights, allowing you to review past entries.",
  },
  {
    title: "Ready to Go!",
    description: "You\'re all set to start tracking. If you need a refresher, you can always revisit this tour.",
  },
];

export function OnboardingTour({ isOpen, onOpenChange, onComplete }: OnboardingTourProps) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) {
      return;
    }
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  const handleFinishTour = () => {
    if (onComplete) {
      onComplete();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0">
        <Carousel setApi={setApi} className="w-full">
          <CarouselContent>
            {tourSteps.map((step, index) => (
              <CarouselItem key={index}>
                <div className="p-1">
                  <Card className="border-0 shadow-none">
                    <CardContent className="flex flex-col items-center justify-center p-6 aspect-[3/2] sm:aspect-[4/3]">
                      <DialogHeader className="text-center mb-4">
                        <DialogTitle className="text-2xl font-semibold">{step.title}</DialogTitle>
                      </DialogHeader>
                      <DialogDescription className="text-center text-muted-foreground text-base leading-relaxed">
                        {step.description}
                      </DialogDescription>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {count > 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full px-6 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    {api && current > 1 && <CarouselPrevious className="static translate-y-0" />}                 
                </div>
                <div className="text-center text-sm text-muted-foreground">
                    Step {current} of {count}
                </div>
                <div className="flex items-center space-x-2">
                    {api && current < count && <CarouselNext className="static translate-y-0" />}
                    {api && current === count && (
                        <Button onClick={handleFinishTour} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            Finish Tour
                        </Button>
                    )}
                </div>
            </div>
          )}
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}

export default OnboardingTour; 