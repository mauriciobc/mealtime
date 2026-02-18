import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { m } from "framer-motion"

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  icon?: React.ReactNode
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, title, value, icon, description, trend, ...props }, ref) => {
    return (
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
      >
        <Card className={cn("relative overflow-hidden p-2 h-full flex flex-col", className)} ref={ref} {...props}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {title}
            </CardTitle>
            {icon && <div className="text-primary">{icon}</div>}
          </CardHeader>
          <CardContent className="p-0 pt-1 flex-1 flex flex-col justify-center">
            <div className="text-lg font-bold">{value}</div>
            {description && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
            {trend && (
              <div className={cn(
                "flex items-center text-[10px] mt-1",
                trend.isPositive ? "text-green-500" : "text-red-500"
              )}>
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </div>
            )}
          </CardContent>
        </Card>
      </m.div>
    )
  }
)
StatCard.displayName = "StatCard"

export { StatCard } 