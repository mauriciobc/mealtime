"use client";

import React from "react";
import { useUserContext } from "@/lib/context/UserContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute(props: ProtectedRouteProps) {
  const { state: userState } = useUserContext();
  const { currentUser, isLoading } = userState;
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push("/login");
    }
  }, [currentUser, isLoading, router]);

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

  return <React.Fragment>{props.children}</React.Fragment>;
} 