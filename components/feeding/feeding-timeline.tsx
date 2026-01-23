"use client"

import { Timeline, MemoizedTimelineItem } from "@/components/ui/timeline"

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
  return (
    <Timeline className="mt-8">
      {events.map((event) => (
        <MemoizedTimelineItem
          key={event.id}
          date={event.date}
          title={event.title}
          description={event.description}
          status={event.status}
        />
      ))}
    </Timeline>
  )
} 