"use client";

import React, { useRef, useMemo } from 'react';
import { VirtualList, useNotificationList } from '@/components/ui/virtual-list';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useSearchDebounce } from '@/lib/hooks/useSearchDebounce';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useComponentPerformanceMonitor } from '@/components/ui/performance-monitor';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Filter, 
  Bell, 
  Clock, 
  CheckCircle2,
  X
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: string;
  imageUrl?: string;
  priority: 'low' | 'medium' | 'high';
}

interface OptimizedNotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onRemove: (id: string) => void;
  onLoadMore?: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
  className?: string;
}

export function OptimizedNotificationList({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onRemove,
  onLoadMore,
  isLoading = false,
  hasMore = false,
  className
}: OptimizedNotificationListProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<string>('all');
  const [sortBy, setSortBy] = React.useState<'newest' | 'oldest' | 'priority'>('newest');
  
  // Monitor de performance do componente
  const { renderCount, isSlowRender } = useComponentPerformanceMonitor('OptimizedNotificationList');
  
  // Debounce para busca
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Filtros e busca otimizados
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    
    // Filtro por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(notification => notification.type === filterType);
    }
    
    // Busca por texto
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(notification => 
        notification.title.toLowerCase().includes(searchLower) ||
        notification.message.toLowerCase().includes(searchLower)
      );
    }
    
    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [notifications, filterType, debouncedSearchTerm, sortBy]);
  
  // Configuração da lista virtual
  const {
    virtualListRef,
    scrollToTop,
    scrollToBottom,
    itemHeight
  } = useNotificationList(filteredNotifications, 400);
  
  // Função de busca otimizada
  const { results: searchResults, isLoading: isSearching } = useSearchDebounce({
    searchTerm: debouncedSearchTerm,
    searchFunction: async (term) => {
      // Simula busca na API
      await new Promise(resolve => setTimeout(resolve, 100));
      return notifications.filter(notification =>
        notification.title.toLowerCase().includes(term.toLowerCase()) ||
        notification.message.toLowerCase().includes(term.toLowerCase())
      );
    },
    debounceDelay: 300,
    minSearchLength: 2
  });
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <X className="h-5 w-5 text-red-600" />;
      default:
        return <Bell className="h-5 w-5 text-blue-600" />;
    }
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const renderNotification = (notification: Notification, index: number) => (
    <div
      key={notification.id}
      className={cn(
        "flex items-start space-x-3 p-4 border-b hover:bg-gray-50 transition-colors",
        !notification.read && "bg-blue-50 border-l-4 border-l-blue-500"
      )}
    >
      {/* Avatar/Imagem */}
      <div className="flex-shrink-0">
        {notification.imageUrl ? (
          <OptimizedImage
            src={notification.imageUrl}
            alt="Notification"
            width={40}
            height={40}
            className="rounded-full"
            placeholder="skeleton"
          />
        ) : (
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            {getNotificationIcon(notification.type)}
          </div>
        )}
      </div>
      
      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className={cn(
            "text-sm font-medium",
            !notification.read && "font-semibold"
          )}>
            {notification.title}
          </h4>
          <div className="flex items-center space-x-2">
            <Badge
              variant="outline"
              className={cn("text-xs", getPriorityColor(notification.priority))}
            >
              {notification.priority}
            </Badge>
            {!notification.read && (
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
          {notification.message}
        </p>
        
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">
            {new Date(notification.createdAt).toLocaleString()}
          </span>
          
          <div className="flex items-center space-x-2">
            {!notification.read && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onMarkAsRead(notification.id)}
                className="text-xs"
              >
                Marcar como lida
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRemove(notification.id)}
              className="text-xs text-red-600 hover:text-red-700"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header com controles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Notificações ({filteredNotifications.length})
          </h2>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onMarkAllAsRead}
              disabled={notifications.every(n => n.read)}
            >
              Marcar todas como lidas
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={scrollToTop}
            >
              ↑ Topo
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={scrollToBottom}
            >
              ↓ Final
            </Button>
          </div>
        </div>
        
        {/* Filtros e busca */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar notificações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">Todos os tipos</option>
              <option value="info">Info</option>
              <option value="success">Sucesso</option>
              <option value="warning">Aviso</option>
              <option value="error">Erro</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
              <option value="priority">Prioridade</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Lista virtualizada */}
      <div className="border rounded-lg overflow-hidden">
        <VirtualList
          ref={virtualListRef}
          items={filteredNotifications}
          itemHeight={itemHeight}
          containerHeight={400}
          renderItem={renderNotification}
          onScrollToBottom={onLoadMore}
          className="bg-white"
        />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center justify-center p-4 border-t">
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="ml-2 text-sm text-gray-600">Carregando mais notificações...</span>
          </div>
        )}
        
        {/* Empty state */}
        {filteredNotifications.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Bell className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma notificação encontrada
            </h3>
            <p className="text-gray-500">
              {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Você está em dia!'}
            </p>
          </div>
        )}
      </div>
      
      {/* Debug info (apenas em desenvolvimento) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 space-y-1">
          <div>Renderizações: {renderCount}</div>
          <div>Notificações filtradas: {filteredNotifications.length}</div>
          <div>Performance: {isSlowRender ? '⚠️ Lenta' : '✅ Boa'}</div>
        </div>
      )}
    </div>
  );
}