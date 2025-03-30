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
    const loadInitialData = async () => {
      if (!session?.user || !appState.currentUser) return

      const loadingId = "initial-data-load"
      addLoadingOperation({
        id: loadingId,
        priority: 1,
        description: "Carregando dados iniciais..."
      })

      try {
        // Carregar domicílios do usuário
        const households = await fetch('/api/households').then(res => res.json())
          .catch(err => {
            console.error("Erro ao carregar domicílios:", err)
            return []
          })

        if (households && households.length > 0) {
          // Atualizar estado global com os domicílios
          globalDispatch({
            type: "SET_HOUSEHOLDS",
            payload: households
          })

          // Carregar gatos do domicílio principal
          const primaryHousehold = households[0]
          const cats = await getCatsByHouseholdId(primaryHousehold.id)
          
          if (cats && cats.length > 0) {
            globalDispatch({
              type: "SET_CATS",
              payload: cats,
            })
          }

          // Carregar logs de alimentação
          const feedingsResponse = await fetch('/api/feedings')
          if (feedingsResponse.ok) {
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
        removeLoadingOperation(loadingId)
      }
    }

    loadInitialData()
  }, [session, appState.currentUser])

  return (
    <>
      <GlobalLoading />
      {children}
    </>
  )
} 