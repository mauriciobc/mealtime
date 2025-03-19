"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { AnimatedButton } from "@/components/ui/animated-button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { catProfiles } from "@/lib/data"
import BottomNav from "@/components/bottom-nav"
import PageTransition from "@/components/page-transition"
import { motion } from "framer-motion"
import AnimatedList from "@/components/animated-list"
import LoadingSpinner from "@/components/loading-spinner"

export default function CatHistory() {
  const router = useRouter()
  const id = useParams().id as string
  const [cat, setCat] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch cat data
    const fetchData = async () => {
      setLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 800))

      const foundCat = catProfiles.find((c) => c.id === id)
      if (foundCat) {
        setCat(foundCat)
      } else {
        router.push("/")
      }
      setLoading(false)
    }

    fetchData()
  }, [id, router])

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(date)
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
            {!loading && cat && (
              <motion.div
                className="flex items-center"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={cat.avatar} alt={cat.name} />
                  <AvatarFallback>{cat.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <h1 className="text-xl font-bold">{cat.name}'s Feeding History</h1>
              </motion.div>
            )}
          </header>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <LoadingSpinner size={40} color="#000" />
                <p className="mt-4 text-gray-500">Loading history...</p>
              </div>
            </div>
          ) : (
            <motion.div
              className="bg-white rounded-3xl shadow-sm overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold">Recent Feedings</h2>
              </div>

              {cat.feedingHistory.length > 0 ? (
                <AnimatedList staggerDelay={0.08}>
                  {cat.feedingHistory.map((feeding, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors duration-200"
                    >
                      <div>
                        <div className="font-medium">{formatDate(feeding.time)}</div>
                        <div className="text-sm text-gray-500">
                          {feeding.amount} {cat.foodUnit}
                        </div>
                      </div>
                      {index === 0 && (
                        <motion.div
                          className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-xs font-medium"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 15,
                            delay: 0.5,
                          }}
                        >
                          Latest
                        </motion.div>
                      )}
                    </div>
                  ))}
                </AnimatedList>
              ) : (
                <div className="text-center py-8 text-gray-500">No feeding history yet</div>
              )}
            </motion.div>
          )}
        </div>

        <BottomNav />
      </div>
    </PageTransition>
  )
}

