"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FeedingFormProps } from "@/lib/types";
import { useAppContext } from "@/lib/context/AppContext";

export function FeedingForm({ catId, onMarkAsFed }: FeedingFormProps) {
  const { state: appState } = useAppContext();
  const cat = appState.cats.find((cat) => cat.id === catId);
  const [amount, setAmount] = useState(cat?.portion?.toString() || "");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (cat?.portion) {
      setAmount(cat.portion.toString());
      console.log("Pre-filling Porção field with:", cat.portion.toString());
    }
  }, [cat]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onMarkAsFed(amount, notes);
      setAmount("");
      setNotes("");
    } catch (error) {
      console.error("Erro ao registrar alimentação:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="amount" className="text-sm font-medium">
          Quantidade (opcional)
        </label>
        <Input
          id="amount"
          type="number"
          step="0.1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Ex: 1.5"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium">
          Observações (opcional)
        </label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Adicione observações sobre a alimentação..."
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Registrando..." : "Registrar Alimentação"}
      </Button>
    </form>
  );
} 