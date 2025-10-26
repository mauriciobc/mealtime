/**
 * EXEMPLO DE MIGRAÇÃO PARA REACT 19 - Hook `use`
 * 
 * Este arquivo demonstra como migrar de useContext para o novo hook `use` do React 19.
 * O hook `use` tem várias vantagens:
 * 
 * 1. Suporta Promises diretamente (não precisa de useEffect para async)
 * 2. Pode ser usado condicionalmente (diferente de useContext)
 * 3. Melhor integração com Suspense
 * 4. Simplifica código assíncrono
 */

import React, { use, Suspense, cache } from 'react';
// import { FeedingStateContext, FeedingActionsContext } from './FeedingContext.v2';
import type { FeedingLog } from '@/lib/types';

// Stub for FeedingClientData component
interface FeedingClientDataProps {
  feedingsPromise?: Promise<FeedingLog[]>;
}

function FeedingClientData({ feedingsPromise }: FeedingClientDataProps) {
  const feedings = feedingsPromise ? use(feedingsPromise) : [];
  
  return (
    <div>
      {feedings.map(log => (
        <div key={log.id}>{log.notes}</div>
      ))}
    </div>
  );
}

// ============================================================================
// EXEMPLO 1: Uso Básico do Hook `use`
// ============================================================================

// Example commented out since contexts don't exist
// export function FeedingLogsList() {
//   // ANTES (React 18):
//   // const { state } = useContext(FeedingContext)
//   // const { feedingLogs, isLoading } = state
//   
//   // DEPOIS (React 19):
//   const { feedingLogs, isLoading } = use(FeedingStateContext);
//   const actions = use(FeedingActionsContext);
//
//   if (isLoading) {
//     return <div>Carregando...</div>;
//   }
//
//   return (
//     <div>
//       {feedingLogs.map(log => (
//         <div key={log.id}>
//           {log.notes}
//           <button onClick={() => actions.removeFeeding(log)}>
//             Deletar
//           </button>
//         </div>
//       ))}
//     </div>
//   );
// }

// ============================================================================
// EXEMPLO 2: Hook `use` com Promise (Fetch Assíncrono)
// ============================================================================

// Função que retorna uma Promise
async function fetchFeedingStats(householdId: string) {
  const response = await fetch(`/api/feedings/stats?householdId=${householdId}`);
  return response.json();
}

export function FeedingStats({ householdId }: { householdId: string }) {
  // O hook `use` pode consumir Promises diretamente!
  // Ele automaticamente suspende o componente até a Promise resolver
  const stats = use(fetchFeedingStats(householdId));

  return (
    <div>
      <h2>Estatísticas</h2>
      <p>Total de alimentações: {stats.total}</p>
      <p>Média por dia: {stats.average}</p>
    </div>
  );
}

// Uso com Suspense (obrigatório quando usando Promises)
export function FeedingStatsPage({ householdId }: { householdId: string }) {
  return (
    <Suspense fallback={<div>Carregando estatísticas...</div>}>
      <FeedingStats householdId={householdId} />
    </Suspense>
  );
}

// ============================================================================
// EXEMPLO 3: Hook `use` Condicional (NÃO possível com useContext!)
// ============================================================================

// Example commented out since contexts don't exist
// export function ConditionalFeedingData({ showData }: { showData: boolean }) {
//   // Hook `use` PODE ser usado condicionalmente!
//   // Isso é IMPOSSÍVEL com useContext devido às regras dos hooks
//   const feedingState = showData ? use(FeedingStateContext) : null;
//
//   if (!showData || !feedingState) {
//     return <div>Dados ocultos</div>;
//   }
//
//   return <div>Total: {feedingState.feedingLogs.length}</div>;
// }

// ============================================================================
// EXEMPLO 4: Hook `use` em Loops e Condições Complexas
// ============================================================================

// Example commented out since contexts don't exist
// export function DynamicFeedingDisplay({ contexts }: { contexts: Array<typeof FeedingStateContext> }) {
//   // Hook `use` pode ser chamado em loops!
//   const states = contexts.map(context => use(context));
//
//   return (
//     <div>
//       {states.map((state, index) => (
//         <div key={index}>
//           Logs: {state.feedingLogs.length}
//         </div>
//       ))}
//     </div>
//   );
// }

// ============================================================================
// EXEMPLO 5: Combinação com Server Components (CORRIGIDO)
// ============================================================================

/**
 * Função cacheada para buscar dados de alimentação.
 * 
 * Benefícios do cache():
 * - Deduplica requisições idênticas durante uma renderização
 * - Melhora performance evitando fetches duplicados
 * - Mantém a Promise consistente entre renders
 * 
 * @param householdId - ID do household para filtrar alimentações
 * @returns Promise tipada com array de FeedingLog
 */
