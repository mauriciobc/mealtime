"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { 
  Menu, 
  X, 
  Moon, 
  Sun, 
  Settings,
  User,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { NotificationBadge } from "@/components/notifications/notification-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

// Componente para exibir os links de navegação no menu
const NavLinks = ({ className, onClick = () => {} }: { className?: string; onClick?: () => void }) => {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  return (
    <div className={cn("flex flex-col space-y-1", className)}>
      {[
        { href: "/", label: "Home" },
        { href: "/cats", label: "Meus Gatos" },
        { href: "/feedings", label: "Alimentações" },
        { href: "/schedules", label: "Agendamentos" },
        { href: "/statistics", label: "Estatísticas" },
        { href: "/households", label: "Residências" }
      ].map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onClick}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors",
            isActive(link.href) 
              ? "bg-primary/10 text-primary font-medium" 
              : "hover:bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
};

export function AppHeader() {
  const { theme, setTheme } = useTheme();
  const { data: session, status } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-200",
        isScrolled
          ? "backdrop-blur-md bg-background/80 border-b shadow-sm"
          : "bg-background"
      )}
    >
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader className="mb-4">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <NavLinks onClick={closeMobileMenu} />
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex items-center space-x-2">
            <motion.div
              className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold"
              whileHover={{ rotate: 10 }}
            >
              M
            </motion.div>
            <span className="font-bold text-lg hidden sm:inline-block">MealTime</span>
          </Link>
        </div>

        <nav className="hidden lg:flex items-center space-x-1">
          <NavLinks className="flex-row space-y-0 space-x-1" />
        </nav>

        <div className="flex items-center gap-2">
          <NotificationBadge />

          {status === "loading" ? (
            <div className="animate-pulse h-8 w-8 rounded-full bg-muted"></div>
          ) : status === "unauthenticated" ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage 
                      src={session?.user?.image || "/placeholder-user.jpg"} 
                      alt={session?.user?.name || "Usuário"} 
                    />
                    <AvatarFallback>
                      {session?.user?.name 
                        ? session.user.name.substring(0, 2).toUpperCase()
                        : "US"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="font-medium">{session?.user?.name}</p>
                    <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configurações</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {theme === "dark" ? (
                    <>
                      <Sun className="mr-2 h-4 w-4" />
                      <span>Tema Claro</span>
                    </>
                  ) : (
                    <>
                      <Moon className="mr-2 h-4 w-4" />
                      <span>Tema Escuro</span>
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-destructive" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
} 