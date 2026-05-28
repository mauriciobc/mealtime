"use client"

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import PageTransition from "@/components/page-transition"
import { Loading } from "@/components/ui/loading"
import { PageHeader } from "@/components/page-header"
import { ImageUpload } from "@/components/ui/image-upload"
import { DateTimePicker } from "@/components/ui/datetime-picker-new"
import { CatType } from "@/lib/types"

export type EditCatPageState =
  | { type: 'LOADING_USER' }
  | { type: 'ERROR_USER'; error: string }
  | { type: 'NO_USER' }
  | { type: 'ERROR_CATS'; error: string }
  | { type: 'LOADING_CAT' }
  | { type: 'ERROR_CAT'; error: string }
  | { type: 'NO_CAT' }
  | { type: 'READY'; cat: CatType }

export type EditCatFormData = {
  name: string
  birthdate: string
  weight: string
  restrictions: string
  photoUrl: string
  gender: "" | "male" | "female"
  feedingInterval: string
  portion_size: string
  notes: string
}

export type EditCatLocalState = {
  cat: CatType | null
  isLoadingData: boolean
  isSubmitting: boolean
  isDeleting: boolean
  error: string | null
  formData: EditCatFormData
}

export type EditCatLocalAction =
  | { type: 'SET_LOADING_DATA'; value: boolean }
  | { type: 'SET_SUBMITTING'; value: boolean }
  | { type: 'SET_DELETING'; value: boolean }
  | { type: 'LOAD_CAT'; cat: CatType | null; formData: EditCatFormData; error: string | null }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'UPDATE_FORM'; field: keyof EditCatFormData; value: string }
  | { type: 'PATCH_FORM'; formData: Partial<EditCatFormData> }

export const initialFormData: EditCatFormData = {
  name: "",
  birthdate: "",
  weight: "",
  restrictions: "",
  photoUrl: "",
  gender: "",
  feedingInterval: "8",
  portion_size: "",
  notes: "",
}

export const initialEditCatState: EditCatLocalState = {
  cat: null,
  isLoadingData: true,
  isSubmitting: false,
  isDeleting: false,
  error: null,
  formData: initialFormData,
}

export function editCatReducer(state: EditCatLocalState, action: EditCatLocalAction): EditCatLocalState {
  switch (action.type) {
    case 'SET_LOADING_DATA':
      return { ...state, isLoadingData: action.value }
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.value }
    case 'SET_DELETING':
      return { ...state, isDeleting: action.value }
    case 'LOAD_CAT':
      return { ...state, cat: action.cat, formData: action.formData, error: action.error, isLoadingData: false }
    case 'SET_ERROR':
      return { ...state, error: action.error }
    case 'UPDATE_FORM':
      return { ...state, formData: { ...state.formData, [action.field]: action.value } }
    case 'PATCH_FORM':
      return { ...state, formData: { ...state.formData, ...action.formData } }
    default:
      return state
  }
}

type EditCatDispatch = React.Dispatch<
  | { type: 'UPDATE_FORM'; field: keyof EditCatFormData; value: string }
  | { type: 'PATCH_FORM'; formData: Partial<EditCatFormData> }
>

export function EditCatStateViews({ pageState }: { pageState: EditCatPageState }) {
  const router = useRouter()

  switch (pageState.type) {
    case 'LOADING_USER':
      return <Loading text="Verificando usuário..." />
    case 'ERROR_USER':
      return (
        <PageTransition>
          <div className="p-4 text-center">
            <p className="text-destructive">Erro ao carregar dados do usuário: {pageState.error}. Tente recarregar a página.</p>
            <Button onClick={() => router.back()} className="mt-4">Voltar</Button>
          </div>
        </PageTransition>
      )
    case 'NO_USER':
      return <Loading text="Redirecionando para login..." />
    case 'ERROR_CATS':
      return (
        <PageTransition>
          <div className="p-4 text-center">
            <p className="text-destructive">Erro ao carregar lista de gatos: {pageState.error}. Tente recarregar a página.</p>
            <Button onClick={() => router.back()} className="mt-4">Voltar</Button>
          </div>
        </PageTransition>
      )
    case 'LOADING_CAT':
      return <Loading text="Carregando dados do gato..." />
    case 'ERROR_CAT':
      return (
        <PageTransition>
          <div className="p-4 text-center">
            <p className="text-destructive">{pageState.error}</p>
            <Button onClick={() => router.push('/cats')} className="mt-4">Voltar para Meus Gatos</Button>
          </div>
        </PageTransition>
      )
    case 'NO_CAT':
      return (
        <PageTransition>
          <div className="p-4 text-center">
            <p className="text-muted-foreground">Não foi possível carregar os dados do gato.</p>
            <Button onClick={() => router.push('/cats')} className="mt-4">Voltar para Meus Gatos</Button>
          </div>
        </PageTransition>
      )
    default:
      return null
  }
}

