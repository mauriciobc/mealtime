"use client";

import React from "react";
import { useUserContext } from "@/lib/context/UserContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { state: userState } = useUserContext();
  const { currentUser, isLoading } = userState;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p>Carregando sessão do usuário...</p>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return <>{children}</>;
}
