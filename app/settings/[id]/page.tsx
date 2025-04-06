"use client"

import { useState, useEffect, use } from "react"
import { useRouter, notFound } from "next/navigation"
import { AnimatedButton } from "@/components/ui/animated-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Bell, Trash2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { catProfiles, getCatById } from "@/lib/data"
import BottomNav from "@/components/bottom-nav"
import PageTransition from "@/components/page-transition"
import { motion } from "framer-motion"
import AnimatedIcon from "@/components/animated-icon"
import LoadingSpinner from "@/components/loading-spinner"
import { BaseCat, ID } from "@/lib/types/common"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PageProps {
  params: Promise<{ id: string }>;
}

interface Cat extends BaseCat {
  avatar: string;
  regularAmount: string;
  foodUnit: string;
  feedingInterval: number;
  lastFed: string;
  feedingHistory: {
    time: string;
    amount: string;
  }[];
}

export default async function CatSettingsPage({ params }: { params: { id: string } }) {
  const cat = await getCatById(parseInt(params.id))

  if (!cat) {
    notFound()
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={cat.photoUrl} alt={cat.name} />
            <AvatarFallback>{cat.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{cat.name}</CardTitle>
            <p className="text-sm text-muted-foreground">Settings</p>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" defaultValue={cat.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="breed">Breed</Label>
              <Input id="breed" defaultValue={cat.breed} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input id="weight" type="number" step="0.1" defaultValue={cat.weight} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedingInterval">Feeding Interval (hours)</Label>
              <Input id="feedingInterval" type="number" defaultValue={cat.feedingInterval} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restrictions">Dietary Restrictions</Label>
              <Input id="restrictions" defaultValue={cat.restrictions} />
            </div>
            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

