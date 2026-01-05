// ⚡ Bolt: This component is memoized with React.memo to prevent unnecessary re-renders.
// By isolating the render logic for a single log item, we ensure that only the items
// whose props have actually changed will re-render during filtering or sorting,
// significantly improving the performance of the feeding list.
"use client"

import React, { useState } from 'react';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose, DrawerTrigger } from "@/components/ui/drawer";
import { Loading } from "@/components/ui/loading";
import { FeedingLog, Cat } from "@/lib/types";
import { CheckCircle2, AlertCircle, Ban, AlertTriangle, HelpCircle, Trash2, Edit } from "lucide-react";

// Helper functions for status display (kept internal to the component)
const getStatusIcon = (status: string | undefined) => {
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

const getStatusVariant = (status: string | undefined): "default" | "secondary" | "destructive" | "outline" => {
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

const getStatusText = (status: string | undefined) => {
  return status || "-";
};

interface FeedingLogItemProps {
  log: FeedingLog;
  cat?: Cat;
  onEdit: (log: FeedingLog) => void;
  onDelete: (logId: string) => void;
  isDeleting: boolean;
}

const FeedingLogItem: React.FC<FeedingLogItemProps> = ({ log, cat, onEdit, onDelete, isDeleting }) => {
  const [isDeleteDrawerOpen, setDeleteDrawerOpen] = useState(false);

  const displayStatusIcon = getStatusIcon(log.status);
  const displayStatusVariant = getStatusVariant(log.status);
  const displayStatusText = getStatusText(log.status);

  const handleDelete = () => {
    if (log.id) {
        onDelete(String(log.id));
    }
  };

  return (
    <div className="relative pl-[58px] mb-4 group">
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
                  onClick={() => onEdit(log)}
                  aria-label="Editar registro"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Drawer open={isDeleteDrawerOpen} onOpenChange={setDeleteDrawerOpen}>
                  <DrawerTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10 p-1"
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
                        {` (Gato: ${cat?.name || 'Desconhecido'}, Data: ${format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })})`}
                        <br />
                        Esta ação não pode ser desfeita.
                      </DrawerDescription>
                    </DrawerHeader>
                    <DrawerFooter>
                      <DrawerClose asChild>
                        <Button variant="outline" disabled={isDeleting}>
                          Cancelar
                        </Button>
                      </DrawerClose>
                      <Button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive text-white"
                      >
                        {isDeleting ? <Loading text="Excluindo..." size="sm" className="text-white"/> : "Excluir"}
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
  );
};

export default React.memo(FeedingLogItem);
