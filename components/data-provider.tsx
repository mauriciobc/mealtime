"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useGlobalState } from "@/lib/context/global-state"
import { useAppContext } from "@/lib/context/AppContext"
import { getCatsByHouseholdId } from "@/lib/services/apiService"
import { CatType } from "@/lib/types"
import LoadingSpinner from "@/components/loading-spinner"

interface DataProviderProps {
  children: React.ReactNode
}

export function DataProvider({ children }: DataProviderProps) {
  const { data: session } = useSession()
  const { state: globalState, dispatch: globalDispatch } = useGlobalState()
  const { state: appState } = useAppContext()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadInitialData = async () => {
      if (!session?.user || !appState.currentUser) return

      try {
        setIsLoading(true)
        setError(null)

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
        setError("Falha ao carregar dados. Por favor, recarregue a página.")
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [session, appState.currentUser, globalDispatch])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={32} />
      </div>
    )
  }

  return <>{children}</>
} 