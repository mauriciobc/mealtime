"use client"

import { Fragment } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Search, SortDesc, Utensils, CheckCircle2, AlertCircle, Ban, AlertTriangle, HelpCircle, Trash2, Edit } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { Loading } from "@/components/ui/loading"
import { FeedingLog, CatType } from "@/lib/types"
import { Timeline } from "@/components/ui/timeline"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
  DrawerTrigger,
} from "@/components/ui/drawer"

export const getStatusIcon = (status: string | undefined) => {
  switch (status) {
    case "Normal":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "Comeu Pouco":
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    case "Recusou":
      return <Ban className="h-5 w-5 text-red-500" />;
    case "Vomitou":
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case "Outro":
      return <HelpCircle className="h-5 w-5 text-blue-500" />;
    default:
      return null;
  }
};

export const getStatusVariant = (status: string | undefined): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "Normal":
      return "default";
    case "Comeu Pouco":
      return "secondary";
    case "Recusou":
    case "Vomitou":
      return "destructive";
    case "Outro":
      return "secondary";
    default:
      return "outline";
  }
};

export const getStatusText = (status: string | undefined) => {
  return status || "-";
};

type FeedingsSearchControlsProps = {
  searchTerm: string;
  sortOrder: "asc" | "desc";
  isPending: boolean;
  onSearchChange: (value: string) => void;
  onToggleSort: () => void;
};

