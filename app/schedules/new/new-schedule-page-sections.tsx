"use client";

import Link from "next/link";
import { ArrowLeft, Users, Cat as CatIcon, Trash2 } from "lucide-react";
import { m } from "framer-motion";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CatType } from "@/lib/types";
import { PageTransition } from "@/components/ui/page-transition";
import { SimpleTimePicker } from "@/components/ui/simple-time-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export type ScheduleFormType = {
  catId: string;
  type: "interval" | "fixedTime";
  enabled: boolean;
  interval?: string;
  times?: string;
};

type NewScheduleEmptyStateProps = {
  onBack: () => void;
  variant: "no-household" | "no-cats";
};

export function NewScheduleEmptyState({ onBack, variant }: NewScheduleEmptyStateProps) {
  const isNoHousehold = variant === "no-household";

  return (
    <PageTransition>
      <div className="container max-w-md mx-auto py-6 pb-28">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
            <PageHeader title="Novo Agendamento" />
          </div>
          <div className="mt-6">
             <EmptyState
                 IconComponent={isNoHousehold ? Users : CatIcon}
                 title={isNoHousehold ? "Sem Residência Associada" : "Nenhum Gato Cadastrado"}
                 description={isNoHousehold
                   ? "Associe-se a uma residência para criar agendamentos."
                   : "Cadastre pelo menos um gato antes de criar agendamentos."}
                 actionButton={
                   <Button asChild>
                     <Link href={isNoHousehold ? "/settings" : "/cats/new"}>
                       {isNoHousehold ? "Ir para Configurações" : "Cadastrar Gato"}
                     </Link>
                   </Button>
                 }
              />
          </div>
      </div>
    </PageTransition>
  );
}

type NewScheduleErrorViewProps = {
  error: string;
  onBack: () => void;
};

export function NewScheduleErrorView({ error, onBack }: NewScheduleErrorViewProps) {
  return (
    <PageTransition>
      <div className="container max-w-md mx-auto py-6 pb-28 text-center">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <PageHeader title="Novo Agendamento" />
        </div>
         <p className="text-destructive mt-6">Erro ao carregar dados necessários: {error}</p>
      </div>
    </PageTransition>
  );
}

type NewScheduleFormSectionProps = {
  form: UseFormReturn<ScheduleFormType>;
  householdCats: CatType[];
  selectedCat: CatType | undefined;
  selectedTimes: (Date | undefined)[];
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: (values: ScheduleFormType) => void;
  addTimeField: () => void;
  removeTimeField: (index: number) => void;
  updateTime: (index: number, date: Date | undefined) => void;
};

export function NewScheduleFormSection({
  form,
  householdCats,
  selectedCat,
  selectedTimes,
  isSubmitting,
  onBack,
  onSubmit,
  addTimeField,
  removeTimeField,
  updateTime,
}: NewScheduleFormSectionProps) {
  return (
    <PageTransition>
        <div className="container max-w-md mx-auto py-6 pb-28">
           <div className="flex items-center gap-2 mb-4">
             <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
             <PageHeader title="Novo Agendamento" />
           </div>

           <m.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="mt-6"
           >
             {selectedCat && (
               <div className="flex justify-center mb-4">
                 <Avatar className="h-20 w-20">
                   <AvatarImage src={selectedCat.photo_url || ""} alt={selectedCat.name} />
                   <AvatarFallback>{selectedCat.name?.substring(0, 2) || "?"}</AvatarFallback>
                 </Avatar>
               </div>
             )}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-5">
                 <FormField
                   control={form.control as any}
                   name="catId"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Gato *</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                         <FormControl>
                           <SelectTrigger>
                             <SelectValue placeholder="Selecione o gato" />
                           </SelectTrigger>
                         </FormControl>
                         <SelectContent>
                           {householdCats.map((cat: CatType) => (
                             <SelectItem key={cat.id} value={String(cat.id)}>
                               {cat.name}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                       <FormMessage />
                     </FormItem>
                   )}
                 />

                 <Separator />

                 <FormField
                    control={form.control as any}
                    name="type"
                    render={({ field }) => (
                       <FormItem className="space-y-3">
                          <FormLabel>Tipo de Agendamento *</FormLabel>
                          <FormControl>
                             <Tabs
                                value={field.value}
                                onValueChange={(value) => {
                                   field.onChange(value as "interval" | "fixedTime");
                                }}
                                className="w-full"
                             >
                                <TabsList className="grid w-full grid-cols-2">
                                   <TabsTrigger value="interval">Intervalo</TabsTrigger>
                                   <TabsTrigger value="fixedTime">Horário Fixo</TabsTrigger>
                                </TabsList>
                                <TabsContent value="interval" className="pt-4">
                                   <FormField
                                      control={form.control as any}
                                      name="interval"
                                      render={({ field: intervalField }) => (
                                         <FormItem>
                                            <FormLabel>Intervalo (em horas) *</FormLabel>
                                            <FormControl>
                                               <Input 
                                                 type="number" 
                                                 placeholder="Ex: 8" 
                                                 min="1" 
                                                 max="48" 
                                                 {...intervalField} 
                                                 value={intervalField.value || ''}
                                                 disabled={isSubmitting}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                               O gato será alimentado a cada X horas após a última refeição registrada.
                                            </FormDescription>
                                            <FormMessage />
                                         </FormItem>
                                      )}
                                    />
                                </TabsContent>
                                <TabsContent value="fixedTime" className="pt-4 space-y-4">
                                   <FormLabel>Horários Fixos *</FormLabel>
                                   {selectedTimes.map((time, slot) => (
                                      <div key={`fixed-time-${slot}-${time?.getTime() ?? "new"}`} className="flex items-center gap-2">
                                         <SimpleTimePicker 
                                            value={time || new Date()} 
                                            onChange={(date) => updateTime(slot, date)} 
                                            disabled={isSubmitting}
                                          />
                                         {selectedTimes.length > 1 && (
                                            <Button 
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeTimeField(slot)}
                                                disabled={isSubmitting}
                                                className="text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                          )}
                                      </div>
                                    ))}
                                    {selectedTimes.length < 5 && (
                                       <Button 
                                          type="button" 
                                          variant="outline" 
                                          size="sm" 
                                          onClick={addTimeField}
                                          disabled={isSubmitting}
                                        >
                                          Adicionar Horário
                                        </Button>
                                    )}
                                     <FormField
                                        control={form.control as any}
                                        name="times"
                                        render={({ field: timesField }) => (
                                           <FormItem className="hidden">
                                              <FormControl>
                                                 <Input {...timesField} />
                                              </FormControl>
                                              <FormMessage /> 
                                           </FormItem>
                                        )}
                                      />
                                      <FormDescription>
                                         Defina os horários específicos em que o gato deve ser alimentado.
                                      </FormDescription>
                                </TabsContent>
                             </Tabs>
                          </FormControl>
                          <FormMessage />
                       </FormItem>
                    )}
                 />

                 <FormField
                    control={form.control as any}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Ativado</FormLabel>
                          <FormDescription>
                             Se desativado, este agendamento não gerará próximas refeições.
                          </FormDescription>
                        </div>
                        <FormControl>
                           <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isSubmitting}
                           />
                        </FormControl>
                      </FormItem>
                    )}
                 />

                 <div className="pt-4">
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Criando..." : "Criar Agendamento"}
                    </Button>
                 </div>
               </form>
             </Form>
           </m.div>
        </div>
    </PageTransition>
  );
}
