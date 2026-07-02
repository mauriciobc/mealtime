"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FeedingFormProps } from "@/lib/types";
import { useCats } from "@/lib/context/CatsContext";
import { useHaptics } from "@/lib/context/HapticsContext";

export function FeedingForm({ catId, onMarkAsFed }: FeedingFormProps) {
  const { state: catsState } = useCats();
  const { triggerNudge, triggerSuccess, triggerError } = useHaptics();
  const cat = catsState.cats.find((c) => String(c.id) === String(catId));
  const [amount, setAmount] = useState(cat?.portion_size?.toString() || "");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (cat?.portion_size) {
      setAmount(cat.portion_size.toString());
      console.log("Pre-filling Porção field with:", cat.portion_size.toString());
    }
  }, [cat]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerNudge();
    setIsSubmitting(true);

    try {
      await onMarkAsFed(amount, notes);
      triggerSuccess();
      setAmount("");
      setNotes("");
    } catch (error) {
      triggerError();
      console.error("Erro ao registrar alimentação:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="amount" className="text-sm font-medium text-foreground">
          Quantidade (opcional)
        </label>
        <Input
          id="amount"
          type="number"
          step="0.1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Ex: 1.5"
          className="rounded-xl h-11"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium text-foreground">
          Observações (opcional)
        </label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Adicione observações sobre a alimentação..."
          className="rounded-xl min-h-[100px] resize-none"
        />
      </div>

      <Button 
        type="submit" 
        disabled={isSubmitting} 
        className="w-full rounded-xl h-11 font-medium"
      >
        {isSubmitting ? "Registrando..." : "Registrar Alimentação"}
      </Button>
    </form>
  );
} 