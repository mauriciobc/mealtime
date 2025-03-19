"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Calendar, Save, Trash2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import PageTransition from "@/components/page-transition"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useAppContext } from "@/lib/context/AppContext"
import { getCatById, updateCat, deleteCat } from "@/lib/services/apiService"
import { toast } from "sonner"
import { format } from "date-fns"
import { Cat } from "@/lib/types"

// Simple UUID function since we can't install the package
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function EditCatPage({
  params
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const { state, dispatch } = useAppContext()
  const { id } = params
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    birthdate: "",
    weight: "",
    dietaryRestrictions: "",
    medicalNotes: "",
    regularAmount: "",
    foodUnit: "cup",
    feedingScheduleType: "interval",
    feedingInterval: "12",
    feedingTimes: "08:00,18:00", // Comma-separated times
    avatar: "/placeholder.svg?height=200&width=200"
  })
  
  // Fetch cat data
  useEffect(() => {
    const loadCat = async () => {
      try {
        const cat = await getCatById(id, state.cats)
        
        if (!cat) {
          toast.error("Cat not found")
          router.push("/cats")
          return
        }
        
        // Find the active feeding schedule
        const activeSchedule = cat.feedingSchedules.find(s => s.isActive) || cat.feedingSchedules[0]
        
        // Format date for input field (YYYY-MM-DD)
        let formattedBirthdate = ""
        if (cat.birthdate) {
          const date = new Date(cat.birthdate)
          formattedBirthdate = format(date, "yyyy-MM-dd")
        }
        
        setFormData({
          name: cat.name,
          birthdate: formattedBirthdate,
          weight: cat.weight?.toString() || "",
          dietaryRestrictions: cat.dietaryRestrictions?.join(", ") || "",
          medicalNotes: cat.medicalNotes || "",
          regularAmount: cat.regularAmount?.toString() || "",
          foodUnit: cat.foodUnit || "cup",
          feedingScheduleType: activeSchedule?.type || "interval",
          feedingInterval: activeSchedule?.interval?.toString() || "12",
          feedingTimes: activeSchedule?.times?.join(", ") || "08:00,18:00",
          avatar: cat.avatar || "/placeholder.svg?height=200&width=200"
        })
        
        setIsLoading(false)
      } catch (error) {
        console.error("Error loading cat:", error)
        toast.error("Failed to load cat data")
        router.push("/cats")
      }
    }
    
    loadCat()
  }, [id, router, state.cats])
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  
  // Handle radio button changes
  const handleRadioChange = (value: string) => {
    setFormData(prev => ({ ...prev, feedingScheduleType: value }))
  }
  
  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true)
    
    try {
      await deleteCat(id, state.cats)
      
      // Update local state
      dispatch({
        type: "SET_CATS",
        payload: state.cats.filter(cat => cat.id !== id)
      })
      
      toast.success("Cat deleted successfully")
      router.push("/cats")
    } catch (error) {
      console.error("Error deleting cat:", error)
      toast.error("Failed to delete cat")
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsSubmitting(true)
    
    try {
      // Format dietary restrictions
      const dietaryRestrictionsArray = formData.dietaryRestrictions
        ? formData.dietaryRestrictions.split(',').map(item => item.trim())
        : []
      
      // Create feeding schedule
      const feedingSchedule = {
        id: uuidv4(),
        type: formData.feedingScheduleType as 'interval' | 'fixedTime',
        interval: formData.feedingScheduleType === 'interval' ? parseInt(formData.feedingInterval) : undefined,
        times: formData.feedingScheduleType === 'fixedTime' ? formData.feedingTimes.split(',').map(time => time.trim()) : undefined,
        isActive: true,
        isOverride: false,
      }
      
      // Get existing cat to preserve fields we're not changing
      const existingCat = await getCatById(id, state.cats) as Cat
      
      if (!existingCat) {
        toast.error("Cat not found")
        return
      }
      
      // Update cat with new values, preserving existing feeding schedules
      // but marking the new one as active and others as inactive
      const existingSchedules = existingCat.feedingSchedules.map(schedule => ({
        ...schedule,
        isActive: false
      }))
      
      const updatedCat = {
        ...existingCat,
        name: formData.name,
        regularAmount: formData.regularAmount,
        foodUnit: formData.foodUnit,
        feedingSchedules: [feedingSchedule, ...existingSchedules],
        avatar: formData.avatar,
        // Optional fields
        birthdate: formData.birthdate ? new Date(formData.birthdate) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        dietaryRestrictions: dietaryRestrictionsArray.length > 0 ? dietaryRestrictionsArray : undefined,
        medicalNotes: formData.medicalNotes || undefined,
      }
      
      // Update the cat
      const result = await updateCat(id, updatedCat, state.cats)
      
      // Update local state
      dispatch({
        type: "UPDATE_CAT",
        payload: result
      })
      
      toast.success(`${formData.name} has been updated`)
      router.push(`/cats/${id}`)
    } catch (error) {
      console.error("Error updating cat:", error)
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading cat data...</p>
      </div>
    )
  }
  
  return (
    <PageTransition>
      <div className="bg-gray-50 min-h-screen pb-4">
        <div className="container max-w-md mx-auto p-4">
          {/* Status Bar Spacer */}
          <div className="h-6"></div>
          
          {/* Top Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Link href={`/cats/${id}`} className="flex items-center text-sm font-medium">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Cancel
            </Link>
            <div className="flex gap-2">
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="gap-1"
                    disabled={isSubmitting || isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {formData.name} and all their feeding records.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <Button 
                type="submit" 
                form="cat-form"
                size="sm" 
                className="gap-1"
                disabled={isSubmitting || isDeleting}
              >
                {isSubmitting ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Edit {formData.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <form id="cat-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Profile Picture */}
                <div className="flex flex-col items-center mb-6">
                  <Avatar className="h-24 w-24 mb-2">
                    <AvatarImage src={formData.avatar} alt="Preview" />
                    <AvatarFallback>
                      {formData.name ? formData.name.substring(0, 2) : "CA"}
                    </AvatarFallback>
                  </Avatar>
                  <Button type="button" variant="outline" size="sm">
                    Upload Photo
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: Square image, 300×300px or larger
                  </p>
                </div>
                
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Basic Information</h3>
                  
                  <div className="grid gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="name">Cat Name <span className="text-red-500">*</span></Label>
                      <Input 
                        id="name" 
                        name="name" 
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter cat name" 
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="birthdate">Birthdate (approximate)</Label>
                      <div className="relative">
                        <Input 
                          id="birthdate" 
                          name="birthdate" 
                          type="date" 
                          value={formData.birthdate}
                          onChange={handleChange}
                          className="pl-10"
                        />
                        <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input 
                        id="weight" 
                        name="weight" 
                        type="number" 
                        step="0.01"
                        value={formData.weight}
                        onChange={handleChange}
                        placeholder="Enter weight in kg" 
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Feeding Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Feeding Information</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="regularAmount">Regular Amount <span className="text-red-500">*</span></Label>
                      <Input 
                        id="regularAmount" 
                        name="regularAmount" 
                        value={formData.regularAmount}
                        onChange={handleChange}
                        placeholder="e.g. 1/2" 
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="foodUnit">Unit</Label>
                      <Select 
                        name="foodUnit"
                        value={formData.foodUnit} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, foodUnit: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cup">Cup</SelectItem>
                          <SelectItem value="gram">Gram</SelectItem>
                          <SelectItem value="ounce">Ounce</SelectItem>
                          <SelectItem value="scoop">Scoop</SelectItem>
                          <SelectItem value="packet">Packet</SelectItem>
                          <SelectItem value="can">Can</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Feeding Schedule</Label>
                    <RadioGroup 
                      value={formData.feedingScheduleType} 
                      onValueChange={handleRadioChange}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-start space-x-2">
                        <RadioGroupItem value="interval" id="interval" />
                        <div className="grid gap-1.5">
                          <Label htmlFor="interval" className="font-normal">
                            Feed every
                            <Input 
                              type="number" 
                              name="feedingInterval"
                              value={formData.feedingInterval}
                              onChange={handleChange}
                              min="1" 
                              max="24"
                              className="w-16 h-7 inline-block mx-2" 
                              disabled={formData.feedingScheduleType !== 'interval'}
                            />
                            hours
                          </Label>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-2">
                        <RadioGroupItem value="fixedTime" id="fixedTime" />
                        <div className="grid gap-1.5 w-full">
                          <Label htmlFor="fixedTime" className="font-normal">Fixed feeding times</Label>
                          <Input 
                            name="feedingTimes"
                            value={formData.feedingTimes}
                            onChange={handleChange}
                            placeholder="08:00, 18:00" 
                            disabled={formData.feedingScheduleType !== 'fixedTime'}
                          />
                          <p className="text-xs text-gray-500">Comma-separated times (24-hour format)</p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                
                <Separator />
                
                {/* Health Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Health Information</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
                    <Input 
                      id="dietaryRestrictions" 
                      name="dietaryRestrictions" 
                      value={formData.dietaryRestrictions}
                      onChange={handleChange}
                      placeholder="e.g. Grain-free, Dairy-free (comma-separated)" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="medicalNotes">Medical Notes</Label>
                    <Textarea 
                      id="medicalNotes" 
                      name="medicalNotes" 
                      value={formData.medicalNotes}
                      onChange={handleChange}
                      placeholder="Any special medical conditions or notes..."
                      rows={3}
                    />
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  )
}
