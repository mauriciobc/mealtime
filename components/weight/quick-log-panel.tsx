"use client";

<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
=======
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
>>>>>>> a59197a (feat(weight): add QuickLogPanel FAB and dialog structure)
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
<<<<<<< HEAD
<<<<<<< HEAD
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Assuming a Plus icon, replace if you have a specific icon library
// import { PlusIcon } from 'lucide-react'; 

const weightLogSchema = z.object({
  catId: z.string().uuid({ message: 'Valid Cat ID is required.' }),
  weight: z.coerce.number().positive({ message: 'Weight must be a positive number.' }),
  date: z.string().min(1, { message: 'Date is required.' }),
  notes: z.string().optional(),
});

export type WeightLogFormValues = z.infer<typeof weightLogSchema>;

interface QuickLogPanelProps {
  catId: string;
  onLogSubmit: (data: WeightLogFormValues, logIdToUpdate?: string) => Promise<void>;
  logToEdit?: WeightLogFormValues & { id: string };
  isPanelOpen: boolean;
  onPanelOpenChange: (isOpen: boolean) => void;
}

const QuickLogPanel: React.FC<QuickLogPanelProps> = ({ 
  catId, 
  onLogSubmit, 
  logToEdit, 
  isPanelOpen,
  onPanelOpenChange
}) => {
  const isEditing = !!logToEdit;

  const form = useForm<WeightLogFormValues>({
    resolver: zodResolver(weightLogSchema),
  });

  useEffect(() => {
    if (isPanelOpen) {
      if (isEditing && logToEdit) {
        form.reset({
          catId: logToEdit.catId || catId,
          weight: logToEdit.weight,
          date: logToEdit.date,
          notes: logToEdit.notes || '',
        });
      } else {
        form.reset({
          catId: catId,
          weight: NaN,
          date: new Date().toISOString().split('T')[0],
          notes: '',
        });
      }
    }
  }, [isPanelOpen, isEditing, logToEdit, catId, form]);

  async function onSubmit(data: WeightLogFormValues) {
    try {
      await onLogSubmit(data, isEditing ? logToEdit?.id : undefined);
    } catch (error) {
      toast.error((error as Error)?.message || 'Failed to save log. Please try again.');
    }
  }

  return (
    <>
      <Drawer open={isPanelOpen} onOpenChange={onPanelOpenChange}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DrawerTrigger asChild>
                <Button 
                  className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-2xl z-30 print:hidden"
                  variant="default" 
                  size="icon"
                  aria-label={isEditing ? "Editar registro de peso" : "Registrar novo peso"}
                >
                  +
                </Button>
              </DrawerTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isEditing ? "Editar Registro" : "Registrar Novo Peso"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DrawerContent>
          <div className="mx-auto w-full max-w-md">
            <DrawerHeader className="text-left">
              <DrawerTitle>{isEditing ? 'Editar Registro de Peso' : 'Registrar Novo Peso'}</DrawerTitle>
              <DrawerDescription>
                {isEditing 
                  ? "Atualize os detalhes para esta medição de peso."
                  : "Insira o peso atual do gato, data da medição e notas relevantes."}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 py-2">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Peso (kg)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="ex: 5.2"
                            {...field}
                            value={isNaN(field.value as number) ? '' : field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas</FormLabel>
                        <FormControl>
                          <Input placeholder="Notas opcionais..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DrawerFooter className="pt-4">
                    <DrawerClose asChild>
                      <Button type="button" variant="outline" onClick={() => onPanelOpenChange(false)}>
                        Cancelar
                      </Button>
                    </DrawerClose>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? 'Salvando...' : (isEditing ? 'Atualizar Registro' : 'Salvar Registro')}
                    </Button>
                  </DrawerFooter>
                </form>
              </Form>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
=======
import { Label } from '@/components/ui/label';
=======
>>>>>>> 37a1589 (feat(weight): implement API for logging weight and update QuickLogPanel)
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';

// Assuming a Plus icon, replace if you have a specific icon library
// import { PlusIcon } from 'lucide-react'; 

const weightLogSchema = z.object({
  catId: z.string().uuid({ message: 'Valid Cat ID is required.' }),
  weight: z.coerce.number().positive({ message: 'Weight must be a positive number.' }),
  date: z.string().min(1, { message: 'Date is required.' }),
  notes: z.string().optional(),
});

export type WeightLogFormValues = z.infer<typeof weightLogSchema>;

interface QuickLogPanelProps {
  catId: string;
  onLogSubmit: (data: WeightLogFormValues) => Promise<void>;
}

const QuickLogPanel: React.FC<QuickLogPanelProps> = ({ catId, onLogSubmit }) => {
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<WeightLogFormValues>({
    resolver: zodResolver(weightLogSchema),
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        catId: catId,
        weight: undefined,
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
  }, [isOpen, catId, form]);

  async function onSubmit(data: WeightLogFormValues) {
    try {
      await onLogSubmit(data);
      toast({ title: 'Success!', description: 'Weight logged successfully.' });
      form.reset();
      setIsOpen(false);
    } catch (error) {
      toast({ 
        title: 'Error',
        description: (error as Error)?.message || 'Failed to log weight. Please try again.',
        variant: 'destructive' 
      });
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (open) {
      form.reset({
        catId: catId,
        weight: undefined,
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
    setIsOpen(open);
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-2xl" 
              variant="default" 
              size="icon"
              aria-label="Log new weight"
              onClick={() => handleOpenChange(true)}
            >
              {/* <PlusIcon className="h-6 w-6" /> */}
              +
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Log New Weight</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Log New Weight</DialogTitle>
            <DialogDescription>
              Enter the cat's current weight, date of measurement, and any relevant notes.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-2">
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right pt-1.5">Weight (kg)</FormLabel>
                    <FormControl className="col-span-3">
                      <Input type="number" step="0.01" placeholder="e.g., 5.2" {...field} />
                    </FormControl>
                    <FormMessage className="col-span-3 col-start-2" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right pt-1.5">Date</FormLabel>
                    <FormControl className="col-span-3">
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage className="col-span-3 col-start-2" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right pt-1.5">Notes</FormLabel>
                    <FormControl className="col-span-3">
                      <Input placeholder="Optional notes..." {...field} />
                    </FormControl>
                    <FormMessage className="col-span-3 col-start-2" />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving...' : 'Save Log'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
>>>>>>> a59197a (feat(weight): add QuickLogPanel FAB and dialog structure)
    </>
  );
};

export default QuickLogPanel; 