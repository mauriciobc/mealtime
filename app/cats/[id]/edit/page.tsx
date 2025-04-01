"use client"

import { useState, useEffect, use, useCallback } from "react"
import { ArrowLeft, Calendar, Save, Trash2, Clock, AlertTriangle, Ban, Users } from "lucide-react"
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
import { format, parseISO } from "date-fns"
import { CatType, Schedule } from "@/lib/types"
import { ImageUpload } from "@/components/image-upload"
import { useSession } from "next-auth/react"
import { Loading } from "@/components/ui/loading"
import { v4 as uuidv4 } from 'uuid';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditCatPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { state, dispatch } = useGlobalState()
  const { data: session, status } = useSession()
  const [cat, setCat] = useState<CatType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    birthdate: "",
    weight: "",
    restrictions: "",
    photoUrl: "/placeholder.svg?height=200&width=200",
    feeding_interval: "8",
    portion: "",
    notes: "",
    schedules: [] as Schedule[]
  })
  
  const catId = resolvedParams.id ? parseInt(resolvedParams.id) : null
  
  // Fetch cat data
  useEffect(() => {
    let isMounted = true
    
    const loadCat = async () => {
      if (!catId || status !== "authenticated" || !state.currentUser?.id || !state.currentUser?.householdId) {
        if (isMounted) {
          setIsLoading(false)
          if (status === "authenticated" && state.currentUser && !state.currentUser.householdId) {
            setError("Nenhuma residência associada. Não é possível editar o gato.")
          } else if (status === "authenticated" && !catId) {
            setError("ID do gato inválido.")
          } else {
            // Still loading auth or user... wait.
          }
        }
        return
      }
      
      setIsLoading(true)
      setError(null)
      const currentHouseholdId = state.currentUser.householdId
      const currentUserId = state.currentUser.id
      
      try {
        const fetchedCat = await getCatById(catId.toString())
        
        if (!isMounted) return
        
        if (!fetchedCat) {
          throw new Error("Gato não encontrado.")
        }
        
        if (String(fetchedCat.householdId) !== String(currentHouseholdId)) {
          console.warn(`Attempted to edit cat ${catId} from household ${fetchedCat.householdId}, user belongs to ${currentHouseholdId}.`)
          throw new Error("Você não tem permissão para editar este gato.")
        }
        
        setCat(fetchedCat)
        
        let formattedBirthdate = ""
        if (fetchedCat.birthdate) {
          try {
            const date = typeof fetchedCat.birthdate === 'string' ? parseISO(fetchedCat.birthdate) : new Date(fetchedCat.birthdate)
            formattedBirthdate = format(date, "yyyy-MM-dd")
          } catch (e) {
            console.error("Error parsing birthdate:", fetchedCat.birthdate, e)
          }
        }
        
        const existingSchedules = fetchedCat.schedules || []
        console.log('Agendamentos existentes:', existingSchedules)
        
        setFormData({
          name: fetchedCat.name,
          birthdate: formattedBirthdate,
          weight: fetchedCat.weight?.toString() || "",
          restrictions: fetchedCat.restrictions || "",
          photoUrl: fetchedCat.photoUrl || "/placeholder.svg?height=200&width=200",
          feeding_interval: fetchedCat.feeding_interval?.toString() || "8",
          portion: fetchedCat.portion?.toString() || "",
          notes: fetchedCat.notes || "",
          schedules: existingSchedules.map(schedule => ({
            ...schedule,
            times: schedule.times || "",
            enabled: schedule.enabled !== undefined ? schedule.enabled : true,
            status: schedule.status || "pending"
          }))
        })
        
        console.log('Form data atualizado:', formData)
      } catch (err: any) {
        console.error("Erro ao carregar gato:", err)
        if (isMounted) setError(err.message || "Falha ao carregar dados do gato")
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    
    loadCat()
    
    return () => { isMounted = false }
  }, [catId, status, state.currentUser, router, dispatch])
  
  // Handle form input changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }, [])
  
  // Handle image upload change
  const handlePhotoChange = useCallback((url: string) => {
    setFormData(prev => ({ ...prev, photoUrl: url }))
  }, [])
  
  // Handle delete
  const handleDelete = async () => {
    if (!cat || String(cat.householdId) !== String(state.currentUser?.householdId)) {
      toast.error("Não é possível excluir: Gato não pertence à sua residência.")
      setShowDeleteDialog(false)
      return
    }
    
    setIsDeleting(true)
    try {
      await deleteCat(cat.id.toString())
      
      dispatch({
        type: "DELETE_CAT",
        payload: cat.id
      })
      
      toast.success("Gato excluído com sucesso")
      router.push("/cats")
    } catch (error) {
      console.error("Erro ao excluir gato:", error)
      toast.error("Falha ao excluir gato")
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLoading || isSubmitting) return
    if (!cat || !state.currentUser?.householdId || String(cat.householdId) !== String(state.currentUser.householdId)) {
      toast.error("Não é possível salvar: Dados inválidos ou permissão negada.")
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const updatedData: Partial<CatType> = {
        name: formData.name.trim(),
        photoUrl: formData.photoUrl || null,
        birthdate: formData.birthdate ? new Date(formData.birthdate) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        restrictions: formData.restrictions?.trim() || undefined,
        feeding_interval: formData.feeding_interval ? parseInt(formData.feeding_interval) : undefined,
        portion: formData.portion ? parseFloat(formData.portion) : undefined,
        notes: formData.notes?.trim() || undefined,
      }
      
      if (updatedData.feeding_interval !== undefined && (isNaN(updatedData.feeding_interval) || updatedData.feeding_interval < 1 || updatedData.feeding_interval > 24)) {
        toast.error("Intervalo de alimentação deve ser entre 1 e 24 horas.")
        setIsSubmitting(false)
        return
      }
      
      const updatedCatResult = await updateCat(cat.id.toString(), updatedData)
      
      dispatch({
        type: "UPDATE_CAT",
        payload: updatedCatResult
      })
      
      toast.success(`${updatedCatResult.name} foi atualizado com sucesso`)
      router.push(`/cats/${cat.id}`)
    } catch (error: any) {
      console.error("Erro ao atualizar gato:", error)
      toast.error(error.message || "Algo deu errado. Por favor, tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  if (isLoading || status === 'loading' || (status === 'authenticated' && !state.currentUser)) {
    return (
      <div className="container max-w-md py-6 pb-28 flex justify-center items-center min-h-[400px]">
        <Loading text="Carregando dados do gato..." />
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="container max-w-md py-6 pb-28 flex flex-col items-center justify-center text-center min-h-[400px]">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao Carregar</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => router.push("/cats")} variant="outline">Voltar para Gatos</Button>
      </div>
    )
  }
  
  if (status === 'authenticated' && state.currentUser && !state.currentUser.householdId) {
    return (
      <div className="container max-w-md py-6 pb-28 flex flex-col items-center justify-center text-center min-h-[400px]">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sem Residência</h2>
        <p className="text-muted-foreground mb-4">Você precisa de uma residência associada para editar gatos.</p>
        <Button onClick={() => router.push("/settings")} variant="outline">Ir para Configurações</Button>
      </div>
    )
  }
  
  if (!cat) {
    return (
      <div className="container max-w-md py-6 pb-28 flex flex-col items-center justify-center text-center min-h-[400px]">
        <Ban className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Não foi possível carregar</h2>
        <p className="text-muted-foreground mb-4">Os dados do gato não puderam ser carregados.</p>
        <Button onClick={() => router.push("/cats")} variant="outline">Voltar para Gatos</Button>
      </div>
    )
  }
  
  return (
    <PageTransition>
      <div className="container max-w-md py-6 pb-28">
        <div className="flex items-center justify-between mb-4">
          <Link href={`/cats/${cat.id}`} className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar para {cat.name}
          </Link>
        </div>
        
        <h1 className="text-2xl font-bold mb-6">Editar {cat.name}</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Label htmlFor="photoUrl" className="cursor-pointer">
              <Avatar className="h-24 w-24 ring-2 ring-offset-2 ring-primary/50">
                <AvatarImage src={formData.photoUrl || undefined} alt={formData.name} />
                <AvatarFallback>{formData.name ? formData.name.substring(0, 2) : "Gato"}</AvatarFallback>
              </Avatar>
            </Label>
            <ImageUpload
              value={formData.photoUrl || ""}
              onChange={handlePhotoChange}
              type="cat"
            />
          </div>
          
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Nome do gato"
            />
          </div>
          
          <div>
            <Label htmlFor="birthdate">Data de Nascimento</Label>
            <Input
              id="birthdate"
              name="birthdate"
              type="date"
              value={formData.birthdate}
              onChange={handleChange}
            />
          </div>
          
          <div>
            <Label htmlFor="weight">Peso (kg)</Label>
            <Input
              id="weight"
              name="weight"
              type="number"
              step="0.1"
              placeholder="Ex: 4.5"
              value={formData.weight}
              onChange={handleChange}
            />
          </div>
          
          <div>
            <Label htmlFor="feeding_interval">Intervalo Alimentação (horas)</Label>
            <Input
              id="feeding_interval"
              name="feeding_interval"
              type="number"
              min="1"
              max="24"
              placeholder="Ex: 8"
              value={formData.feeding_interval}
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="restrictions">Restrições Alimentares</Label>
            <Textarea
              id="restrictions"
              name="restrictions"
              placeholder="Alguma restrição? (opcional)"
              value={formData.restrictions}
              onChange={handleChange}
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="portion">Porção por Refeição (ex: gramas)</Label>
            <Input
              id="portion"
              name="portion"
              type="number"
              step="any"
              placeholder="Ex: 50"
              value={formData.portion}
              onChange={handleChange}
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Observações Adicionais</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Notas sobre comportamento, saúde, etc. (opcional)"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
            />
          </div>
          
          <Separator />
          
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <Button type="submit" disabled={isSubmitting || isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
            </Button>
            
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Gato
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso excluirá permanentemente {formData.name} e todos os seus dados. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive hover:bg-destructive/90"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>
      </div>
    </PageTransition>
  )
}
