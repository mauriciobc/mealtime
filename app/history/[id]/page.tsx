"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, notFound } from "next/navigation"
import { AnimatedButton } from "@/components/ui/animated-button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { catProfiles, getCatById } from "@/lib/data"
import BottomNav from "@/components/bottom-nav"
import PageTransition from "@/components/page-transition"
import { motion } from "framer-motion"
import AnimatedList from "@/components/animated-list"
import LoadingSpinner from "@/components/loading-spinner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"

export default async function CatHistoryPage({ params }: { params: { id: string } }) {
  const cat = await getCatById(parseInt(params.id))

  if (!cat) {
    notFound()
  }

  return (
    <PageTransition>
      <div className="bg-gray-50 min-h-screen pb-16">
        <div className="container max-w-md mx-auto p-4">
          {/* Status Bar Spacer */}
          <div className="h-6"></div>

          <header className="flex items-center mb-6">
            <Link href="/">
              <AnimatedButton variant="ghost" size="icon" className="mr-2 rounded-full">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back</span>
              </AnimatedButton>
            </Link>
            {!cat && (
              <motion.div
                className="flex items-center"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={cat.photoUrl} alt={cat.name} />
                  <AvatarFallback>{cat.name[0]}</AvatarFallback>
                </Avatar>
                <h1 className="text-xl font-bold">{cat.name}'s Feeding History</h1>
              </motion.div>
            )}
          </header>

          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={cat.photoUrl} alt={cat.name} />
                <AvatarFallback>{cat.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{cat.name}</CardTitle>
                <p className="text-sm text-muted-foreground">Feeding History</p>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {cat.feedingLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{log.user.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(log.timestamp))} ago
                        </p>
                      </div>
                      <Badge variant="secondary">{log.portionSize} portion</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <BottomNav />
      </div>
    </PageTransition>
  )
}

