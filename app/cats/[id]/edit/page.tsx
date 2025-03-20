"use client"

import { useState, useEffect, use } from "react"
import { ArrowLeft, Calendar, Save, Trash2, Clock } from "lucide-react"
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
import { useGlobalState } from "@/lib/context/global-state"
import { getCatById, updateCat, deleteCat } from "@/lib/services/apiService"
import { toast } from "sonner"
import { format } from "date-fns"
import { CatType, Schedule } from "@/lib/types"

// Simple UUID function since we can't install the package
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditCatPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { state, dispatch } = useGlobalState()
  const [cat, setCat] = useState<CatType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    birthdate: "",
    weight: "",
    restrictions: "",
    photoUrl: "/placeholder.svg?height=200&width=200",
    schedules: [] as Schedule[]
  })
  
  // Fetch cat data
  useEffect(() => {
    const loadCat = async () => {
      try {
        const cat = await getCatById(resolvedParams.id, state.cats)
        
        if (!cat) {
          toast.error("Gato não encontrado")
          router.push("/cats")
          return
        }
        
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
          restrictions: cat.restrictions || "",
          photoUrl: cat.photoUrl || "/placeholder.svg?height=200&width=200",
          schedules: cat.schedules || []
        })
        
        setIsLoading(false)
      } catch (error) {
        console.error("Erro ao carregar gato:", error)
        toast.error("Falha ao carregar dados do gato")
        router.push("/cats")
      }
    }
    
    loadCat()
  }, [resolvedParams.id, router, state.cats])
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  
  // Handle radio button changes
  const handleRadioChange = (value: string) => {
    setFormData(prev => {
      const newSchedules = [...prev.schedules]
      if (newSchedules.length > 0) {
        newSchedules[0] = {
          ...newSchedules[0],
          type: value as 'interval' | 'fixedTime'
        }
      }
      return { ...prev, schedules: newSchedules }
    })
  }
  
  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true)
    
    try {
      await deleteCat(resolvedParams.id, state.cats)
      
      dispatch({
        type: "DELETE_CAT",
        payload: parseInt(resolvedParams.id)
      })
      
      toast.success("Gato excluído com sucesso")
      router.push("/cats")
    } catch (error) {
      console.error("Erro ao excluir gato:", error)
      toast.error("Falha ao excluir gato")
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
      const existingCat = await getCatById(resolvedParams.id, state.cats)
      
      if (!existingCat) {
        toast.error("Gato não encontrado")
        return
      }
      
      // Update cat with new values
      const updatedCat: CatType = {
        ...existingCat,
        name: formData.name,
        photoUrl: formData.photoUrl,
        // Optional fields
        birthdate: formData.birthdate ? new Date(formData.birthdate) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        restrictions: formData.restrictions || undefined,
        schedules: formData.schedules
      }
      
      // Update the cat
      const result = await updateCat(resolvedParams.id, updatedCat, state.cats)
      
      // Update local state
      dispatch({
        type: "UPDATE_CAT",
        payload: result
      })
      
      toast.success(`${formData.name} foi atualizado com sucesso`)
      router.push(`/cats/${resolvedParams.id}`)
    } catch (error) {
      console.error("Erro ao atualizar gato:", error)
      toast.error("Algo deu errado. Por favor, tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando dados do gato...</p>
      </div>
    )
  }
  
  return (
    <PageTransition>
      <div className="bg-background min-h-screen pb-4">
        <div className="container max-w-md mx-auto p-4">
          {/* Status Bar Spacer */}
          <div className="h-6"></div>
          
          {/* Top Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Link href={`/cats/${resolvedParams.id}`} className="flex items-center text-sm font-medium">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Cancelar
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
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso excluirá permanentemente {formData.name} e todos os seus registros de alimentação.
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Excluindo..." : "Excluir"}
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
                  <>Salvando...</>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Editar {formData.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <form id="cat-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Profile Picture */}
                <div className="flex flex-col items-center mb-6">
                  <Avatar className="h-24 w-24 mb-2">
                    <AvatarImage src={formData.photoUrl} alt="Preview" />
                    <AvatarFallback>
                      {formData.name ? formData.name.substring(0, 2) : "GA"}
                    </AvatarFallback>
                  </Avatar>
                  <Button type="button" variant="outline" size="sm">
                    Enviar Foto
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    Recomendado: Imagem quadrada, 300×300px ou maior
                  </p>
                </div>
                
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Informações Básicas</h3>
                  
                  <div className="grid gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Gato <span className="text-red-500">*</span></Label>
                      <Input 
                        id="name" 
                        name="name" 
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Digite o nome do gato" 
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="birthdate">Data de Nascimento (aproximada)</Label>
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
                      <Label htmlFor="weight">Peso (kg)</Label>
                      <Input 
                        id="weight" 
                        name="weight" 
                        type="number" 
                        step="0.01"
                        value={formData.weight}
                        onChange={handleChange}
                        placeholder="Digite o peso em kg" 
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Feeding Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Informações de Alimentação</h3>
                  
                  <div className="space-y-2">
                    <Label>Agendamento de Alimentação</Label>
                    <RadioGroup 
                      value={formData.schedules[0]?.type || 'interval'} 
                      onValueChange={handleRadioChange}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-start space-x-2">
                        <RadioGroupItem value="interval" id="interval" />
                        <div className="grid gap-1.5">
                          <Label htmlFor="interval" className="font-normal">
                            Alimentar a cada
                            <Input 
                              type="number" 
                              name="interval"
                              value={formData.schedules[0]?.interval || 8}
                              onChange={(e) => {
                                const value = parseInt(e.target.value)
                                setFormData(prev => {
                                  const newSchedules = [...prev.schedules]
                                  if (newSchedules.length > 0) {
                                    newSchedules[0] = {
                                      ...newSchedules[0],
                                      interval: value
                                    }
                                  } else {
                                    newSchedules.push({
                                      id: uuidv4(),
                                      catId: parseInt(resolvedParams.id),
                                      userId: "1",
                                      type: 'interval',
                                      interval: value,
                                      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                                      enabled: true,
                                      status: "pending",
                                      createdAt: new Date()
                                    })
                                  }
                                  return { ...prev, schedules: newSchedules }
                                })
                              }}
                              min="1" 
                              max="24"
                              className="w-16 h-7 inline-block mx-2" 
                              disabled={formData.schedules[0]?.type === 'fixedTime'}
                            />
                            horas
                          </Label>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-2">
                        <RadioGroupItem value="fixedTime" id="fixedTime" />
                        <div className="grid gap-1.5 w-full">
                          <Label htmlFor="fixedTime" className="font-normal">Horários fixos</Label>
                          <Input 
                            name="times"
                            value={formData.schedules[0]?.times || "08:00"}
                            onChange={(e) => {
                              const value = e.target.value
                              setFormData(prev => {
                                const newSchedules = [...prev.schedules]
                                if (newSchedules.length > 0) {
                                  newSchedules[0] = {
                                    ...newSchedules[0],
                                    times: value
                                  }
                                } else {
                                  newSchedules.push({
                                    id: uuidv4(),
                                    catId: parseInt(resolvedParams.id),
                                    userId: "1",
                                    type: 'fixedTime',
                                    times: value,
                                    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                                    enabled: true,
                                    status: "pending",
                                    createdAt: new Date()
                                  })
                                }
                                return { ...prev, schedules: newSchedules }
                              })
                            }}
                            placeholder="08:00"
                          />
                          <p className="text-xs text-gray-500">Formato 24 horas (ex: 08:00)</p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                
                <Separator />
                
                {/* Health Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Informações de Saúde</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="restrictions">Restrições Alimentares</Label>
                    <Input 
                      id="restrictions" 
                      name="restrictions" 
                      value={formData.restrictions}
                      onChange={handleChange}
                      placeholder="ex: Sem grãos, Sem lactose" 
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
