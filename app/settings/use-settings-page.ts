"use client"

import { useReducer, useEffect, type Dispatch, type SetStateAction } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useLoading } from "@/lib/context/LoadingContext"
import { useUserContext } from "@/lib/context/UserContext"
import { useHousehold } from "@/lib/context/HouseholdContext"
import { useHouseholdDetail } from "@/lib/hooks/useHouseholdDetail"
import { NotificationSettings } from "@/lib/types"

const defaultNotificationSettings: NotificationSettings = {
  pushEnabled: true,
  emailEnabled: false,
  feedingReminders: true,
  missedFeedingAlerts: true,
  householdUpdates: true,
};

type SettingsLocalState = {
  isProfileModalOpen: boolean;
  isRegionalModalOpen: boolean;
  isNotificationModalOpen: boolean;
  isHouseholdModalOpen: boolean;
  isLeaveHouseholdConfirmOpen: boolean;
  editName: string;
  editAvatar: string;
  editLanguage: string;
  editTimezone: string;
  editNotifications: NotificationSettings;
  householdCode: string;
  newHouseholdName: string;
  modalError: string | null;
};

type SettingsLocalAction =
  | { type: 'SET_MODAL'; modal: 'profile' | 'regional' | 'notification' | 'household' | 'leaveConfirm'; value: boolean }
  | { type: 'SET_EDIT_NAME'; value: string }
  | { type: 'SET_EDIT_AVATAR'; value: string }
  | { type: 'SET_EDIT_LANGUAGE'; value: string }
  | { type: 'SET_EDIT_TIMEZONE'; value: string }
  | { type: 'SET_EDIT_NOTIFICATIONS'; value: NotificationSettings }
  | { type: 'SET_HOUSEHOLD_CODE'; value: string }
  | { type: 'SET_NEW_HOUSEHOLD_NAME'; value: string }
  | { type: 'SET_MODAL_ERROR'; value: string | null }
  | { type: 'INIT_PROFILE_EDIT'; name: string; avatar: string }
  | { type: 'INIT_REGIONAL_EDIT'; language: string; timezone: string }
  | { type: 'INIT_NOTIFICATIONS_EDIT'; notifications: NotificationSettings }
  | { type: 'INIT_HOUSEHOLD_MODAL' };

const initialSettingsLocalState: SettingsLocalState = {
  isProfileModalOpen: false,
  isRegionalModalOpen: false,
  isNotificationModalOpen: false,
  isHouseholdModalOpen: false,
  isLeaveHouseholdConfirmOpen: false,
  editName: "",
  editAvatar: "",
  editLanguage: "pt-BR",
  editTimezone: "America/Sao_Paulo",
  editNotifications: defaultNotificationSettings,
  householdCode: "",
  newHouseholdName: "",
  modalError: null,
};

function settingsLocalReducer(state: SettingsLocalState, action: SettingsLocalAction): SettingsLocalState {
  switch (action.type) {
    case 'SET_MODAL':
      return {
        ...state,
        ...(action.modal === 'profile' ? { isProfileModalOpen: action.value } : {}),
        ...(action.modal === 'regional' ? { isRegionalModalOpen: action.value } : {}),
        ...(action.modal === 'notification' ? { isNotificationModalOpen: action.value } : {}),
        ...(action.modal === 'household' ? { isHouseholdModalOpen: action.value } : {}),
        ...(action.modal === 'leaveConfirm' ? { isLeaveHouseholdConfirmOpen: action.value } : {}),
      };
    case 'SET_EDIT_NAME':
      return { ...state, editName: action.value };
    case 'SET_EDIT_AVATAR':
      return { ...state, editAvatar: action.value };
    case 'SET_EDIT_LANGUAGE':
      return { ...state, editLanguage: action.value };
    case 'SET_EDIT_TIMEZONE':
      return { ...state, editTimezone: action.value };
    case 'SET_EDIT_NOTIFICATIONS':
      return { ...state, editNotifications: action.value };
    case 'SET_HOUSEHOLD_CODE':
      return { ...state, householdCode: action.value };
    case 'SET_NEW_HOUSEHOLD_NAME':
      return { ...state, newHouseholdName: action.value };
    case 'SET_MODAL_ERROR':
      return { ...state, modalError: action.value };
    case 'INIT_PROFILE_EDIT':
      return { ...state, editName: action.name, editAvatar: action.avatar, modalError: null, isProfileModalOpen: true };
    case 'INIT_REGIONAL_EDIT':
      return { ...state, editLanguage: action.language, editTimezone: action.timezone, modalError: null, isRegionalModalOpen: true };
    case 'INIT_NOTIFICATIONS_EDIT':
      return { ...state, editNotifications: action.notifications, modalError: null, isNotificationModalOpen: true };
    case 'INIT_HOUSEHOLD_MODAL':
      return { ...state, householdCode: "", newHouseholdName: "", modalError: null, isHouseholdModalOpen: true };
    default:
      return state;
  }
}

