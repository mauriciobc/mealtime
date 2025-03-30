"use client"

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface TimePickerProps {
  time?: string
  setTime: (time?: string) => void
  disabled?: boolean
}

export function TimePicker({ time, setTime, disabled }: TimePickerProps) {
  const [inputValue, setInputValue] = React.useState(time || "")

  React.useEffect(() => {
    setInputValue(time || "")
  }, [time])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    if (value.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
      setTime(value)
    }
  }

  return (
    <div className="relative flex-1">
      <Input
        type="time"
        value={inputValue}
        onChange={handleInputChange}
        disabled={disabled}
        className={cn(
          "w-full",
          !time && "text-muted-foreground"
        )}
      />
      <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
    </div>
  )
} 