"use client"

import { useState, useEffect, useCallback, memo, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAppContext } from "@/lib/context/AppContext"
import { useTheme } from "next-themes"
import { useSession, signOut } from "next-auth/react"
import { toast } from "sonner"
import { useLoading } from "@/lib/context/LoadingContext"
import { useUserContext } from "@/lib/context/UserContext"

// Componentes
import { AppHeader } from "@/components/app-header"
import PageTransition from "@/components/page-transition"
import BottomNav from "@/components/bottom-nav"
import { AnimatedCard } from "@/components/ui/animated-card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeSelector } from "@/components/theme-selector"
import { Loading } from "@/components/ui/loading"

// Ícones
import { 
  Bell,
  Globe, 
  Clock, 
  Check, 
  ChevronRight, 
  LogOut, 
  Moon, 
  Sun, 
  User,
  Mail
} from "lucide-react"

// Tipos
type NotificationSettings = {
  pushEnabled: boolean
  emailEnabled: boolean
  feedingReminders: boolean
  missedFeedingAlerts: boolean
  householdUpdates: boolean
}

// Constantes
const LANGUAGE_OPTIONS = [
  { value: "pt-BR", label: "Português do Brasil" },
  { value: "en-US", label: "English (US)" },
  { value: "es-ES", label: "Español" }
]

const TIMEZONE_OPTIONS = [
  { value: "America/Sao_Paulo", label: "Brasília (GMT-3)" },
  { value: "America/New_York", label: "New York (GMT-4)" },
  { value: "America/Los_Angeles", label: "Los Angeles (GMT-7)" },
  { value: "Europe/London", label: "London (GMT+1)" },
  { value: "Europe/Madrid", label: "Madrid (GMT+2)" },
  { value: "Asia/Tokyo", label: "Tokyo (GMT+9)" },
  { value: "UTC", label: "UTC (GMT+0)" }
]