export function useSettingsPage() {
  const router = useRouter();
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const userContext = useUserContext();
  const { state: userState } = userContext;
  const { currentUser, isLoading: isLoadingUser, error: errorUser } = userState;
  const { state: householdState } = useHousehold();
  const { isLoading: isLoadingHouseholds, error: errorHousehold } = householdState;

  const [localState, dispatch] = useReducer(settingsLocalReducer, initialSettingsLocalState);
  const {
    isProfileModalOpen,
    isRegionalModalOpen,
    isNotificationModalOpen,
    isHouseholdModalOpen,
    isLeaveHouseholdConfirmOpen,
    editName,
    editAvatar,
    editLanguage,
    editTimezone,
    editNotifications,
    householdCode,
    newHouseholdName,
    modalError,
  } = localState;

  const { data: householdDetailData, isLoading: isHouseholdDetailLoading, error: householdDetailError } = useHouseholdDetail(currentUser?.householdId ?? undefined, currentUser?.id ?? undefined);
  const householdDetails = householdDetailData ?? null;
  const isHouseholdLoading = isHouseholdDetailLoading;

  const handleEditProfile = () => {
    if (!currentUser) return;
    dispatch({
      type: 'INIT_PROFILE_EDIT',
      name: currentUser.name || "",
      avatar: currentUser.avatar || "",
    });
  };

  const handleEditRegional = () => {
    if (!currentUser) return;
    dispatch({
      type: 'INIT_REGIONAL_EDIT',
      language: currentUser.preferences?.language || "pt-BR",
      timezone: currentUser.preferences?.timezone || "America/Sao_Paulo",
    });
  };

  const handleEditNotifications = () => {
    if (!currentUser) return;
    dispatch({
      type: 'INIT_NOTIFICATIONS_EDIT',
      notifications: currentUser.preferences?.notifications || defaultNotificationSettings,
    });
  };

  const handleManageHousehold = () => {
    if (!currentUser) return;
    if (householdDetailError) {
      toast.error(`Erro ao carregar residência: ${householdDetailError instanceof Error ? householdDetailError.message : "Erro desconhecido"}`);
    }
    dispatch({ type: 'INIT_HOUSEHOLD_MODAL' });
  };

  const handleSave = async (operation: string, endpoint: string, payload: any, successMessage: string) => {
    const opId = `save-${operation}-${Date.now()}`;
    addLoadingOperation({ id: opId, priority: 1, description: `Salvando ${operation}...` });
    dispatch({ type: 'SET_MODAL_ERROR', value: null });
    let success = false;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Falha ao salvar");
      }

      const updatedUser = await response.json();
      if (updatedUser && updatedUser.user) {
        await userContext.refreshUser();
        toast.success(successMessage);
        success = true;
      } else {
        throw new Error("Resposta inválida do servidor");
      }
    } catch (error: any) {
      console.error(`Error saving ${operation}:`, error);
      toast.error(`Erro ao salvar ${operation}: ${error.message}`);
      dispatch({ type: 'SET_MODAL_ERROR', value: error.message });
    } finally {
      removeLoadingOperation(opId);
    }
    return success;
  };

  const handleJoinHousehold = async () => {
    if (!householdCode.trim()) {
      dispatch({ type: 'SET_MODAL_ERROR', value: "Por favor, insira o código da residência." });
      return;
    }
    const opId = `join-household-${Date.now()}`;
    addLoadingOperation({ id: opId, priority: 1, description: "Entrando na residência..." });
    dispatch({ type: 'SET_MODAL_ERROR', value: null });
    try {
      const response = await fetch('/api/households/join', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: householdCode }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Falha ao entrar na residência. Status: ${response.status}`);
      }
      await userContext.refreshUser();
      toast.success("Você entrou na residência com sucesso!");
      dispatch({ type: 'SET_MODAL', modal: 'household', value: false });
    } catch (error: any) {
      console.error("Erro ao entrar na residência:", error);
      toast.error(`Erro: ${error.message}`);
      dispatch({ type: 'SET_MODAL_ERROR', value: error.message });
    } finally {
      removeLoadingOperation(opId);
    }
  };

  const handleCreateHousehold = async () => {
    if (!newHouseholdName.trim()) {
      dispatch({ type: 'SET_MODAL_ERROR', value: "Por favor, insira um nome para a nova residência." });
      return;
    }
    const opId = `create-household-${Date.now()}`;
    addLoadingOperation({ id: opId, priority: 1, description: "Criando residência..." });
    dispatch({ type: 'SET_MODAL_ERROR', value: null });
    try {
      const response = await fetch('/api/households', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newHouseholdName }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Falha ao criar residência. Status: ${response.status}`);
      }
      await userContext.refreshUser();
      toast.success("Residência criada com sucesso!");
      dispatch({ type: 'SET_MODAL', modal: 'household', value: false });
    } catch (error: any) {
      console.error("Erro ao criar residência:", error);
      toast.error(`Erro: ${error.message}`);
      dispatch({ type: 'SET_MODAL_ERROR', value: error.message });
    } finally {
      removeLoadingOperation(opId);
    }
  };

  const handleLeaveHousehold = async () => {
    if (!currentUser?.householdId) return;
    const opId = `leave-household-${Date.now()}`;
    addLoadingOperation({ id: opId, priority: 1, description: "Saindo da residência..." });
    dispatch({ type: 'SET_MODAL_ERROR', value: null });
    try {
      const response = await fetch(`/api/households/${currentUser.householdId}/leave`, {
        method: "POST",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Falha ao sair da residência. Status: ${response.status}`);
      }
      await userContext.refreshUser();
      toast.success("Você saiu da residência.");
      dispatch({ type: 'SET_MODAL', modal: 'leaveConfirm', value: false });
      dispatch({ type: 'SET_MODAL', modal: 'household', value: false });
    } catch (error: any) {
      console.error("Erro ao sair da residência:", error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      removeLoadingOperation(opId);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    const success = await handleSave(
      "profile",
      `/api/users/${currentUser.id}/profile`,
      { name: editName, avatar: editAvatar },
      "Perfil atualizado com sucesso!"
    );
    if (success) dispatch({ type: 'SET_MODAL', modal: 'profile', value: false });
  };

  const handleSaveRegional = async () => {
    if (!currentUser) return;
    const success = await handleSave(
      "regional",
      `/api/users/${currentUser.id}/preferences`,
      { language: editLanguage, timezone: editTimezone },
      "Preferências regionais salvas!"
    );
    if (success) dispatch({ type: 'SET_MODAL', modal: 'regional', value: false });
  };

  const handleSaveNotifications = async () => {
    if (!currentUser) return;
    const fullSettings = { ...defaultNotificationSettings, ...editNotifications };
    const success = await handleSave(
      "notifications",
      `/api/users/${currentUser.id}/preferences`,
      { notifications: fullSettings },
      "Preferências de notificação salvas!"
    );
    if (success) dispatch({ type: 'SET_MODAL', modal: 'notification', value: false });
  };

  const handleLogout = async () => {
    const opId = "logout-op";
    addLoadingOperation({ id: opId, priority: 1, description: "Logging out..." });
    try {
      await userContext.signOut();
      toast.success("Logout realizado com sucesso!");
      router.push('/login');
    } catch (error: any) {
      console.error("Error during logout:", error);
      toast.error(`Erro ao fazer logout: ${error.message}`);
    } finally {
      removeLoadingOperation(opId);
    }
  };

  const isLoading = isLoadingUser || isLoadingHouseholds;
  const combinedError = errorUser || errorHousehold;

  return {
    currentUser,
    isLoading,
    combinedError,
    householdDetails,
    isHouseholdLoading,
    handleEditProfile,
    handleEditRegional,
    handleEditNotifications,
    handleManageHousehold,
    handleLogout,
    modalError,
    isProfileModalOpen,
    setIsProfileModalOpen: (value: boolean) => dispatch({ type: 'SET_MODAL', modal: 'profile', value }),
    editName,
    setEditName: (value: string) => dispatch({ type: 'SET_EDIT_NAME', value }),
    editAvatar,
    setEditAvatar: (value: string) => dispatch({ type: 'SET_EDIT_AVATAR', value }),
    handleSaveProfile,
    isRegionalModalOpen,
    setIsRegionalModalOpen: (value: boolean) => dispatch({ type: 'SET_MODAL', modal: 'regional', value }),
    editLanguage,
    setEditLanguage: (value: string) => dispatch({ type: 'SET_EDIT_LANGUAGE', value }),
    editTimezone,
    setEditTimezone: (value: string) => dispatch({ type: 'SET_EDIT_TIMEZONE', value }),
    handleSaveRegional,
    isNotificationModalOpen,
    setIsNotificationModalOpen: (value: boolean) => dispatch({ type: 'SET_MODAL', modal: 'notification', value }),
    editNotifications,
    setEditNotifications: ((value: SetStateAction<NotificationSettings>) =>
      dispatch({
        type: 'SET_EDIT_NOTIFICATIONS',
        value: typeof value === 'function' ? value(editNotifications) : value,
      })) as Dispatch<SetStateAction<NotificationSettings>>,
    handleSaveNotifications,
    isHouseholdModalOpen,
    setIsHouseholdModalOpen: (value: boolean) => dispatch({ type: 'SET_MODAL', modal: 'household', value }),
    householdCode,
    setHouseholdCode: (value: string) => dispatch({ type: 'SET_HOUSEHOLD_CODE', value }),
    newHouseholdName,
    setNewHouseholdName: (value: string) => dispatch({ type: 'SET_NEW_HOUSEHOLD_NAME', value }),
    handleJoinHousehold,
    handleCreateHousehold,
    isLeaveHouseholdConfirmOpen,
    setIsLeaveHouseholdConfirmOpen: (value: boolean) => dispatch({ type: 'SET_MODAL', modal: 'leaveConfirm', value }),
    handleLeaveHousehold,
  };
}
