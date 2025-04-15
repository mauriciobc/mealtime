"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { BaseFeedingLog, BaseCat, BaseUser } from "@/lib/types/common";

interface FeedingLogItemProps {
  log: BaseFeedingLog & {
    cat?: BaseCat;
    user?: BaseUser;
  };
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function FeedingLogItem({ log, onView, onEdit, onDelete }: FeedingLogItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const showActions = onView || onEdit || onDelete;

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    onDelete();
    setShowDeleteDialog(false);
  };

  const getCatName = () => {
    return log.cat?.name || "Gato não identificado";
  };

  const getCatInitials = () => {
    const name = getCatName();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <motion.div 
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        className="cursor-pointer"
        onClick={onView}
      >
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={log.cat?.photoUrl || ""} alt={getCatName()} />
                <AvatarFallback className="bg-emerald-100 text-emerald-500">
                  {getCatInitials()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{getCatName()}</h3>
                    {log.user && (
                      <p className="text-sm text-muted-foreground">
                        Alimentado por {log.user.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center">
                    <div className="text-right mr-2">
                      <p className="text-sm font-medium">
                        {format(new Date(log.timestamp), "HH:mm")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.timestamp), "dd/MM/yyyy")}
                      </p>
                    </div>
                    {showActions && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onView && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                              <Eye className="mr-2 h-4 w-4" />
                              <span>Visualizar</span>
                            </DropdownMenuItem>
                          )}
                          {onEdit && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Editar</span>
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <DropdownMenuItem 
                              onClick={(e) => { e.stopPropagation(); handleDeleteClick(); }} 
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Excluir</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                <div className="mt-2 text-sm">
                  {log.portionSize !== undefined && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Quantidade:</span>
                      <span>{log.portionSize} g</span>
                    </div>
                  )}
                  {log.notes && (
                    <div className="mt-1 text-muted-foreground">
                      {log.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {onDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este registro de alimentação? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete} 
                className="bg-destructive text-destructive-foreground"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
} 