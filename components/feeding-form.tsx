"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useFeeding } from "@/hooks/use-feeding";

const formSchema = z.object({
  amount: z.string()
    .min(1, "A quantidade é obrigatória")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "A quantidade deve ser um número maior que 0"
    }),
  notes: z.string().optional(),
  timestamp: z.date(),
});

type FormValues = z.infer<typeof formSchema>;

interface FeedingFormProps {
  catId: number;
  catPortionSize: number;
  onSuccess?: () => void;
}

export function FeedingForm({ catId, catPortionSize, onSuccess }: FeedingFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { handleMarkAsFed, nextFeedingTime, formattedNextFeedingTime } = useFeeding(catId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: catPortionSize ? catPortionSize.toString() : "",
      notes: "",
      timestamp: new Date(),
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      setIsSubmitting(true);
      
      // Check if feeding is before the next scheduled time
      if (nextFeedingTime && values.timestamp < nextFeedingTime) {
        const confirmEarly = window.confirm(
          `Ainda não está na hora da próxima alimentação (${formattedNextFeedingTime}). Deseja registrar mesmo assim?`
        );
        if (!confirmEarly) {
          setIsSubmitting(false);
          return;
        }
      }
      
      await handleMarkAsFed(values.amount, values.notes || undefined, values.timestamp);
      
      form.reset();
      router.refresh();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Erro ao registrar alimentação:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="timestamp"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data e Hora</FormLabel>
                <FormControl>
                  <DateTimePicker
                    date={field.value}
                    setDate={(date) => {
                      field.onChange(date);
                      field.onBlur();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade (porções)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.5" 
                    placeholder="Ex: 1.5" 
                    {...field} 
                  />
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
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Alguma observação sobre esta alimentação" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Registrando..." : "Registrar Alimentação"}
          </Button>
        </form>
      </Form>
    </motion.div>
  );
} 