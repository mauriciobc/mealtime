# Checklist de Melhorias - Página de Configurações

## Backend e Dados
- [x] Implementar persistência de dados no backend
  - [x] Criar rota de API para configurações
  - [x] Implementar GET para buscar configurações
  - [x] Implementar PUT para atualizar configurações
  - [x] Integrar com o frontend
  - [x] Adicionar tratamento de erros básico
- [x] Adicionar validação robusta de dados
  - [x] Criar schema de validação com Zod
  - [x] Implementar validações específicas para cada campo
  - [x] Adicionar validação de timezone e idioma
  - [x] Integrar validações no backend
  - [x] Atualizar frontend para lidar com erros de validação
- [ ] Implementar tratamento de erros
- [ ] Implementar cache de configurações

## UX/UI
- [ ] Adicionar confirmações para ações críticas
- [ ] Melhorar feedback visual durante operações
- [ ] Adicionar suporte a temas personalizados

## Qualidade
- [ ] Adicionar testes unitários
- [ ] Adicionar testes de integração
- [ ] Implementar monitoramento de erros

## Documentação
- [ ] Atualizar documentação da API
- [ ] Adicionar comentários no código
- [ ] Criar guia de contribuição

## Segurança
- [ ] Implementar rate limiting
- [ ] Adicionar validação de permissões
- [ ] Implementar auditoria de mudanças

## Gerenciamento de Imagens
- [x] Implementar sistema de otimização de imagens
  - [x] Configurar Sharp para processamento de imagens
    - [x] Instalar dependência: `npm install sharp`
    - [x] Criar utilitário em `src/lib/image-processing.ts`
    - [x] Implementar funções de redimensionamento e otimização
  - [x] Definir padrões de tamanho
    - [x] Perfil de usuário: 400x400px
    - [x] Perfil de gato: 300x300px
    - [x] Thumbnails: 150x150px
  - [x] Configurar limites de upload
    - [x] Tamanho máximo: 5MB
    - [x] Formatos permitidos: JPG, PNG, WebP
  - [x] Implementar validação de imagens
    - [x] Verificar dimensões mínimas
    - [x] Validar tipos MIME
    - [x] Detectar imagens corrompidas
- [x] Configurar armazenamento
  - [x] Criar estrutura de pastas organizada
    - [x] `/public/profiles/humans/`
    - [x] `/public/profiles/cats/`
    - [x] `/public/profiles/thumbnails/`
  - [x] Implementar sistema de nomes de arquivo únicos
  - [x] Configurar limpeza automática de arquivos temporários
- [x] Atualizar componentes existentes
  - [x] Modificar `src/components/ProfileImage.tsx`
  - [x] Atualizar `src/components/CatProfile.tsx`
  - [x] Implementar lazy loading de imagens
  - [x] Adicionar placeholders durante carregamento
- [x] Implementar cache de imagens
  - [x] Configurar cache no servidor
  - [x] Implementar cache no cliente
  - [x] Definir políticas de expiração
- [x] Adicionar tratamento de erros
  - [x] Implementar fallback para imagens quebradas
  - [x] Adicionar mensagens de erro amigáveis
  - [x] Implementar retry mechanism para uploads falhos
- [x] Documentação
  - [x] Criar guia de uso do sistema de imagens
  - [x] Documentar limites e restrições
  - [x] Adicionar exemplos de implementação
  - [ ] Adicionar diagramas de fluxo
  - [ ] Criar guia de contribuição específico para o sistema de imagens
  - [ ] Documentar procedimentos de backup e recuperação
  - [ ] Adicionar exemplos de casos de uso específicos

## PWA (Progressive Web App)
- [ ] Configurar manifest.json
  - [ ] Criar arquivo em `/public/manifest.json`
  - [ ] Definir metadados básicos
    - [ ] Nome e nome curto do app
    - [ ] Descrição
    - [ ] Cores de tema e fundo
    - [ ] URL inicial
  - [ ] Configurar ícones
    - [ ] Gerar ícones em múltiplos tamanhos (192x192, 512x512)
    - [ ] Adicionar ícones no manifest
    - [ ] Configurar máscaras de ícone para iOS
  - [ ] Adicionar link no `app/layout.tsx`
    ```tsx
    <link rel="manifest" href="/manifest.json" />
    ```