// Componentes de Skeleton
const SettingsSkeleton = () => (
  <div className="space-y-6">
    {/* Skeleton do Perfil */}
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

    {/* Skeleton das Seções */}
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

// Componentes de Seção
const ProfileSection = memo(({ user, onEditProfile }: { user: any, onEditProfile: () => void }) => {
  const { data: session } = useSession();
  
  // Usar dados do session como fallback
  const userData = {
    name: user?.name || session?.user?.name || "Usuário",
    email: user?.email || session?.user?.email || "email@exemplo.com",
    avatar: user?.avatar || session?.user?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || session?.user?.name || 'U'}`,
    role: user?.role || "user"
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
            <div>
              <h3 className="font-medium">{userData.name}</h3>
              <p className="text-xs text-muted-foreground">{userData.email}</p>
              {userData.role && (
                <p className="text-xs text-primary mt-0.5">
                  {userData.role === "admin" ? "Administrador" : "Usuário"}
                </p>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onEditProfile}
            className="hover:bg-primary/10"
          >
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </AnimatedCard>
    </section>
  );
});

const AppearanceSection = memo(({ theme, onThemeChange }: { theme: string, onThemeChange: () => void }) => (
  <AnimatedCard className="p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Sun className="h-5 w-5" />
        <span className="font-medium">Aparência</span>
      </div>
      <ThemeSelector />
    </div>
  </AnimatedCard>
));

const RegionalPreferencesSection = memo(({ 
  language, 
  timezone, 
  onLanguageChange, 
  onTimezoneChange 
}: { 
  language: string, 
  timezone: string, 
  onLanguageChange: () => void, 
  onTimezoneChange: () => void 
}) => (
  <section className="mb-6">
    <h2 className="text-lg font-semibold mb-3">Preferências Regionais</h2>
    <div className="space-y-3">
      <AnimatedCard className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-medium">Idioma</h3>
              <p className="text-xs text-muted-foreground">
                {LANGUAGE_OPTIONS.find(l => l.value === language)?.label || "Português do Brasil"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onLanguageChange}>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </AnimatedCard>
      
      <AnimatedCard className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-medium">Fuso Horário</h3>
              <p className="text-xs text-muted-foreground">
                {TIMEZONE_OPTIONS.find(t => t.value === timezone)?.label || "UTC"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onTimezoneChange}>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </AnimatedCard>
    </div>
  </section>
));

const NotificationSection = memo(({ 
  settings, 
  onSettingChange 
}: { 
  settings: NotificationSettings, 
  onSettingChange: (key: keyof NotificationSettings, value: boolean) => void 
}) => (
  <section className="mb-6">
    <h2 className="text-lg font-semibold mb-3">Notificações</h2>
    <div className="space-y-3">
      {Object.entries(settings).map(([key, value]) => (
        <AnimatedCard key={key} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {key.includes('email') ? (
                <Mail className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Bell className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <h3 className="font-medium">
                  {key === 'pushEnabled' && 'Notificações Push'}
                  {key === 'emailEnabled' && 'Notificações por Email'}
                  {key === 'feedingReminders' && 'Lembretes de Alimentação'}
                  {key === 'missedFeedingAlerts' && 'Alertas de Alimentação Perdida'}
                  {key === 'householdUpdates' && 'Atualizações da Residência'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {key === 'pushEnabled' && 'Receber notificações no navegador'}
                  {key === 'emailEnabled' && 'Receber notificações por email'}
                  {key === 'feedingReminders' && 'Receber lembretes para alimentar os gatos'}
                  {key === 'missedFeedingAlerts' && 'Receber alertas quando uma alimentação for perdida'}
                  {key === 'householdUpdates' && 'Receber notificações sobre mudanças na residência'}
                </p>
              </div>
            </div>
            <Switch 
              checked={value} 
              onCheckedChange={(checked) => onSettingChange(key as keyof NotificationSettings, checked)} 
            />
          </div>
        </AnimatedCard>
      ))}
    </div>
  </section>
));

// Layout comum
const SettingsLayout = ({ children }: { children: React.ReactNode }) => (
  <PageTransition>
    <div className="flex flex-col min-h-screen bg-background">
      {children}
    </div>
  </PageTransition>
)

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const { state: userState, dispatch } = useUserContext();
  const { currentUser } = userState;
  const [isLoading, setIsLoading] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);

  // Add missing state variables
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isLanguageDialogOpen, setIsLanguageDialogOpen] = useState(false);
  const [isTimezoneDialogOpen, setIsTimezoneDialogOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const [selectedLanguage, setSelectedLanguage] = useState(currentUser?.preferences?.language || "pt-BR");
  const [selectedTimezone, setSelectedTimezone] = useState(currentUser?.preferences?.timezone || "UTC");
  const [notification, setNotification] = useState(currentUser?.preferences?.notifications || {
    pushEnabled: true,
    emailEnabled: true,
    feedingReminders: true,
    missedFeedingAlerts: true,
    householdUpdates: true,
  });
  const [profileName, setProfileName] = useState(currentUser?.name || "");

  // Add missing handler functions
  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  const updateNotificationSetting = useCallback((key: keyof NotificationSettings, value: boolean) => {
    setNotification(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  }, []);

  const saveLanguage = useCallback(async () => {
    setIsLanguageDialogOpen(false);
    await handleSaveSettings();
  }, []);

  const saveTimezone = useCallback(async () => {
    setIsTimezoneDialogOpen(false);
    await handleSaveSettings();
  }, []);

  const saveProfile = useCallback(async () => {
    setIsProfileDialogOpen(false);
    await handleSaveSettings();
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadSettings = useCallback(async () => {
    if (!session?.user || status !== "authenticated") return;
    if (loadingRef.current) return;

    loadingRef.current = true;
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings');
      
      if (!mountedRef.current) return;

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao carregar configurações');
      }

      if (!mountedRef.current) return;

      const formattedUser = {
        id: Number(data.id),
        name: data.name || session.user.name || "",
        email: data.email || session.user.email || "",
        avatar: session.user.image || `https://api.dicebear.com/7.x/initials/svg?seed=${data.name || session.user.name || 'U'}`,
        householdId: data.householdId || null,
        preferences: {
          timezone: data.timezone || "UTC",
          language: data.language || "pt-BR",
          notifications: {
            pushEnabled: data.notifications?.pushEnabled ?? true,
            emailEnabled: data.notifications?.emailEnabled ?? true,
            feedingReminders: data.notifications?.feedingReminders ?? true,
            missedFeedingAlerts: data.notifications?.missedFeedingAlerts ?? true,
            householdUpdates: data.notifications?.householdUpdates ?? true,
          },
        },
        role: data.role || "user"
      };

      if (mountedRef.current) {
        dispatch({ type: "SET_CURRENT_USER", payload: formattedUser });
        setSelectedLanguage(formattedUser.preferences.language);
        setSelectedTimezone(formattedUser.preferences.timezone);
        setNotification(formattedUser.preferences.notifications);
        setProfileName(formattedUser.name);
      }
    } catch (error) {
      if (mountedRef.current) {
        console.error('Erro ao carregar configurações:', error);
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar configurações');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setHasAttemptedLoad(true);
        loadingRef.current = false;
      }
    }
  }, [session, status, dispatch]);

  useEffect(() => {
    if (!hasAttemptedLoad) {
      loadSettings();
    }
  }, [loadSettings, hasAttemptedLoad]);

  const handleSaveSettings = async () => {
    if (!currentUser?.id || isLoading) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profileName,
          preferences: {
            language: selectedLanguage,
            timezone: selectedTimezone,
            notifications: notification,
          },
        }),
      });

      if (!mountedRef.current) return;

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao salvar configurações');
      }

      if (mountedRef.current) {
        dispatch({
          type: "SET_CURRENT_USER",
          payload: {
            ...currentUser,
            name: profileName,
            preferences: {
              language: selectedLanguage,
              timezone: selectedTimezone,
              notifications: notification,
            },
          },
        });
        toast.success('Configurações salvas com sucesso');
      }
    } catch (error) {
      if (mountedRef.current) {
        console.error('Erro ao salvar configurações:', error);
        toast.error(error instanceof Error ? error.message : 'Erro ao salvar configurações');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Renderização condicional
  if (status === "loading") {
    return (
      <SettingsLayout>
        <div className="flex-1 p-4 pb-24">
          <SettingsSkeleton />
        </div>
      </SettingsLayout>
    )
  }

  if (!session?.user) {
    router.push('/auth/signin');
    return null;
  }

  if (isLoading && !currentUser) {
    return (
      <SettingsLayout>
        <div className="flex-1 p-4 pb-24">
          <SettingsSkeleton />
        </div>
      </SettingsLayout>
    )
  }

  // Renderização principal
  return (
    <SettingsLayout>
      <div className="flex-1 p-4 pb-24">
        <ProfileSection 
          user={currentUser} 
          onEditProfile={() => setIsProfileDialogOpen(true)} 
        />
        
        <AppearanceSection 
          theme={theme || 'light'} 
          onThemeChange={toggleTheme} 
        />
        
        <RegionalPreferencesSection 
          language={selectedLanguage}
          timezone={selectedTimezone}
          onLanguageChange={() => setIsLanguageDialogOpen(true)}
          onTimezoneChange={() => setIsTimezoneDialogOpen(true)}
        />
        
        <NotificationSection 
          settings={notification}
          onSettingChange={updateNotificationSetting}
        />
        
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
      
      {/* Diálogos */}
      <Dialog open={isLanguageDialogOpen} onOpenChange={setIsLanguageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecione o Idioma</DialogTitle>
            <DialogDescription>
              Escolha o idioma preferido para a interface
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {LANGUAGE_OPTIONS.map((option) => (
              <div
                key={option.value}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                onClick={() => {
                  setSelectedLanguage(option.value)
                  saveLanguage()
                }}
              >
                <span>{option.label}</span>
                {selectedLanguage === option.value && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isTimezoneDialogOpen} onOpenChange={setIsTimezoneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecione o Fuso Horário</DialogTitle>
            <DialogDescription>
              Escolha o fuso horário da sua localização
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {TIMEZONE_OPTIONS.map((option) => (
              <div
                key={option.value}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                onClick={() => {
                  setSelectedTimezone(option.value)
                  saveTimezone()
                }}
              >
                <span>{option.label}</span>
                {selectedTimezone === option.value && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Atualize suas informações pessoais
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveProfile}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <BottomNav />
    </SettingsLayout>
  )
} 