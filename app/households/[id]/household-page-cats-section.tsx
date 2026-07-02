"use client";

import { useRouter } from "next/navigation";
import { Cat, Plus } from "lucide-react";
import { CatCard } from "@/components/cat/cat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TabsContent } from "@/components/ui/tabs";
import type { HouseholdPageViewProps } from "./use-household-page";

type HouseholdCatsSectionProps = Pick<
  HouseholdPageViewProps,
  "householdId" | "cats" | "isAdmin" | "pageDispatch"
>;

export function HouseholdCatsTabSection({
  householdId,
  cats,
  isAdmin,
  pageDispatch,
}: HouseholdCatsSectionProps) {
  const router = useRouter();

  return (
    <TabsContent value="cats" className="mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gatos na Residência</CardTitle>
          <CardDescription>Gatos gerenciados nesta residência.</CardDescription>
        </CardHeader>
        <CardContent>
          {cats.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cats.map((cat) => (
                <CatCard
                  key={cat.id}
                  cat={cat}
                  onView={() => router.push(`/cats/${cat.id}`)}
                  onEdit={() => router.push(`/cats/${cat.id}/edit`)}
                  onDelete={() => pageDispatch({ type: "SET_CAT_TO_DELETE", value: cat })}
                />
              ))}
            </div>
          ) : (
            <div className="pt-4">
              <EmptyState
                IconComponent={Cat}
                title="Nenhum Gato Adicionado"
                description="Adicione o primeiro gato desta residência."
                actionButton={
                  <Button onClick={() => router.push(`/cats/new?householdId=${householdId}`)}>
                    Adicionar Gato
                  </Button>
                }
              />
            </div>
          )}
        </CardContent>
        {isAdmin && (
          <CardFooter className="border-t pt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(`/cats/new?householdId=${householdId}`)}
            >
              <Plus className="mr-2 h-4 w-4" /> Adicionar Gato à Residência
            </Button>
          </CardFooter>
        )}
      </Card>
    </TabsContent>
  );
}
