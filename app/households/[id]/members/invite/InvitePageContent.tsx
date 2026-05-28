"use client";

import { useReducer, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHousehold } from "@/lib/context/HouseholdContext";
import { useUserContext } from "@/lib/context/UserContext";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loading } from "@/components/ui/loading";
import { useLoading } from "@/lib/context/LoadingContext";
import {
  InvitePageDeniedView,
  InvitePageLoadingSkeleton,
  InvitePageMainView,
  InviteUserErrorView,
  InviteHouseholdErrorView,
  invitePageReducer,
  initialInvitePageState,
  type EmailFormValues,
} from "./invite-page-sections";

const emailSchema = z.object({
  email: z.string().email("Digite um endereço de e-mail válido"),
});

interface InvitePageContentProps {
  params: { id: string };
}

export default function InvitePageContent({ params }: InvitePageContentProps) {
  const householdId = params.id;
  const router = useRouter();
  const { state: householdState } = useHousehold();
  const { state: userState } = useUserContext();
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  
  const { currentUser, isLoading: isLoadingUser, error: errorUser } = userState;
  const { households, isLoading: isLoadingHouseholds, error: errorHousehold } = householdState;
  
  const [pageState, dispatch] = useReducer(invitePageReducer, initialInvitePageState);
  const { household, isAuthorized, isLoadingData, isSending, isCopied, isGenerating } = pageState;

  const shouldLoadData = !isLoadingUser && !errorUser && currentUser && !errorHousehold;

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (!shouldLoadData) return;

    const opId = "household-invite-load";
    addLoadingOperation({ id: opId, priority: 1, description: "Loading household data..."});
    dispatch({ type: 'LOAD_START' });

    if (isLoadingHouseholds) {
        console.log("HouseholdInvitePage useEffect: HouseholdContext still loading, waiting...");
        return;
    }

    console.log(`HouseholdInvitePage useEffect: Attempting to find household ${householdId}`);
    const foundHousehold = households.find(h => String(h.id) === String(householdId));

    if (foundHousehold) {
      console.log(`HouseholdInvitePage useEffect: Found household ${foundHousehold.id}. Checking authorization...`);
      console.log("Household details:", JSON.stringify({
        household_id: foundHousehold.id,
        name: foundHousehold.name,
        owner: foundHousehold.owner,
        owner_id: foundHousehold.owner?.id || foundHousehold.owner?.id,
        members: foundHousehold.members,
        current_user: currentUser.id
      }, null, 2));
      
      const isOwner = String(foundHousehold.owner?.id) === String(currentUser.id) || 
                      String(foundHousehold.owner?.id || foundHousehold.owner?.id) === String(currentUser.id);
      const isAdmin = isOwner || foundHousehold.members?.some(
        member => String(member.userId) === String(currentUser.id) && member.role?.toLowerCase() === 'admin'
      );
      console.log(`HouseholdInvitePage useEffect: Is owner? ${isOwner}, Is admin member? ${isAdmin}`);
      dispatch({ type: 'LOAD_HOUSEHOLD', household: foundHousehold, isAuthorized: isAdmin });
    } else {
      console.warn(`HouseholdInvitePage useEffect: Household ${householdId} not found in context.`);
      dispatch({ type: 'LOAD_HOUSEHOLD', household: null, isAuthorized: false });
    }
    dispatch({ type: 'LOAD_END' });
    removeLoadingOperation(opId);
  }, [shouldLoadData, households, householdId, currentUser, isLoadingHouseholds, addLoadingOperation, removeLoadingOperation]);

  if (isLoadingUser) {
    return <Loading text="Verificando usuário..." />;
  }

  if (errorUser) {
    return <InviteUserErrorView error={errorUser} onBack={() => router.back()} />;
  }

  if (errorHousehold) {
     return <InviteHouseholdErrorView error={errorHousehold} onBack={() => router.back()} />;
  }
  
  const handleSendInvite = async (data: EmailFormValues) => {
    if (!isAuthorized || !household) return;
    const opId = "send-invite";
    addLoadingOperation({ id: opId, priority: 1, description: "Sending invite..." });
    dispatch({ type: 'SET_SENDING', value: true });
    try {
      console.log("Sending invitation with headers:", {
        userId: currentUser!.id,
        householdId: householdId
      });
      
      const response = await fetch(`/api/households/${householdId}/invite`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-ID": currentUser!.id
        },
        body: JSON.stringify({ email: data.email }),
      });

      console.log("Invitation response status:", response.status);
      const result = await response.json();
      console.log("Invitation response body:", result);

      if (!response.ok) {
         throw new Error(result.error || "Falha ao enviar convite por e-mail.");
      }
      
      console.log("DEBUG CLIENT: Invitation response details:", {
        status: response.status,
        message: result.message,
        details: result.details,
        profile: result.profile
      });
      
      if (result.message && result.message.includes("already a member")) {
        if (result.profile && result.profile.email) {
          if (result.profile.email !== data.email) {
            toast.info(
              `Este e-mail (${data.email}) não pode ser adicionado porque o usuário com e-mail ${result.profile.email} já é membro desta residência.`
            );
          } else {
            toast.info(`${data.email} já é um membro desta residência.`);
          }
        } else {
          toast.info(`${data.email} já está associado a um membro desta residência.`);
        }
      } else if (result.message && result.message.includes("similar email")) {
        toast.info(result.details || `Encontramos uma variação deste e-mail já cadastrada. Por favor, tente com o email exato.`);
      } else {
        toast.success(`Convite enviado para ${data.email}`);
      }
      form.reset();

    } catch (error: any) {
      console.error("Erro ao enviar convite:", error);
      toast.error(`Erro ao enviar: ${error.message}`);
    } finally {
      dispatch({ type: 'SET_SENDING', value: false });
      removeLoadingOperation(opId);
    }
  };

  const copyInviteLink = async () => {
    if (!household?.inviteCode) {
       toast.error("Código de convite não disponível.");
       return;
    }
    const inviteUrl = `${window.location.origin}/join?code=${household.inviteCode}`;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      dispatch({ type: 'SET_COPIED', value: true });
      toast.success("Link de convite copiado!");
      setTimeout(() => dispatch({ type: 'SET_COPIED', value: false }), 3000);
    } catch (error) {
      console.error("Erro ao copiar link:", error);
      toast.error("Não foi possível copiar o link.");
    }
  };

  const shareInvite = async () => {
     if (!household?.inviteCode || !household?.name) return;
     
    const inviteUrl = `${window.location.origin}/join?code=${household.inviteCode}`;
    const text = `Olá! Gostaria de te convidar para participar da minha residência "${household.name}" no MealTime. Use este link para entrar:`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Convite para ${household.name} - MealTime`,
          text: text,
          url: inviteUrl,
        });
      } else {
         copyInviteLink();
         toast.info("API de compartilhamento não suportada. Link copiado!");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
         console.error("Erro ao compartilhar:", error);
         toast.error("Não foi possível compartilhar o convite.");
      }
    }
  };

   const regenerateInviteCode = async () => {
     if (!isAuthorized || !household) return;
     const opId = "regenerate-code";
     addLoadingOperation({ id: opId, priority: 1, description: "Generating new code..." });
     dispatch({ type: 'SET_GENERATING', value: true });
     try {
       const response = await fetch(`/api/households/${householdId}/invite-code`, {
          method: "PATCH",
          headers: {
            "X-User-ID": currentUser!.id,
            "Content-Type": "application/json"
          }
        });

        const result = await response.json();

        if (!response.ok) {
           throw new Error(result.error || "Falha ao gerar novo código de convite.");
        }
       
       const newCode = result.inviteCode; 
       const updatedHousehold = { ...household, inviteCode: newCode };
       dispatch({ type: 'UPDATE_HOUSEHOLD', household: updatedHousehold });

       toast.success("Novo código de convite gerado!");

     } catch (error: any) {
       console.error("Erro ao gerar novo código:", error);
       toast.error(`Erro: ${error.message}`);
     } finally {
       dispatch({ type: 'SET_GENERATING', value: false });
       removeLoadingOperation(opId);
     }
   };

  if (isLoadingData) {
    return <InvitePageLoadingSkeleton />;
  }

   if (!household || isAuthorized === false) {
      const message = !household ? "Redirecionando... Residência não encontrada." : "Redirecionando... Acesso negado.";
      console.log(`[HouseholdInvitePage] Render condition met: ${message}`);
      return <InvitePageDeniedView message={message} />;
   }

  return (
    <InvitePageMainView
      householdId={householdId}
      household={household}
      form={form}
      isSending={isSending}
      isCopied={isCopied}
      isGenerating={isGenerating}
      onSendInvite={handleSendInvite}
      onCopy={copyInviteLink}
      onShare={shareInvite}
      onRegenerate={regenerateInviteCode}
    />
  );
}
