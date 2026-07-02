"use client";

import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose
} from "@/components/ui/drawer";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Cat as CatIcon, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { CatType } from "@/lib/types";
import type { NewFeedingSheetState } from "./use-new-feeding-sheet";

interface NewFeedingCatListItemProps {
  cat: CatType;
  isSelected: boolean;
  portion: string;
  status: string;
  foodType: string;
  note: string;
  lastFeedingLabel: string;
  statusOptions: { value: string; label: string }[];
  foodTypeOptions: { value: string; label: string }[];
  onToggle: (catId: string) => void;
  onPortionChange: (catId: string, value: string) => void;
  onStatusChange: (catId: string, value: string) => void;
  onFoodTypeChange: (catId: string, value: string) => void;
  onNotesChange: (catId: string, value: string) => void;
}

function NewFeedingCatListItem({
  cat,
  isSelected,
  portion,
  status,
  foodType,
  note,
  lastFeedingLabel,
  statusOptions,
  foodTypeOptions,
  onToggle,
  onPortionChange,
  onStatusChange,
  onFoodTypeChange,
  onNotesChange,
}: NewFeedingCatListItemProps) {
  const selectValue = foodType === "" ? "__none__" : foodType;

  return (
    <m.div
      key={cat.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <div className={cn(
        "relative overflow-hidden transition-all rounded-2xl p-5",
        isSelected
          ? "bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/30"
          : "bg-muted/30 border-2 border-transparent hover:border-muted-foreground/20"
      )}>
        <div className="flex items-start gap-4">
          <Checkbox
            id={`cat-${cat.id}`}
            checked={isSelected}
            onCheckedChange={() => onToggle(cat.id)}
            className="mt-2"
          />
          <div className="flex-grow space-y-5">
            <Label
              htmlFor={`cat-${cat.id}`}
              className="flex items-center gap-4 cursor-pointer"
            >
              <Avatar className={cn(
                "h-14 w-14 ring-2 transition-all",
                isSelected ? "ring-primary/40" : "ring-border"
              )}>
                <AvatarImage src={cat.photo_url || ""} alt={cat.name} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  <CatIcon className="h-7 w-7" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-base leading-none mb-1.5">{cat.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Última: {lastFeedingLabel}
                </p>
              </div>
            </Label>
            {isSelected && (
              <m.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`portion-${cat.id}`} className="text-sm font-medium mb-2 block">
                      Porção (g)
                    </Label>
                    <Input
                      id={`portion-${cat.id}`}
                      type="number"
                      min="0"
                      step="0.1"
                      value={portion}
                      onChange={(e) => onPortionChange(cat.id, e.target.value)}
                      placeholder={cat.portion_size?.toString() || "0"}
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`status-${cat.id}`} className="text-sm font-medium mb-2 block">
                      Status
                    </Label>
                    <Select value={status} onValueChange={(value) => onStatusChange(cat.id, value as any)}>
                      <SelectTrigger id={`status-${cat.id}`} className="rounded-xl h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {statusOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor={`food-type-${cat.id}`} className="text-sm font-medium mb-2 block">
                      Tipo de Comida
                    </Label>
                    <Select
                      value={selectValue}
                      onValueChange={(value) => onFoodTypeChange(cat.id, value)}
                    >
                      <SelectTrigger id={`food-type-${cat.id}`} className="rounded-xl h-11">
                        <SelectValue placeholder="Não especificado" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {foodTypeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor={`notes-${cat.id}`} className="text-sm font-medium mb-2 block">
                    Observações
                  </Label>
                  <Input
                    id={`notes-${cat.id}`}
                    value={note}
                    onChange={(e) => onNotesChange(cat.id, e.target.value)}
                    placeholder="Opcional"
                    className="rounded-xl h-11"
                  />
                </div>
              </m.div>
            )}
          </div>
        </div>
      </div>
    </m.div>
  );
}

interface NewFeedingCatListProps {
  sheet: NewFeedingSheetState;
}

export function NewFeedingCatList({ sheet }: NewFeedingCatListProps) {
  const {
    householdCats,
    isLoadingCats,
    selectedCats,
    portions,
    feedingStatus,
    foodTypes,
    notes,
    statusOptions,
    foodTypeOptions,
    formatRelativeTime,
    getLastFeedingLog,
    toggleCatSelection,
    handlePortionChange,
    handleStatusChange,
    handleFoodTypeChange,
    handleNotesChange,
  } = sheet;

  if (isLoadingCats || !householdCats) {
    return <Loading />;
  }

  if (householdCats.length === 0) {
    return (
      <EmptyState
        IconComponent={Users}
        title="Nenhum gato encontrado"
        description="Você ainda não tem gatos cadastrados."
        actionButton={
          <Button asChild>
            <Link href="/cats">Cadastrar Gato</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      {householdCats.map((cat) => {
        const isSelected = selectedCats.includes(cat.id);
        const lastFeeding = getLastFeedingLog(cat.id);

        return (
          <NewFeedingCatListItem
            key={cat.id}
            cat={cat}
            isSelected={isSelected}
            portion={portions[cat.id] || ""}
            status={feedingStatus[cat.id] || "Normal"}
            foodType={foodTypes[cat.id] || ""}
            note={notes[cat.id] || ""}
            lastFeedingLabel={formatRelativeTime(lastFeeding?.timestamp)}
            statusOptions={statusOptions}
            foodTypeOptions={foodTypeOptions}
            onToggle={toggleCatSelection}
            onPortionChange={handlePortionChange}
            onStatusChange={handleStatusChange}
            onFoodTypeChange={handleFoodTypeChange}
            onNotesChange={handleNotesChange}
          />
        );
      })}
    </>
  );
}

interface NewFeedingSheetContentProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: NewFeedingSheetState;
}

export function NewFeedingSheetContent({ isOpen, onOpenChange, sheet }: NewFeedingSheetContentProps) {
  const {
    householdCats,
    selectedCats,
    isSubmitting,
    error,
    handleSelectAll,
    handleDeselectAll,
    handleSubmit,
  } = sheet;

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] flex flex-col">
        <DrawerHeader className="text-left px-6 pt-4 pb-2">
          <DrawerTitle>Registrar Nova Alimentação</DrawerTitle>
          <DrawerDescription>
            Selecione os gatos e informe os detalhes da refeição.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex justify-between items-center px-6 pb-3">
          <p className="text-sm text-muted-foreground">
            {selectedCats.length} de {householdCats.length} gatos selecionados
          </p>
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={selectedCats.length === householdCats.length || householdCats.length === 0 || isSubmitting}>
              Todos
            </Button>
            <Button variant="outline" size="sm" onClick={handleDeselectAll} disabled={selectedCats.length === 0 || isSubmitting}>
              Limpar
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-grow overflow-y-auto px-6">
          <div className="space-y-2 pb-4">
            <AnimatePresence>
              <NewFeedingCatList sheet={sheet} />
            </AnimatePresence>
          </div>
        </ScrollArea>
        {error && (
          <p className="px-6 py-2 text-sm text-destructive text-center">Erro: {error}</p>
        )}
        <DrawerFooter className="pt-4 border-t flex-row gap-2">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">Cancelar</Button>
          </DrawerClose>
          <Button
            onClick={handleSubmit}
            disabled={selectedCats.length === 0 || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? <Loading size="sm" className="mr-2" /> : <Check className="mr-2 h-4 w-4" />}
            Confirmar Alimentação ({selectedCats.length})
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
