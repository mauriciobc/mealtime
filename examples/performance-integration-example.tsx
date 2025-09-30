/**
 * Exemplo de Integração de Otimizações de Performance
 * 
 * Este arquivo demonstra como integrar todas as otimizações de performance
 * implementadas no Mealtime App.
 */

"use client";

import React, { useState, useMemo } from 'react';
import { PerformanceLayout, PerformanceSection, usePerformanceMeasurement } from '@/components/layout/performance-layout';
import { OptimizedImage, OptimizedAvatar } from '@/components/ui/optimized-image';
import { VirtualList } from '@/components/ui/virtual-list';
import { LazyComponent } from '@/components/ui/lazy-component';
import { useOptimizedFetch } from '@/lib/hooks/useOptimizedFetch';
import { useSearchDebounce } from '@/lib/hooks/useSearchDebounce';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useComponentPerformanceMonitor } from '@/components/ui/performance-monitor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, User, Bell } from 'lucide-react';

// Exemplo de dados
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  lastActive: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

// Componente principal otimizado
export function PerformanceIntegrationExample() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  
  // Monitor de performance
  const { measureOperation } = usePerformanceMeasurement();
  const { renderCount, isSlowRender } = useComponentPerformanceMonitor('PerformanceExample');
  
  // Debounce para busca
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Busca otimizada
  const { results: searchResults, isLoading: isSearching } = useSearchDebounce({
    searchTerm: debouncedSearchTerm,
    searchFunction: async (term) => {
      // Simula busca na API
      await new Promise(resolve => setTimeout(resolve, 200));
      return mockUsers.filter(user =>
        user.name.toLowerCase().includes(term.toLowerCase()) ||
        user.email.toLowerCase().includes(term.toLowerCase())
      );
    },
    debounceDelay: 300,
    minSearchLength: 2
  });
  
  // Dados otimizados com cache
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useOptimizedFetch({
    url: '/api/users',
    cacheTime: 5 * 60 * 1000, // 5 minutos
    staleTime: 1 * 60 * 1000, // 1 minuto
    onSuccess: (data) => {
      measureOperation('Users Loaded', () => {
        console.log(`[Performance] ${data.length} usuários carregados`);
      });
    }
  });
  
  // Dados otimizados para notificações
  const { data: notifications, isLoading: notificationsLoading } = useOptimizedFetch({
    url: '/api/notifications',
    cacheTime: 2 * 60 * 1000, // 2 minutos
    staleTime: 30 * 1000, // 30 segundos
  });
  
  // Filtros otimizados
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    let filtered = users;
    
    if (filterType !== 'all') {
      filtered = filtered.filter(user => user.name.startsWith(filterType));
    }
    
    if (debouncedSearchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [users, filterType, debouncedSearchTerm]);
  
  const renderUser = (user: User, index: number) => (
    <Card key={user.id} className="mb-2">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <OptimizedAvatar
            src={user.avatar}
            alt={user.name}
            size={40}
            className="ring-2 ring-blue-500"
          />
          <div className="flex-1">
            <h3 className="font-semibold">{user.name}</h3>
            <p className="text-sm text-gray-600">{user.email}</p>
            <p className="text-xs text-gray-500">
              Última atividade: {new Date(user.lastActive).toLocaleString()}
            </p>
          </div>
          <Badge variant="outline">
            {user.name.charAt(0).toUpperCase()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
  
  const renderNotification = (notification: Notification, index: number) => (
    <div
      key={notification.id}
      className={`p-3 border-b hover:bg-gray-50 ${
        !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <Bell className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium">{notification.title}</h4>
          <p className="text-sm text-gray-600">{notification.message}</p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(notification.createdAt).toLocaleString()}
          </p>
        </div>
        <Badge
          variant="outline"
          className={`text-xs ${
            notification.type === 'error' ? 'text-red-600' :
            notification.type === 'warning' ? 'text-yellow-600' :
            notification.type === 'success' ? 'text-green-600' :
            'text-blue-600'
          }`}
        >
          {notification.type}
        </Badge>
      </div>
    </div>
  );
  
  return (
    <PerformanceLayout enableMonitoring={true} showDetails={true}>
      <div className="container mx-auto p-6 space-y-6">
        <PerformanceSection name="Header">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">
              Exemplo de Integração de Performance
            </h1>
            <p className="text-gray-600">
              Demonstração de todas as otimizações implementadas
            </p>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-2 text-sm text-gray-500">
                Renderizações: {renderCount} | 
                Performance: {isSlowRender ? '⚠️ Lenta' : '✅ Boa'}
              </div>
            )}
          </div>
        </PerformanceSection>
        
        <PerformanceSection name="Search">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Busca Otimizada</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Buscar usuários..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {isSearching && (
                      <div className="mt-2 text-sm text-blue-600">
                        Buscando...
                      </div>
                    )}
                  </div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="all">Todos</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
                
                {searchResults.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">
                      Resultados da busca ({searchResults.length})
                    </h3>
                    <div className="space-y-2">
                      {searchResults.slice(0, 5).map(user => (
                        <div key={user.id} className="p-2 bg-gray-50 rounded">
                          {user.name} - {user.email}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </PerformanceSection>
        
        <PerformanceSection name="UsersList">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Lista de Usuários (Virtualizada)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                  <p className="mt-2 text-gray-600">Carregando usuários...</p>
                </div>
              ) : (
                <VirtualList
                  items={filteredUsers}
                  itemHeight={100}
                  containerHeight={400}
                  renderItem={renderUser}
                  className="border rounded-lg"
                />
              )}
            </CardContent>
          </Card>
        </PerformanceSection>
        
        <PerformanceSection name="Notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notificações (Lazy Loading)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notificationsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                  <p className="mt-2 text-gray-600">Carregando notificações...</p>
                </div>
              ) : (
                <VirtualList
                  items={notifications || []}
                  itemHeight={80}
                  containerHeight={300}
                  renderItem={renderNotification}
                  className="border rounded-lg"
                />
              )}
            </CardContent>
          </Card>
        </PerformanceSection>
        
        <PerformanceSection name="LazyComponents">
          <Card>
            <CardHeader>
              <CardTitle>Componentes Lazy Loading</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LazyComponent
                  importFn={() => import('@/components/ui/performance-monitor')}
                  fallback={() => (
                    <div className="p-4 border rounded-lg">
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  )}
                />
                
                <LazyComponent
                  importFn={() => import('@/components/ui/virtual-list')}
                  fallback={() => (
                    <div className="p-4 border rounded-lg">
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </PerformanceSection>
        
        <PerformanceSection name="Actions">
          <div className="flex justify-center space-x-4">
            <Button
              onClick={() => refetchUsers()}
              variant="outline"
            >
              Recarregar Usuários
            </Button>
            <Button
              onClick={() => {
                measureOperation('Custom Action', () => {
                  console.log('[Performance] Ação customizada executada');
                });
              }}
              variant="outline"
            >
              Ação Customizada
            </Button>
          </div>
        </PerformanceSection>
      </div>
    </PerformanceLayout>
  );
}

// Dados mock para demonstração
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Ana Silva',
    email: 'ana@example.com',
    avatar: '/avatars/ana.jpg',
    lastActive: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    name: 'Bruno Santos',
    email: 'bruno@example.com',
    avatar: '/avatars/bruno.jpg',
    lastActive: '2024-01-15T09:15:00Z'
  },
  {
    id: '3',
    name: 'Carlos Oliveira',
    email: 'carlos@example.com',
    lastActive: '2024-01-15T08:45:00Z'
  }
];

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Nova mensagem',
    message: 'Você recebeu uma nova mensagem de Ana Silva',
    type: 'info',
    read: false,
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    title: 'Sistema atualizado',
    message: 'O sistema foi atualizado com novas funcionalidades',
    type: 'success',
    read: true,
    createdAt: '2024-01-15T09:00:00Z'
  },
  {
    id: '3',
    title: 'Atenção necessária',
    message: 'Sua assinatura expira em 7 dias',
    type: 'warning',
    read: false,
    createdAt: '2024-01-15T08:00:00Z'
  }
];

export default PerformanceIntegrationExample;