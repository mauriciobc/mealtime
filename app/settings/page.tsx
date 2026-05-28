"use client"

import { redirect } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Loading } from "@/components/ui/loading"
import {
  SettingsSkeleton,
  SettingsLayout,
  ProfileSection,
  AppearanceSection,
  RegionalPreferencesSection,
  NotificationSection,
  HouseholdSection,
} from "./settings-sections"
import { SettingsModals } from "./settings-modals"
import { useSettingsPage } from "./use-settings-page"

export default function SettingsPage() {
  const page = useSettingsPage();

  if (page.isLoading) {
    return (
      <SettingsLayout>
        <SettingsSkeleton />
      </SettingsLayout>
    );
  }

  if (page.combinedError) {
    return (
      <SettingsLayout>
        <div className="text-center p-4">
          <Alert variant="destructive" className="max-w-md mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar configurações: {page.combinedError}. Tente recarregar a página.
            </AlertDescription>
          </Alert>
          <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">Recarregar</Button>
        </div>
      </SettingsLayout>
    );
  }

  if (!page.currentUser) {
    console.log("[SettingsPage] No currentUser found. Redirecting...");
    return <Loading text="Redirecionando para login..." />;
  }

  if (!page.isLoading && !page.combinedError && page.currentUser && !page.currentUser.householdId) {
    console.log("[SettingsPage] User has no household. Redirecting to /households...");
    redirect("/households");
    return null;
  }

  const { currentUser } = page;

  return (
    <SettingsLayout>
      <ProfileSection user={currentUser} onEditProfile={page.handleEditProfile} />
      <AppearanceSection />
      <RegionalPreferencesSection
        language={currentUser.preferences?.language}
        timezone={currentUser.preferences?.timezone}
        onEdit={page.handleEditRegional}
      />
      <NotificationSection onEdit={page.handleEditNotifications} />
      <HouseholdSection
        householdId={currentUser.householdId ? String(currentUser.householdId) : null}
        householdName={page.householdDetails?.name}
        onManageHousehold={page.handleManageHousehold}
      />

      <Button
        variant="destructive"
        className="w-full mt-6"
        onClick={page.handleLogout}
        disabled={page.isLoading}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sair
      </Button>

      <SettingsModals
        currentUser={currentUser}
        modalError={page.modalError}
        isProfileModalOpen={page.isProfileModalOpen}
        setIsProfileModalOpen={page.setIsProfileModalOpen}
        editName={page.editName}
        setEditName={page.setEditName}
        editAvatar={page.editAvatar}
        setEditAvatar={page.setEditAvatar}
        handleSaveProfile={page.handleSaveProfile}
        isRegionalModalOpen={page.isRegionalModalOpen}
        setIsRegionalModalOpen={page.setIsRegionalModalOpen}
        editLanguage={page.editLanguage}
        setEditLanguage={page.setEditLanguage}
        editTimezone={page.editTimezone}
        setEditTimezone={page.setEditTimezone}
        handleSaveRegional={page.handleSaveRegional}
        isNotificationModalOpen={page.isNotificationModalOpen}
        setIsNotificationModalOpen={page.setIsNotificationModalOpen}
        editNotifications={page.editNotifications}
        setEditNotifications={page.setEditNotifications}
        handleSaveNotifications={page.handleSaveNotifications}
        isHouseholdModalOpen={page.isHouseholdModalOpen}
        setIsHouseholdModalOpen={page.setIsHouseholdModalOpen}
        isHouseholdLoading={page.isHouseholdLoading}
        householdDetails={page.householdDetails}
        householdCode={page.householdCode}
        setHouseholdCode={page.setHouseholdCode}
        newHouseholdName={page.newHouseholdName}
        setNewHouseholdName={page.setNewHouseholdName}
        handleJoinHousehold={page.handleJoinHousehold}
        handleCreateHousehold={page.handleCreateHousehold}
        isLeaveHouseholdConfirmOpen={page.isLeaveHouseholdConfirmOpen}
        setIsLeaveHouseholdConfirmOpen={page.setIsLeaveHouseholdConfirmOpen}
        handleLeaveHousehold={page.handleLeaveHousehold}
      />
    </SettingsLayout>
  );
}
