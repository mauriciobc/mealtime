"use client";

import { useState, useMemo, memo, useCallback } from "react";
import { m } from "framer-motion";
import { format } from "date-fns";
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
import { FeedingLog } from "@/lib/types";
import { useCats } from "@/lib/context/CatsContext";
import { useUserContext } from "@/lib/context/UserContext";
import { resolveDateFnsLocale } from "@/lib/utils/dateFnsLocale";

interface FeedingLogItemProps {
  log: FeedingLog;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const FeedingLogItem = memo(function FeedingLogItem({ log, onView, onEdit, onDelete }: FeedingLogItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { state: catsState } = useCats();
  const { cats, isLoading: isLoadingCats } = catsState;
  const { state: userState } = useUserContext();
  const userLanguage = userState.currentUser?.preferences?.language;
  const userLocale = resolveDateFnsLocale(userLanguage);

  // Memoize cat lookup for better performance
  const cat = useMemo(() => {
    return cats?.find(c => c.id === log.catId);
  }, [cats, log.catId]);

  const showActions = onView || onEdit || onDelete;

  const handleDeleteClick = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (onDelete) {
      onDelete();
    }
    setShowDeleteDialog(false);
  }, [onDelete]);

  const getCatName = useMemo(() => {
    if (isLoadingCats) return "Carregando...";
    return cat?.name || "Gato não identificado";
  }, [isLoadingCats, cat?.name]);

  const getCatInitials = useMemo(() => {
    if (isLoadingCats) return "..";
    const name = cat?.name || "??";
    return name.substring(0, 2).toUpperCase();
  }, [isLoadingCats, cat?.name]);

  // Improved photo URL handling
  const catPhotoUrl = useMemo(() => {
    if (isLoadingCats) return "";
    if (!cat) return "";
    return cat.photo_url || "";
  }, [isLoadingCats, cat]);

  // Memoize click handler
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if (onView) {
      e.stopPropagation();
      onView();
    } 
  }, [onView]);

  // Show loading state while cats are being loaded
  if (isLoadingCats) {
    return (
      <Card className="overflow-hidden transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-24 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-32 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <m.div 
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        className={`cursor-pointer ${!onView ? 'pointer-events-none' : ''}`}
        onClick={handleCardClick}
      >
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={catPhotoUrl} alt={getCatName} />
                <AvatarFallback className="bg-emerald-100 text-emerald-500">
                  {getCatInitials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{getCatName}</h3>
                    {log.user?.name && (
                      <p className="text-sm text-muted-foreground">
                        Alimentado por {log.user.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center">
                    <div className="text-right mr-2">
                      <p className="text-sm font-medium">
                        {format(new Date(log.timestamp), "HH:mm", { locale: userLocale })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.timestamp), "dd/MM/yyyy", { locale: userLocale })}
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
                  <div className="flex flex-col gap-1">
                    {log.mealType && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Refeição:</span>
                        <span>{log.mealType === 'breakfast' ? 'Café da Manhã' :
                               log.mealType === 'lunch' ? 'Almoço' :
                               log.mealType === 'dinner' ? 'Jantar' :
                               log.mealType === 'snack' ? 'Lanche' : log.mealType}</span>
                      </div>
                    )}
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
            </div>
          </CardContent>
        </Card>
      </m.div>

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
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}); 