"use client"

import { useState, useEffect, useCallback, memo, useRef } from "react"
import { useRouter } from "next/navigation"
// import { useAppContext } from "@/lib/context/AppContext"; // REMOVED
import { useTheme } from "next-themes"
import { useSession, signOut } from "next-auth/react"
import { toast } from "sonner"
import { useLoading } from "@/lib/context/LoadingContext"
import { useUserContext } from "@/lib/context/UserContext"

// Componentes
import { AppHeader } from "@/components/app-header" // Likely unused here, consider removing if so
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select" // Added for Language/Timezone modals
import { Alert, AlertDescription } from "@/components/ui/alert" // Added for error display
import { AlertCircle } from "lucide-react" // Added for error display

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
  Mail,
  Loader2, // Added for loading states
  Home, // Added for household management
  Users, // Added for household management
  Settings2, // Added for household management
  Trash2 // Added for leave household
} from "lucide-react"

// Tipos
import { User as UserType } from "@/lib/types" // Assuming User type exists with potential settings

type NotificationSettings = {
  pushEnabled: boolean
  emailEnabled: boolean
  feedingReminders: boolean
  missedFeedingAlerts: boolean
  householdUpdates: boolean
}

// Default settings (used if not present in user profile)
const defaultNotificationSettings: NotificationSettings = {
  pushEnabled: true,
  emailEnabled: false,
  feedingReminders: true,
  missedFeedingAlerts: true,
  householdUpdates: true,
};

// Constantes
const LANGUAGE_OPTIONS = [
  { value: "pt-BR", label: "Português do Brasil" },
  { value: "en-US", label: "English (US)" },
  // { value: "es-ES", label: "Español" } // Example - keep updated
]

