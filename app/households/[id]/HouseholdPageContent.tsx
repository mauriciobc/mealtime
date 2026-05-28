"use client";

import { HouseholdPageMainView } from "./household-page-sections";
import { HouseholdPageStateSections } from "./household-page-state-sections";
import { useHouseholdPage } from "./use-household-page";

interface HouseholdPageContentProps {
  params: { id: string };
}

export default function HouseholdPageContent({ params }: HouseholdPageContentProps) {
  const page = useHouseholdPage(params.id);

  const stateContent = HouseholdPageStateSections({
    router: page.router,
    isLoadingUser: page.isLoadingUser,
    errorUser: page.errorUser,
    currentUser: page.currentUser,
    isLoadingData: page.isLoadingData,
    loadError: page.loadError,
    household: page.household,
  });

  if (stateContent) return stateContent;

  return <HouseholdPageMainView {...page} />;
}