const getFeedingsData = cache(async (householdId: string): Promise<FeedingLog[]> => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/feedings?householdId=${householdId}`,
    {
      // Opções importantes para SSR
      headers: {
        'Content-Type': 'application/json',
      },
      // Next.js 15 recomenda especificar cache behavior
      next: { revalidate: 60 }, // Revalida a cada 60 segundos
    }
  );

  if (!response.ok) {
    throw new Error(`Erro ao buscar alimentações: ${response.status}`);
  }

  return response.json();
});

/**
 * Server Component que busca dados e passa Promise para Client Component.
 * 
 * BOAS PRÁTICAS APLICADAS:
 * ✅ Função assíncrona (Server Component)
 * ✅ Usa cache() para deduplicação
 * ✅ Tipagem forte (Promise<FeedingLog[]>)
 * ✅ Cria Promise no servidor (melhor performance)
/**
 * QUANDO MIGRAR DE useContext para use:
 * 
 * ✅ MIGRE se você precisa:
 * - Consumir Promises diretamente
 * - Melhor integração com Suspense
 * - Simplificar código assíncrono com Suspense
 * 
 * ❌ NÃO MIGRE ainda se:
 * - O código está funcionando bem e não precisa das novas features
 * - Você não está usando Suspense
 * - A equipe não está familiarizada com o novo padrão
 * 
 * VANTAGENS do hook `use`:
 * 1. Suporta Promises com Suspense integrado
 * 2. Suporta Promises nativas
 * 3. Melhor para Server Components
 * 4. Código mais limpo para dados assíncronos
 * 
 * DESVANTAGENS:
 * 1. Requer React 19
 * 2. Precisa de Suspense para Promises
 * 3. Mudança de paradigma para a equipe
 * 4. Promises devem ser memoizadas para evitar re-criação
 * 5. AINDA segue as Rules of Hooks (não pode ser condicional ou em loops)
 */

/**
 * Server Component que busca dados e passa Promise para Client Component.
 * 
 * BOAS PRÁTICAS APLICADAS:
 * ✅ Função assíncrona (Server Component)
 * ✅ Usa cache() para deduplicação
 * ✅ Tipagem forte (Promise<FeedingLog[]>)
 * ✅ Cria Promise no servidor (melhor performance)
 */
export async function FeedingServerData({ householdId }: { householdId: string }) {
  // Usar o hook `use` no Client Component passando a Promise
  const feedings = await getFeedingsData(householdId);
  const feedingsPromise = Promise.resolve(feedings);
  return <FeedingClientData feedingsPromise={feedingsPromise} />;
}

export function FeedingPageWithSuspense({ householdId }: { householdId: string }) {
  return (
    <div className="container">
      <h1>Alimentações</h1>
      <Suspense fallback={
        <div className="p-4 border rounded-md animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      }>
        <FeedingServerData householdId={householdId} />
      </Suspense>
    </div>
  );
}

// ============================================================================
// EXEMPLO 6: Error Handling com use + ErrorBoundary
// ============================================================================

// Error Boundary para capturar erros do hook `use`
class FeedingErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error) {
    // Atualiza o state para mostrar a UI de fallback na próxima renderização
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div>Erro ao carregar dados de alimentação</div>;
    }

    return this.props.children;
  }
}

// Componente simplificado - apenas busca dados e renderiza
// Example commented out since contexts don't exist
// export function SafeFeedingData() {
//   const state = use(FeedingStateContext);
//   return <div>Logs: {state.feedingLogs.length}</div>;
// }

// Uso com Error Boundary
// Example commented out since contexts don't exist
// export function SafeFeedingDataWithBoundary() {
//   return (
//     <FeedingErrorBoundary>
//       <SafeFeedingData />
//     </FeedingErrorBoundary>
//   );
// }

// ============================================================================
// GUIA DE MIGRAÇÃO
// ============================================================================

/**
 * QUANDO MIGRAR DE useContext para use:
 * 
 * ✅ MIGRE se você precisa:
 * - Usar o hook condicionalmente
 * - Consumir Promises diretamente
 * - Melhor integração com Suspense
 * - Usar em loops ou condições complexas
 * 
 * ❌ NÃO MIGRE ainda se:
 * - O código está funcionando bem e não precisa das novas features
 * - Você não está usando Suspense
 * - A equipe não está familiarizada com o novo padrão
 * 
 * VANTAGENS do hook `use`:
 * 1. Mais flexível (pode ser condicional)
 * 2. Suporta Promises nativas
 * 3. Melhor para Server Components
 * 4. Código mais limpo para dados assíncronos
 * 
 * DESVANTAGENS:
 * 1. Requer React 19
 * 2. Precisa de Suspense para Promises
 * 3. Mudança de paradigma para a equipe
 */

// ============================================================================
// COMPARAÇÃO: ANTES vs DEPOIS
// ============================================================================

// ANTES (React 18 com useContext)
/*
function FeedingLogOld() {
  const { state } = useContext(FeedingContext)
  const [stats, setStats] = useState(null)
  
  useEffect(() => {
    async function loadStats() {
      const data = await fetchStats()
      setStats(data)
    }
    loadStats()
  }, [])
  
  if (!state || !stats) return <Loading />
  
  return <div>{state.feedingLogs.length} logs, {stats.total} total</div>
}
*/

// DEPOIS (React 19 com use)
/*
function FeedingLogNew({ statsPromise }: { statsPromise: Promise<Stats> }) {
  const state = use(FeedingStateContext)
  const stats = use(statsPromise)
  
  return <div>{state.feedingLogs.length} logs, {stats.total} total</div>
}

// Usado com Suspense:
<Suspense fallback={<Loading />}>
  <FeedingLogNew statsPromise={fetchStats()} />
</Suspense>
*/