export function FeedingsSearchControls({
  searchTerm,
  sortOrder,
  isPending,
  onSearchChange,
  onToggleSort,
}: FeedingsSearchControlsProps) {
  return (
    <div className="flex items-center gap-2 mb-6 sticky top-0 bg-background py-3 z-20 border-b">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por gato, notas, usuário..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background pl-10 pr-4 py-2 text-sm h-9 focus-visible:ring-primary"
        />
        {isPending && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 flex-shrink-0"
        onClick={onToggleSort}
        title={sortOrder === "desc" ? "Ordenar: Mais recentes primeiro" : "Ordenar: Mais antigos primeiro"}
      >
        <SortDesc className={`h-4 w-4 transform transition-transform duration-200 ${sortOrder === "asc" ? 'rotate-180' : ''}`} />
      </Button>
    </div>
  );
}

type FeedingsTimelineSectionProps = {
  groupedLogs: Record<string, FeedingLog[]>;
  catsMap: Map<string, CatType>;
  searchTerm: string;
  isLoading: boolean;
  logToDelete: FeedingLog | null;
  isDeleting: boolean;
  onSetLogToDelete: (log: FeedingLog | null) => void;
  onSetLogToEdit: (log: FeedingLog) => void;
  onDelete: (logId: string | undefined) => void;
};

export function FeedingsTimelineSection({
  groupedLogs,
  catsMap,
  searchTerm,
  isLoading,
  logToDelete,
  isDeleting,
  onSetLogToDelete,
  onSetLogToEdit,
  onDelete,
}: FeedingsTimelineSectionProps) {
  const totalLogs = Object.values(groupedLogs).flat().length;

  if (totalLogs === 0 && !isLoading) {
    return (
      <EmptyState
        IconComponent={Utensils}
        title="Nenhum registro encontrado"
        description={searchTerm
          ? "Nenhum registro corresponde à sua busca. Tente outros termos."
          : "Ainda não há registros de alimentação. Que tal registrar o primeiro?"}
        actionButton={
          !searchTerm ? (
            <Button asChild>
              <Link href="/feedings/new">Registrar Alimentação</Link>
            </Button>
          ) : undefined
        }
        className="mt-12"
      />
    );
  }

  return (
    <Timeline>
      {Object.entries(groupedLogs).map(([date, logsOnDate]) => (
        <Fragment key={date}>
          <h2 className="text-lg font-semibold my-4 sticky top-[68px] bg-background py-2 z-10">
            {format(new Date(date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
          {logsOnDate.map((log) => {
            const cat = catsMap.get(String(log.catId))
            const displayStatusIcon = getStatusIcon(log.status);
            const displayStatusVariant = getStatusVariant(log.status);
            const displayStatusText = getStatusText(log.status);
            
            return (
              <div key={log.id} className="relative pl-[58px] mb-4 group">
                <div className="absolute left-0 top-0 flex-shrink-0">
                  {cat?.id ? (
                    <Link href={`/cats/${cat.id}`} aria-label={`Ver perfil de ${cat?.name}`}>
                      <Avatar className="h-10 w-10 border shadow-md">
                        <AvatarImage src={cat?.photo_url || undefined} alt={cat?.name} />
                        <AvatarFallback>{cat?.name?.substring(0, 1).toUpperCase() || "?"}</AvatarFallback>
                      </Avatar>
                    </Link>
                  ) : (
                    <Avatar className="h-10 w-10 border shadow-md">
                      <AvatarFallback>?</AvatarFallback>
                    </Avatar>
                  )}
                </div>
                <div className="flex items-start gap-8 w-full">
                  <div className="text-right text-sm text-muted-foreground pt-1 w-16 flex-shrink-0 tabular-nums -ml-[58px] pl-12">
                    {format(new Date(log.timestamp), "HH:mm", { locale: ptBR })}
                  </div>

                  <Card className="flex-grow shadow-sm transition-shadow hover:shadow-md ml-2">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          {cat?.id ? (
                            <Link href={`/cats/${cat.id}`} className="font-medium truncate hover:underline text-sm sm:text-base">
                              {cat?.name || "Gato Desconhecido"}
                            </Link>
                          ) : (
                            <span className="font-medium truncate text-sm sm:text-base text-muted-foreground">
                              {cat?.name || "Gato Desconhecido"}
                            </span>
                          )}
                          {log.user && (
                            <p className="text-xs text-muted-foreground truncate" title={`Registrado por ${log.user?.name}`}>
                              por {log.user?.name || "Usuário Desconhecido"}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                          {log.portionSize != null && log.portionSize > 0 && (
                            <Badge variant="outline" className="text-xs px-1.5 sm:px-2.5">
                              {log.portionSize}g
                            </Badge>
                          )}
                          {displayStatusIcon && (
                              <span title={displayStatusText}>{displayStatusIcon}</span>
                          )}
                          {log.status && log.status !== 'Normal' && (
                            <Badge variant={displayStatusVariant} className="text-xs px-1.5 sm:px-2.5">
                              {displayStatusText}
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={(e) => { e.stopPropagation(); onSetLogToEdit(log); }}
                            aria-label="Editar registro"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Drawer open={logToDelete?.id === log.id} onOpenChange={(open) => { if (!open) onSetLogToDelete(null) }}>
                            <DrawerTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10 p-1"
                                onClick={(e) => { e.stopPropagation(); onSetLogToDelete(log); }}
                                aria-label="Excluir registro"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </DrawerTrigger>
                            <DrawerContent>
                              <DrawerHeader>
                                <DrawerTitle>Confirmar Exclusão</DrawerTitle>
                                <DrawerDescription>
                                  Tem certeza que deseja excluir este registro de alimentação?
                                  {log && ` (Gato: ${catsMap.get(String(log.catId))?.name || 'Desconhecido'}, Data: ${format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })})`}
                                  <br />
                                  Esta ação não pode ser desfeita.
                                </DrawerDescription>
                              </DrawerHeader>
                              <DrawerFooter>
                                <DrawerClose asChild>
                                  <Button variant="outline" onClick={() => onSetLogToDelete(null)} disabled={isDeleting}>
                                    Cancelar
                                  </Button>
                                </DrawerClose>
                                <Button
                                  onClick={() => onDelete(log.id ? String(log.id) : undefined)}
                                  disabled={isDeleting || !logToDelete || logToDelete.id !== log.id}
                                  className="bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive text-white"
                                >
                                  {isDeleting && logToDelete?.id === log.id ? <Loading text="Excluindo..." size="sm" className="text-white"/> : "Excluir"}
                                </Button>
                              </DrawerFooter>
                            </DrawerContent>
                          </Drawer>
                        </div>
                      </div>
                      {log.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          &quot;{log.notes}&quot;
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )
          })}
        </Fragment>
      ))}
    </Timeline>
  );
}
