"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useAppContext } from "@/lib/context/AppContext";
import { useLoading } from "@/lib/context/LoadingContext";

export function UserDataLoader() {
  const { data: session } = useSession();
  const { dispatch } = useAppContext();
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const hasAttemptedLoad = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      if (hasAttemptedLoad.current || !session?.user) {
        return;
      }

      const loadingId = "user-data-load";
      addLoadingOperation({
        id: loadingId,
        priority: 1,
        description: "Carregando dados do usuário..."
      });

      try {
        const response = await fetch('/api/settings');
        if (!response.ok) {
          throw new Error('Falha ao carregar configurações');
        }
        const userData = await response.json();
        
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

        dispatch({ type: "SET_CURRENT_USER", payload: currentUser });
        hasAttemptedLoad.current = true;
      } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
        hasAttemptedLoad.current = true;
        dispatch({ type: "SET_ERROR", payload: "Falha ao carregar dados. Por favor, recarregue a página." });
      } finally {
        removeLoadingOperation(loadingId);
      }
    };

    loadData();
  }, [session?.user, dispatch, addLoadingOperation, removeLoadingOperation]);

  return null;
} 