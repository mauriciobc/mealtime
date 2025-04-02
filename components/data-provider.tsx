"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useAppContext } from "@/lib/context/AppContext"
import { useUserContext } from "@/lib/context/UserContext"
import { useLoading } from "@/lib/context/LoadingContext"
import { getCatsByHouseholdId } from "@/lib/services/apiService"
import { CatType, FeedingLog, Household } from "@/lib/types"
import { GlobalLoading } from "@/components/ui/global-loading"
import { UserDataLoader } from "./data/user-data-loader"
import { toast } from "sonner"

interface DataProviderProps {
  children: React.ReactNode
}

export function DataProvider({ children }: DataProviderProps) {
  const { data: session, status } = useSession()
  const { state: appState, dispatch: appDispatch } = useAppContext()
  const { state: userState } = useUserContext()
  const { currentUser } = userState
  const { addLoadingOperation, removeLoadingOperation, isLoading: isGlobalLoading } = useLoading()

  useEffect(() => {
    let isMounted = true
    let loadingId: string | null = null

    const loadInitialData = async () => {
      console.log("[DataProvider] Starting loadInitialData", {
        status,
        currentUser,
        householdId: currentUser?.householdId
      })

      if (status !== "authenticated" || !currentUser) {
        console.log("[DataProvider] Not authenticated or no user", { status, currentUser })
        return
      }

      const householdId = currentUser.householdId
      if (!householdId) {
        console.log("[DataProvider] No household ID")
        return
      }

      loadingId = "initial-app-data-load"
      addLoadingOperation({
        id: loadingId,
        priority: 1,
        description: "Carregando dados da aplicação..."
      })

      try {
        // Load households
        console.log("[DataProvider] Loading households...")
        const householdsResponse = await fetch('/api/households')
        if (!householdsResponse.ok) {
          throw new Error(`Erro ao carregar residências (${householdsResponse.status})`)
        }
        const households: Household[] = await householdsResponse.json()
        if (!isMounted) return
        console.log("[DataProvider] Households loaded:", households.length)
        appDispatch({ type: "SET_HOUSEHOLDS", payload: households })

        // Load cats
        console.log("[DataProvider] Loading cats for household:", householdId)
        const cats: CatType[] = await getCatsByHouseholdId(householdId)
        if (!isMounted) return
        console.log("[DataProvider] Cats loaded:", cats.length)
        appDispatch({ type: "SET_CATS", payload: cats })

        // Load feedings
        console.log("[DataProvider] Loading feedings for household:", householdId)
        const feedingsResponse = await fetch(`/api/feedings?householdId=${householdId}`)
        if (!feedingsResponse.ok) {
          const errorText = await feedingsResponse.text()
          console.error("[DataProvider] Feedings response error:", {
            status: feedingsResponse.status,
            statusText: feedingsResponse.statusText,
            body: errorText
          })
          throw new Error(`Erro ao carregar alimentações (${feedingsResponse.status}): ${errorText}`)
        }
        const feedingsData: FeedingLog[] = await feedingsResponse.json()
        if (!isMounted) return
        console.log("[DataProvider] Feedings loaded:", feedingsData.length)
        appDispatch({ type: "SET_FEEDING_LOGS", payload: feedingsData })

        console.log("[DataProvider] All data loaded successfully")
      } catch (error: any) {
        console.error("[DataProvider] Error loading initial data:", error)
        if (isMounted) {
          toast.error(`Erro ao carregar dados: ${error.message}`)
        }
      } finally {
        if (isMounted && loadingId) {
          removeLoadingOperation(loadingId)
        }
      }
    }

    loadInitialData()

    return () => {
      isMounted = false
      if (loadingId) {
        removeLoadingOperation(loadingId)
      }
    }
  }, [status, currentUser?.id, currentUser?.householdId, appDispatch, addLoadingOperation, removeLoadingOperation, currentUser])

  return (
    <>
      <GlobalLoading />
      <UserDataLoader />
      {children}
    </>
  )
} 