- [ ] Implementar Service Worker
  - [ ] Criar arquivo em `/public/sw.js`
  - [ ] Configurar cache de assets
    - [ ] Definir estratégia de cache (Cache First para assets estáticos)
    - [ ] Listar recursos para cache
    - [ ] Implementar atualização de cache
  - [ ] Adicionar registro no `app/layout.tsx`
    ```tsx
    useEffect(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => console.log('SW registered:', registration))
          .catch(error => console.log('SW registration failed:', error));
      }
    }, []);
    ```

- [ ] Otimizar para PWA
  - [ ] Configurar meta tags no `app/layout.tsx`
    ```tsx
    <meta name="theme-color" content="#000000" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="MealTime" />
    ```
  - [ ] Implementar fallback offline
    - [ ] Criar página offline em `/app/offline/page.tsx`
    - [ ] Configurar service worker para servir página offline
  - [ ] Otimizar performance
    - [ ] Implementar lazy loading de componentes
    - [ ] Configurar cache de rotas
    - [ ] Otimizar carregamento de imagens

- [ ] Testar e Validar
  - [ ] Verificar Lighthouse score
  - [ ] Testar instalação em diferentes dispositivos
  - [ ] Validar funcionamento offline
  - [ ] Testar atualizações de cache
  - [ ] Verificar compatibilidade cross-browser

- [ ] Documentação
  - [ ] Criar guia de desenvolvimento PWA
  - [ ] Documentar processo de atualização
  - [ ] Adicionar instruções de debug
  - [ ] Criar checklist de validação 

# User profile

## Objetivo
Desenvolver uma página de perfil de usuário com uma seção fixa no topo (Avatar e Nome Completo) e três abas:
1. Informações adicionais (Username, e-mail, data de cadastro)
2. Lares (lista de lares, quantidade de gatos e membros)
3. Meus Gatos (lista de gatos do usuário, peso atual e último horário de alimentação)
A página deve ter botão de editar e uma rota/página separada para edição dos dados do usuário.

---

## Passo a Passo para Desenvolvimento

### 1. Planejamento e Estrutura
- [x] Ler o schema do Prisma para entender os campos do usuário, lares e gatos.
- [x] Definir a estrutura dos dados necessários para cada aba.
- [x] Esboçar o layout da página (wireframe simples).

### 2. Backend/API
- [x] Criar endpoint GET `/api/profile/[id|username]` para buscar dados completos do usuário (incluindo lares e gatos).
- [x] Criar endpoint PUT `/api/profile/[id|username]` para editar dados do usuário.
- [x] Garantir autenticação/autorização nas rotas. (IMPORTANTE: Não alterar a implementação atual de autenticação!!)
- [x] Incluir dados relacionados: lares (com membros e gatos), gatos (com peso e último feeding).

### 3. Frontend - Página de Perfil
- [x] Criar página `/profile/[id|username]`.
- [x] Implementar seção fixa no topo com Avatar e Nome Completo.
- [x] Adicionar botão "Editar perfil" (leva para `/profile/edit`).
- [ ] Implementar tabs usando componentes do shadcn/ui:
    - [x] Aba 1: Informações adicionais (Username, e-mail, data de cadastro)
    - [x] Aba 2: Lares (listar lares, mostrar quantidade de gatos e membros de cada lar)
    - [x] Aba 3: Meus Gatos (listar gatos, mostrar peso atual e último horário de alimentação)
- [x] Garantir responsividade e acessibilidade.

### 4. Frontend - Página de Edição
- [x] Criar página `/profile/edit`.
- [x] Implementar formulário para editar Avatar, Nome Completo, Username, e-mail e fuso horário. (usar o mesmo componente de upload de imagens da página '/cats/new')
- [x] Validar dados no frontend (usar Zod se possível).
- [x] Enviar dados para o endpoint PUT.
- [x] Exibir feedback de sucesso/erro.

### 5. Integração e Testes
- [x] Integrar frontend com endpoints do backend.
- [ ] Testar fluxo de exibição e edição do perfil.
- [ ] Adicionar testes unitários e de integração (quando possível).

### 6. UX/UI
- [x] Usar componentes do shadcn/ui e Tailwind para layout e tabs.
- [x] Adicionar feedback visual (loading, sucesso, erro).
- [x] Aplicar animações do Framer para criar impacto visual.
- [x] Garantir que a seção fixa do topo permaneça visível ao trocar de abas.
- [x] Permitir upload e alteração do avatar do usuário na edição de perfil.

