"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { AnimatedButton } from "@/components/ui/animated-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Bell, Trash2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { catProfiles } from "@/lib/data"
import BottomNav from "@/components/bottom-nav"
import PageTransition from "@/components/page-transition"
import { motion } from "framer-motion"
import AnimatedIcon from "@/components/animated-icon"
import LoadingSpinner from "@/components/loading-spinner"

interface PageProps {
  params: Promise<{ id: string }>;
}

interface Cat {
  id: string;
  name: string;
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

export default function CatSettings({ params }: PageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [cat, setCat] = useState<Cat | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    regularAmount: "",
    foodUnit: "",
    feedingInterval: "",
    notifications: true,
  })

  useEffect(() => {
    // Simulate API fetch
    const fetchData = async () => {
      setLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 800))

      const foundCat = catProfiles.find((c) => c.id === resolvedParams.id)
      if (foundCat) {
        setCat(foundCat)
        setFormData({
          name: foundCat.name,
          regularAmount: foundCat.regularAmount,
          foodUnit: foundCat.foodUnit,
          feedingInterval: foundCat.feedingInterval.toString(),
          notifications: true,
        })
      } else {
        router.push("/")
      }
      setLoading(false)
    }

    fetchData()
  }, [resolvedParams.id, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, notifications: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // In a real app, we would save this to a database
    toast({
      title: "Settings saved!",
      description: `${formData.name}'s settings have been updated.`,
    })

    setSaving(false)

    // Navigate back to the home page
    router.push("/")
  }

  const handleDelete = async () => {
    if (!cat) return
    
    setDeleting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // In a real app, we would delete from a database
    toast({
      title: "Cat removed",
      description: `${cat.name} has been removed from your cats.`,
      variant: "destructive",
    })

    // Navigate back to the home page
    router.push("/")
  }

  if (loading) {
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
              <h1 className="text-xl font-bold">Cat Settings</h1>
            </header>

            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <LoadingSpinner size={40} color="#000" />
                <p className="mt-4 text-gray-500">Loading settings...</p>
              </div>
            </div>
          </div>

          <BottomNav />
        </div>
      </PageTransition>
    )
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
            <motion.h1
              className="text-xl font-bold"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {cat?.name || 'Cat'}'s Settings
            </motion.h1>
          </header>

          <motion.form
            onSubmit={handleSubmit}
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <motion.div
              className="bg-white rounded-3xl shadow-sm p-5 space-y-5"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700">
                  Cat Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="rounded-xl border-gray-200 bg-white py-3 px-4 focus:border-gray-300 focus:ring-0 transition-all duration-300 focus:shadow-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="regularAmount" className="text-gray-700">
                    Regular Amount
                  </Label>
                  <select
                    id="regularAmount"
                    name="regularAmount"
                    value={formData.regularAmount}
                    onChange={handleChange}
                    className="w-full rounded-xl border-gray-200 bg-white py-3 px-4 focus:border-gray-300 focus:ring-0 transition-all duration-300 focus:shadow-md"
                  >
                    <option value="1/4">1/4</option>
                    <option value="1/3">1/3</option>
                    <option value="1/2">1/2</option>
                    <option value="2/3">2/3</option>
                    <option value="3/4">3/4</option>
                    <option value="1">1</option>
                    <option value="1.5">1.5</option>
                    <option value="2">2</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="foodUnit" className="text-gray-700">
                    Unit
                  </Label>
                  <select
                    id="foodUnit"
                    name="foodUnit"
                    value={formData.foodUnit}
                    onChange={handleChange}
                    className="w-full rounded-xl border-gray-200 bg-white py-3 px-4 focus:border-gray-300 focus:ring-0 transition-all duration-300 focus:shadow-md"
                  >
                    <option value="cup">Cup</option>
                    <option value="oz">Ounce</option>
                    <option value="g">Gram</option>
                    <option value="scoop">Scoop</option>
                    <option value="can">Can</option>
                    <option value="pouch">Pouch</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedingInterval" className="text-gray-700">
                  Feeding Interval (hours)
                </Label>
                <select
                  id="feedingInterval"
                  name="feedingInterval"
                  value={formData.feedingInterval}
                  onChange={handleChange}
                  className="w-full rounded-xl border-gray-200 bg-white py-3 px-4 focus:border-gray-300 focus:ring-0 transition-all duration-300 focus:shadow-md"
                >
                  <option value="6">Every 6 hours</option>
                  <option value="8">Every 8 hours</option>
                  <option value="12">Every 12 hours</option>
                  <option value="24">Once a day</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-2 group">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications" className="text-gray-700 flex items-center">
                    <AnimatedIcon icon={Bell} size={16} className="mr-2" animate="wiggle" />
                    Feeding Notifications
                  </Label>
                  <div className="text-sm text-gray-500">Receive reminders when it's time to feed</div>
                </div>
                <Switch id="notifications" checked={formData.notifications} onCheckedChange={handleSwitchChange} />
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <AnimatedButton
                type="submit"
                className="w-full rounded-xl py-3 bg-black hover:bg-gray-800 text-white"
                disabled={saving}
              >
                {saving ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size={20} color="#fff" />
                    <span className="ml-2">Saving...</span>
                  </div>
                ) : (
                  "Save Changes"
                )}
              </AnimatedButton>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <AnimatedButton
                type="button"
                variant="outline"
                className="w-full rounded-xl py-3 border-red-300 text-red-600 hover:bg-red-50"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size={20} color="#e11d48" />
                    <span className="ml-2">Removing...</span>
                  </div>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Cat
                  </>
                )}
              </AnimatedButton>
            </motion.div>
          </motion.form>
        </div>

        <BottomNav />
      </div>
    </PageTransition>
  )
}

