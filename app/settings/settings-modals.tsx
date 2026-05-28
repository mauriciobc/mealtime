"use client"

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
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { User as UserType, NotificationSettings } from "@/lib/types"
import { LANGUAGE_OPTIONS, TIMEZONE_OPTIONS } from "./settings-sections"

export interface SettingsModalsProps {
  currentUser: UserType
  modalError: string | null
  isProfileModalOpen: boolean
  setIsProfileModalOpen: (open: boolean) => void
  editName: string
  setEditName: (value: string) => void
  editAvatar: string
  setEditAvatar: (value: string) => void
  handleSaveProfile: () => void
  isRegionalModalOpen: boolean
  setIsRegionalModalOpen: (open: boolean) => void
  editLanguage: string
  setEditLanguage: (value: string) => void
  editTimezone: string
  setEditTimezone: (value: string) => void
  handleSaveRegional: () => void
  isNotificationModalOpen: boolean
  setIsNotificationModalOpen: (open: boolean) => void
  editNotifications: NotificationSettings
  setEditNotifications: (value: NotificationSettings | ((prev: NotificationSettings) => NotificationSettings)) => void
  handleSaveNotifications: () => void
  isHouseholdModalOpen: boolean
  setIsHouseholdModalOpen: (open: boolean) => void
  isHouseholdLoading: boolean
  householdDetails: { name?: string; inviteCode?: string | null } | null
  householdCode: string
  setHouseholdCode: (value: string) => void
  newHouseholdName: string
  setNewHouseholdName: (value: string) => void
  handleJoinHousehold: () => void
  handleCreateHousehold: () => void
  isLeaveHouseholdConfirmOpen: boolean
  setIsLeaveHouseholdConfirmOpen: (open: boolean) => void
  handleLeaveHousehold: () => void
}

export function SettingsModals({
  currentUser,
  modalError,
  isProfileModalOpen,
  setIsProfileModalOpen,
  editName,
  setEditName,
  editAvatar,
  setEditAvatar,
  handleSaveProfile,
  isRegionalModalOpen,
  setIsRegionalModalOpen,
  editLanguage,
  setEditLanguage,
  editTimezone,
  setEditTimezone,
  handleSaveRegional,
  isNotificationModalOpen,
  setIsNotificationModalOpen,
  editNotifications,
  setEditNotifications,
  handleSaveNotifications,
  isHouseholdModalOpen,
  setIsHouseholdModalOpen,
  isHouseholdLoading,
  householdDetails,
  householdCode,
  setHouseholdCode,
  newHouseholdName,
  setNewHouseholdName,
  handleJoinHousehold,
  handleCreateHousehold,
  isLeaveHouseholdConfirmOpen,
  setIsLeaveHouseholdConfirmOpen,
  handleLeaveHousehold,
}: SettingsModalsProps) {
  return (
    <>
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
              feedingReminders: "Lembretes de Alimentação Agendada",
              missedFeedingAlerts: "Alertas de Alimentação Perdida",
              householdUpdates: "Atualizações da Residência (novos membros, etc.)"
            }).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between space-x-2 p-3 border rounded-md">
                <Label htmlFor={`notif-${key}`} className="flex flex-col space-y-1">
                  <span>{label}</span>
                </Label>
                <Switch
                  id={`notif-${key}`}
                  checked={editNotifications[key as keyof NotificationSettings]}
                  onCheckedChange={(checked) =>
                    setEditNotifications(prev => ({ ...prev, [key]: checked }))
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

      <Dialog open={isHouseholdModalOpen} onOpenChange={setIsHouseholdModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentUser?.householdId ? "Gerenciar Residência" : "Entrar ou Criar Residência"}</DialogTitle>
            <DialogDescription>
              {currentUser?.householdId
                ? isHouseholdLoading
                  ? <span className="italic">Carregando detalhes...</span>
                  : householdDetails
                    ? `Você está na residência: ${householdDetails.name}. Código de convite: ${householdDetails.inviteCode || 'N/A'}`
                    : <span className="text-destructive">Erro ao carregar detalhes da residência.</span>
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

          {!currentUser?.householdId && (
            <div className="space-y-6 py-4">
              <div className="space-y-3 p-4 border rounded-md">
                <h3 className="font-medium">Entrar em uma Residência</h3>
                <div className="space-y-2">
                  <Label htmlFor="householdCode">Código de Convite</Label>
                  <Input id="householdCode" value={householdCode} onChange={(e) => setHouseholdCode(e.target.value)} placeholder="Insira o código" />
                </div>
                <Button onClick={handleJoinHousehold} className="w-full">Entrar</Button>
              </div>

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

          {currentUser?.householdId && (
            <div className="space-y-4 py-4">
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

      <Dialog open={isLeaveHouseholdConfirmOpen} onOpenChange={setIsLeaveHouseholdConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Saída</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja sair da residência "{isHouseholdLoading ? '...' : householdDetails?.name || 'atual'}"?
              Você perderá acesso aos gatos e agendamentos associados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLeaveHouseholdConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleLeaveHousehold}>Confirmar Saída</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
