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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
// Assuming a Plus icon, replace if you have a specific icon library
// import { PlusIcon } from 'lucide-react'; 

// Placeholder for form handling (e.g., react-hook-form) and Toast
// import { useForm } from 'react-hook-form';
// import { toast } from '@/components/ui/use-toast'; 

interface QuickLogPanelProps {
  // onLogSubmit: (data: { weight: number; date: string; notes?: string }) => Promise<void>;
}

const QuickLogPanel: React.FC<QuickLogPanelProps> = (/*{ onLogSubmit }*/) => {
  const [isOpen, setIsOpen] = useState(false);
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Pre-fill date
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation
    if (!weight || isNaN(parseFloat(weight)) || !date) {
      alert('Please enter a valid weight and date.'); // Replace with FormMessage & Toast
      return;
    }
    console.log('Submitting:', { weight: parseFloat(weight), date, notes });
    // await onLogSubmit({ weight: parseFloat(weight), date, notes });
    // toast({ title: 'Weight logged successfully!' }); // Example toast
    setIsOpen(false); // Close dialog on submit
    // Reset form fields
    setWeight('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild isOpen={isOpen} onOpenChange={setIsOpen}>
              <Button 
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-2xl" 
                variant="default" 
                size="icon"
                aria-label="Log new weight"
              >
                {/* <PlusIcon className="h-6 w-6" /> Replace with actual icon */}
                +
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Log New Weight</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Log New Weight</DialogTitle>
            <DialogDescription>
              Enter the cat's current weight, date of measurement, and any relevant notes.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="weight" className="text-right">
                  Weight (kg)
                </Label>
                <Input 
                  id="weight" 
                  type="number" 
                  step="0.01" 
                  value={weight} 
                  onChange={(e) => setWeight(e.target.value)} 
                  className="col-span-3" 
                  required 
                />
                {/* Placeholder for FormMessage */}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Date
                </Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  className="col-span-3" 
                  required 
                />
                {/* Placeholder for FormMessage */}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">
                  Notes
                </Label>
                <Input 
                  id="notes" 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  className="col-span-3" 
                  placeholder="Optional notes..."
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save Log</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
>>>>>>> a59197a (feat(weight): add QuickLogPanel FAB and dialog structure)
    </>
  );
};

export default QuickLogPanel; 