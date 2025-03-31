"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, History, Settings } from "lucide-react"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { getNextFeedingTime, getCats } from "@/lib/data"
import { useAppContext } from "@/lib/context/AppContext"
import { format, formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"
import { CatType } from "@/lib/types"

export function CatList() {
  const [cats, setCats] = useState<CatType[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { state } = useAppContext()

  useEffect(() => {
    const loadCats = async () => {
      try {
        const data = await getCats()
        setCats(data)
      } catch (error) {
        console.error('Error loading cats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCats()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  // Function to record a feeding
  const recordFeeding = (id: string) => {
    setCats(
      cats.map((cat) => {
        if (cat.id === id) {
          const updatedCat = {
            ...cat,
            lastFed: new Date().toISOString(),
            feedingHistory: [{ time: new Date().toISOString(), amount: cat.regularAmount }, ...cat.feedingHistory],
          }
          return updatedCat
        }
        return cat
      }),
    )

    toast({
      title: "Feeding recorded!",
      description: "The feeding has been added to the history.",
    })
  }

  // Calculate time until next feeding
  const getFormattedNextFeedingTime = (catId: string) => {
    const { cats, feedingLogs } = state
    const nextFeedingDateTime = getNextFeedingTime(catId, cats, feedingLogs)
    
    if (!nextFeedingDateTime) return "Não configurado"
    
    const now = new Date()
    const diffMs = nextFeedingDateTime.getTime() - now.getTime()
    
    if (diffMs < 0) {
      return "Atrasado"
    }
    
    return formatDistanceToNow(nextFeedingDateTime, { addSuffix: true })
  }

  // Determine if feeding is due soon (within 30 minutes)
  const isFeedingDueSoon = (catId: string) => {
    const { cats, feedingLogs } = state
    const nextFeedingTime = getNextFeedingTime(catId, cats, feedingLogs)
    if (!nextFeedingTime) return false
    
    const now = new Date()
    const diffMs = nextFeedingTime.getTime() - now.getTime()
    const diffHours = diffMs / (60 * 60 * 1000)
    
    return diffHours > 0 && diffHours < 1
  }

  // Determine if feeding is overdue
  const isFeedingOverdue = (catId: string) => {
    const { cats, feedingLogs } = state
    const nextFeedingTime = getNextFeedingTime(catId, cats, feedingLogs)
    if (!nextFeedingTime) return false
    
    const now = new Date()
    return nextFeedingTime.getTime() < now.getTime()
  }

  return (
    <div className="space-y-4">
      {cats.map((cat) => (
        <Card key={cat.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center p-4 bg-gradient-to-r from-primary/10 to-secondary/10">
              <Avatar className="h-16 w-16 border-2 border-primary">
                <AvatarImage src={cat.photoUrl} alt={cat.name} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {cat.name.substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="ml-4">
                <h2 className="text-xl font-bold">{cat.name}</h2>
                <div className="flex items-center mt-1">
                  <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span className="text-sm">
                    Next: {getFormattedNextFeedingTime(cat.id)}
                    {isFeedingDueSoon(cat.id) && (
                      <Badge variant="warning" className="ml-2 bg-amber-500">
                        Soon
                      </Badge>
                    )}
                    {isFeedingOverdue(cat.id) && (
                      <Badge variant="destructive" className="ml-2">
                        Overdue
                      </Badge>
                    )}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {cat.regularAmount} {cat.foodUnit} every {cat.feedingInterval}h
                </div>
              </div>
            </div>
          </CardContent>
          <CardHeader className="flex justify-between p-4">
            <div className="flex space-x-2">
              <Link href={`/history/${cat.id}`}>
                <Button variant="outline" size="sm">
                  <History className="h-4 w-4 mr-2" />
                  History
                </Button>
              </Link>
              <Link href={`/settings/${cat.id}`}>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
            </div>
            <Button
              onClick={() => recordFeeding(cat.id)}
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
            >
              Feed Now
            </Button>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}