### 7. Documentação
- [ ] Documentar endpoints criados/alterados.
- [ ] Adicionar comentários no código para facilitar manutenção.
- [ ] Atualizar README ou documentação interna sobre o fluxo de perfil de usuário.

---

## Dicas para Desenvolvedor Júnior
- Sempre comece pelo backend: garanta que os dados necessários estão disponíveis.
- Use mocks/fake data no frontend enquanto a API não estiver pronta.
- Teste cada parte separadamente antes de integrar tudo.
- Peça revisão de código e feedbacks frequentes.
- Documente dúvidas e decisões tomadas durante o desenvolvimento.

# Backend Listener for Scheduled Notifications (pg_notify)

## Objetivo
Implementar um serviço backend que escuta eventos pg_notify no canal 'send-scheduled-notifications' do Postgres, permitindo entrega instantânea de notificações agendadas.

## Checklist
- [ ] Planejamento
  - [x] Definir objetivo e arquitetura do listener
  - [x] Escolher tecnologia (Node.js + pg)
  - [x] Definir método de entrega (chamar Edge Function ou inserir direto na tabela notifications)
- [ ] Implementação
  - [ ] Adicionar script Node.js ao projeto existente (ex: `scripts/pg_notify_listener.js`)
  - [ ] Instalar dependências necessárias (`pg`, `dotenv`) se ainda não estiverem presentes
  - [ ] Utilizar variáveis de ambiente já existentes (.env compartilhado)
  - [ ] Implementar conexão segura com o banco (usar service role key)
  - [ ] Implementar lógica de LISTEN no canal 'send-scheduled-notifications'
  - [ ] Parsear payload JSON recebido
  - [ ] Chamar função de entrega (Edge Function via HTTP OU inserir na tabela notifications)
  - [ ] Adicionar tratamento de erros e reconexão automática
  - [ ] Adicionar logs para monitoramento
  - [ ] Adicionar instruções para rodar o script como processo separado (ex: `node scripts/pg_notify_listener.js`)
- [ ] Deploy
  - [ ] Escolher ambiente de execução (VM, container, serverless, etc.)
  - [ ] Configurar variáveis de ambiente seguras
  - [ ] Garantir execução contínua e reinício automático em caso de falha
- [ ] Documentação
  - [ ] Documentar arquitetura e fluxo do listener
  - [ ] Adicionar instruções de deploy e variáveis de ambiente
  - [ ] Atualizar diagramas de arquitetura (se aplicável)
  - [ ] Incluir exemplos de logs e troubleshooting

# weight loading refactor

## Objetivo
Centralizar e padronizar o controle de carregamento, erro e ausência de dados na página de peso (`app/weight/page.tsx`), alinhando com o padrão da Home. Garantir robustez, fácil manutenção e experiência consistente para o usuário.

## Plano Detalhado

### 1. Mapear Estados Possíveis
- [x] Carregando usuário
- [x] Carregando gatos
- [x] Carregando logs de peso/alimentação
- [x] Erro ao carregar qualquer dado
- [x] Usuário não autenticado
- [x] Usuário sem householdId
- [x] Nenhum gato cadastrado
- [x] Nenhum gato selecionado
- [x] Pronto para renderizar painel

### 2. Criar Enum/Type para Estado da Página
```ts
type WeightPageState =
  | 'LOADING'
  | 'ERROR'
  | 'NO_USER'
  | 'NO_HOUSEHOLD'
  | 'NO_CATS'
  | 'NO_SELECTED_CAT'
  | 'READY';
```

### 3. Calcular Estado Centralizado
- [x] Utilizar `useMemo` para decidir o estado da página com base nos contextos e variáveis

### 4. Renderização Única via Switch
- [x] Substituir early returns por um único switch

### 5. Padronizar Feedback Visual
- [x] Sempre usar `<GlobalLoading />` para carregamento.
- [x] Usar `<EmptyState />` ou `<Alert />` para erros e estados vazios.

### 6. Estratégias para Casos de Exceção
- [ ] Implementar logs e mensagens para cada exceção

### 7. Uso do Logger
- [x] Adicionar logs com `logger` nos pontos de decisão do switch
- [x] Para erros com stack trace, usar `logger.logError(error)`
- [x] Garantir logs em produção no formato JSON

