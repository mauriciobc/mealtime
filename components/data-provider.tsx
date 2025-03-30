"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useGlobalState } from "@/lib/context/global-state"
import { useAppContext } from "@/lib/context/AppContext"
import { useLoading } from "@/lib/context/LoadingContext"
import { getCatsByHouseholdId } from "@/lib/services/apiService"
import { CatType } from "@/lib/types"
import { GlobalLoading } from "@/components/ui/global-loading"

interface DataProviderProps {
  children: React.ReactNode
}

export function DataProvider({ children }: DataProviderProps) {
  const { data: session } = useSession()
  const { state: globalState, dispatch: globalDispatch } = useGlobalState()
  const { state: appState } = useAppContext()
  const { addLoadingOperation, removeLoadingOperation } = useLoading()

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      if (!session?.user || !appState.currentUser) {
        console.log("Aguardando dados do usuário...");
        return;
      }

      const loadingId = "initial-data-load"
      addLoadingOperation({
        id: loadingId,
        priority: 1,
        description: "Carregando dados iniciais..."
      })

      try {
        console.log("Iniciando carregamento de dados...");
        // Carregar domicílios do usuário
        const households = await fetch('/api/households').then(res => res.json())
          .catch(err => {
            console.error("Erro ao carregar domicílios:", err)
            return []
          })

        console.log("Domicílios carregados:", households);

        if (households && households.length > 0 && isMounted) {
          // Atualizar estado global com os domicílios
          globalDispatch({
            type: "SET_HOUSEHOLDS",
            payload: households
          })

          // Carregar gatos do domicílio principal
          const primaryHousehold = households[0]
          const cats = await getCatsByHouseholdId(primaryHousehold.id)
          
          console.log("Gatos carregados:", cats);
          
          if (cats && cats.length > 0 && isMounted) {
            globalDispatch({
              type: "SET_CATS",
              payload: cats,
            })
          }

          // Carregar logs de alimentação
          const feedingsResponse = await fetch('/api/feedings')
          if (feedingsResponse.ok && isMounted) {
            const feedingsData = await feedingsResponse.json()
            globalDispatch({
              type: "SET_FEEDING_LOGS",
              payload: feedingsData
            })
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error)
      } finally {
        if (isMounted) {
          removeLoadingOperation(loadingId)
        }
      }
    }

    loadInitialData()

    return () => {
      isMounted = false;
    }
  }, [session?.user?.email, appState.currentUser?.id])

  return (
    <>
      <GlobalLoading />
      {children}
    </>
  )
} 