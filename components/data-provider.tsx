"use client"

import { useEffect } from "react"
// import { useSession } from "next-auth/react" // No longer needed directly here
// import { useAppContext } from "@/lib/context/AppContext" // REMOVED
// import { useUserContext } from "@/lib/context/UserContext" // No longer needed directly here
// import { useLoading } from "@/lib/context/LoadingContext" // No longer needed directly here
// import { getCatsByHouseholdId } from "@/lib/services/apiService" // REMOVED
// import { CatType, FeedingLog, Household } from "@/lib/types" // REMOVED
import { GlobalLoading } from "@/components/ui/global-loading"
import { UserDataLoader } from "./data/user-data-loader" // Keep for now, might remove later
// import { toast } from "sonner" // No longer needed directly here

interface DataProviderProps {
  children: React.ReactNode
}

// This component might become redundant if UserDataLoader and GlobalLoading
// are moved to RootClientLayout or handled differently.
export function DataProvider({ children }: DataProviderProps) {
  // const { data: session, status } = useSession()
  // const { state: appState, dispatch: appDispatch } = useAppContext() // REMOVED
  // const { state: userState } = useUserContext()
  // const { currentUser } = userState
  // const { addLoadingOperation, removeLoadingOperation, isLoading: isGlobalLoading } = useLoading()

  // REMOVED useEffect hook that performed data fetching
  // useEffect(() => { ... }, [...] )

  // Consider if GlobalLoading should be triggered by LoadingContext directly
  // Consider if UserDataLoader is still necessary if UserProvider handles loading
  return (
    <>
      <GlobalLoading />
      <UserDataLoader />
      {children}
    </>
  )
} 