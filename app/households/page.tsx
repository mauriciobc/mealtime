"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Lock, MoreVertical, Plus, Trash, Pencil, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Tipos para os dados
interface HouseholdMember {
  userId: string;
  role: "Admin" | "Member";
  joinedAt: Date;
  name?: string;
  email?: string;
  image?: string;
}

interface Cat {
  id: string;
  name: string;
  imageUrl?: string;
}

interface Household {
  id: string;
  name: string;
  members: HouseholdMember[];
  cats: Cat[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Componente de estado vazio
function EmptyHouseholdsState() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg bg-muted/50">
      <Home className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Sem casas cadastradas</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Crie uma casa para organizar seus gatos e programações de alimentação.
        Casas permitem que você compartilhe a responsabilidade de cuidar dos gatos com outras pessoas.
      </p>
      <Button asChild>
        <Link href="/households/new" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>Criar Nova Casa</span>
        </Link>
      </Button>
    </div>
  );
}

// Componente de carregamento
function LoadingHouseholds() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, index) => (
          <Card key={index} className="w-full">
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function HouseholdsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [householdToDelete, setHouseholdToDelete] = useState<string | null>(null);

  // Função para carregar os domicílios
  useEffect(() => {
    const fetchHouseholds = async () => {
      setIsLoading(true);
      try {
        // Simulando uma chamada de API
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Dados simulados
        const mockHouseholds: Household[] = [
          {
            id: "1",
            name: "Casa Principal",
            members: [
              { 
                userId: session?.user?.email || "user-1", 
                role: "Admin", 
                joinedAt: new Date(),
                name: session?.user?.name || "Usuário Atual",
                email: session?.user?.email || "user@example.com"
              },
              { 
                userId: "user-2", 
                role: "Member", 
                joinedAt: new Date(),
                name: "João Silva",
                email: "joao@example.com"
              }
            ],
            cats: [
              { id: "cat-1", name: "Mia" },
              { id: "cat-2", name: "Felix" }
            ]
          },
          {
            id: "2",
            name: "Apartamento",
            members: [
              { 
                userId: session?.user?.email || "user-1", 
                role: "Member", 
                joinedAt: new Date(),
                name: session?.user?.name || "Usuário Atual",
                email: session?.user?.email || "user@example.com"
              },
              { 
                userId: "user-3", 
                role: "Admin", 
                joinedAt: new Date(),
                name: "Maria Costa",
                email: "maria@example.com"
              }
            ],
            cats: [
              { id: "cat-3", name: "Luna" }
            ]
          }
        ];
        
        setHouseholds(mockHouseholds);
      } catch (error) {
        console.error("Erro ao carregar domicílios:", error);
        toast.error("Não foi possível carregar seus domicílios. Tente novamente mais tarde.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHouseholds();
  }, [session]);

  const handleDeleteHousehold = async (id: string) => {
    try {
      // Simulando uma requisição
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Atualiza o estado local
      setHouseholds(prev => prev.filter(h => h.id !== id));
      
      // Fecha o diálogo
      setHouseholdToDelete(null);
      
      // Notifica o usuário
      toast.success("Casa excluída com sucesso");
    } catch (error) {
      console.error("Erro ao excluir casa:", error);
      toast.error("Erro ao excluir casa. Tente novamente mais tarde.");
    }
  };

  const isAdmin = (household: Household) => {
    const currentUser = household.members.find(
      member => member.userId === session?.user?.email || member.email === session?.user?.email
    );
    return currentUser?.role === "Admin";
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingHouseholds />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Minhas Casas</h1>
          <p className="text-muted-foreground">
            Gerencie as casas onde você alimenta seus gatos
          </p>
        </div>
        <Button asChild>
          <Link href="/households/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Nova Casa</span>
          </Link>
        </Button>
      </div>

      {households.length === 0 ? (
        <EmptyHouseholdsState />
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {households.map((household) => (
            <motion.div key={household.id} variants={itemVariants}>
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl mb-1">{household.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        {household.members.length} membros · {household.cats.length} gatos
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin(household) && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          <Lock className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/households/${household.id}`} className="flex items-center cursor-pointer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </Link>
                          </DropdownMenuItem>
                          {isAdmin(household) && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/households/${household.id}/edit`} className="flex items-center cursor-pointer">
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Editar
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <AlertDialog open={householdToDelete === household.id} onOpenChange={(open) => !open && setHouseholdToDelete(null)}>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => {
                                    e.preventDefault();
                                    setHouseholdToDelete(household.id);
                                  }} className="text-destructive focus:text-destructive">
                                    <Trash className="h-4 w-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. Isso excluirá permanentemente a casa
                                      <span className="font-semibold"> {household.name} </span>
                                      e removerá todos os dados associados.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteHousehold(household.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex flex-wrap gap-2">
                    {household.cats.slice(0, 3).map((cat) => (
                      <Badge key={cat.id} variant="secondary" className="rounded-full">
                        {cat.name}
                      </Badge>
                    ))}
                    {household.cats.length > 3 && (
                      <Badge variant="outline" className="rounded-full">
                        +{household.cats.length - 3} mais
                      </Badge>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-4 pb-4 flex justify-between">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/households/${household.id}`}>Ver Detalhes</Link>
                  </Button>
                  {isAdmin(household) && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/households/${household.id}/members/invite`}>Convidar</Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
} 