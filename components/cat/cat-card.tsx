"use client";

import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Edit, 
  Trash2, 
  Calendar,
  Weight,
  Loader2,
} from "lucide-react";
import { CatType, FeedingLog } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
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
import { getAgeString } from "@/lib/utils/dateUtils";
import { getFallbackImageUrl, isFallbackImage } from "@/lib/image-errors";
import { SafeImage } from "../safe-image";
import { cn } from "@/lib/utils";
import { GlobalLoading } from "@/components/ui/global-loading";
import { useUserContext } from "@/lib/context/UserContext";

interface CatCardProps {
  cat: CatType;
  latestFeedingLog?: FeedingLog | null;
  isDeleting?: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

export const CatCard = memo(function CatCard({ cat, latestFeedingLog, onView, onEdit, onDelete, isDeleting = false }: CatCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const { state: userState } = useUserContext();
  const userTimezone = userState.currentUser?.preferences?.timezone;

  // Memoize expensive calculations
  const ageString = useMemo(() => {
    return cat.birthdate ? getAgeString(
      typeof cat.birthdate === 'string' ? new Date(cat.birthdate) : cat.birthdate,
      userTimezone
    ) : "Idade desconhecida";
  }, [cat.birthdate, userTimezone]);

  const lastFed = useMemo(() => {
    return latestFeedingLog
      ? formatDistanceToNow(new Date(latestFeedingLog.timestamp), {
          addSuffix: true,
          locale: ptBR,
        })
      : "Nunca alimentado";
  }, [latestFeedingLog]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  }, []);

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  }, [onEdit]);

  const confirmDelete = useCallback(async () => {
    await onDelete();
    setShowDeleteDialog(false);
  }, [onDelete]);

  const imageUrl = useMemo(() => {
    if (!cat.photo_url || cat.photo_url.trim() === '') {
      return getFallbackImageUrl('cat');
    }
    return cat.photo_url.trim();
  }, [cat.photo_url]);

  // Reset loading state when image URL changes
  useEffect(() => {
    setIsImageLoading(true);
  }, [imageUrl]);

  // Memoize image handlers
  const handleImageLoad = useCallback(() => {
    setIsImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setIsImageLoading(false);
  }, []);

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
        className="h-full cursor-pointer"
        onClick={onView}
      >
        <Card className="h-full overflow-hidden flex flex-col max-w-[300px] mx-auto">
           <div className="relative w-full aspect-square bg-muted overflow-hidden"> 
             <SafeImage 
               src={imageUrl}
               alt={`Photo of ${cat.name}`} 
               fill
               sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
               className={cn(
                 "absolute inset-0 object-cover transition-all duration-300",
                 isImageLoading ? "opacity-0" : "opacity-100"
               )}
               priority={true}
               onError={handleImageError}
               onLoad={handleImageLoad}
               fallback={
                 <div className="w-full h-full flex items-center justify-center bg-purple-100">
                   <span className="text-purple-500 text-4xl">
                     {cat.name.substring(0, 2).toUpperCase()}
                   </span>
                 </div>
               }
             />
             {isImageLoading && (
               <div className="absolute inset-0 flex items-center justify-center bg-purple-50">
                 <GlobalLoading mode="spinner" size="md" />
               </div>
             )}
           </div>

           <CardHeader className="pt-4 pb-2">
              <CardTitle className="text-lg font-semibold">{cat.name}</CardTitle>
           </CardHeader>
           <CardContent className="flex-grow space-y-1.5 text-sm text-muted-foreground">
              {cat.birthdate && (
                 <div className="flex items-center gap-1.5">
                   <Calendar className="h-4 w-4"/> 
                   <span>{ageString}</span>
                 </div>
              )}
              {cat.weight && (
                 <div className="flex items-center gap-1.5">
                   <Weight className="h-4 w-4"/> 
                   <span>{cat.weight} kg</span>
                 </div>
              )}
              {cat.breed && (
                 <p><span className="font-medium">Raça:</span> {cat.breed}</p>
              )}
              {cat.restrictions && (
                 <p><span className="font-medium">Restrições:</span> {cat.restrictions}</p>
              )}
              
              <div className="pt-1"> 
                 <Badge variant="outline">{lastFed}</Badge>
              </div>
           </CardContent>

           <CardFooter className="pt-3 pb-3 flex justify-end gap-2 border-t mt-auto">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleEditClick} aria-label={`Editar ${cat.name}`}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Editar Gato</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDeleteClick} aria-label={`Excluir ${cat.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Excluir Gato</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
           </CardFooter>
        </Card>
      </motion.div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o gato {cat.name}
              e todos os seus registros de alimentação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={(e) => e.stopPropagation()}
              disabled={isDeleting}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}); 