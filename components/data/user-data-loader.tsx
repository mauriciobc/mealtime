"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
// Remove useAppContext if no longer needed, or keep if used for other purposes
// import { useAppContext } from "@/lib/context/AppContext"; 
// import { useGlobalState } from "@/lib/context/global-state"; // Import useGlobalState
import { useUserContext } from "@/lib/context/UserContext"; // Added
import { useLoading } from "@/lib/context/LoadingContext";
import { toast } from "sonner"; // Added for error reporting

export function UserDataLoader() {
  const { data: session, update: updateSession, status } = useSession();
  // Get dispatch from useGlobalState
  // const { dispatch } = useGlobalState(); 
  const { dispatch: userDispatch } = useUserContext(); // Removed unused userState import
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const hasAttemptedLoad = useRef(false);
  const loadingId = useRef("user-data-load-" + Math.random().toString(36).substring(2, 9));

  // Extract email *outside* both effects to use in dependency arrays
  const userEmail = session?.user?.email;

  useEffect(() => {
    // Reset hasAttemptedLoad when the user email changes (login/logout)
    hasAttemptedLoad.current = false;
  }, [userEmail]); // Depend only on userEmail

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const currentLoadingId = loadingId.current;

    const loadData = async () => {
      // Use the userEmail variable from the outer scope
      // Ensure status is authenticated as well before proceeding
      if (status !== "authenticated" || !userEmail || !isMounted) return; 
      
      console.log("[UserDataLoader] Starting user data load", { 
          /* logs */ 
          userEmail 
      });

      addLoadingOperation({ 
          id: currentLoadingId, 
          priority: 1, 
          description: "Carregando dados do usuário..." 
      });

      try {
        console.log("[UserDataLoader] Preparing to fetch user settings");
        console.log("[UserDataLoader] Current session token:", session?.token || 'No token');

        const response = await fetch('/api/settings', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            credentials: 'include',
            signal: controller.signal 
        });

        if (!isMounted) return;
        
        const textData = await response.text();
        if (!isMounted) return;
        
        let userData;
        try {
          userData = JSON.parse(textData);
        } catch (parseError) {
          console.error("[UserDataLoader] JSON parse error:", parseError, "Raw text:", textData);
          throw new Error('Erro ao processar resposta do servidor.');
        }

        if (!response.ok) {
          throw new Error(userData.error || `Falha ao carregar dados (${response.status})`);
        }
        
        if (!session?.user) { // Check session?.user still exists
            throw new Error('Sessão do usuário não encontrada ao processar dados.');
        }

        // --- Restore currentUser creation logic --- 
        const currentUser = {
          id: Number(userData.id),
          name: userData.name || session.user.name || "",
          email: userData.email || session.user.email || "",
          householdId: userData.householdId || null,
          role: userData.role || "member",
          // Ensure preferences exist and have the expected structure
          preferences: userData.preferences && typeof userData.preferences === 'object' ? {
            timezone: userData.preferences.timezone || "UTC",
            language: userData.preferences.language || "pt-BR",
            notifications: userData.preferences.notifications && typeof userData.preferences.notifications === 'object' ? {
              pushEnabled: userData.preferences.notifications.pushEnabled !== undefined ? userData.preferences.notifications.pushEnabled : true,
              emailEnabled: userData.preferences.notifications.emailEnabled !== undefined ? userData.preferences.notifications.emailEnabled : true,
              feedingReminders: userData.preferences.notifications.feedingReminders !== undefined ? userData.preferences.notifications.feedingReminders : true,
              missedFeedingAlerts: userData.preferences.notifications.missedFeedingAlerts !== undefined ? userData.preferences.notifications.missedFeedingAlerts : true,
              householdUpdates: userData.preferences.notifications.householdUpdates !== undefined ? userData.preferences.notifications.householdUpdates : true
            } : { // Default notifications if missing
              pushEnabled: true, emailEnabled: true, feedingReminders: true, missedFeedingAlerts: true, householdUpdates: true
            }
          } : { // Default preferences if missing
            timezone: "UTC", language: "pt-BR", notifications: {
              pushEnabled: true, emailEnabled: true, feedingReminders: true, missedFeedingAlerts: true, householdUpdates: true
            }
          }
        };
        // --- End of restored logic --- 

        console.log("[UserDataLoader] Processed user data:", currentUser);

        // Update session if householdId differs (optional)
        const currentSessionHouseholdId = session.user.householdId;
        if (currentUser.householdId !== currentSessionHouseholdId) {
          console.log("[UserDataLoader] Updating session with new household ID");
          try {
            await updateSession({
              ...session,
              user: {
                ...session.user,
                householdId: currentUser.householdId
              }
            });
          } catch (updateError) {
            console.error("[UserDataLoader] Session update failed:", updateError);
          }
        }

        console.log("[UserDataLoader] Dispatching SET_CURRENT_USER");
        userDispatch({ type: "SET_CURRENT_USER", payload: currentUser });
        hasAttemptedLoad.current = true;

      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log("[UserDataLoader] Fetch aborted (expected).", { currentLoadingId });
        } else {
          console.error("[UserDataLoader] Error during loadData:", { error, currentLoadingId });
          toast.error(`Erro ao carregar dados: ${error.message}`);
          if (isMounted) {
            userDispatch({ type: "SET_CURRENT_USER", payload: null });
          }
        }
        // Catch block ends here
      } finally {
        // Finally block correctly attached
        if (isMounted) {
          console.log("[UserDataLoader] Removing loading operation", { currentLoadingId });
          removeLoadingOperation(currentLoadingId);
        }
      } // Finally block ends here
    }; // loadData function ends here

    // Trigger loadData only if authenticated and load hasn't been attempted for this user
    if (status === "authenticated" && userEmail && !hasAttemptedLoad.current) {
      loadData();
    }

    // Cleanup function
    return () => {
      isMounted = false;
      console.log(`[UserDataLoader] Cleanup: Aborting fetch`, { currentLoadingId });
      controller.abort();
      removeLoadingOperation(currentLoadingId);
    };
    // Correct dependency array using the variable defined outside
  }, [status, userEmail, userDispatch, updateSession, addLoadingOperation, removeLoadingOperation, session]);

  return null;
} 