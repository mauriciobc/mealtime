// Define the expected props type for a dynamic route page
interface FeedingDetailsPageProps {
  params: {
    slug: string;
  };
}

// Update the component function signature to use the correct props type
export default function FeedingDetailsPage(props: Readonly<FeedingDetailsPageProps>) {
  // ... existing code ...
} 