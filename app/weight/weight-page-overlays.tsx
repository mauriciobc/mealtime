"use client";

import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import QuickLogPanel from '@/components/weight/quick-log-panel';
import GoalFormSheet from '@/components/weight/goal-form-sheet';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import type { WeightPageMainProps } from './weight-page-sections';

export function WeightPageOverlays(props: WeightPageMainProps) {
  const {
    selectedCatId, handleLogSubmit, logToEditData,
    isQuickLogPanelOpen, setIsQuickLogPanelOpen,
    isTipsSheetOpen, setIsTipsSheetOpen,
    isGoalFormSheetOpen, setIsGoalFormSheetOpen,
    handleGoalSubmit, currentWeight, selectedCatActiveGoal, selectedCatForForm,
  } = props;

  return (
    <>
          {/* Botão Flutuante */}
          <Button
            id="weight-add-button"
            size="icon"
            className="fixed bottom-24 right-4 z-50 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-lg flex items-center justify-center h-14 w-14 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 print:hidden"
            onClick={() => setIsQuickLogPanelOpen(true)}
            aria-label="Registrar Peso"
          >
            <Plus className="h-7 w-7" />
          </Button>

          {/* Painel de log rápido (QuickLogPanel) */}
          <QuickLogPanel
            catId={selectedCatId || ''}
            onLogSubmit={async (data, logIdToUpdate) => {
              if (selectedCatId) {
                await handleLogSubmit(selectedCatId, data, logIdToUpdate);
              }
            }}
            logToEdit={logToEditData || undefined}
            isPanelOpen={isQuickLogPanelOpen}
            onPanelOpenChange={setIsQuickLogPanelOpen}
          />

          {/* Bottom Sheet de Dicas */}
          <Sheet open={isTipsSheetOpen} onOpenChange={setIsTipsSheetOpen}>
            <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>⚖️ Dicas para Controle de Peso</SheetTitle>
                <SheetDescription>
                  Recomendações para um acompanhamento saudável do peso do seu gato.
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-2 text-base text-foreground">
                <div className="space-y-2">
                  <p className="font-semibold">🩺 Consulte sempre o veterinário:</p>
                  <p>Antes de iniciar qualquer plano de perda ou ganho de peso, busque orientação profissional.</p>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold">📊 Use o app a seu favor:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Registre o peso regularmente para acompanhar tendências.</li>
                    <li>Compartilhe os dados com o veterinário.</li>
                    <li>Fique atento a alertas de mudanças bruscas.</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-yellow-700 dark:text-yellow-400">⚠️ Atenção:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Evite dietas restritivas sem acompanhamento.</li>
                    <li>Perda de peso rápida pode ser perigosa.</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold">💡 Dica extra:</p>
                  <p>Combine os registros do app com exames clínicos para um cuidado completo.</p>
                </div>
                <div className="pt-2 border-t text-sm text-muted-foreground">
                  O app é um apoio, mas não substitui o veterinário. Priorize sempre a saúde do seu gato!
                </div>
              </div>
              <SheetClose asChild>
                <Button className="mt-6 w-full" variant="default">Fechar</Button>
              </SheetClose>
            </SheetContent>
          </Sheet>

          {/* Bottom Sheet de Nova Meta */}
          <GoalFormSheet
            isOpen={isGoalFormSheetOpen}
            onOpenChange={setIsGoalFormSheetOpen}
            onSubmit={async (data) => {
              if (selectedCatId) {
                await handleGoalSubmit(selectedCatId, data);
              }
            }}
            catId={selectedCatId}
            currentWeight={currentWeight}
            defaultUnit={selectedCatActiveGoal?.unit || 'kg'}
            birthDate={selectedCatForForm?.birthdate ? (typeof selectedCatForForm.birthdate === 'string' ? selectedCatForForm.birthdate : selectedCatForForm.birthdate.toISOString().split('T')[0]) : undefined}
          />
    </>
  );
}
