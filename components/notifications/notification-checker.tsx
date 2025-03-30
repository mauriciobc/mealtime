"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { checkForNewNotifications } from '@/lib/services/notification-service';

// Componente simplificado para evitar erros
export default function NotificationChecker() {
  const { status } = useSession();
  
  useEffect(() => {
    const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutos
    
    const intervalId = setInterval(() => {
      checkNotifications().catch(err => {
        console.warn('Erro ao verificar notificações:', err);
      });
    }, CHECK_INTERVAL);
    
    return () => clearInterval(intervalId);
    
    async function checkNotifications() {
      if (status !== 'authenticated') return;
      try {
        await checkForNewNotifications();
      } catch (error) {
        console.error('Erro ao verificar notificações:', error);
      }
    }
  }, [status]);
  
  return null;
} 