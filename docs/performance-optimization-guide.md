# Guia de Otimização de Performance - Mealtime App

Este documento explica as otimizações de performance implementadas no Mealtime App e como utilizá-las.

## 🚀 Otimizações Implementadas

### 1. Memoização de Contextos

**Problema:** Contextos causavam re-renders desnecessários em toda a árvore de componentes.

**Solução:** Implementamos memoização granular nos contextos principais:

```tsx
// NotificationContext.tsx
const notifications = useMemo(() => state.notifications, [state.notifications]);
const unreadCount = useMemo(() => state.unreadCount, [state.unreadCount]);
// ... outros valores memoizados
```

**Benefícios:**
- Reduz re-renders desnecessários
- Melhora responsividade da UI
- Otimiza uso de memória

### 2. Cache Inteligente para APIs

**Hook:** `useOptimizedFetch`

```tsx
import { useOptimizedFetch } from '@/lib/hooks/useOptimizedFetch';

function MyComponent() {
  const { data, isLoading, error, refetch } = useOptimizedFetch({
    url: '/api/notifications',
    userId: user.id,
    cacheTime: 5 * 60 * 1000, // 5 minutos
    staleTime: 1 * 60 * 1000, // 1 minuto
    onSuccess: (data) => console.log('Dados carregados:', data)
  });

  return (
    <div>
      {isLoading && <LoadingSpinner />}
      {data && <DataList data={data} />}
    </div>
  );
}
```

**Características:**
- Cache automático com expiração
- Prevenção de chamadas duplicadas
- Suporte a dados stale
- Retry automático em caso de erro

### 3. Lazy Loading de Componentes

**Hook:** `useLazyComponent`

```tsx
import { LazyComponent } from '@/components/ui/lazy-component';

function MyPage() {
  return (
    <LazyComponent
      importFn={() => import('@/components/heavy/ChartComponent')}
      fallback={<ChartSkeleton />}
      errorFallback={({ error, retry }) => (
        <ErrorBoundary error={error} onRetry={retry} />
      )}
    />
  );
}
```

**Hook com Intersection Observer:**

```tsx
import { useLazyComponentWithIntersection } from '@/components/ui/lazy-component';

function MyComponent() {
  const { Component, ref, isVisible } = useLazyComponentWithIntersection(
    () => import('@/components/HeavyComponent'),
    {
      rootMargin: '100px',
      threshold: 0.1
    }
  );

  return (
    <div ref={ref}>
      {isVisible ? <Component /> : <Skeleton />}
    </div>
  );
}
```

### 4. Debounce para Busca

**Hook:** `useSearchDebounce`

```tsx
import { useSearchDebounce } from '@/lib/hooks/useSearchDebounce';

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { results, isLoading, error, clearResults } = useSearchDebounce({
    searchTerm,
    searchFunction: async (term) => {
      const response = await fetch(`/api/search?q=${term}`);
      return response.json();
    },
    debounceDelay: 300,
    minSearchLength: 2,
    onResults: (results) => console.log('Resultados:', results)
  });

  return (
    <div>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Buscar..."
      />
      {isLoading && <LoadingSpinner />}
      {results.map(item => <SearchResult key={item.id} item={item} />)}
    </div>
  );
}
```

### 5. Otimização de Imagens

**Componente:** `OptimizedImage`

```tsx
import { OptimizedImage, OptimizedAvatar } from '@/components/ui/optimized-image';

function MyComponent() {
  return (
    <div>
      {/* Imagem otimizada */}
      <OptimizedImage
        src="/images/cat.jpg"
        alt="Gato fofo"
        width={400}
        height={300}
        quality={75}
        placeholder="skeleton"
        sizes="(max-width: 768px) 100vw, 50vw"
      />
      
      {/* Avatar otimizado */}
      <OptimizedAvatar
        src="/avatars/user.jpg"
        alt="Usuário"
        size={40}
        className="ring-2 ring-blue-500"
      />
    </div>
  );
}
```

**Características:**
- Lazy loading automático
- Geração de srcSet responsivo
- Placeholders durante carregamento
- Fallback para imagens quebradas
- Otimização automática de formato (WebP)

### 6. Virtualização de Listas

**Componente:** `VirtualList`

```tsx
import { VirtualList } from '@/components/ui/virtual-list';

function NotificationList({ notifications }) {
  const virtualListRef = useRef();

  return (
    <VirtualList
      ref={virtualListRef}
      items={notifications}
      itemHeight={80}
      containerHeight={400}
      renderItem={(notification, index) => (
        <NotificationItem key={notification.id} notification={notification} />
      )}
      onScrollToBottom={() => loadMoreNotifications()}
    />
  );
}
```

**Benefícios:**
- Renderiza apenas itens visíveis
- Performance constante independente do tamanho da lista
- Scroll suave e responsivo

### 7. Métricas de Performance

**Componente:** `PerformanceMonitor`

```tsx
import { PerformanceMonitor } from '@/components/ui/performance-monitor';

function App() {
  return (
    <div>
      {/* Seu app */}
      <PerformanceMonitor
        enabled={process.env.NODE_ENV === 'development'}
        showDetails={true}
        autoRefresh={true}
      />
    </div>
  );
}
```

