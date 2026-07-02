"use client";

import { useRouter } from "next/navigation";
import {
  CopyCheck,
  MoreVertical,
  ShieldCheck,
  ShieldX,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { TabsContent } from "@/components/ui/tabs";
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
import { formatMemberRole } from "./household-page-reducer";
import type { HouseholdPageViewProps } from "./use-household-page";

type HouseholdMembersSectionProps = Pick<
  HouseholdPageViewProps,
  | "householdId"
  | "household"
  | "currentUser"
  | "isAdmin"
  | "isProcessing"
  | "memberToRemove"
  | "memberToPromote"
  | "memberToDemote"
  | "pageDispatch"
  | "changeMemberRole"
  | "removeMember"
  | "copyInviteCode"
>;

export function HouseholdMembersTabSection({
  householdId,
  household,
  currentUser,
  isAdmin,
  isProcessing,
  memberToRemove,
  memberToPromote,
  memberToDemote,
  pageDispatch,
  changeMemberRole,
  removeMember,
  copyInviteCode,
}: HouseholdMembersSectionProps) {
  const router = useRouter();
  const resolvedHousehold = household as Household;

  return (
    <TabsContent value="members" className="mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Membros da Residência</CardTitle>
          {resolvedHousehold.inviteCode && isAdmin && (
            <CardDescription className="text-xs flex items-center gap-2 pt-1">
              <span>
                Código de Convite: <code>{resolvedHousehold.inviteCode}</code>
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={copyInviteCode}
                title="Copiar código"
              >
                <CopyCheck className="h-3 w-3" />
              </Button>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {resolvedHousehold.members && resolvedHousehold.members.length > 0 ? (
            <ul className="space-y-3">
              {[...(resolvedHousehold.members || [])]
                .sort((a, b) => {
                  const roleA = a.role?.toLowerCase();
                  const roleB = b.role?.toLowerCase();
                  if (roleA === "admin" && roleB !== "admin") return -1;
                  if (roleA !== "admin" && roleB === "admin") return 1;
                  return (a.name || "").localeCompare(b.name || "");
                })
                .map((member) => (
                  <li
                    key={member.id || member.userId}
                    className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3 flex-grow min-w-0">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.avatar || undefined} alt={member.name || "User"} />
                        <AvatarFallback>
                          {member.name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.name || "Usuário Desconhecido"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center flex-shrink-0 gap-1">
                      <Badge
                        variant={member.role?.toLowerCase() === "admin" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {formatMemberRole(member.role)}
                      </Badge>
                      {isAdmin && String(member.userId) !== String(currentUser?.id) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Ações para {member.name}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Gerenciar {member.name}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {member.role?.toLowerCase() === "member" ? (
                              <AlertDialog
                                onOpenChange={(open) =>
                                  !open && pageDispatch({ type: "SET_MEMBER_TO_PROMOTE", value: null })
                                }
                              >
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      pageDispatch({ type: "SET_MEMBER_TO_PROMOTE", value: member });
                                    }}
                                  >
                                    <ShieldCheck className="mr-2 h-4 w-4" /> Promover a Admin
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                {memberToPromote?.id === member.id && (
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Promover a Admin?</AlertDialogTitle>
                                    </AlertDialogHeader>
                                    <AlertDialogDescription>
                                      Deseja conceder permissões de administrador para {member.name}?
                                    </AlertDialogDescription>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel disabled={isProcessing}>
                                        Cancelar
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => changeMemberRole(String(member.userId), "Admin")}
                                        disabled={isProcessing}
                                      >
                                        {isProcessing ? (
                                          <Loading text="Promovendo..." size="sm" />
                                        ) : (
                                          "Promover"
                                        )}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                )}
                              </AlertDialog>
                            ) : (
                              <AlertDialog
                                onOpenChange={(open) =>
                                  !open && pageDispatch({ type: "SET_MEMBER_TO_DEMOTE", value: null })
                                }
                              >
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      pageDispatch({ type: "SET_MEMBER_TO_DEMOTE", value: member });
                                    }}
                                  >
                                    <ShieldX className="mr-2 h-4 w-4" /> Rebaixar para Membro
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                {memberToDemote?.id === member.id && (
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Rebaixar para Membro?</AlertDialogTitle>
                                    </AlertDialogHeader>
                                    <AlertDialogDescription>
                                      Deseja remover as permissões de administrador de {member.name}?
                                    </AlertDialogDescription>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => changeMemberRole(String(member.userId), "Member")}
                                        disabled={isProcessing}
                                      >
                                        {isProcessing ? (
                                          <Loading text="Rebaixando..." size="sm" />
                                        ) : (
                                          "Rebaixar"
                                        )}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                )}
                              </AlertDialog>
                            )}
                            <DropdownMenuSeparator />
                            <AlertDialog
                              onOpenChange={(open) =>
                                !open && pageDispatch({ type: "SET_MEMBER_TO_REMOVE", value: null })
                              }
                            >
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    pageDispatch({ type: "SET_MEMBER_TO_REMOVE", value: member });
                                  }}
                                >
                                  <UserMinus className="mr-2 h-4 w-4" /> Remover da Residência
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              {memberToRemove?.id === member.id && (
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover {member.name}?</AlertDialogTitle>
                                  </AlertDialogHeader>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover {member.name} desta residência?
                                  </AlertDialogDescription>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={async () => await removeMember(String(member.userId))}
                                      disabled={isProcessing}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      {isProcessing ? (
                                        <Loading text="Removendo..." size="sm" />
                                      ) : (
                                        "Remover Membro"
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              )}
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro encontrado.</p>
          )}
        </CardContent>
        {isAdmin && (
          <CardFooter className="border-t pt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(`/households/${householdId}/members/invite`)}
            >
              <UserPlus className="mr-2 h-4 w-4" /> Convidar Novo Membro
            </Button>
          </CardFooter>
        )}
      </Card>
    </TabsContent>
  );
}
