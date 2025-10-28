"use client";

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
} from "@/components/ui/drawer";
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { DateTimePicker } from '@/components/ui/datetime-picker';

const weightLogSchema = z.object({
  catId: z.string().uuid({ message: 'Valid Cat ID is required.' }),
  weight: z.coerce.number().positive({ message: 'Weight must be a positive number.' }),
  date: z.date({ message: 'Date is required.' }),
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
    resolver: zodResolver(weightLogSchema) as any,
  });

  useEffect(() => {
    if (isPanelOpen) {
      if (isEditing && logToEdit) {
        form.reset({
          catId: logToEdit.catId || catId,
          weight: logToEdit.weight,
          date: new Date(logToEdit.date),
          notes: logToEdit.notes || '',
        });
      } else {
        form.reset({
          catId: catId,
          weight: NaN,
          date: new Date(),
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
                <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
                  <FormField
                    control={form.control as any}
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
                    control={form.control as any}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data e Hora</FormLabel>
                        <FormControl>
                          <DateTimePicker
                            value={field.value}
                            onChange={(date) => field.onChange(date)}
                            hourCycle={24}
                            granularity="minute"
                            placeholder="Selecione a data e hora"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
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
    </>
  );
};

export default QuickLogPanel; 