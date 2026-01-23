"use client"

import * as React from "react"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface EnhancedCalendarProps {
  mode?: "single"
  selected?: Date | null
  onSelect?: (date: Date | null) => void
  disabled?: (date: Date) => boolean
  initialFocus?: boolean
  fromYear?: number
  toYear?: number
  className?: string
  showClearButton?: boolean
}

function EnhancedCalendar({
  mode = "single",
  selected,
  onSelect,
  disabled,
  showClearButton = false,
  initialFocus,
  fromYear = 1900,
  toYear = 2100,
  className,
  ...props
}: EnhancedCalendarProps) {
  const [month, setMonth] = React.useState<Date>(selected || new Date())

  // Generate year options
  const years = React.useMemo(() => {
    const yearArray = []
    for (let year = fromYear; year <= toYear; year++) {
      yearArray.push(year)
    }
    return yearArray
  }, [fromYear, toYear])

  // Generate month options
  const months = React.useMemo(() =>
    Array.from({ length: 12 }, (_, i) =>
      new Date(0, i).toLocaleString('pt-BR', { month: 'long' })
    ),
    []
  )

  React.useEffect(() => {
    if (selected) setMonth(selected);
  }, [selected]);

  const handleYearChange = (year: string) => {
    const yearNum = Number.parseInt(year)
    if (yearNum < fromYear || yearNum > toYear) return
    
    const newDate = new Date(month)
    newDate.setFullYear(yearNum)
    setMonth(newDate)
  }

  const handleMonthChange = (monthIndex: string) => {
    const idx = Number.parseInt(monthIndex);
    if (isNaN(idx) || idx < 0 || idx > 11) return;
    const newDate = new Date(month);
    newDate.setMonth(idx);
    if (newDate.getFullYear() < fromYear || newDate.getFullYear() > toYear) return;
    setMonth(newDate);
  }

  const handlePreviousMonth = () => {
    const newDate = new Date(month)
    newDate.setMonth(newDate.getMonth() - 1)
    if (
      (newDate.getFullYear() > fromYear) ||
      (newDate.getFullYear() === fromYear && newDate.getMonth() >= 0)
    ) {
      setMonth(newDate)
    }
  }

  const handleNextMonth = () => {
    const newDate = new Date(month)
    newDate.setMonth(newDate.getMonth() + 1)
    if (
      (newDate.getFullYear() < toYear) ||
      (newDate.getFullYear() === toYear && newDate.getMonth() <= 11)
    ) {
      setMonth(newDate)
    }
  }

  const currentYear = month.getFullYear()
  const currentMonth = month.getMonth()

  const isPrevDisabled = month.getFullYear() <= fromYear && month.getMonth() === 0;
  const isNextDisabled = month.getFullYear() >= toYear && month.getMonth() === 11;

  return (
    <div className={cn("p-3", className)}>
      {/* Custom Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePreviousMonth}
          className="h-7 w-7"
          aria-label="Mês anterior"
          disabled={isPrevDisabled}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2">
          <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[110px] h-8" aria-label="Selecionar mês">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {month.charAt(0).toUpperCase() + month.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={currentYear.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[80px] h-8" aria-label="Selecionar ano">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-7 w-7" aria-label="Próximo mês" disabled={isNextDisabled}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <DayPicker
        mode={mode}
        selected={selected ?? undefined}
        onSelect={(date) => onSelect?.(date ?? null)}
        month={month}
        onMonthChange={setMonth}
        disabled={disabled}
        initialFocus={initialFocus}
        showOutsideDays={true}
        disableNavigation={true}
        className="w-full"
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "hidden", // Hide default caption since we have custom header
          caption_label: "text-sm font-medium",
          nav: "hidden", // Hide default navigation
          nav_button: "hidden",
          nav_button_previous: "hidden",
          nav_button_next: "hidden",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn("h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
        }}
        
        {...props}
      />
      {/* Footer with Today and Clear buttons */}
      <div className="flex items-center justify-end gap-2 p-2 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelect?.(new Date())}
            aria-label="Selecionar data de hoje"
          >
            Hoje
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelect?.(null)}
            aria-label="Limpar data selecionada"
          >
            Limpar
          </Button>
        </div>
    </div>
  )
}

// Novo componente DateTimePicker para uso reutilizável
export interface DateTimePickerProps {
  value?: Date;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
  fromYear?: number;
  toYear?: number;
  disabled?: (date: Date) => boolean;
  container?: HTMLElement | null;
  align?: "start" | "center" | "end";
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  placeholder = "Selecione uma data",
  className = "",
  fromYear = 1900,
  toYear = 2100,
  disabled = () => false,
  container,
  align = "start",
}) => {
  const [month, setMonth] = React.useState<Date>(value || new Date())
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  // Generate year options
  const years = React.useMemo(() => {
    const yearArray = []
    for (let year = fromYear; year <= toYear; year++) {
      yearArray.push(year)
    }
    return yearArray
  }, [fromYear, toYear])

  // Generate month options
  const months = React.useMemo(() =>
    Array.from({ length: 12 }, (_, i) =>
      new Date(0, i).toLocaleString('pt-BR', { month: 'long' })
    ),
    []
  )

  React.useEffect(() => {
    if (value) setMonth(value);
  }, [value]);

  const handleYearChange = (year: string) => {
    const yearNum = Number.parseInt(year)
    if (yearNum < fromYear || yearNum > toYear) return
    
    const newDate = new Date(month)
    newDate.setFullYear(yearNum)
    setMonth(newDate)
  }

  const handleMonthChange = (monthIndex: string) => {
    const idx = Number.parseInt(monthIndex);
    if (isNaN(idx) || idx < 0 || idx > 11) return;
    const newDate = new Date(month);
    newDate.setMonth(idx);
    if (newDate.getFullYear() < fromYear || newDate.getFullYear() > toYear) return;
    setMonth(newDate);
  }

  const handlePreviousMonth = () => {
    const newDate = new Date(month)
    newDate.setMonth(newDate.getMonth() - 1)
    if (
      (newDate.getFullYear() > fromYear) ||
      (newDate.getFullYear() === fromYear && newDate.getMonth() >= 0)
    ) {
      setMonth(newDate)
    }
  }

  const handleNextMonth = () => {
    const newDate = new Date(month)
    newDate.setMonth(newDate.getMonth() + 1)
    if (
      (newDate.getFullYear() < toYear) ||
      (newDate.getFullYear() === toYear && newDate.getMonth() <= 11)
    ) {
      setMonth(newDate)
    }
  }

  const currentYear = month.getFullYear()
  const currentMonth = month.getMonth()

  const isPrevDisabled = month.getFullYear() <= fromYear && month.getMonth() === 0;
  const isNextDisabled = month.getFullYear() >= toYear && month.getMonth() === 11;

  const handleDateSelect = (selectedDate: Date | null) => {
    if (onChange) {
      onChange(selectedDate);
    }
    setIsPopoverOpen(false); // Close popover on selection
  };

  return (
    <Popover
      open={isPopoverOpen}
      onOpenChange={(open) => {
        console.log("Popover open change:", open);
        setIsPopoverOpen(open);
      }}
      modal={true}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground", className)}
          aria-label="Selecionar data"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            value.toLocaleDateString("pt-BR", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align} forceMount>
        <EnhancedCalendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          disabled={disabled}
          initialFocus
          fromYear={fromYear}
          toYear={toYear}
        />
      </PopoverContent>
    </Popover>
  );
};

export { EnhancedCalendar, DateTimePicker };
