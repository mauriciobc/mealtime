import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import InvitePageContent from "./InvitePageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const resolved = await params;
  return pageMetadata("Convidar membros", `Convide membros para a residência.`);
}

export default async function HouseholdInvitePage({ params }: PageProps) {
  const resolved = await params;
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <InvitePageContent params={resolved} />
    </Suspense>
  );
}