### 8. Testes e Documentação
- [ ] Testar todos os fluxos de exceção e loading
- [ ] Documentar os estados e mensagens para facilitar manutenção

---

**Próximo milestone:**
Testar todos os fluxos de exceção e loading, garantindo logs e feedbacks visuais corretos (etapa 8).

**Responsável:** Squad Frontend
**Status:** Em andamento

# Performance Optimization Plan - Mealtime App

## Objetivo
Implementar otimizações de performance para reduzir o LCP de 4.6s para < 2.0s, otimizar cadeia de requisições de 4.9s para < 1.5s, e melhorar a experiência geral do usuário através de melhorias mensuráveis nas métricas Core Web Vitals.

## Contexto Técnico
- **LCP Atual**: 4.6s (Crítico - ideal < 2.5s)
- **Cadeia de Requisições**: 4.9s (8+ requisições sequenciais)
- **Requisições Auth**: 4 simultâneas (deveria ser 1)
- **CLS**: 0.01 (Bom)
- **TTFB**: 160ms (Bom)

## FASE 1: Otimizações Críticas (Semanas 1-2)
*Meta: LCP < 3.0s, Requisições < 2.0s*

### 1.1 Otimizar Elemento LCP (Logo SVG)
**Problema**: Logo não tem `fetchpriority="high"` e não é descoberto no HTML inicial
**Localização**: `components/layout/header.tsx` ou onde o logo é renderizado

**Passos**:
1. Encontrar o componente que renderiza o logo SVG
2. Adicionar atributos obrigatórios:
   - `fetchpriority="high"`
   - `loading="eager"`
   - `width` e `height` explícitos
3. Garantir que o logo esteja no HTML inicial (não carregado via JS)
4. Testar com Lighthouse para verificar melhoria no LCP

**Critério de Sucesso**: LCP reduzido para < 3.0s

### 1.2 Implementar Preconnect para Supabase
**Problema**: Conexões lentas com servidor Supabase
**Localização**: `app/layout.tsx` no `<head>`

**Passos**:
1. Abrir `app/layout.tsx`
2. Adicionar no `<head>` antes de outros links:
   ```html
   <link rel="preconnect" href="https://zzvmyzyszsqptgyqwqwt.supabase.co" />
   <link rel="dns-prefetch" href="https://zzvmyzyszsqptgyqwqwt.supabase.co" />
   <link rel="preconnect" href="https://zzvmyzyszsqptgyqwqwt.supabase.co" crossorigin />
   ```
3. Testar se as requisições Supabase iniciam mais rapidamente

**Critério de Sucesso**: Redução de 200-300ms no TTFB de requisições Supabase

### 1.3 Criar Endpoint Consolidado `/api/dashboard`
**Problema**: 8+ requisições sequenciais causando latência de 4.9s
**Localização**: `app/api/dashboard/route.ts` (criar novo arquivo)

**Passos**:
1. Criar novo arquivo `app/api/dashboard/route.ts`
2. Implementar função GET que recebe `householdId` e `userId` como query params
3. Usar `Promise.all()` para executar todas as consultas em paralelo:
   - Notificações (`/api/notifications`)
   - Contagem não lida (`/api/notifications/unread-count`)
   - Cronogramas (`/api/schedules`)
   - Alimentações (`/api/feedings`)
   - Logs de peso (`/api/weight/logs`)
   - Metas (`/api/goals`)
   - Lares (`/api/households`)
   - Gatos (`/api/households/[id]/cats`)
4. Retornar objeto JSON com todos os dados
5. Manter compatibilidade com autenticação existente

**Critério de Sucesso**: Redução de 8+ requisições para 1, tempo total < 2.0s

### 1.4 Atualizar Frontend para Usar Endpoint Consolidado
**Problema**: Contextos fazem requisições individuais
**Localização**: Todos os contextos (NotificationContext, WeightContext, etc.)

**Passos**:
1. Identificar onde cada contexto faz suas requisições iniciais
2. Modificar para chamar `/api/dashboard` primeiro
3. Distribuir os dados retornados para cada contexto
4. Manter fallback para requisições individuais em caso de erro
5. Testar se todos os dados ainda carregam corretamente

**Critério de Sucesso**: Apenas 1 requisição inicial, dados distribuídos corretamente

## FASE 2: Otimizações Estruturais (Semanas 3-4)
*Meta: LCP < 2.5s, Bundle size -20%*

