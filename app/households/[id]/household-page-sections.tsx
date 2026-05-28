"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Cat,
  ChevronLeft,
  LogOut,
  Pencil,
  Settings,
  Trash2,
  UserPlus,
  Users,
  Lock,
} from "lucide-react";
import BottomNav from "@/components/bottom-nav";
import PageTransition from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Household } from "@/lib/types";
import { HouseholdCatsTabSection } from "./household-page-cats-section";
import { HouseholdMembersTabSection } from "./household-page-members-section";
import type { HouseholdPageViewProps } from "./use-household-page";

export function HouseholdPageMainView(props: HouseholdPageViewProps) {
  const router = useRouter();
  const {
    householdId,
    household,
    cats,
    activeTab,
    isAdmin,
    isProcessing,
    catToDelete,
    pageDispatch,
    leaveHousehold,
    deleteHousehold,
    deleteCat,
  } = props;

  const resolvedHousehold = household as Household;

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <main className="flex-1 p-4 pb-24">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/households")}
                className="mr-2"
                aria-label="Voltar para Residências"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold truncate" title={resolvedHousehold.name}>
                  {resolvedHousehold.name}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Criada em {format(new Date(resolvedHousehold.createdAt || Date.now()), "dd/MM/yyyy")} por{" "}
                  {resolvedHousehold.owner?.name || "Desconhecido"}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="flex-shrink-0">
                  <Settings className="h-4 w-4" />
                  <span className="sr-only">Opções da Residência</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Opções da Residência</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem onClick={() => router.push(`/households/${householdId}/edit`)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar Nome
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => router.push(`/households/${householdId}/members/invite`)}
                  disabled={!isAdmin}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Convidar Membros
                  {!isAdmin && <Lock className="ml-auto h-3 w-3 text-muted-foreground" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialog
                  onOpenChange={(value) => pageDispatch({ type: "SET_SHOW_LEAVE_DIALOG", value })}
                >
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair da Residência
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sair da Residência?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja sair de &quot;{resolvedHousehold.name}&quot;? Você perderá o
                        acesso aos gatos e dados associados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={leaveHousehold} disabled={isProcessing}>
                        {isProcessing ? <Loading text="Saindo..." size="sm" /> : "Confirmar Saída"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {isAdmin && (
                  <AlertDialog
                    onOpenChange={(value) =>
                      pageDispatch({ type: "SET_SHOW_DELETE_HOUSEHOLD_DIALOG", value })
                    }
                  >
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive focus:bg-destructive/10 mt-1"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir Residência
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Residência?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir PERMANENTEMENTE &quot;{resolvedHousehold.name}
                          &quot;? Todos os membros, gatos e dados serão perdidos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={deleteHousehold}
                          disabled={isProcessing}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          {isProcessing ? <Loading text="Excluindo..." size="sm" /> : "Confirmar Exclusão"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => pageDispatch({ type: "SET_ACTIVE_TAB", value })}
            className="mt-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="members" disabled={isProcessing}>
                <Users className="mr-2 h-4 w-4" /> Membros ({resolvedHousehold.members?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="cats" disabled={isProcessing}>
                <Cat className="mr-2 h-4 w-4" /> Gatos ({cats.length || 0})
              </TabsTrigger>
            </TabsList>

            <HouseholdMembersTabSection {...props} />
            <HouseholdCatsTabSection
              householdId={props.householdId}
              cats={props.cats}
              isAdmin={props.isAdmin}
              pageDispatch={props.pageDispatch}
            />
          </Tabs>
        </main>

        {catToDelete && (
          <AlertDialog
            open={!!catToDelete}
            onOpenChange={(open) => !open && pageDispatch({ type: "SET_CAT_TO_DELETE", value: null })}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover {catToDelete.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja remover {catToDelete.name} desta residência? Seus dados e
                  agendamentos associados serão perdidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteCat(String(catToDelete.id))}
                  disabled={isProcessing}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isProcessing ? <Loading text="Removendo..." size="sm" /> : "Remover Gato"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <BottomNav />
      </div>
    </PageTransition>
  );
}
