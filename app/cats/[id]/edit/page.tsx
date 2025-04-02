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
import { useAppContext } from "@/lib/context/AppContext"
import { useUserContext } from "@/lib/context/UserContext"
import { useLoading } from "@/lib/context/LoadingContext"
import { toast } from "sonner"
import { format, parseISO, isValid } from "date-fns"
import { CatType, Schedule } from "@/lib/types"
import { ImageUpload } from "@/components/image-upload"
import { useSession } from "next-auth/react"
import { Loading } from "@/components/ui/loading"
import { v4 as uuidv4 } from 'uuid'
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/ui/empty-state"

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditCatPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { state: appState, dispatch: appDispatch } = useAppContext()
  const { state: userState } = useUserContext()
  const { addLoadingOperation, removeLoadingOperation } = useLoading()
  const { cats } = appState
  const { currentUser } = userState
  const { data: session, status } = useSession()
  const [cat, setCat] = useState<CatType | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    birthdate: "",
    weight: "",
    restrictions: "",
    photoUrl: "",
    feedingInterval: "8",
    portion_size: "",
    notes: "",
  })
  
  const catId = resolvedParams.id ? parseInt(resolvedParams.id) : null
  
  useEffect(() => {
    const opId = `load-cat-${catId}`
    addLoadingOperation({ id: opId, priority: 1, description: "Loading cat data..." })
    setIsLoadingData(true)
    setError(null)

    if (status === "authenticated" && currentUser && catId && cats.length > 0) {
      const foundCat = cats.find(c => c.id === catId)

      if (foundCat) {
        if (String(foundCat.householdId) !== String(currentUser.householdId)) {
          console.warn(`Attempted to edit cat ${catId} from household ${foundCat.householdId}, user belongs to ${currentUser.householdId}.`)
          setError("Você não tem permissão para editar este gato.")
          setCat(null)
        } else {
          setCat(foundCat)
          let formattedBirthdate = ""
          if (foundCat.birthdate) {
            try {
              const dateObj = typeof foundCat.birthdate === 'string' ? parseISO(foundCat.birthdate) : new Date(foundCat.birthdate)
              if (isValid(dateObj)) {
                formattedBirthdate = format(dateObj, "yyyy-MM-dd")
              } else {
                console.warn("Invalid birthdate format received:", foundCat.birthdate)
              }
            } catch (e) {
              console.error("Error parsing birthdate:", foundCat.birthdate, e)
            }
          }
          
          setFormData({
            name: foundCat.name,
            birthdate: formattedBirthdate,
            weight: foundCat.weight?.toString() || "",
            restrictions: foundCat.restrictions || "",
            photoUrl: foundCat.photoUrl || "",
            feedingInterval: foundCat.feedingInterval?.toString() || "8",
            portion_size: foundCat.portion_size?.toString() || "",
            notes: foundCat.notes || "",
          })
        }
      } else {
        setError("Gato não encontrado.")
        setCat(null)
      }
      setIsLoadingData(false)
      removeLoadingOperation(opId)
    } else if (status === "unauthenticated") {
      setIsLoadingData(false)
      removeLoadingOperation(opId)
      setError("Autenticação necessária.")
      router.replace("/login")
    } else if (status === "loading" || (currentUser && cats.length === 0)) {
      setIsLoadingData(true)
    } else if (!catId) {
      setIsLoadingData(false)
      removeLoadingOperation(opId)
      setError("ID do gato inválido.")
    }
  }, [catId, status, currentUser, cats, router, addLoadingOperation, removeLoadingOperation])
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }, [])
  
  const handlePhotoChange = useCallback((url: string) => {
    setFormData(prev => ({ ...prev, photoUrl: url }))
  }, [])
  
  const handleDelete = async () => {
    if (!cat || !currentUser?.householdId || String(cat.householdId) !== String(currentUser.householdId)) {
      toast.error("Não é possível excluir: Gato inválido ou permissão negada.")
      return
    }
    
    const opId = `delete-cat-${cat.id}`
    addLoadingOperation({ id: opId, priority: 1, description: `Deleting ${cat.name}...` })
    setIsDeleting(true)
    const previousCats = cats
    
    appDispatch({ type: "DELETE_CAT", payload: cat.id })
    
    try {
      const response = await fetch(`/api/cats/${cat.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete cat on server')
      }
      toast.success(`${cat.name} foi excluído com sucesso`)
      router.push("/cats")
    } catch (error: any) {
      console.error("Erro ao excluir gato:", error)
      toast.error(`Falha ao excluir gato: ${error.message}`)
      appDispatch({ type: "SET_CATS", payload: previousCats })
    } finally {
      setIsDeleting(false)
      removeLoadingOperation(opId)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLoadingData || isSubmitting || !cat || !currentUser?.householdId || String(cat.householdId) !== String(currentUser.householdId)) {
      toast.error("Não é possível salvar: Dados inválidos, carregando ou permissão negada.")
      return
    }
    
    const opId = `update-cat-${cat.id}`
    addLoadingOperation({ id: opId, priority: 1, description: `Saving ${formData.name}...` })
    setIsSubmitting(true)
    
    try {
      const updatedData: Partial<CatType> = {
        name: formData.name.trim(),
        photoUrl: formData.photoUrl || null,
        birthdate: formData.birthdate ? new Date(formData.birthdate) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        restrictions: formData.restrictions?.trim() || null,
        feedingInterval: formData.feedingInterval ? parseInt(formData.feedingInterval) : null,
        portion_size: formData.portion_size ? parseFloat(formData.portion_size) : null,
        notes: formData.notes?.trim() || null,
      }
      
      if (updatedData.feedingInterval !== null && (isNaN(updatedData.feedingInterval) || updatedData.feedingInterval < 1 || updatedData.feedingInterval > 24)) {
        toast.error("Intervalo de alimentação deve ser entre 1 e 24 horas.")
        setIsSubmitting(false)
        removeLoadingOperation(opId)
        return
      }

      console.log('Sending update request with data:', updatedData)
      
      const response = await fetch(`/api/cats/${cat.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(updatedData),
      })
      
      const responseData = await response.json()
      
      if (!response.ok) {
        console.error('Server response:', responseData)
        throw new Error(responseData.error || 'Failed to update cat on server')
      }
      
      console.log('Server response:', responseData)
      
      appDispatch({
        type: "UPDATE_CAT",
        payload: responseData
      })
      
      toast.success(`${responseData.name} foi atualizado com sucesso`)
      router.push(`/cats/${cat.id}`)
    } catch (error: any) {
      console.error("Erro ao atualizar gato:", error)
      console.error("Stack trace:", error.stack)
      toast.error(error.message || "Algo deu errado. Por favor, tente novamente.")
    } finally {
      setIsSubmitting(false)
      removeLoadingOperation(opId)
    }
  }
  
  if (isLoadingData) {
    return (
      <PageTransition>
        <div className="container max-w-md py-6 pb-28">
          <div className="flex items-center mb-6">
            <Skeleton className="h-8 w-8 mr-2 rounded-full" />
            <Skeleton className="h-7 w-32" />
          </div>
          <div className="space-y-6">
            <div className="flex justify-center mb-4">
              <Skeleton className="h-32 w-32 rounded-full" />
            </div>
            <Skeleton className="h-4 w-20 mb-1" /> 
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-24 mb-1" /> 
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-16 mb-1" /> 
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-32 mb-1" /> 
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-28 mb-1" /> 
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full mt-4" />
          </div>
        </div>
      </PageTransition>
    )
  }
  
  if (error) {
    return (
      <PageTransition>
        <div className="container max-w-md py-6 pb-28">
          <PageHeader title="Erro ao Editar Gato" /> 
          <div className="mt-6">
            <EmptyState 
              icon={AlertTriangle}
              title="Erro ao Carregar"
              description={error || "Não foi possível carregar os dados deste gato."}
              actionLabel="Voltar para Gatos"
              actionHref="/cats"
            />
          </div>
        </div>
      </PageTransition>
    )
  }
  
  return (
    <PageTransition>
      <div className="container max-w-md py-6 pb-28">
        <PageHeader title={`Editar ${formData.name || "Gato"}`} />

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="flex justify-center">
            <ImageUpload
              value={formData.photoUrl}
              onChange={handlePhotoChange}
              type="cat"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">Nome *</Label>
            <Input 
              id="name" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              placeholder="Nome do gato" 
              required 
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="birthdate">Data de Nascimento</Label>
            <Input 
               id="birthdate" 
               name="birthdate" 
               type="date" 
               value={formData.birthdate} 
               onChange={handleChange} 
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="weight">Peso (kg)</Label>
            <Input 
              id="weight" 
              name="weight" 
              type="number" 
              step="0.1" 
              value={formData.weight} 
              onChange={handleChange} 
              placeholder="Ex: 4.5"
             />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="portion_size">Porção Recomendada (gramas)</Label>
             <Input
               id="portion_size"
               name="portion_size"
               type="number"
               step="1"
               placeholder="Ex: 50"
               value={formData.portion_size}
               onChange={handleChange}
             />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="feedingInterval">Intervalo Entre Refeições (horas) *</Label>
            <Input 
              id="feedingInterval" 
              name="feedingInterval" 
              type="number" 
              min="1" 
              max="24" 
              value={formData.feedingInterval} 
              onChange={handleChange} 
              required 
            />
            
            {(parseInt(formData.feedingInterval) < 1 || parseInt(formData.feedingInterval) > 24) && (
              <p className="text-sm text-destructive">O intervalo deve ser entre 1 e 24 horas.</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="restrictions">Restrições Alimentares</Label>
            <Textarea 
              id="restrictions" 
              name="restrictions" 
              value={formData.restrictions} 
              onChange={handleChange} 
              placeholder="Ex: Alergia a frango" 
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Observações Adicionais</Label>
            <Textarea 
              id="notes" 
              name="notes" 
              value={formData.notes} 
              onChange={handleChange} 
              placeholder="Ex: Prefere comer no quarto" 
            />
          </div>
          
          <Separator />

          <div className="flex flex-col sm:flex-row gap-3">
            <AlertDialog onOpenChange={(open) => !open && setIsDeleting(false)}> 
              <AlertDialogTrigger asChild>
                 <Button type="button" variant="destructive" className="w-full sm:w-auto" disabled={isSubmitting || isDeleting}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir Gato
                 </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                       Tem certeza que deseja excluir {cat?.name || "este gato"}? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                      {isDeleting ? <Loading text="Excluindo..." size="sm" /> : "Confirmar Exclusão"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <Button type="submit" className="w-full sm:flex-1" disabled={isSubmitting || isDeleting || isLoadingData}>
              {isSubmitting ? <Loading text="Salvando..." size="sm" /> : <><Save className="mr-2 h-4 w-4" /> Salvar Alterações</>}
            </Button>
          </div>
        </form>
      </div>
    </PageTransition>
  )
}
