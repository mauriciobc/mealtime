"use client";

import { useEffect, useState } from 'react';
import { useAppContext } from '@/lib/context/AppContext';
import { checkForNewNotifications } from '@/lib/services/notification-service';
import { toast } from '@/components/ui/use-toast';
import { useSession } from 'next-auth/react';
import type { Notification } from '@/lib/types';

export default function NotificationChecker() {
  const { state, dispatch } = useAppContext();
  const [lastCheck, setLastCheck] = useState(Date.now());
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  
  // Verificar por novas notificações periodicamente
  useEffect(() => {
    // Se o usuário não estiver autenticado, não verificar notificações
    if (!isAuthenticated) {
      return;
    }
    
    // Intervalo de 5 minutos (em produção pode ser ajustado)
    const CHECK_INTERVAL = 5 * 60 * 1000;
    
    // Verificar notificações ao carregar a página
    checkNotifications();
    
    // Configurar timer para verificar periodicamente
    const intervalId = setInterval(() => {
      checkNotifications();
    }, CHECK_INTERVAL);
    
    // Limpar timer ao desmontar o componente
    return () => clearInterval(intervalId);
    
    async function checkNotifications() {
      try {
        // Se o usuário não estiver mais autenticado, não prosseguir
        if (status !== 'authenticated') {
          return;
        }
        
        const now = Date.now();
        setLastCheck(now);
        
        // Obter novas notificações
        const newNotifications = await checkForNewNotifications();
        
        // Filtrar apenas notificações realmente novas
        const filteredNotifications = newNotifications.filter(n => {
          // Usar timestamp para verificar se a notificação é nova
          const timestamp = n.timestamp ? new Date(n.timestamp).getTime() : 0;
          return timestamp > lastCheck;
        });
        
        // Adicionar novas notificações ao estado
        if (filteredNotifications.length > 0 && dispatch) {
          filteredNotifications.forEach(notification => {
            // Adicionar notificação ao contexto
            dispatch({
              type: 'ADD_NOTIFICATION',
              payload: notification
            });
            
            // Mostrar toast para cada nova notificação
            toast({
              title: notification.title,
              description: notification.message
            });
          });
        }
      } catch (error: any) {
        console.error('Erro ao verificar notificações:', error);
        
        // Mostrar mensagem de erro apenas no ambiente de desenvolvimento
        if (process.env.NODE_ENV === 'development') {
          toast({
            title: 'Erro ao verificar notificações',
            description: error?.message || 'Ocorreu um erro ao verificar as notificações',
            variant: 'destructive'
          });
        }
      }
    }
  }, [dispatch, lastCheck, isAuthenticated, status]);
  
  // Componente não renderiza nada visualmente
  return null;
} 