### 2.1 Refatorar UserProvider para Singleton
**Problema**: Múltiplas inicializações causando 4 requisições simultâneas para auth
**Localização**: `contexts/UserContext.tsx`

**Passos**:
1. Analisar o código atual do UserProvider
2. Implementar padrão Singleton para evitar múltiplas instâncias
3. Garantir que apenas uma inicialização aconteça por sessão
4. Manter compatibilidade com a API existente
5. Adicionar logs para monitorar inicializações
6. Testar se apenas 1 requisição auth é feita

**Critério de Sucesso**: Apenas 1 requisição para `/auth/v1/user`, eliminação de logs duplicados

### 2.2 Implementar Lazy Loading de Imagens
**Problema**: Todas as imagens carregam simultaneamente
**Localização**: Componentes que renderizam imagens de gatos e usuários

**Passos**:
1. Criar componente `OptimizedImage` em `components/ui/optimized-image.tsx`
2. Usar Next.js Image com:
   - `loading="lazy"` para imagens não críticas
   - `loading="eager"` para imagens críticas (logo, avatar principal)
   - `placeholder="blur"` com blurDataURL
3. Substituir tags `<img>` por `<OptimizedImage>` nos componentes:
   - `CatProfile.tsx`
   - `ProfileImage.tsx`
   - Outros componentes com imagens
4. Testar se imagens carregam conforme necessário

**Critério de Sucesso**: Redução de 30-40% no tempo de carregamento inicial

### 2.3 Implementar Code Splitting por Contexto
**Problema**: Todos os contextos carregam simultaneamente
**Localização**: `contexts/index.ts` e `app/layout.tsx`

**Passos**:
1. Criar arquivo `contexts/index.ts` com exports lazy
2. Usar `React.lazy()` para cada contexto:
   - NotificationProvider
   - WeightProvider
   - FeedingProvider
   - CatsProvider
3. Modificar `app/layout.tsx` para usar Suspense
4. Adicionar fallback de loading para cada contexto
5. Testar se contextos carregam sob demanda

**Critério de Sucesso**: Redução de 20-30% no bundle size inicial

## FASE 3: Otimizações Avançadas (Semanas 5-6)
*Meta: LCP < 2.0s, Performance geral +40%*

### 3.1 Implementar Service Worker
**Problema**: Recarregamento desnecessário de assets
**Localização**: `public/sw.js` (criar novo arquivo)

**Passos**:
1. Criar arquivo `public/sw.js`
2. Implementar cache para assets estáticos:
   - CSS, JS, imagens
   - Estratégia Cache First
3. Implementar cache para APIs com TTL:
   - `/api/dashboard` (5 minutos)
   - `/api/cats` (10 minutos)
4. Adicionar registro no `app/layout.tsx`
5. Testar funcionamento offline básico

**Critério de Sucesso**: Redução de 50-70% no tempo de carregamento em visitas subsequentes

### 3.2 Otimizar CSS Crítico
**Problema**: CSS render-blocking
**Localização**: `app/layout.tsx` e `components/critical-css.tsx`

**Passos**:
1. Criar componente `CriticalCSS` com estilos inline essenciais
2. Adicionar no `<head>` do `app/layout.tsx`
3. Modificar link do CSS para `rel="preload"` com `onLoad`
4. Adicionar fallback `<noscript>` para o CSS
5. Testar se CSS não bloqueia renderização

**Critério de Sucesso**: Eliminação do render-blocking CSS, melhoria no FCP

### 3.3 Otimizar Bundle com Tree Shaking
**Problema**: Bundle size não otimizado
**Localização**: `next.config.mjs`

**Passos**:
1. Instalar `@next/bundle-analyzer`
2. Configurar análise de bundle no `next.config.mjs`
3. Implementar `optimizePackageImports` para bibliotecas grandes
4. Configurar `splitChunks` para separar vendors e contextos
5. Executar análise e otimizar imports desnecessários

**Critério de Sucesso**: Redução de 20-30% no bundle size

## Sistema de Monitoramento

### 4.1 Implementar Performance Monitor
**Localização**: `lib/performance-monitor.ts` (criar novo arquivo)

**Passos**:
1. Criar classe `PerformanceMonitor` com métodos:
   - `measureLCP()` - medir Largest Contentful Paint
   - `measureCLS()` - medir Cumulative Layout Shift
   - `measureAPIResponseTime()` - medir tempo de APIs
