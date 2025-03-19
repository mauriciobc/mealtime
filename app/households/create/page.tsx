"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAppContext } from "@/lib/context/AppContext"
import { ArrowLeft } from "lucide-react"
import PageTransition from "@/components/page-transition"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { v4 as uuidv4 } from "uuid"
import { Household } from "@/lib/types"

export default function CreateHouseholdPage() {
  const { state, dispatch } = useAppContext()
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [householdName, setHouseholdName] = useState("")

  const handleCreateHousehold = async () => {
    if (!householdName.trim()) {
      toast.error("Please enter a household name")
      return
    }

    setIsCreating(true)

    try {
      // Generate a random invite code (6 character alphanumeric)
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      
      const newHousehold: Household = {
        id: uuidv4(),
        name: householdName.trim(),
        inviteCode,
        members: [
          {
            userId: state.currentUser?.id || "",
            role: "Admin",
            joinedAt: new Date()
          }
        ],
        cats: [],
        catGroups: []
      }

      // Add household to state
      dispatch({ type: "SET_HOUSEHOLDS", payload: [...state.households, newHousehold] })

      // Add household to user's household list
      if (state.currentUser) {
        const updatedUser = {
          ...state.currentUser,
          households: [...state.currentUser.households, newHousehold.id],
          // If this is their first household, set it as primary
          primaryHousehold: state.currentUser.primaryHousehold || newHousehold.id
        }
        dispatch({ type: "SET_CURRENT_USER", payload: updatedUser })
      }

      toast.success("Household created successfully!")
      router.push(`/households/${newHousehold.id}`)
    } catch (error) {
      console.error("Error creating household:", error)
      toast.error("Failed to create household. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <PageTransition>
      <div className="bg-gray-50 min-h-screen">
        <div className="container max-w-md mx-auto p-4">
          {/* Status Bar Spacer */}
          <div className="h-6"></div>

          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-500 mb-6"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            <span>Back</span>
          </button>

          {/* Header */}
          <header className="mb-8">
            <h1 className="text-2xl font-bold">Create Household</h1>
            <p className="text-sm text-gray-500 mt-1">
              Create a new household to manage cats and members
            </p>
          </header>

          {/* Create Household Form */}
          <div className="bg-white p-6 rounded-3xl shadow-sm mb-8">
            <form onSubmit={(e) => {
              e.preventDefault()
              handleCreateHousehold()
            }}>
              <div className="mb-6">
                <Label htmlFor="householdName" className="block mb-2">Household Name</Label>
                <Input
                  id="householdName"
                  type="text"
                  placeholder="e.g., Smith Family"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  className="w-full"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  This will be the name displayed to all household members
                </p>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2">As the creator, you will:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Be assigned as the household admin</li>
                  <li>• Be able to add and remove members</li>
                  <li>• Be able to manage cats and feeding schedules</li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isCreating || !householdName.trim()}
              >
                {isCreating ? "Creating..." : "Create Household"}
              </Button>
            </form>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>
              You can add members after creating your household by sharing the invite code
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
