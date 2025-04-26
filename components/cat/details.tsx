'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAgeString } from '@/lib/utils/dateUtils'

interface Cat {
  id: string
  name: string
  birthdate?: Date | null
  weight?: number | null
  householdId: string
  household: {
    id: string
    name: string
  }
  schedules: Array<{
    id: string
    type: string
    interval?: number
    times?: string[]
    enabled: boolean
  }>
}

interface CatDetailsProps {
  cat: Cat
}

export default function CatDetails({ cat }: CatDetailsProps) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate a small delay to prevent flash of loading state
    const timer = setTimeout(() => setIsLoading(false), 300)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="flex flex-row items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback>{cat.name[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <CardTitle className="text-2xl font-bold">{cat.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Information</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>
          
          <TabsContent value="info" className="space-y-4 mt-4">
            {cat.birthdate && (
              <div>
                <p className="font-semibold">Age</p>
                <p className="text-gray-600">
                  {getAgeString(new Date(cat.birthdate))}
                </p>
              </div>
            )}
            {cat.weight && (
              <div>
                <p className="font-semibold">Weight</p>
                <p className="text-gray-600">{cat.weight} kg</p>
              </div>
            )}
            <div>
              <p className="font-semibold">Household</p>
              <p className="text-gray-600">{cat.household.name}</p>
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="mt-4">
            {cat.schedules.length > 0 ? (
              <div className="space-y-4">
                <p className="font-semibold">Feeding Schedule</p>
                <ul className="space-y-2">
                  {cat.schedules.map(schedule => (
                    <li key={schedule.id} className="text-gray-600 flex items-center justify-between">
                      <span>
                        {schedule.type === 'interval' 
                          ? `Every ${schedule.interval} hours`
                          : schedule.times?.join(', ')}
                      </span>
                      {!schedule.enabled && (
                        <span className="text-sm text-gray-400">(disabled)</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-gray-600">No feeding schedules set</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 