2. Usar `PerformanceObserver` para capturar métricas
3. Implementar envio para sistema de analytics
4. Adicionar logs estruturados para debugging

### 4.2 Criar Dashboard de Performance
**Localização**: `components/admin/performance-dashboard.tsx` (criar novo arquivo)

**Passos**:
1. Criar componente para exibir métricas em tempo real
2. Implementar cards para LCP, CLS, API response time
3. Adicionar indicadores visuais (bom/ruim) baseados em thresholds
4. Integrar com `PerformanceMonitor`
5. Adicionar rota `/admin/performance` (apenas em desenvolvimento)

## Validação e Testes

### 5.1 Configurar Testes de Performance
**Passos**:
1. Instalar `lighthouse-ci` e `@lhci/cli`
2. Configurar script `npm run lighthouse:ci`
3. Definir performance budget no `lighthouserc.js`
4. Integrar com CI/CD para testes automáticos
5. Configurar alertas para degradação de performance

### 5.2 Implementar Monitoramento Contínuo
**Passos**:
1. Configurar Vercel Analytics ou similar
2. Implementar Real User Monitoring (RUM)
3. Configurar alertas para métricas críticas
4. Criar dashboard de monitoramento em produção
5. Documentar procedimentos de troubleshooting

## Cronograma de Implementação

### Semana 1
- [ ] Implementar otimizações do LCP (1.1)
- [ ] Adicionar preconnect para Supabase (1.2)
- [ ] **Meta**: LCP < 3.0s

### Semana 2
- [ ] Criar endpoint `/api/dashboard` (1.3)
- [ ] Atualizar frontend para usar endpoint consolidado (1.4)
- [ ] **Meta**: LCP < 2.5s, Requisições < 2.0s

### Semana 3
- [ ] Refatorar UserProvider (2.1)
- [ ] Implementar lazy loading de imagens (2.2)
- [ ] **Meta**: LCP < 2.2s, Bundle size -15%

### Semana 4
- [ ] Implementar code splitting (2.3)
- [ ] Otimizar CSS crítico (3.2)
- [ ] **Meta**: LCP < 2.0s, Bundle size -20%

### Semana 5
- [ ] Implementar Service Worker (3.1)
- [ ] Otimizar bundle com tree shaking (3.3)
- [ ] **Meta**: Performance geral +30%

### Semana 6
- [ ] Implementar sistema de monitoramento (4.1, 4.2)
- [ ] Configurar testes de performance (5.1, 5.2)
- [ ] **Meta**: LCP < 1.8s, Monitoramento ativo

## Critérios de Sucesso

| Métrica | Baseline | Target | Melhoria |
|---------|----------|--------|----------|
| **LCP** | 4.6s | < 2.0s | 57% |
| **Cadeia de Requisições** | 4.9s | < 1.5s | 69% |
| **Bundle Size** | ~500KB | ~350KB | 30% |
| **Requisições Auth** | 4 | 1 | 75% |
| **Tempo de Carregamento** | 4.9s | < 2.0s | 59% |

## Notas Importantes para Desenvolvedor Júnior

1. **Sempre meça antes e depois**: Use Lighthouse antes de cada mudança para ter baseline
2. **Implemente incrementalmente**: Faça uma otimização por vez e teste
3. **Mantenha compatibilidade**: Não quebre funcionalidades existentes
4. **Documente mudanças**: Adicione comentários explicando as otimizações
5. **Teste em diferentes dispositivos**: Performance varia muito entre dispositivos
6. **Use ferramentas de debug**: Chrome DevTools, React DevTools, Bundle Analyzer
7. **Peça revisão**: Sempre peça review de código para otimizações complexas

## Troubleshooting Comum

- **LCP não melhora**: Verificar se `fetchpriority="high"` está no elemento correto
- **Requisições duplicadas**: Verificar se UserProvider não está sendo inicializado múltiplas vezes
- **Bundle size aumenta**: Verificar se tree shaking está funcionando corretamente
- **Service Worker não funciona**: Verificar se está registrado corretamente no layout
- **Métricas inconsistentes**: Verificar se está testando em ambiente de produção

**Responsável:** Squad Frontend + Tech Lead
**Status:** Planejado
**Prioridade:** Alta