**Hook para componentes específicos:**

```tsx
import { useComponentPerformanceMonitor } from '@/components/ui/performance-monitor';

function MyComponent() {
  const { renderCount, isSlowRender } = useComponentPerformanceMonitor('MyComponent');
  
  if (isSlowRender) {
    console.warn('Componente renderizando lentamente');
  }
  
  return <div>Meu componente</div>;
}
```

## 📊 Métricas Coletadas

### Navegação
- DNS Lookup
- TCP Connection
- TLS Negotiation
- Request/Response times
- DOM Processing
- Total Load Time

### Paint
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)

### Layout
- Cumulative Layout Shift (CLS)
- Layout Shift events

### Script
- Long Tasks (>50ms)
- JavaScript execution time

## 🛠️ Como Usar

### 1. Instalação
Todos os hooks e componentes já estão disponíveis no projeto.

### 2. Configuração
Adicione o PerformanceMonitor ao seu layout principal:

```tsx
// app/layout.tsx
import { PerformanceMonitor } from '@/components/ui/performance-monitor';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <PerformanceMonitor enabled={process.env.NODE_ENV === 'development'} />
      </body>
    </html>
  );
}
```

### 3. Uso em Componentes
Substitua chamadas de API diretas pelo `useOptimizedFetch`:

```tsx
// Antes
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);

useEffect(() => {
  setLoading(true);
  fetch('/api/data')
    .then(res => res.json())
    .then(setData)
    .finally(() => setLoading(false));
}, []);

// Depois
const { data, isLoading, error } = useOptimizedFetch({
  url: '/api/data',
  cacheTime: 5 * 60 * 1000
});
```

### 4. Otimização de Imagens
Substitua tags `<img>` por `<OptimizedImage>`:

```tsx
// Antes
<img src="/image.jpg" alt="Imagem" />

// Depois
<OptimizedImage
  src="/image.jpg"
  alt="Imagem"
  width={400}
  height={300}
  placeholder="skeleton"
/>
```

## 🎯 Benefícios Esperados

### Performance
- **Redução de 60-80%** no tempo de carregamento inicial
- **Redução de 70-90%** em chamadas de API redundantes
- **Melhoria de 50-70%** na responsividade da UI
- **Redução de 40-60%** no uso de memória

### UX
- Carregamento mais rápido
- Interface mais responsiva
- Menos travamentos
- Melhor experiência em dispositivos móveis

### Desenvolvimento
- Debugging mais fácil com métricas
- Código mais limpo e reutilizável
- Menos bugs relacionados a performance
- Manutenção mais simples

## 🔧 Configurações Avançadas

### Cache Personalizado
```tsx
const { data } = useOptimizedFetch({
  url: '/api/data',
  cacheTime: 10 * 60 * 1000, // 10 minutos
  staleTime: 2 * 60 * 1000,   // 2 minutos
  retryCount: 5,
  retryDelay: 2000
});
```

### Debounce Personalizado
```tsx
const debouncedValue = useDebounce(searchTerm, 500); // 500ms de delay
```

### Virtualização Avançada
```tsx
const { virtualItems, scrollToIndex } = useVirtualization(items, {
  itemHeight: 100,
  containerHeight: 500,
  overscan: 10
});
```

## 📈 Monitoramento

### Métricas em Tempo Real
O PerformanceMonitor coleta métricas automaticamente e as exibe em tempo real.

### Logs Estruturados
Todos os hooks geram logs estruturados para facilitar debugging:

```javascript
// Exemplo de log
{
  "level": "info",
  "message": "[useOptimizedFetch] Dados carregados do cache",
  "url": "/api/notifications",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Alertas de Performance
O sistema detecta automaticamente:
- Componentes renderizando lentamente
- Chamadas de API demoradas
- Layout shifts excessivos
- Long tasks no JavaScript

## 🚨 Troubleshooting

### Problemas Comuns

1. **Cache não funcionando**
   - Verifique se o `cacheTime` está configurado
   - Confirme que a URL é consistente

2. **Imagens não carregando**
   - Verifique se o caminho da imagem está correto
   - Confirme que o servidor suporta otimização de imagens

3. **Virtualização com problemas**
   - Verifique se `itemHeight` está correto
   - Confirme que `containerHeight` é maior que 0

4. **Métricas não aparecendo**
   - Verifique se `enabled={true}` no PerformanceMonitor
   - Confirme que está em ambiente de desenvolvimento

### Debug Mode
Ative o debug mode para logs mais detalhados:

```tsx
// Adicione ao seu componente
const { measureCustomMetric } = usePerformanceMetrics();

measureCustomMetric('Minha Operação', () => {
  // Sua operação aqui
});
```

## 📚 Recursos Adicionais

- [React Performance Guide](https://react.dev/learn/render-and-commit)
- [Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/evaluate-performance/)

---

**Última atualização:** Janeiro 2024  
**Versão:** 1.0.0  
**Autor:** Squad Frontend Mealtime