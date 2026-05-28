"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCats } from "@/lib/context/CatsContext";
import { useUserContext } from "@/lib/context/UserContext";
import { useLoading } from "@/lib/context/LoadingContext";
import { Loading } from "@/components/ui/loading";
import {
  NewCatFormSection,
  NewCatStateViews,
  newCatFormSchema,
  type NewCatFormValues,
} from "./new-cat-page-sections";

type NewCatPageState =
  | { type: 'LOADING_USER' }
  | { type: 'ERROR_USER'; error: string }
  | { type: 'NO_USER' }
  | { type: 'NO_HOUSEHOLD' }
  | { type: 'READY' };

export default function NewCatPageContent() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { dispatch: catsDispatch, forceRefresh } = useCats();
  const { state: userState } = useUserContext();
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const { currentUser, isLoading: isLoadingUser, error: errorUser } = userState;

  const pageState: NewCatPageState = useMemo(() => {
    if (isLoadingUser) return { type: 'LOADING_USER' };
    if (errorUser) return { type: 'ERROR_USER', error: errorUser };
    if (!currentUser) return { type: 'NO_USER' };
    if (!currentUser.householdId) return { type: 'NO_HOUSEHOLD' };
    return { type: 'READY' };
  }, [isLoadingUser, errorUser, currentUser]);

  const form = useForm<NewCatFormValues>({
    resolver: zodResolver(newCatFormSchema),
    defaultValues: {
      name: "",
      photoUrl: "",
      birthdate: undefined,
      weight: "",
      portion_size: "",
      gender: undefined as "male" | "female" | undefined,
      restrictions: "",
      notes: "",
      feedingInterval: "8",
    },
  });

  async function onSubmit(values: NewCatFormValues) {
    if (!currentUser?.householdId) {
       toast.error("Você precisa pertencer a um domicílio para adicionar um gato.");
       return;
    }

    const currentHouseholdId = currentUser.householdId;
    const opId = "create-cat";
    addLoadingOperation({ id: opId, priority: 1, description: "Criando perfil do gato..." });
    setIsSubmitting(true);
    const finalPhotoUrl: string | null = values.photoUrl || null;

    try {
      console.log('Raw form values:', values);

      const payload = {
        name: values.name.trim(),
        photoUrl: finalPhotoUrl,
        birthdate: values.birthdate ? values.birthdate.toISOString() : null,
        weight: values.weight || null,
        portion_size: values.portion_size || null,
        gender: (values.gender === "male" || values.gender === "female") ? values.gender : null,
        feeding_interval: values.feedingInterval ? parseInt(values.feedingInterval) : null,
        householdId: currentHouseholdId,
        restrictions: values.restrictions?.trim() || null,
        notes: values.notes?.trim() || null
      };

      console.log('Sending payload to /api/cats:', payload);
      console.log('Current user:', currentUser);
      console.log('Headers:', {
        "Content-Type": "application/json",
        "X-User-ID": currentUser?.id
      });

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (currentUser?.id) {
        headers["X-User-ID"] = currentUser.id;
      } else {
         console.error('No user ID found in currentUser:', currentUser);
         toast.error("Erro de autenticação. Tente fazer login novamente.");
         throw new Error("User ID not found for API request");
      }

      const response = await fetch("/api/cats", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      console.log('Response from server:', {
        status: response.status,
        ok: response.ok,
        data: responseData
      });

      if (!response.ok) {
        console.error("Server error response:", responseData);
        throw new Error(responseData.error || "Falha ao adicionar gato");
      }

      console.log('Successfully created cat:', responseData);
      
      forceRefresh();

      await new Promise(resolve => setTimeout(resolve, 100));

      toast.success("Gato adicionado com sucesso!");
      
      router.replace("/cats");
    } catch (error) {
      console.error("Error creating cat profile:", {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      toast.error(error instanceof Error ? error.message : "Ocorreu um erro ao criar o perfil do gato");
    } finally {
      setIsSubmitting(false);
      removeLoadingOperation(opId);
    }
  }

  switch (pageState.type) {
    case 'LOADING_USER':
      return (
        <div className="container max-w-md p-4 pb-28 flex justify-center items-center min-h-[300px]">
          <Loading text="Carregando dados do usuário..." />
        </div>
      );
    case 'ERROR_USER':
    case 'NO_HOUSEHOLD':
      return <NewCatStateViews pageState={pageState} onBack={() => router.back()} />;
    case 'NO_USER':
      return (
        <div className="container max-w-md p-4 pb-28 flex justify-center items-center min-h-[300px]">
          <Loading text="Redirecionando para login..." />
        </div>
      );
    case 'READY':
      return (
        <NewCatFormSection
          form={form}
          currentUserId={currentUser!.id}
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
        />
      );
  }
}
