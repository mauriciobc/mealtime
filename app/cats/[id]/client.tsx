"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useIsClient } from "@/lib/hooks/use-is-client"
import PageTransition from "@/components/page-transition"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCats } from "@/lib/context/CatsContext"
import { useLoading } from "@/lib/context/LoadingContext"
import { useFeeding } from "@/hooks/use-feeding"
import { getAgeString } from "@/lib/utils/dateUtils"
import { toast } from "sonner"
import { CatType } from "@/lib/types"
import { Loading } from "@/components/ui/loading"
import { useUserContext } from "@/lib/context/UserContext"
import { resolveDateFnsLocale } from "@/lib/utils/dateFnsLocale"
import {
  CatDetailsHeader,
  CatDetailsHero,
  CatDetailsNextFeeding,
  CatDetailsFeedingTab,
  CatDetailsSchedulesTab,
  type CatSchedule,
} from "./cat-details-sections"

export default function CatDetailsClient({ id }: { id: string }) {
  const router = useRouter()
  const { dispatch: catsDispatch } = useCats()
  const { addLoadingOperation, removeLoadingOperation } = useLoading()
  const { 
    cat, 
    logs, 
    nextFeedingTime, 
    formattedNextFeedingTime, 
    formattedTimeDistance, 
    isLoading: isFeedingLoading,
    error: feedingError,
    handleMarkAsFed 
  } = useFeeding(id)
  const isClient = useIsClient()
  const [isProcessingDelete, setIsProcessingDelete] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { state: userState } = useUserContext();
  const userLanguage = userState.currentUser?.preferences?.language;
  const userLocale = resolveDateFnsLocale(userLanguage);
  
  useEffect(() => {
    if (!isFeedingLoading && feedingError) {
      toast.error(feedingError);
      return;
    }
  }, [feedingError, isFeedingLoading, router]);
  
  if (isFeedingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading text="Carregando perfil do gato..." />
      </div>
    )
  }
  
  if (!cat) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading text="Gato não encontrado. Redirecionando..." />
      </div>
    );
  }

  const catWithSchedules = cat as CatType & { schedules?: CatSchedule[] };

  const handleDelete = () => {
    const opId = `delete-cat-${id}`;
    addLoadingOperation({ id: opId, description: `Excluindo ${cat?.name || 'gato'}...`, priority: 1 });
    setIsProcessingDelete(true);
    catsDispatch({ type: "REMOVE_CAT", payload: id });

    const form = document.getElementById('delete-cat-form') as HTMLFormElement;
    if (form) {
      form.submit();
    }
    setTimeout(() => {
      setIsProcessingDelete(false);
      setShowDeleteDialog(false);
      removeLoadingOperation(opId);
    }, 2000);
  };

  return (
    <>
      <form id="delete-cat-form" action={`/api/cats/${cat.id}`} method="POST" style={{ display: 'none' }}>
        <input type="hidden" name="_method" value="DELETE" />
      </form>
      <PageTransition>
        <div className="bg-background min-h-screen">
          <div className="container max-w-2xl mx-auto px-4 py-6">
            <CatDetailsHeader
              cat={cat}
              isProcessingDelete={isProcessingDelete}
              showDeleteDialog={showDeleteDialog}
              onDeleteDialogChange={setShowDeleteDialog}
              onDelete={handleDelete}
            />
            
            <CatDetailsHero cat={cat} isClient={isClient} getAge={getAgeString} />
              
            {nextFeedingTime && (
              <CatDetailsNextFeeding
                isClient={isClient}
                formattedNextFeedingTime={formattedNextFeedingTime}
                formattedTimeDistance={formattedTimeDistance}
                onMarkAsFed={handleMarkAsFed}
              />
            )}
            
            <Tabs defaultValue="feeding" className="space-y-6">
              <TabsList className="grid grid-cols-2 h-12 bg-muted/30 p-1 rounded-xl">
                <TabsTrigger 
                  value="feeding" 
                  className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Alimentação
                </TabsTrigger>
                <TabsTrigger 
                  value="schedules"
                  className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Programação
                </TabsTrigger>
              </TabsList>
              
              <CatDetailsFeedingTab
                cat={cat}
                logs={logs}
                userLocale={userLocale}
                onMarkAsFed={handleMarkAsFed}
              />
              <CatDetailsSchedulesTab cat={catWithSchedules} />
            </Tabs>
          </div>
        </div>
      </PageTransition>
    </>
  )
}
