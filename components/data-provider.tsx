"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useGlobalState } from "@/lib/context/global-state"
import { getCatsByHouseholdId } from "@/lib/services/apiService"
import { CatType } from "@/lib/types"

interface DataProviderProps {
  children: React.ReactNode
}

export function DataProvider({ children }: DataProviderProps) {
  const { data: session } = useSession()
  const { state, dispatch } = useGlobalState()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadInitialData = async () => {
      if (!session?.user) return

      try {
        // Carregar domicílios do usuário (mockado ou da API)
        const households = await fetch('/api/households').then(res => res.json())
        .catch(err => {
          console.error("Erro ao carregar domicílios:", err)
          return []
        })

        if (households && households.length > 0) {
          // Atualizar estado global com os domicílios
          households.forEach((household: any) => {
            dispatch({
              type: "ADD_HOUSEHOLD",
              payload: household,
            })
          })

          // Carregar gatos do domicílio principal
          try {
            const primaryHousehold = households[0] // Assumindo que o primeiro é o principal
            const cats = await getCatsByHouseholdId(primaryHousehold.id)
            
            if (cats && cats.length > 0) {
              // Atualizar estado global com os gatos
              dispatch({
                type: "SET_CATS",
                payload: cats,
              })
            }
          } catch (error) {
            console.error("Erro ao carregar gatos do domicílio:", error)
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user) {
      loadInitialData()
    }
  }, [session, dispatch])

  return <>{children}</>
} 