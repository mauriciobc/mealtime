"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Edit, 
  Trash2, 
  MoreHorizontal, 
  Eye
} from "lucide-react";
import { CatType } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
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

interface CatCardProps {
  cat: CatType;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  showAdminActions?: boolean;
}

export function CatCard({ cat, onView, onEdit, onDelete, showAdminActions = true }: CatCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const formatAge = (birthdate: Date) => {
    const today = new Date();
    const birth = new Date(birthdate);
    
    const yearDiff = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return `${yearDiff - 1} anos e ${12 + monthDiff} meses`;
    }
    
    if (yearDiff > 0) {
      return `${yearDiff} ${yearDiff === 1 ? 'ano' : 'anos'} e ${monthDiff} ${monthDiff === 1 ? 'mês' : 'meses'}`;
    }
    
    return `${monthDiff} ${monthDiff === 1 ? 'mês' : 'meses'}`;
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    onDelete();
    setShowDeleteDialog(false);
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
      >
        <Card className="h-full overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={cat.photoUrl || ""} alt={cat.name} />
                  <AvatarFallback className="bg-purple-100 text-purple-500">
                    {cat.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-xl">{cat.name}</CardTitle>
              </div>
              {showAdminActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onView} className="flex items-center gap-2 cursor-pointer">
                      <Eye className="h-4 w-4" />
                      <span>Visualizar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onEdit} className="flex items-center gap-2 cursor-pointer">
                      <Edit className="h-4 w-4" />
                      <span>Editar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDeleteClick} className="flex items-center gap-2 text-destructive cursor-pointer">
                      <Trash2 className="h-4 w-4" />
                      <span>Excluir</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {cat.birthdate && (
                <p>
                  <span className="font-medium">Idade:</span>{" "}
                  {formatAge(cat.birthdate)}
                </p>
              )}
              {cat.weight && (
                <p>
                  <span className="font-medium">Peso:</span> {cat.weight} kg
                </p>
              )}
              {cat.breed && (
                <p>
                  <span className="font-medium">Raça:</span>{" "}
                  {cat.breed}
                </p>
              )}
              {cat.restrictions && (
                <p>
                  <span className="font-medium">Restrições:</span>{" "}
                  {cat.restrictions}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="pt-2 text-xs text-muted-foreground">
            {cat.feedingLogs && cat.feedingLogs.length > 0 ? (
              <p>
                Última alimentação:{" "}
                {formatDistanceToNow(new Date(cat.feedingLogs[0].timestamp), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            ) : (
              <p>Sem registros de alimentação</p>
            )}
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
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 