type EditCatFormSectionProps = {
  cat: CatType
  formData: EditCatFormData
  currentUserId: string
  isSubmitting: boolean
  isLoadingData: boolean
  isDeleting: boolean
  dispatch: EditCatDispatch
  onSubmit: (e: React.FormEvent) => void
  onDelete: () => void
  onCancel: () => void
}

export function EditCatFormSection({
  cat,
  formData,
  currentUserId,
  isSubmitting,
  isLoadingData,
  isDeleting,
  dispatch,
  onSubmit,
  onDelete,
  onCancel,
}: EditCatFormSectionProps) {
  return (
    <PageTransition>
      <div className="container max-w-md p-4 pb-28">
        <PageHeader title={`Editar ${cat.name || "Gato"}`} />

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => dispatch({ type: 'UPDATE_FORM', field: 'name', value: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="photoUrl">Foto</Label>
              <div className="w-64 aspect-square flex items-center justify-center mx-auto">
                <ImageUpload
                  type="cat"
                  userId={currentUserId}
                  value={formData.photoUrl || ''}
                  onChange={(url) => dispatch({ type: 'PATCH_FORM', formData: { photoUrl: url } })}
                  maxSizeMB={50}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthdate">Data de Nascimento</Label>
              <DateTimePicker
                {...(formData.birthdate ? { value: new Date(formData.birthdate) } : {})}
                onChange={date => dispatch({ type: 'PATCH_FORM', formData: { birthdate: date ? date.toISOString().split('T')[0] ?? "" : "" } })}
                fromYear={1980}
                toYear={2030}
                placeholder="Selecione uma data"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                value={formData.weight || ''}
                onChange={(e) => dispatch({ type: 'UPDATE_FORM', field: 'weight', value: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Sexo</Label>
              <Select
                value={formData.gender || "none"}
                onValueChange={(v) => dispatch({ type: 'PATCH_FORM', formData: { gender: v === "none" ? "" : (v as "male" | "female") } })}
              >
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Não informado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não informado</SelectItem>
                  <SelectItem value="male">Macho</SelectItem>
                  <SelectItem value="female">Fêmea</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="restrictions">Restrições Alimentares</Label>
              <Textarea
                id="restrictions"
                value={formData.restrictions || ''}
                onChange={(e) => dispatch({ type: 'UPDATE_FORM', field: 'restrictions', value: e.target.value })}
                placeholder="Alergias, intolerâncias..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedingInterval">Intervalo de Alimentação (horas)</Label>
              <Input
                id="feedingInterval"
                type="number"
                min="1"
                max="24"
                value={formData.feedingInterval || ''}
                onChange={(e) => dispatch({ type: 'UPDATE_FORM', field: 'feedingInterval', value: e.target.value })}
                placeholder="6"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="portion_size">Tamanho da Porção (gramas)</Label>
              <Input
                id="portion_size"
                type="number"
                step="0.1"
                value={formData.portion_size || ''}
                onChange={(e) => dispatch({ type: 'UPDATE_FORM', field: 'portion_size', value: e.target.value })}
                placeholder="0.0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => dispatch({ type: 'UPDATE_FORM', field: 'notes', value: e.target.value })}
                placeholder="Outras informações importantes..."
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingData}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting || isLoadingData}
              onClick={onDelete}
              className="w-full"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir Gato'
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </PageTransition>
  )
}
