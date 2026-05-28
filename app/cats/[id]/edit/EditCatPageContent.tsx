"use client"

import { useReducer, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useCats } from "@/lib/context/CatsContext"
import { useUserContext } from "@/lib/context/UserContext"
import { useLoading } from "@/lib/context/LoadingContext"
import { toast } from "sonner"
import { format, isValid } from "date-fns"
import { parseISO } from "date-fns/parseISO"
import { CatType } from "@/lib/types"
import { resolveDateFnsLocale } from "@/lib/utils/dateFnsLocale"
import {
  editCatReducer,
  initialEditCatState,
  initialFormData,
  EditCatFormSection,
  EditCatStateViews,
  type EditCatPageState,
} from "./edit-cat-page-sections"

interface EditCatPageContentProps {
  params: { id: string };
}

export default function EditCatPageContent({ params }: EditCatPageContentProps) {
  const router = useRouter()
  const { state: catsState, dispatch: catsDispatch } = useCats()
  const { state: userState } = useUserContext()
  const { addLoadingOperation, removeLoadingOperation } = useLoading()
  const { cats, error: errorCats } = catsState
  const { currentUser, isLoading: isLoadingUser, error: errorUser } = userState
  const [localState, dispatch] = useReducer(editCatReducer, initialEditCatState)
  const { cat, isLoadingData, isSubmitting, isDeleting, error, formData } = localState

  const userLanguage = userState.currentUser?.preferences?.language;
  const userLocale = resolveDateFnsLocale(userLanguage);

  useEffect(() => {
    if (!params.id || !currentUser) {
      console.log("EditCatPage useEffect: params.id or currentUser not available yet, waiting.");
      return; 
    }

    if (catsState.isLoading) {
        console.log("EditCatPage useEffect: CatsContext still loading, waiting...");
        dispatch({ type: 'SET_LOADING_DATA', value: true });
        return;
    }

    const catId = params.id;
    const opId = `load-cat-edit-${catId}`;
    addLoadingOperation({ id: opId, priority: 1, description: "Loading cat data..." });
    dispatch({ type: 'SET_LOADING_DATA', value: true });
    dispatch({ type: 'SET_ERROR', error: null });

    console.log(`EditCatPage useEffect: Attempting to find cat ${catId} for user ${currentUser.id} (household: ${currentUser.householdId})`);
    console.log(`EditCatPage useEffect: Cats available in context: ${cats.length}`);
    const foundCat = cats.find(c => String(c.id) === catId);
    console.log(`EditCatPage useEffect: Found cat?`, foundCat ? foundCat.id : 'No');
      
    if (foundCat) {
      console.log(`EditCatPage useEffect: Checking household match: Cat=${foundCat.householdId}, User=${currentUser.householdId}`);
      if (String(foundCat.householdId) !== String(currentUser.householdId)) {
        console.warn(`EditCatPage useEffect: Household mismatch!`);
        dispatch({
          type: 'LOAD_CAT',
          cat: null,
          formData: initialFormData,
          error: "Você não tem permissão para editar este gato.",
        });
      } else {
        console.log(`EditCatPage useEffect: Cat found and authorized. Setting data.`);
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
        
        dispatch({
          type: 'LOAD_CAT',
          cat: foundCat,
          formData: {
            name: foundCat.name,
            birthdate: formattedBirthdate,
            weight: foundCat.weight?.toString() || "",
            restrictions: foundCat.restrictions || "",
            photoUrl: foundCat.photo_url || "",
            gender: (foundCat.gender === "male" || foundCat.gender === "female") ? foundCat.gender : "",
            feedingInterval: foundCat.feeding_interval !== undefined && foundCat.feeding_interval !== null ? String(foundCat.feeding_interval) : "8",
            portion_size: foundCat.portion_size?.toString() || "",
            notes: foundCat.notes || "",
          },
          error: null,
        });
      }
    } else {
      console.warn(`EditCatPage useEffect: Cat ${catId} not found in CatsContext.`);
      dispatch({
        type: 'LOAD_CAT',
        cat: null,
        formData: initialFormData,
        error: "Gato não encontrado.",
      });
    }
    dispatch({ type: 'SET_LOADING_DATA', value: false });
    removeLoadingOperation(opId);
  }, [params.id, currentUser, cats, catsState.isLoading, addLoadingOperation, removeLoadingOperation, userLocale]);

  const handleDelete = async () => {
    if (!cat || !currentUser?.householdId || String(cat.householdId) !== String(currentUser.householdId)) {
      toast.error("Não é possível excluir: Gato inválido ou permissão negada.")
      return
    }
    
    const opId = `delete-cat-${cat.id}`
    addLoadingOperation({ id: opId, priority: 1, description: `Deleting ${cat.name}...` })
    dispatch({ type: 'SET_DELETING', value: true })
    const previousCats = cats
    
    catsDispatch({ type: "REMOVE_CAT", payload: cat.id })
    
    try {
      const headers: HeadersInit = {};
      if (currentUser?.id) {
          headers['X-User-ID'] = currentUser.id;
      } else {
          toast.error("Erro de autenticação ao excluir.");
          throw new Error("User ID missing for delete request");
      }
      
      const response = await fetch(`/api/cats/${cat.id}`, { 
          method: 'DELETE',
          headers: headers
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete cat on server')
      }
      toast.success(`${cat.name} foi excluído com sucesso`)
      router.push("/cats")
    } catch (error: any) {
      console.error("Erro ao excluir gato:", error)
      toast.error(`Falha ao excluir gato: ${error.message}`)
      catsDispatch({ type: "FETCH_SUCCESS", payload: previousCats })
    } finally {
      dispatch({ type: 'SET_DELETING', value: false })
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
    dispatch({ type: 'SET_SUBMITTING', value: true })
    
    try {
      const updatedData: Partial<CatType> = {
        name: formData.name.trim(),
        photo_url: formData.photoUrl || null,
        birthdate: formData.birthdate ? new Date(formData.birthdate) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        gender: (formData.gender === "male" || formData.gender === "female") ? formData.gender : null,
        restrictions: formData.restrictions?.trim() || null,
        feeding_interval: formData.feedingInterval ? parseInt(formData.feedingInterval) : null,
        portion_size: formData.portion_size ? String(formData.portion_size) : null,
        notes: formData.notes?.trim() || null,
      }
      
      if (updatedData.feeding_interval !== null && (isNaN(Number(updatedData.feeding_interval)) || Number(updatedData.feeding_interval) < 1 || Number(updatedData.feeding_interval) > 24)) {
        toast.error("Intervalo de alimentação deve ser entre 1 e 24 horas.")
        dispatch({ type: 'SET_SUBMITTING', value: false })
        removeLoadingOperation(opId)
        return
      }

      console.log('Sending update request with data:', updatedData)
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (currentUser?.id) {
          headers['X-User-ID'] = currentUser.id;
      } else {
          toast.error("Erro de autenticação ao salvar.");
          throw new Error("User ID missing for update request");
      }
      
      const response = await fetch(`/api/cats/${cat.id}`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(updatedData),
      })
      
      const responseData = await response.json()
      
      if (!response.ok) {
        console.error('Server response:', responseData)
        throw new Error(responseData.error || 'Failed to update cat on server')
      }
      
      console.log('Server response:', responseData)
      
      catsDispatch({
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
      dispatch({ type: 'SET_SUBMITTING', value: false })
      removeLoadingOperation(opId)
    }
  }

  const pageState = useMemo<EditCatPageState>(() => {
    if (isLoadingUser) return { type: 'LOADING_USER' };
    if (errorUser) return { type: 'ERROR_USER', error: errorUser };
    if (!currentUser) return { type: 'NO_USER' };
    if (errorCats) return { type: 'ERROR_CATS', error: errorCats };
    if (isLoadingData && !error) return { type: 'LOADING_CAT' };
    if (error) return { type: 'ERROR_CAT', error };
    if (!cat) return { type: 'NO_CAT' };
    return { type: 'READY', cat };
  }, [isLoadingUser, errorUser, currentUser, errorCats, isLoadingData, error, cat]);

  if (pageState.type !== 'READY') {
    return <EditCatStateViews pageState={pageState} />
  }

  return (
    <EditCatFormSection
      cat={pageState.cat}
      formData={formData}
      currentUserId={currentUser!.id}
      isSubmitting={isSubmitting}
      isLoadingData={isLoadingData}
      isDeleting={isDeleting}
      dispatch={dispatch}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
      onCancel={() => router.back()}
    />
  )
}
