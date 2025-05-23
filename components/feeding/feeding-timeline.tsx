"use client"

import { Timeline, TimelineItem } from "@/components/ui/timeline"
import { CheckCircle, AlertCircle, Ban, AlertTriangle, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface FeedingEvent {
  id: string
  date: Date
  title: string
  description: string
  status: "Normal" | "Comeu Pouco" | "Recusou" | "Vomitou" | "Outro"
}

interface FeedingTimelineProps {
  events: FeedingEvent[]
}

export function FeedingTimeline({ events }: FeedingTimelineProps) {
  const getStatusIcon = (status: FeedingEvent["status"]) => {
    switch (status) {
      case "Normal":
        return <CheckCircle className="h-5 w-5 text-success" />
      case "Comeu Pouco":
        return <AlertCircle className="h-5 w-5 text-warning" />
      case "Recusou":
        return <Ban className="h-5 w-5 text-destructive" />
      case "Vomitou":
        return <AlertTriangle className="h-5 w-5 text-destructive" />
      case "Outro":
        return <HelpCircle className="h-5 w-5 text-primary" />
      default:
        return null
    }
  }

  return (
    <Timeline className="mt-8">
      {events.map((event) => (
        <TimelineItem
          key={event.id}
          date={event.date}
          title={event.title}
          description={event.description}
          icon={getStatusIcon(event.status)}
          status={event.status}
        />
      ))}
    </Timeline>
  )
} 