"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
// Remove useAppContext if no longer needed, or keep if used for other purposes
// import { useAppContext } from "@/lib/context/AppContext"; 
import { useGlobalState } from "@/lib/context/global-state"; // Import useGlobalState
import { useLoading } from "@/lib/context/LoadingContext";

export function UserDataLoader() {
  const { data: session, update: updateSession } = useSession();
  // Get dispatch from useGlobalState
  const { dispatch } = useGlobalState(); 
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const hasAttemptedLoad = useRef(false);

  useEffect(() => {
    console.log("[UserDataLoader] useEffect triggered.");
    const loadData = async () => {
      console.log("[UserDataLoader] loadData started.");
      if (hasAttemptedLoad.current || !session?.user) {
        console.log(`[UserDataLoader] Skipping loadData: hasAttemptedLoad=${hasAttemptedLoad.current}, sessionUserExists=${!!session?.user}`);
        return;
      }

      console.log("[UserDataLoader] Conditions met, attempting to load user data.");
      const loadingId = "user-data-load";
      addLoadingOperation({
        id: loadingId,
        priority: 1,
        description: "Carregando dados do usuário..."
      });

      try {
        console.log("[UserDataLoader] Fetching /api/settings...");
        const response = await fetch('/api/settings');
        if (!response.ok) {
          console.error(`[UserDataLoader] Fetch /api/settings failed with status: ${response.status}`);
          throw new Error('Falha ao carregar configurações');
        }
        const userData = await response.json();
        console.log("[UserDataLoader] Fetched userData:", userData);
        
        const currentUser = {
          id: Number(userData.id),
          name: userData.name || session.user.name || "",
          email: userData.email || session.user.email || "",
          avatar: session.user.image || `https://api.dicebear.com/7.x/initials/svg?seed=${userData.name || session.user.name || 'U'}`,
          householdId: userData.householdId || null,
          preferences: {
            timezone: userData.timezone || "UTC",
            language: userData.language || "pt-BR",
            notifications: {
              pushEnabled: true,
              emailEnabled: true,
              feedingReminders: true,
              missedFeedingAlerts: true,
              householdUpdates: true,
            },
          },
          role: userData.role || "user"
        };

        console.log("[UserDataLoader] Prepared currentUser object:", currentUser);

        // Always update the session with the household ID from settings
        console.log("[UserDataLoader] Attempting to update session...");
        await updateSession({
          ...session,
          user: {
            ...session.user,
            householdId: userData.householdId || null
          }
        });
        console.log("[UserDataLoader] Session update potentially complete.");

        console.log("[UserDataLoader] Dispatching SET_CURRENT_USER...");
        dispatch({ type: "SET_CURRENT_USER", payload: currentUser });
        console.log("[UserDataLoader] Dispatched SET_CURRENT_USER.");
        hasAttemptedLoad.current = true;
        console.log("[UserDataLoader] Set hasAttemptedLoad to true.");
      } catch (error) {
        console.error("[UserDataLoader] Error during loadData:", error);
        hasAttemptedLoad.current = true;
        dispatch({ type: "SET_ERROR", payload: "Falha ao carregar dados. Por favor, recarregue a página." });
      } finally {
        removeLoadingOperation(loadingId);
      }
    };

    loadData();
  }, [session?.user, dispatch, addLoadingOperation, removeLoadingOperation, updateSession]);

  return null;
} 