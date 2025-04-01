"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useGlobalState } from "@/lib/context/global-state"
import { useAppContext } from "@/lib/context/AppContext"
import { useLoading } from "@/lib/context/LoadingContext"
import { getCatsByHouseholdId } from "@/lib/services/apiService"
import { CatType } from "@/lib/types"
import { GlobalLoading } from "@/components/ui/global-loading"
import { UserDataLoader } from "./data/user-data-loader"

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
      if (!session?.user || !globalState.currentUser) {
        console.log("Aguardando sessão e globalState.currentUser...");
        return;
      }

      const householdId = globalState.currentUser.householdId;
      if (!householdId) {
        console.log("DataProvider: currentUser existe, mas sem householdId. Não é possível carregar gatos.");
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
          const cats = await getCatsByHouseholdId(householdId)
          
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
  }, [session?.user?.email, globalState.currentUser?.id, globalDispatch, addLoadingOperation, removeLoadingOperation])

  return (
    <>
      <GlobalLoading />
      <UserDataLoader />
      {children}
    </>
  )
} 