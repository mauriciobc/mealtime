"use client"

import { Timeline, TimelineItem } from "@/components/ui/timeline"
import { CheckCircle, Clock, AlertCircle } from "lucide-react"

interface FeedingEvent {
  id: string
  date: Date
  title: string
  description: string
  status: "completed" | "in-progress" | "pending"
}

interface FeedingTimelineProps {
  events: FeedingEvent[]
}

export function FeedingTimeline({ events }: FeedingTimelineProps) {
  const getStatusIcon = (status: FeedingEvent["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "in-progress":
        return <Clock className="h-5 w-5 text-blue-500" />
      case "pending":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
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