const TIMEZONE_OPTIONS = [
  { value: "America/Sao_Paulo", label: "Brasília (GMT-3)" },
  { value: "America/New_York", label: "New York (GMT-4)" },
  { value: "Europe/London", label: "London (GMT+1)" },
  { value: "UTC", label: "UTC (GMT+0)" }
  // Add more as needed
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
const ProfileSection = memo(({ user, onEditProfile }: { user: UserType | null, onEditProfile: () => void }) => {
  const { data: session } = useSession();
  
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
            <div className="min-w-0 flex-1">
              <h3 className="font-medium truncate">{userData.name}</h3>
              <p className="text-xs text-muted-foreground truncate">{userData.email}</p>
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

const AppearanceSection = memo(() => (
  <section className="mb-6">
    <h2 className="text-lg font-semibold mb-3">Aparência</h2>
    <AnimatedCard className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sun className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Tema</span>
        </div>
        <ThemeSelector />
      </div>
    </AnimatedCard>
  </section>
));
AppearanceSection.displayName = 'AppearanceSection';

const RegionalPreferencesSection = memo(({ 
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

const NotificationSection = memo(({ 
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

// Household Section (NEW or updated)
const HouseholdSection = memo(({ householdId, householdName, onManageHousehold }: { householdId: string | null | undefined, householdName: string | null | undefined, onManageHousehold: () => void }) => {
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

// Main Settings Page Component
export default function SettingsPage() {
  const router = useRouter();
  const { state: userState, dispatch: userDispatch } = useUserContext();
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme(); // Theme is handled directly here

  // Local state for modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isRegionalModalOpen, setIsRegionalModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isHouseholdModalOpen, setIsHouseholdModalOpen] = useState(false);
  const [isLeaveHouseholdConfirmOpen, setIsLeaveHouseholdConfirmOpen] = useState(false);
  
  // Local state for editing values within modals
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editLanguage, setEditLanguage] = useState("");
  const [editTimezone, setEditTimezone] = useState("");
  const [editNotifications, setEditNotifications] = useState<NotificationSettings>(defaultNotificationSettings);
  const [householdCode, setHouseholdCode] = useState("");
  const [newHouseholdName, setNewHouseholdName] = useState("");
  
  // Error state for modals
  const [modalError, setModalError] = useState<string | null>(null);

  const { currentUser, isLoading: isUserLoading, error: userError } = userState;

  // Initialize edit states when modals open or user data loads
  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name || "");
      setEditAvatar(currentUser.avatar || "");
      setEditLanguage(currentUser.preferences?.language || "pt-BR");
      setEditTimezone(currentUser.preferences?.timezone || "America/Sao_Paulo");
      setEditNotifications(currentUser.preferences?.notifications || defaultNotificationSettings);
    }
  }, [currentUser]);

  // Handlers to open modals and set initial values
  const handleEditProfile = () => {
    if (!currentUser) return;
    setEditName(currentUser.name || "");
    setEditAvatar(currentUser.avatar || "");
    setModalError(null);
    setIsProfileModalOpen(true);
  };

  const handleEditRegional = () => {
    if (!currentUser) return;
    setEditLanguage(currentUser.preferences?.language || "pt-BR");
    setEditTimezone(currentUser.preferences?.timezone || "America/Sao_Paulo");
    setModalError(null);
    setIsRegionalModalOpen(true);
  };

  const handleEditNotifications = () => {
    if (!currentUser) return;
    setEditNotifications(currentUser.preferences?.notifications || defaultNotificationSettings);
    setModalError(null);
    setIsNotificationModalOpen(true);
  };
  
  const handleManageHousehold = () => {
     if (!currentUser) return;
     setHouseholdCode("");
     setNewHouseholdName("");
     setModalError(null);
     setIsHouseholdModalOpen(true);
  };

  // Generic save handler (example, adapt per setting)
  const handleSave = async (operation: string, endpoint: string, payload: any, successMessage: string) => {
    const opId = `save-${operation}-${Date.now()}`;
    addLoadingOperation({ id: opId, priority: 1, description: `Salvando ${operation}...` });
    setModalError(null);
    let success = false;
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Falha ao salvar ${operation}. Status: ${response.status}`);
      }

      const updatedUser = await response.json();
      userDispatch({ type: "SET_USER", payload: updatedUser.user }); // Update context
      toast.success(successMessage);
      success = true;
    } catch (error: any) {
      console.error(`Erro ao salvar ${operation}:`, error);
      toast.error(`Erro: ${error.message}`);
      setModalError(error.message);
    } finally {
      removeLoadingOperation(opId);
    }
    return success;
  };
  
   // Household Specific Actions
  const handleJoinHousehold = async () => {
    if (!householdCode) {
        setModalError("Por favor, insira o código da residência.");
        return;
    }
    const opId = `join-household-${Date.now()}`;
    addLoadingOperation({ id: opId, priority: 1, description: "Entrando na residência..." });
    setModalError(null);
    try {
      const response = await fetch('/api/households/join', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: householdCode }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Falha ao entrar na residência. Status: ${response.status}`);
      }
      const updatedData = await response.json();
      userDispatch({ type: "SET_USER", payload: updatedData.user }); // Update user with new householdId
      // Potentially refresh other contexts if needed (cats, schedules, etc.)
      toast.success("Você entrou na residência com sucesso!");
      setIsHouseholdModalOpen(false);
    } catch (error: any) {
      console.error("Erro ao entrar na residência:", error);
      toast.error(`Erro: ${error.message}`);
      setModalError(error.message);
    } finally {
      removeLoadingOperation(opId);
    }
  };

  const handleCreateHousehold = async () => {
      if (!newHouseholdName) {
          setModalError("Por favor, insira um nome para a nova residência.");
          return;
      }
      const opId = `create-household-${Date.now()}`;
      addLoadingOperation({ id: opId, priority: 1, description: "Criando residência..." });
      setModalError(null);
      try {
          const response = await fetch('/api/households', {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: newHouseholdName }),
          });
          if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || `Falha ao criar residência. Status: ${response.status}`);
          }
          const updatedData = await response.json();
          userDispatch({ type: "SET_USER", payload: updatedData.user });
          // Potentially refresh other contexts
          toast.success("Residência criada com sucesso!");
          setIsHouseholdModalOpen(false);
      } catch (error: any) { 
          console.error("Erro ao criar residência:", error);
          toast.error(`Erro: ${error.message}`);
          setModalError(error.message);
      } finally {
          removeLoadingOperation(opId);
      }
  };
  
  const handleLeaveHousehold = async () => {
    if (!currentUser?.householdId) return;
    const opId = `leave-household-${Date.now()}`;
    addLoadingOperation({ id: opId, priority: 1, description: "Saindo da residência..." });
    setModalError(null);
    try {
      const response = await fetch(`/api/households/${currentUser.householdId}/leave`, {
        method: "POST",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Falha ao sair da residência. Status: ${response.status}`);
      }
      const updatedData = await response.json();
      userDispatch({ type: "SET_USER", payload: updatedData.user }); // User without householdId
       // Clear other contexts tied to household (cats, schedules, etc.) - This needs robust implementation
       // Example: dispatch({ type: 'RESET_STATE' }) in relevant contexts
      toast.success("Você saiu da residência.");
      setIsLeaveHouseholdConfirmOpen(false);
      setIsHouseholdModalOpen(false); // Close main household modal too
    } catch (error: any) { 
      console.error("Erro ao sair da residência:", error);
      toast.error(`Erro: ${error.message}`);
      // Don't set modalError here as the confirm dialog closes on action
    } finally {
      removeLoadingOperation(opId);
    }
  };

  // Specific save handlers using the generic one
  const handleSaveProfile = async () => {
    if (!currentUser) return;
    const success = await handleSave(
      "profile", 
      `/api/users/${currentUser.id}/profile`, 
      { name: editName, avatar: editAvatar }, 
      "Perfil atualizado com sucesso!"
    );
    if (success) setIsProfileModalOpen(false);
  };

  const handleSaveRegional = async () => {
     if (!currentUser) return;
    const success = await handleSave(
      "regional", 
      `/api/users/${currentUser.id}/preferences`, 
      { language: editLanguage, timezone: editTimezone }, 
      "Preferências regionais salvas!"
    );
     if (success) setIsRegionalModalOpen(false);
  };

  const handleSaveNotifications = async () => {
     if (!currentUser) return;
     // Ensure all keys exist even if false
     const fullSettings = { ...defaultNotificationSettings, ...editNotifications };
     const success = await handleSave(
       "notifications", 
       `/api/users/${currentUser.id}/preferences`, 
       { notifications: fullSettings }, 
       "Preferências de notificação salvas!"
    );
    if (success) setIsNotificationModalOpen(false);
  };
  
  const handleLogout = async () => {
    const opId = "logout";
    addLoadingOperation({ id: opId, priority: 1, description: "Saindo..." });
    try {
      await signOut({ redirect: true, callbackUrl: "/login" });
      toast.success("Logout realizado com sucesso!");
      // Clear user context? NextAuth likely handles session clearance
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Erro ao fazer logout.");
    } finally {
      removeLoadingOperation(opId);
    }
  };

  // Loading and Error States
  if (status === "loading" || isUserLoading) {
    return (
      <SettingsLayout>
        <SettingsSkeleton />
      </SettingsLayout>
    );
  }
  
   if (status === "unauthenticated") {
    router.replace("/login?callbackUrl=/settings"); // Redirect to login
    return (
       <SettingsLayout>
        <Loading text="Redirecionando para login..." />
      </SettingsLayout>
    );
  }
  
  // Handle error from UserContext
  if (userError) {
     return (
      <SettingsLayout>
        <div className="text-center p-6">
           <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                  Erro ao carregar dados do usuário: {userError}
              </AlertDescription>
            </Alert>
        </div>
      </SettingsLayout>
    );
  }
  
   if (!currentUser) {
     // This case might indicate an issue if status is authenticated but user is null
     console.error("SettingsPage: Authenticated status but currentUser is null.");
     return (
        <SettingsLayout>
           <div className="text-center p-6">
              <p>Não foi possível carregar os dados do usuário. Tente recarregar a página.</p>
           </div>
        </SettingsLayout>
     );
   }

  // Main Render
  return (
    <SettingsLayout>
      {/* Profile Section */}
      <ProfileSection user={currentUser} onEditProfile={handleEditProfile} />

      {/* Appearance Section */}
      <AppearanceSection />

      {/* Regional Preferences Section */}
      <RegionalPreferencesSection 
        language={currentUser.preferences?.language}
        timezone={currentUser.preferences?.timezone}
        onEdit={handleEditRegional}
      />
      
      {/* Notification Section */}
      <NotificationSection onEdit={handleEditNotifications} />
      
      {/* Household Section */}
       <HouseholdSection 
         householdId={currentUser.householdId} 
         householdName={currentUser.household?.name} // Assuming household name is nested
         onManageHousehold={handleManageHousehold}
       />

      {/* Logout Button */}
      <Button 
        variant="destructive"
        className="w-full mt-6"
        onClick={handleLogout}
        disabled={status === 'loading'} // Disable while any loading is happening
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sair
      </Button>

      {/* --- Modals --- */}

      {/* Edit Profile Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>Atualize seu nome e avatar.</DialogDescription>
          </DialogHeader>
           {modalError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{modalError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar">URL do Avatar (opcional)</Label>
              <Input id="avatar" value={editAvatar} onChange={(e) => setEditAvatar(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveProfile}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Regional Modal */}
       <Dialog open={isRegionalModalOpen} onOpenChange={setIsRegionalModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preferências Regionais</DialogTitle>
             <DialogDescription>Selecione seu idioma e fuso horário.</DialogDescription>
          </DialogHeader>
           {modalError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{modalError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-4 py-4">
             <div className="space-y-2">
              <Label htmlFor="language">Idioma</Label>
               <Select value={editLanguage} onValueChange={setEditLanguage}>
                 <SelectTrigger id="language"><SelectValue placeholder="Selecione o idioma" /></SelectTrigger>
                 <SelectContent>
                   {LANGUAGE_OPTIONS.map(option => (
                     <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Fuso Horário</Label>
               <Select value={editTimezone} onValueChange={setEditTimezone}>
                 <SelectTrigger id="timezone"><SelectValue placeholder="Selecione o fuso" /></SelectTrigger>
                 <SelectContent>
                   {TIMEZONE_OPTIONS.map(option => (
                     <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegionalModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveRegional}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Notification Modal */}
      <Dialog open={isNotificationModalOpen} onOpenChange={setIsNotificationModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurações de Notificação</DialogTitle>
            <DialogDescription>Escolha como você deseja ser notificado.</DialogDescription>
          </DialogHeader>
           {modalError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{modalError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-4 py-4">
            {Object.entries({
              pushEnabled: "Notificações Push Gerais",
              // emailEnabled: "Notificações por Email", // Example if added
              feedingReminders: "Lembretes de Alimentação Agendada",
              missedFeedingAlerts: "Alertas de Alimentação Perdida",
              householdUpdates: "Atualizações da Residência (novos membros, etc.)"
            }).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between space-x-2 p-3 border rounded-md">
                <Label htmlFor={`notif-${key}`} className="flex flex-col space-y-1">
                  <span>{label}</span>
                   {/* Add descriptions if needed */}
                   {/* <span className="font-normal leading-snug text-muted-foreground">Description...</span> */}
                </Label>
                <Switch
                  id={`notif-${key}`}
                  checked={editNotifications[key as keyof NotificationSettings]}
                  onCheckedChange={(checked) => 
                    setEditNotifications(prev => ({...prev, [key]: checked}))
                  }
                  aria-label={label}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNotificationModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveNotifications}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       {/* Manage Household Modal */}
       <Dialog open={isHouseholdModalOpen} onOpenChange={setIsHouseholdModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{currentUser?.householdId ? "Gerenciar Residência" : "Entrar ou Criar Residência"}</DialogTitle>
                <DialogDescription>
                    {currentUser?.householdId
                        ? `Você está na residência: ${currentUser.household?.name || 'Desconhecido'}. Código de convite: ${currentUser.household?.inviteCode || 'N/A'}`
                        : "Entre em uma residência existente usando um código de convite ou crie uma nova."
                    }
                </DialogDescription>
            </DialogHeader>
             {modalError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{modalError}</AlertDescription>
              </Alert>
            )}

            {/* If user has NO household */} 
            {!currentUser?.householdId && (
                <div className="space-y-6 py-4">
                    {/* Join Household Form */} 
                    <div className="space-y-3 p-4 border rounded-md">
                       <h3 className="font-medium">Entrar em uma Residência</h3>
                        <div className="space-y-2">
                            <Label htmlFor="householdCode">Código de Convite</Label>
                            <Input id="householdCode" value={householdCode} onChange={(e) => setHouseholdCode(e.target.value)} placeholder="Insira o código" />
                        </div>
                        <Button onClick={handleJoinHousehold} className="w-full">Entrar</Button>
                    </div>
                    
                    {/* Create Household Form */} 
                     <div className="space-y-3 p-4 border rounded-md">
                        <h3 className="font-medium">Criar Nova Residência</h3>
                         <div className="space-y-2">
                            <Label htmlFor="newHouseholdName">Nome da Residência</Label>
                            <Input id="newHouseholdName" value={newHouseholdName} onChange={(e) => setNewHouseholdName(e.target.value)} placeholder="Ex: Casa Feliz" />
                        </div>
                        <Button onClick={handleCreateHousehold} variant="secondary" className="w-full">Criar Residência</Button>
                     </div>
                </div>
            )}
            
             {/* If user HAS household */} 
             {currentUser?.householdId && (
                 <div className="space-y-4 py-4">
                     {/* Add household management options here if needed */}
                     {/* e.g., view members, manage cats (link), settings */}
                     <p className="text-sm text-muted-foreground">
                       Gerencie membros e configurações da residência na seção dedicada (se aplicável).
                     </p>
                    
                    <Button 
                       variant="destructive"
                       onClick={() => setIsLeaveHouseholdConfirmOpen(true)}
                       className="w-full"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                       Sair da Residência
                    </Button>
                 </div>
             )}

            <DialogFooter>
                <Button variant="outline" onClick={() => setIsHouseholdModalOpen(false)}>Fechar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirm Leave Household Modal */} 
      <Dialog open={isLeaveHouseholdConfirmOpen} onOpenChange={setIsLeaveHouseholdConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Saída</DialogTitle>
            <DialogDescription>
                Tem certeza que deseja sair da residência "{currentUser?.household?.name || 'atual'}"? 
                Você perderá acesso aos gatos e agendamentos associados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLeaveHouseholdConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleLeaveHousehold}>Confirmar Saída</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </SettingsLayout>
  );
}

// Layout Component (optional, can be inline)
const SettingsLayout = ({ children }: { children: React.ReactNode }) => (
  <PageTransition>
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 p-4 pb-24">
        {/* No AppHeader needed if title is static? Could add PageHeader */}
         <h1 className="text-2xl font-bold mb-6">Configurações</h1>
        {children}
      </div>
      <BottomNav />
    </div>
  </PageTransition>
); 