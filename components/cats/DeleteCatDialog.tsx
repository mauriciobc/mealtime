"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useCats } from '@/lib/hooks/useCats';
import { useHaptics } from '@/lib/context/HapticsContext';

interface DeleteCatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catId: string | null;
  householdId: string;
}

export function DeleteCatDialog({
  open,
  onOpenChange,
  catId,
  householdId,
}: DeleteCatDialogProps) {
  const { deleteCat, isDeleting, cats } = useCats(householdId);
  const { triggerNudge, triggerSuccess, triggerError, triggerLight } = useHaptics();
  const cat = catId ? cats.find(c => c.id === catId) : null;

  async function onDelete() {
    if (!catId) return;
    triggerNudge();

    try {
      await deleteCat(catId);
      triggerSuccess();
      toast.success('Cat deleted successfully');
      onOpenChange(false);
    } catch (error) {
      triggerError();
      toast.error('Failed to delete cat');
    }
  }

  function onCancel() {
    triggerLight();
    onOpenChange(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete{' '}
            {cat?.name || 'this cat'} and remove their data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 