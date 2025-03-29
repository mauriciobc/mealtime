"use client";

import Link from "next/link";
import { NotificationBadge } from "@/components/notifications/notification-badge";
import { AuthStatus } from "@/components/auth/auth-status";
import { useAppContext } from "@/lib/context/AppContext";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface AppHeaderProps {
  title?: string;
  showNotifications?: boolean;
  showBackButton?: boolean;
}

export function AppHeader({ 
  title, 
  showNotifications = true, 
  showBackButton = false 
}: AppHeaderProps) {
  const { state } = useAppContext();
  const { data: session } = useSession();
  const router = useRouter();
  
  // Usar dados do state.currentUser como fonte primária e session como fallback
  const userData = {
    name: state.currentUser?.name || session?.user?.name,
    email: state.currentUser?.email || session?.user?.email,
    avatar: state.currentUser?.avatar || session?.user?.image,
  };
  
  return (
    <div className="w-full bg-background border-b">
      <div className="container max-w-md mx-auto p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showBackButton && (
              <button 
                onClick={() => router.back()}
                className="p-1 rounded-full hover:bg-gray-100"
                aria-label="Voltar"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <Link href="/" className="font-semibold text-lg">
              {title || "MealTime"}
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            {showNotifications && state.currentUser && <NotificationBadge />}
            <AuthStatus user={userData} />
          </div>
        </div>
      </div>
    </div>
  );
}
