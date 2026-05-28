import { pageMetadata } from "@/lib/metadata";
import ErrorPageContent from "./ErrorPageContent";

export const metadata = pageMetadata("Erro", "Ocorreu um erro.");

interface ErrorPageProps {
  searchParams: Promise<{ message?: string }>;
}

export default async function ErrorPage({ searchParams }: ErrorPageProps) {
  const params = await searchParams;
  return <ErrorPageContent message={params.message ?? null} />;
}
