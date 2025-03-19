"use client";

import Link from "next/link";
import { NotificationBadge } from "@/components/notifications/notification-badge";
import { AuthStatus } from "@/components/auth/auth-status";
import { useAppContext } from "@/lib/context/AppContext";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const { currentUser } = state;
  const router = useRouter();
  
  return (
    <div className="w-full bg-white border-b">
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
            {showNotifications && currentUser && <NotificationBadge />}
            <AuthStatus />
          </div>
        </div>
      </div>
    </div>
  );
}
