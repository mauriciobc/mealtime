"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppContext } from "@/lib/context/AppContext"
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
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { AppHeader } from "@/components/app-header"
import PageTransition from "@/components/page-transition"
import BottomNav from "@/components/bottom-nav"
import { AnimatedCard } from "@/components/ui/animated-card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
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
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { useTheme } from "next-themes"

const languageOptions = [
  { value: "pt-BR", label: "Português do Brasil" },
  { value: "en-US", label: "English (US)" },
  { value: "es-ES", label: "Español" }
]

const timezoneOptions = [
  { value: "America/Sao_Paulo", label: "Brasília (GMT-3)" },
  { value: "America/New_York", label: "New York (GMT-4)" },
  { value: "America/Los_Angeles", label: "Los Angeles (GMT-7)" },
  { value: "Europe/London", label: "London (GMT+1)" },
  { value: "Europe/Madrid", label: "Madrid (GMT+2)" },
  { value: "Asia/Tokyo", label: "Tokyo (GMT+9)" }
]

export default function SettingsPage() {
  const { state, dispatch } = useAppContext()
  const { setTheme, theme } = useTheme()
  const router = useRouter()
  
  // Estados dos diálogos
  const [isLanguageDialogOpen, setIsLanguageDialogOpen] = useState(false)
  const [isTimezoneDialogOpen, setIsTimezoneDialogOpen] = useState(false)
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  
  // Estados das configurações
  const [selectedLanguage, setSelectedLanguage] = useState<string>(state.currentUser?.preferences.language || "pt-BR")
  const [selectedTimezone, setSelectedTimezone] = useState<string>(state.currentUser?.preferences.timezone || "America/Sao_Paulo")
  const [notification, setNotification] = useState({
    pushEnabled: state.currentUser?.preferences.notifications.pushEnabled || false,
    emailEnabled: state.currentUser?.preferences.notifications.emailEnabled || false,
    feedingReminders: state.currentUser?.preferences.notifications.feedingReminders || true,
    missedFeedingAlerts: state.currentUser?.preferences.notifications.missedFeedingAlerts || true,
    householdUpdates: state.currentUser?.preferences.notifications.householdUpdates || true
  })
  const [profileName, setProfileName] = useState(state.currentUser?.name || "")
  
  // Função de salvamento de idioma
  const saveLanguage = () => {
    if (state.currentUser) {
      const updatedUser = {
        ...state.currentUser,
        preferences: {
          ...state.currentUser.preferences,
          language: selectedLanguage
        }
      }
      
      dispatch({ type: "SET_CURRENT_USER", payload: updatedUser })
      toast.success("Idioma atualizado")
      setIsLanguageDialogOpen(false)
    }
  }
  
  // Função de salvamento de fuso horário
  const saveTimezone = () => {
    if (state.currentUser) {
      const updatedUser = {
        ...state.currentUser,
        preferences: {
          ...state.currentUser.preferences,
          timezone: selectedTimezone
        }
      }
      
      dispatch({ type: "SET_CURRENT_USER", payload: updatedUser })
      toast.success("Fuso horário atualizado")
      setIsTimezoneDialogOpen(false)
    }
  }
  
  // Função de salvamento de perfil
  const saveProfile = () => {
    if (state.currentUser && profileName.trim()) {
      const updatedUser = {
        ...state.currentUser,
        name: profileName.trim()
      }
      
      dispatch({ type: "SET_CURRENT_USER", payload: updatedUser })
      toast.success("Perfil atualizado")
      setIsProfileDialogOpen(false)
    } else {
      toast.error("Nome não pode estar vazio")
    }
  }
  
  // Função de atualização de notificações
  const updateNotificationSetting = (key: keyof typeof notification, value: boolean) => {
    setNotification(prev => ({ ...prev, [key]: value }))
    
    if (state.currentUser) {
      const updatedUser = {
        ...state.currentUser,
        preferences: {
          ...state.currentUser.preferences,
          notifications: {
            ...state.currentUser.preferences.notifications,
            [key]: value
          }
        }
      }
      
      dispatch({ type: "SET_CURRENT_USER", payload: updatedUser })
    }
  }
  
  // Função de alternância de tema
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }
  
  // Função de deslogar (simulada)
  const handleLogout = () => {
    toast.success("Você foi desconectado")
    // Em uma aplicação real, redirecionaria para tela de login
    router.push('/')
  }
  
  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader title="Configurações" />
        
        <div className="flex-1 p-4 pb-24">
          {/* Seção de Perfil */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Sua Conta</h2>
            
            <AnimatedCard className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={state.currentUser?.avatar || "/placeholder.svg"} />
                    <AvatarFallback>{state.currentUser?.name?.substring(0, 2) || "U"}</AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h3 className="font-medium">{state.currentUser?.name || "Usuário"}</h3>
                    <p className="text-xs text-muted-foreground">{state.currentUser?.email || "email@exemplo.com"}</p>
                  </div>
                </div>
                
                <Button variant="ghost" size="icon" onClick={() => setIsProfileDialogOpen(true)}>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Button>
              </div>
            </AnimatedCard>
          </section>
          
          {/* Seção de Aparência */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Aparência</h2>
            
            <AnimatedCard className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Sun className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <h3 className="font-medium">Tema</h3>
                    <p className="text-xs text-muted-foreground">
                      {theme === 'dark' ? 'Escuro' : 'Claro'}
                    </p>
                  </div>
                </div>
                
                <Switch 
                  checked={theme === 'dark'}
                  onCheckedChange={toggleTheme}
                />
              </div>
            </AnimatedCard>
          </section>
          
          {/* Seção de Preferências */}
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
                        {languageOptions.find(l => l.value === selectedLanguage)?.label || "Português do Brasil"}
                      </p>
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="icon" onClick={() => setIsLanguageDialogOpen(true)}>
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
                        {timezoneOptions.find(t => t.value === selectedTimezone)?.label || "Brasília (GMT-3)"}
                      </p>
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="icon" onClick={() => setIsTimezoneDialogOpen(true)}>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </div>
              </AnimatedCard>
            </div>
          </section>
          
          {/* Seção de Notificações */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Notificações</h2>
            
            <div className="space-y-3">
              <AnimatedCard className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h3 className="font-medium">Notificações Push</h3>
                        <p className="text-xs text-muted-foreground">
                          Receber alertas no dispositivo
                        </p>
                      </div>
                    </div>
                    
                    <Switch 
                      checked={notification.pushEnabled}
                      onCheckedChange={(value) => updateNotificationSetting("pushEnabled", value)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h3 className="font-medium">Notificações por Email</h3>
                        <p className="text-xs text-muted-foreground">
                          Receber alertas por email
                        </p>
                      </div>
                    </div>
                    
                    <Switch 
                      checked={notification.emailEnabled}
                      onCheckedChange={(value) => updateNotificationSetting("emailEnabled", value)}
                    />
                  </div>
                </div>
              </AnimatedCard>
              
              <AnimatedCard className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Lembretes de Alimentação</h3>
                      <p className="text-xs text-muted-foreground">
                        Receber lembretes sobre horários
                      </p>
                    </div>
                    
                    <Switch 
                      checked={notification.feedingReminders}
                      onCheckedChange={(value) => updateNotificationSetting("feedingReminders", value)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Alertas de Alimentação Perdida</h3>
                      <p className="text-xs text-muted-foreground">
                        Avisos quando alimentações são esquecidas
                      </p>
                    </div>
                    
                    <Switch 
                      checked={notification.missedFeedingAlerts}
                      onCheckedChange={(value) => updateNotificationSetting("missedFeedingAlerts", value)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Atualizações de Domicílio</h3>
                      <p className="text-xs text-muted-foreground">
                        Notificações sobre mudanças no domicílio
                      </p>
                    </div>
                    
                    <Switch 
                      checked={notification.householdUpdates}
                      onCheckedChange={(value) => updateNotificationSetting("householdUpdates", value)}
                    />
                  </div>
                </div>
              </AnimatedCard>
            </div>
          </section>
          
          {/* Botão de Logout */}
          <Button 
            variant="destructive" 
            className="w-full" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
        
        {/* Diálogo de Idioma */}
        <Dialog open={isLanguageDialogOpen} onOpenChange={setIsLanguageDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Escolher Idioma</DialogTitle>
              <DialogDescription>
                Selecione o idioma em que deseja visualizar o aplicativo.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um idioma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Idiomas Disponíveis</SelectLabel>
                    {languageOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLanguageDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveLanguage}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Diálogo de Fuso Horário */}
        <Dialog open={isTimezoneDialogOpen} onOpenChange={setIsTimezoneDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Escolher Fuso Horário</DialogTitle>
              <DialogDescription>
                Selecione o fuso horário para definir horários corretos de alimentação.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fuso horário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Fusos Horários Populares</SelectLabel>
                    {timezoneOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTimezoneDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveTimezone}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Diálogo de Perfil */}
        <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Perfil</DialogTitle>
              <DialogDescription>
                Atualize suas informações de perfil.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              <div className="space-y-2">
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
              <Button variant="outline" onClick={() => setIsProfileDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveProfile}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <BottomNav />
      </div>
    </PageTransition>
  )
} 