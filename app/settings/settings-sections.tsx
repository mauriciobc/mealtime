"use client"

import { memo } from "react"
import PageTransition from "@/components/page-transition"
import BottomNav from "@/components/bottom-nav"
import { AnimatedCard } from "@/components/ui/animated-card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ThemeSelector, AccentColorSelector } from "@/components/theme-selector"
import {
  Bell,
  Globe,
  ChevronRight,
  Home,
} from "lucide-react"
import { User as UserType } from "@/lib/types"

export const LANGUAGE_OPTIONS = [
  { value: "pt-BR", label: "Português do Brasil" },
  { value: "en-US", label: "English (US)" },
]

export const TIMEZONE_OPTIONS = [
  { value: "America/Sao_Paulo", label: "Brasília (GMT-3)" },
  { value: "America/New_York", label: "New York (GMT-4)" },
  { value: "Europe/London", label: "London (GMT+1)" },
  { value: "UTC", label: "UTC (GMT+0)" }
]

export const SettingsSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-3">
      <div className="h-6 w-24 bg-muted rounded animate-pulse" />
      <div className="p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-3 w-48 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>

    {[1, 2, 3].map((section) => (
      <div key={section} className="space-y-3">
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        <div className="space-y-2">
          {[1, 2].map((item) => (
            <div key={item} className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 bg-muted rounded animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-48 bg-muted rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-6 w-6 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
)

export const SettingsLayout = ({ children }: { children: React.ReactNode }) => (
  <PageTransition>
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 p-4 pb-24">
        <h1 className="text-2xl font-bold mb-6">Configurações</h1>
        {children}
      </div>
      <BottomNav />
    </div>
  </PageTransition>
)

export const ProfileSection = memo(({ user, onEditProfile }: { user: UserType | null, onEditProfile: () => void }) => {
  const userData = {
    name: user?.name || user?.email || "Usuário",
    email: user?.email || "email@exemplo.com",
    avatar: user?.avatar || `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(user?.name || user?.email || 'U')}`,
  };

  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold mb-3">Sua Conta</h2>
      <AnimatedCard className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/10">
              <AvatarImage
                src={userData.avatar}
                alt={userData.name}
              />
              <AvatarFallback>
                {userData.name
                  ? userData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                  : "U"
                }
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium truncate">{userData.name}</h3>
              <p className="text-xs text-muted-foreground truncate">{userData.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onEditProfile}
            className="hover:bg-primary/10 flex-shrink-0 ml-2"
            aria-label="Editar perfil"
          >
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </AnimatedCard>
    </section>
  );
});
ProfileSection.displayName = 'ProfileSection';

export const AppearanceSection = memo(() => (
  <section className="mb-6">
    <h2 className="text-lg font-semibold mb-3">Aparência</h2>
    <AnimatedCard className="p-4">
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <div className="flex-1">
          <span className="font-medium">Tema</span>
          <p className="text-xs text-muted-foreground mb-2">Escolha entre claro, escuro ou sistema.</p>
          <ThemeSelector />
        </div>
        <div className="flex-1">
          <span className="font-medium">Cor de Destaque</span>
          <p className="text-xs text-muted-foreground mb-2">Personalize a cor de destaque do aplicativo.</p>
          <AccentColorSelector />
        </div>
      </div>
    </AnimatedCard>
  </section>
));
AppearanceSection.displayName = 'AppearanceSection';

export const RegionalPreferencesSection = memo(({
  language,
  timezone,
  onEdit
}: {
  language: string | undefined,
  timezone: string | undefined,
  onEdit: () => void
}) => (
  <section className="mb-6">
    <h2 className="text-lg font-semibold mb-3">Preferências Regionais</h2>
    <AnimatedCard className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-medium">Idioma e Fuso Horário</h3>
            <p className="text-xs text-muted-foreground">
              {LANGUAGE_OPTIONS.find(l => l.value === language)?.label || "Padrão"}, {TIMEZONE_OPTIONS.find(t => t.value === timezone)?.label || "Padrão"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar preferências regionais">
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>
    </AnimatedCard>
  </section>
));
RegionalPreferencesSection.displayName = 'RegionalPreferencesSection';

export const NotificationSection = memo(({
  onEdit
}: {
  onEdit: () => void
}) => (
  <section className="mb-6">
    <h2 className="text-lg font-semibold mb-3">Notificações</h2>
    <AnimatedCard className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-medium">Gerenciar Notificações</h3>
            <p className="text-xs text-muted-foreground">
              Ajuste suas preferências de push e email.
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar notificações">
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>
    </AnimatedCard>
  </section>
));
NotificationSection.displayName = 'NotificationSection';

export const HouseholdSection = memo(({ householdId, householdName, onManageHousehold }: { householdId: string | null | undefined, householdName: string | null | undefined, onManageHousehold: () => void }) => {
  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold mb-3">Residência</h2>
      <AnimatedCard className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Home className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-medium">{householdName ? `Residência: ${householdName}` : "Gerenciar Residência"}</h3>
              <p className="text-xs text-muted-foreground">
                {householdId ? "Ver membros, gatos e configurações." : "Crie ou participe de uma residência."}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onManageHousehold} aria-label="Gerenciar residência">
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </AnimatedCard>
    </section>
  )
});
HouseholdSection.displayName = 'HouseholdSection';
