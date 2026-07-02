"use client"

import Link from "next/link"
import { format } from "date-fns"
import { Locale } from "date-fns/locale"
import {
  Edit,
  ArrowLeft,
  Calendar,
  Weight,
  AlarmClock,
  Utensils,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { FeedingForm } from "@/app/components/feeding-form"
import { CatType, FeedingLog } from "@/lib/types"
import { Loading } from "@/components/ui/loading"

export type MarkAsFedHandler = (amount?: string, notes?: string, timestamp?: Date) => Promise<FeedingLog>;

export interface CatSchedule {
  id: string;
  type: string;
  times: string;
  interval?: number;
  override_until?: string | Date;
  overrideUntil?: string | Date;
}

type CatWithSchedules = CatType & { schedules?: CatSchedule[] };

type CatDetailsHeaderProps = {
  cat: CatType;
  isProcessingDelete: boolean;
  showDeleteDialog: boolean;
  onDeleteDialogChange: (open: boolean) => void;
  onDelete: () => void;
};

export function CatDetailsHeader({
  cat,
  isProcessingDelete,
  showDeleteDialog,
  onDeleteDialogChange,
  onDelete,
}: CatDetailsHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <Link 
        href="/cats" 
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm font-medium">Voltar para gatos</span>
      </Link>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" asChild>
          <Link href={`/cats/${cat.id}/edit`}>
            <Edit className="h-4 w-4" />
            <span className="sr-only">Editar</span>
          </Link>
        </Button>
        <AlertDialog open={showDeleteDialog} onOpenChange={onDeleteDialogChange}>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Excluir</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso excluirá permanentemente {cat?.name || 'este gato'} e todos os seus registros de alimentação.
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessingDelete}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive hover:bg-destructive/90"
                disabled={isProcessingDelete}
              >
                {isProcessingDelete ? <Loading text="Excluindo..." size="sm" /> : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

type CatDetailsHeroProps = {
  cat: CatType;
  isClient: boolean;
  getAge: (birthdate: Date) => string;
};

export function CatDetailsHero({ cat, isClient, getAge }: CatDetailsHeroProps) {
  return (
    <div className="flex flex-col items-center text-center mb-8">
      <Avatar className="h-32 w-32 mb-4 ring-4 ring-primary/20">
        <AvatarImage src={cat.photo_url || ""} alt={cat.name} />
        <AvatarFallback className="text-3xl">{cat.name.substring(0, 2)}</AvatarFallback>
      </Avatar>
      
      <h1 className="text-3xl font-bold mb-3">{cat.name}</h1>
      
      <div className="flex items-center gap-3 text-muted-foreground text-sm">
        {cat.birthdate && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{isClient && cat.birthdate ? getAge(new Date(cat.birthdate)) : "Carregando..."}</span>
          </div>
        )}
        
        {cat.weight && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10">
            <Weight className="h-4 w-4 text-primary" />
            <span className="font-medium text-primary">{cat.weight} kg</span>
          </div>
        )}
      </div>
    </div>
  );
}

type CatDetailsNextFeedingProps = {
  isClient: boolean;
  formattedNextFeedingTime: string;
  formattedTimeDistance: string;
  onMarkAsFed: MarkAsFedHandler;
};

export function CatDetailsNextFeeding({
  isClient,
  formattedNextFeedingTime,
  formattedTimeDistance,
  onMarkAsFed,
}: CatDetailsNextFeedingProps) {
  return (
    <div className="mb-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/20">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
          <AlarmClock className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground mb-0.5">Próxima alimentação</p>
          <p className="text-lg font-semibold text-foreground">
            {isClient ? (
              <>
                {formattedNextFeedingTime}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({formattedTimeDistance})
                </span>
              </>
            ) : (
              "Carregando..."
            )}
          </p>
        </div>
        <Button 
          size="lg"
          className="flex-shrink-0 rounded-xl"
          onClick={() => onMarkAsFed()}
        >
          <Utensils className="h-4 w-4 mr-2" />
          Alimentar
        </Button>
      </div>
    </div>
  );
}

type FeedingLogItem = {
  id: string;
  timestamp: string | Date;
  portionSize?: number | null;
  notes?: string | null;
};

type CatDetailsFeedingTabProps = {
  cat: CatType;
  logs: FeedingLogItem[];
  userLocale: Locale;
  onMarkAsFed: MarkAsFedHandler;
};

export function CatDetailsFeedingTab({ cat, logs, userLocale, onMarkAsFed }: CatDetailsFeedingTabProps) {
  return (
    <TabsContent value="feeding" className="space-y-8 mt-0">
      <div>
        <h2 className="text-xl font-semibold mb-4">Registrar Alimentação</h2>
        <div className="bg-card rounded-2xl p-6 border border-border/50">
          <FeedingForm catId={cat.id} onMarkAsFed={onMarkAsFed} />
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-4">Histórico</h2>
        {logs.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4">
              <Utensils className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Nenhuma alimentação registrada</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Comece a registrar as alimentações de {cat.name} para acompanhar o histórico
            </p>
            <Button
              onClick={() => onMarkAsFed()}
              size="lg"
              className="rounded-xl"
            >
              <Utensils className="h-4 w-4 mr-2" />
              Registrar primeira alimentação
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const feederName = "Usuário do Sistema";
              
              return (
                <div 
                  key={log.id} 
                  className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border/50 hover:border-border transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Utensils className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {format(new Date(log.timestamp), "PPp", { locale: userLocale })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Alimentado por {feederName}
                    </p>
                    {log.portionSize && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {log.portionSize} porções
                      </p>
                    )}
                    {log.notes && (
                      <p className="text-sm mt-2 text-foreground/80">{log.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TabsContent>
  );
}

type CatDetailsSchedulesTabProps = {
  cat: CatWithSchedules;
};

export function CatDetailsSchedulesTab({ cat }: CatDetailsSchedulesTabProps) {
  return (
    <TabsContent value="schedules" className="space-y-8 mt-0">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Agendamentos</h2>
          <Button size="sm" asChild className="rounded-xl">
            <Link href={`/cats/${cat.id}/schedules/new`}>
              Adicionar
            </Link>
          </Button>
        </div>
        
        {cat.schedules && cat.schedules.length > 0 ? (
          <div className="space-y-3">
            {cat.schedules.map((schedule) => (
              <div 
                key={schedule.id}
                className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <AlarmClock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">
                      {schedule.type === "fixedTime" ? "Horário Fixo" : "Intervalo"}
                    </h3>
                    {schedule.type === "fixedTime" ? (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Horários: {typeof schedule.times === 'string' ? schedule.times.split(",").join(", ") : ''}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        A cada {schedule.interval} horas
                      </p>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="rounded-lg flex-shrink-0">
                  <Link href={`/cats/${cat.id}/schedules/${schedule.id}/edit`}>
                    <Edit className="h-3 w-3 mr-1.5" />
                    Editar
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4">
              <AlarmClock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Nenhum agendamento</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Configure horários de alimentação para {cat.name} e nunca esqueça
            </p>
            <Button asChild size="lg" className="rounded-xl">
              <Link href={`/cats/${cat.id}/schedules/new`}>
                Criar primeiro agendamento
              </Link>
            </Button>
          </div>
        )}
      </div>
    </TabsContent>
  );
}
