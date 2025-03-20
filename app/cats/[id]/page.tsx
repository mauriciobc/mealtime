import CatDetails from "@/app/components/cat-details"

interface PageProps {
  params: {
    id: string;
  };
}

export default function CatPage({ params }: PageProps) {
  return <CatDetails params={params} />
}
