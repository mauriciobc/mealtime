"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { m } from "framer-motion";
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import { Loading } from "@/components/ui/loading";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DateTimePicker } from "@/components/ui/datetime-picker-new";

export const newCatFormSchema = z.object({
  name: z.string().min(2, {
    message: "O nome do gato deve ter pelo menos 2 caracteres.",
  }),
  photoUrl: z.string().optional(),
  birthdate: z.date().optional(),
  weight: z.string().optional().refine((val) => !val || !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Peso deve ser um número positivo.",
  }),
  portion_size: z.string().optional().refine((val) => !val || !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Porção deve ser um número positivo.",
  }),
  gender: z.enum(["male", "female"]).optional().nullable(),
  restrictions: z.string().optional(),
  notes: z.string().optional(),
  feedingInterval: z.string().min(1, {
    message: "O intervalo de alimentação é obrigatório.",
  }).refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1 && num <= 24;
  }, {
    message: "O intervalo deve estar entre 1 e 24 horas.",
  }),
});

export type NewCatFormValues = z.infer<typeof newCatFormSchema>;

type NewCatStateViewsProps = {
  pageState: { type: 'ERROR_USER'; error: string } | { type: 'NO_HOUSEHOLD' };
  onBack: () => void;
};

export function NewCatStateViews({ pageState, onBack }: NewCatStateViewsProps) {
  if (pageState.type === 'ERROR_USER') {
    return (
      <div className="container max-w-md p-4 pb-28">
        <PageHeader title="Adicionar Novo Gato" />
        <div className="mt-6 text-center">
          <p className="text-destructive">Erro ao carregar dados do usuário: {pageState.error}. Tente recarregar a página.</p>
          <Button onClick={onBack} className="mt-4">Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-md p-4 pb-28">
      <PageHeader title="Adicionar Novo Gato" />
      <div className="mt-6">
        <EmptyState 
          IconComponent={Users}
          title="Nenhum domicílio encontrado"
          description="Você precisa pertencer a um domicílio para adicionar um gato. Crie ou junte-se a um domicílio nas configurações."
          actionButton={<Button asChild><Link href="/settings">Ir para Configurações</Link></Button>}
        />
      </div>
    </div>
  );
}

type NewCatFormSectionProps = {
  form: UseFormReturn<NewCatFormValues>;
  currentUserId: string;
  isSubmitting: boolean;
  onSubmit: (values: NewCatFormValues) => void;
};

export function NewCatFormSection({ form, currentUserId, isSubmitting, onSubmit }: NewCatFormSectionProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container max-w-md p-4 pb-28"
    >
      <PageHeader title="Adicionar Novo Gato" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl>
                  <Input placeholder="Nome do gato" {...field} id="name" required disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="photoUrl"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel>Foto</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value || ""}
                      onChange={(url: string) => field.onChange(url)}
                      type="cat"
                      userId={currentUserId}
                      maxSizeMB={50}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
          <FormField
            control={form.control}
            name="birthdate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Nascimento</FormLabel>
                <FormControl>
                  <DateTimePicker
                    {...(field.value ? { value: field.value } : {})}
                    onChange={field.onChange}
                    fromYear={1980}
                    toYear={2030}
                    placeholder="Selecione uma data"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso (kg)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.1" 
                    placeholder="Ex: 4.5" 
                    {...field} 
                    id="weight"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sexo</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "none" ? undefined : v)}
                  value={field.value ?? "none"}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Não informado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    <SelectItem value="male">Macho</SelectItem>
                    <SelectItem value="female">Fêmea</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="feedingInterval"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Intervalo Ideal Entre Refeições (horas) *</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1" 
                    max="24" 
                    placeholder="Ex: 8" 
                    {...field} 
                    id="feedingInterval"
                    required 
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="portion_size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Porção Recomendada (gramas)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="1" 
                    placeholder="Ex: 50" 
                    {...field} 
                    id="portion_size"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="restrictions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Restrições Alimentares</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ex: Alergia a frango, sensível a grãos"
                    className="resize-none"
                    {...field}
                    id="restrictions"
                    disabled={isSubmitting}
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
                <FormLabel>Observações Adicionais</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ex: Prefere comer no quarto, só come ração úmida"
                    className="resize-none"
                    {...field}
                    id="notes"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loading text="Adicionando..." size="sm" /> : "Adicionar Gato"}
          </Button>
        </form>
      </Form>
    </m.div>
  );
}
