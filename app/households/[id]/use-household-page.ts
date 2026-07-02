"use client";

import { useReducer, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHouseholdDetail } from "@/lib/hooks/useHouseholdDetail";
import { toast } from "sonner";
import { useHousehold } from "@/lib/context/HouseholdContext";
import { useCats } from "@/lib/context/CatsContext";
import { useUserContext } from "@/lib/context/UserContext";
import { useLoading } from "@/lib/context/LoadingContext";
import { resolveDateFnsLocale } from "@/lib/utils/dateFnsLocale";
import {
  householdPageReducer,
  initialHouseholdPageState,
} from "./household-page-reducer";

export function useHouseholdPage(householdId: string) {
  const router = useRouter();
  const { state: householdState, dispatch: householdDispatch } = useHousehold();
  const { state: userState } = useUserContext();
  const { state: catsState } = useCats();
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const { error: errorHousehold } = householdState;
  const { currentUser, isLoading: isLoadingUser, error: errorUser } = userState;
  const { cats: allCats, isLoading: isLoadingCats, error: errorCats } = catsState;

  const [localState, pageDispatch] = useReducer(householdPageReducer, initialHouseholdPageState);
  const {
    household,
    cats,
    activeTab,
    memberToRemove,
    memberToPromote,
    memberToDemote,
    catToDelete,
    isProcessing,
  } = localState;

  const {
    data: householdData,
    isLoading: isLoadingData,
    error: householdQueryError,
  } = useHouseholdDetail(householdId, currentUser?.id);
  const loadError = householdQueryError
    ? householdQueryError instanceof Error
      ? householdQueryError.message
      : "Failed to load household"
    : null;

  const userLanguage = userState.currentUser?.preferences?.language;
  const _userLocale = resolveDateFnsLocale(userLanguage);

  const isCurrentUserAdmin = () => {
    if (!household || !currentUser) return false;
    if (String(household.owner?.id) === String(currentUser.id)) return true;
    const currentUserMember = household.members?.find(
      (member) => String(member.userId) === String(currentUser.id)
    );
    return currentUserMember?.role?.toLowerCase() === "admin";
  };

  const leaveHousehold = async () => {
    if (!household || !currentUser) return;
    const opId = "leave-household";
    addLoadingOperation({ id: opId, priority: 1, description: "Leaving household..." });
    pageDispatch({ type: "SET_PROCESSING", value: true });
    try {
      const response = await fetch(`/api/households/${household.id}/members/${currentUser.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Falha ao sair da residência");
      }

      householdDispatch({
        type: "REMOVE_MEMBER",
        payload: {
          id: String(currentUser.id),
          name: currentUser.name || "",
          role: "member",
        },
      });

      toast.success("Você saiu da residência.");
      router.push("/households");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro ao sair: ${message}`);
    } finally {
      pageDispatch({ type: "SET_SHOW_LEAVE_DIALOG", value: false });
      pageDispatch({ type: "SET_PROCESSING", value: false });
      removeLoadingOperation(opId);
    }
  };

  const deleteHousehold = async () => {
    if (!household || !currentUser || !isCurrentUserAdmin()) return;
    const opId = "delete-household";
    addLoadingOperation({ id: opId, priority: 1, description: "Deleting household..." });
    pageDispatch({ type: "SET_PROCESSING", value: true });
    try {
      const response = await fetch(`/api/households/${household.id}`, {
        method: "DELETE",
        headers: {
          "X-User-ID": currentUser.id,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Falha ao excluir residência");
      }

      householdDispatch({ type: "SET_HOUSEHOLD", payload: undefined });
      toast.success("Residência excluída com sucesso.");
      router.push("/households");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro ao excluir: ${message}`);
    } finally {
      pageDispatch({ type: "SET_SHOW_DELETE_HOUSEHOLD_DIALOG", value: false });
      pageDispatch({ type: "SET_PROCESSING", value: false });
      removeLoadingOperation(opId);
    }
  };

  const changeMemberRole = async (memberId: string, newRole: "Admin" | "Member") => {
    if (!household || !currentUser || !isCurrentUserAdmin()) return;
    const opId = `change-member-role-${memberId}`;
    addLoadingOperation({ id: opId, priority: 1, description: "Updating member role..." });
    pageDispatch({ type: "SET_PROCESSING", value: true });
    try {
      const response = await fetch(`/api/households/${household.id}/members/${memberId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": currentUser.id,
        },
        body: JSON.stringify({ role: newRole.toLowerCase() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Falha ao atualizar função do membro");
      }

      const updatedHousehold = await response.json();
      householdDispatch({ type: "SET_HOUSEHOLD", payload: updatedHousehold });
      toast.success(`Membro ${newRole === "Admin" ? "promovido" : "rebaixado"} com sucesso.`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro ao atualizar: ${message}`);
    } finally {
      pageDispatch({ type: "CLEAR_MEMBER_DIALOGS" });
      pageDispatch({ type: "SET_PROCESSING", value: false });
      removeLoadingOperation(opId);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!household || !currentUser || !isCurrentUserAdmin()) return;
    const opId = `remove-member-${memberId}`;
    addLoadingOperation({ id: opId, priority: 1, description: "Removing member..." });
    pageDispatch({ type: "SET_PROCESSING", value: true });
    try {
      const response = await fetch(`/api/households/${household.id}/members/${memberId}`, {
        method: "DELETE",
        headers: {
          "X-User-ID": currentUser.id,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Falha ao remover membro");
      }

      const responseData = await response.json();
      const updatedHousehold = responseData;
      householdDispatch({ type: "SET_HOUSEHOLD", payload: updatedHousehold });
      toast.success("Membro removido com sucesso.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro ao remover: ${message}`);
    } finally {
      pageDispatch({ type: "SET_MEMBER_TO_REMOVE", value: null });
      pageDispatch({ type: "SET_PROCESSING", value: false });
      removeLoadingOperation(opId);
    }
  };

  const deleteCat = async (catId: string) => {
    if (!household || !currentUser || !isCurrentUserAdmin()) return;
    const opId = `delete-cat-${catId}`;
    addLoadingOperation({ id: opId, priority: 1, description: "Deleting cat..." });
    pageDispatch({ type: "SET_PROCESSING", value: true });
    try {
      const response = await fetch(`/api/cats/${catId}`, {
        method: "DELETE",
        headers: {
          "X-User-ID": currentUser.id,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Falha ao excluir gato");
      }

      pageDispatch({ type: "REMOVE_CAT", catId });
      toast.success("Gato removido com sucesso.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro ao excluir: ${message}`);
    } finally {
      pageDispatch({ type: "SET_CAT_TO_DELETE", value: null });
      pageDispatch({ type: "SET_PROCESSING", value: false });
      removeLoadingOperation(opId);
    }
  };

  useEffect(() => {
    if (!householdData || !currentUser) return;
    householdDispatch({ type: "SET_HOUSEHOLD", payload: householdData });
    const isOwner = String(householdData.owner?.id) === String(currentUser.id);
    const isMember = householdData.members?.some(
      (m: { userId?: string }) => String(m.userId) === String(currentUser.id)
    );
    if (!isOwner && !isMember) {
      pageDispatch({ type: "SYNC_HOUSEHOLD_DATA", household: null, cats: [] });
      return;
    }
    const householdCats = allCats.filter(
      (cat) => String(cat.householdId) === String(householdData.id)
    );
    pageDispatch({ type: "SYNC_HOUSEHOLD_DATA", household: householdData, cats: householdCats });
  }, [householdData, currentUser, allCats, householdDispatch]);

  useEffect(() => {
    if (!loadError) return;
    pageDispatch({ type: "LOAD_ERROR" });
    toast.error(loadError);
  }, [loadError]);

  const copyInviteCode = async () => {
    if (!household?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(household.inviteCode);
      toast.success("Código de convite copiado!");
    } catch {
      toast.error("Não foi possível copiar o código.");
    }
  };

  const isAdmin = household && typeof household === "object" ? isCurrentUserAdmin() : false;

  return {
    router,
    householdId,
    errorHousehold,
    errorUser,
    errorCats,
    isLoadingUser,
    isLoadingData,
    isLoadingCats,
    loadError,
    currentUser,
    household,
    cats,
    activeTab,
    memberToRemove,
    memberToPromote,
    memberToDemote,
    catToDelete,
    isProcessing,
    isAdmin,
    pageDispatch,
    leaveHousehold,
    deleteHousehold,
    changeMemberRole,
    removeMember,
    deleteCat,
    copyInviteCode,
  };
}

export type HouseholdPageViewProps = ReturnType<typeof useHouseholdPage>;
