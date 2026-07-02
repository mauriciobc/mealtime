"use client";

import { useState } from "react";
import { m } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Edit, 
  Trash2, 
  Clock, 
  AlertCircle,
  Check
} from "lucide-react";
import { Schedule } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ScheduleItemProps {
  schedule: Schedule;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ScheduleItem({ schedule, onView, onEdit, onDelete }: ScheduleItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    onDelete();
    setShowDeleteDialog(false);
  };

  const formatDays = (days?: string[]) => {
    const safeDays = Array.isArray(days) ? days : [];
    if (safeDays.length === 7) return "Todos os dias";
    const dayMap: Record<string, string> = {
      "sun": "Dom",
      "mon": "Seg",
      "tue": "Ter",
      "wed": "Qua",
      "thu": "Qui",
      "fri": "Sex",
      "sat": "Sáb"
    };
    return safeDays.map(d => dayMap[d] || d).join(", ");
  };

  const getCatName = () => {
    return schedule.cat?.name || "Gato não identificado";
  };

  const getCatInitials = () => {
    const name = getCatName();
    return name.substring(0, 2).toUpperCase();
  };

  const getStatusBadge = () => {
    switch (schedule.status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 rounded-lg">
            <Check className="h-3 w-3 mr-1" />
            Concluído
          </Badge>
        );
      case "missed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 rounded-lg">
            <AlertCircle className="h-3 w-3 mr-1" />
            Perdido
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 rounded-lg">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
    }
  };

  return (
    <>
      <m.div 
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        className="cursor-pointer"
        onClick={onView}
      >
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-md rounded-2xl border-border/50 hover:border-border">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                <AvatarImage src={schedule.cat?.photo_url || ""} alt={getCatName()} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {getCatInitials()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-3 mb-2">
                  <h3 className="font-semibold text-base">{getCatName()}</h3>
                  {getStatusBadge()}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium">{schedule.times}</span>
                  <span className="text-border">•</span>
                  <span className="truncate">{formatDays(schedule.days)}</span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  <Switch 
                    checked={schedule.enabled} 
                    onClick={(e) => {
                      e.stopPropagation();
                      // Lógica para alternar o status
                    }} 
                  />
                  <span className="text-xs text-muted-foreground">
                    {schedule.enabled ? "Ativo" : "Desativado"}
                  </span>
                  
                  <div className="flex-1" />
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg"
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  >
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Editar</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(); }}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Excluir</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </m.div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá permanentemente este agendamento para {getCatName()}.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 