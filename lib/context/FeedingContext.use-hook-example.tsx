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

import { use, Suspense } from 'react';
import { FeedingStateContext, FeedingActionsContext } from './FeedingContext.v2';

// ============================================================================
// EXEMPLO 1: Uso Básico do Hook `use`
// ============================================================================

export function FeedingLogsList() {
  // ANTES (React 18):
  // const { state } = useContext(FeedingContext)
  // const { feedingLogs, isLoading } = state
  
  // DEPOIS (React 19):
  const { feedingLogs, isLoading } = use(FeedingStateContext);
  const actions = use(FeedingActionsContext);

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div>
      {feedingLogs.map(log => (
        <div key={log.id}>
          {log.notes}
          <button onClick={() => actions.removeFeeding(log)}>
            Deletar
          </button>
        </div>
      ))}
    </div>
  );
}

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

export function ConditionalFeedingData({ showData }: { showData: boolean }) {
  // Hook `use` PODE ser usado condicionalmente!
  // Isso é IMPOSSÍVEL com useContext devido às regras dos hooks
  const feedingState = showData ? use(FeedingStateContext) : null;

  if (!showData || !feedingState) {
    return <div>Dados ocultos</div>;
  }

  return <div>Total: {feedingState.feedingLogs.length}</div>;
}

// ============================================================================
// EXEMPLO 4: Hook `use` em Loops e Condições Complexas
// ============================================================================

export function DynamicFeedingDisplay({ contexts }: { contexts: Array<typeof FeedingStateContext> }) {
  // Hook `use` pode ser chamado em loops!
  const states = contexts.map(context => use(context));

  return (
    <div>
      {states.map((state, index) => (
        <div key={index}>
          Logs: {state.feedingLogs.length}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EXEMPLO 5: Combinação com Server Components
// ============================================================================

// Este componente Server pode passar uma Promise diretamente
async function FeedingServerData({ householdId }: { householdId: string }) {
  // Fetch no servidor
  const feedingsPromise = fetch(`/api/feedings?householdId=${householdId}`)
    .then(res => res.json());

  return <FeedingClientData feedingsPromise={feedingsPromise} />;
}

// Componente Client consome a Promise com `use`
'use client';
function FeedingClientData({ feedingsPromise }: { feedingsPromise: Promise<any> }) {
  const feedings = use(feedingsPromise);

  return (
    <div>
      {feedings.map((f: any) => (
        <div key={f.id}>{f.notes}</div>
      ))}
    </div>
  );
}

// ============================================================================
// EXEMPLO 6: Error Handling com use + ErrorBoundary
// ============================================================================

export function SafeFeedingData() {
  try {
    const state = use(FeedingStateContext);
    return <div>Logs: {state.feedingLogs.length}</div>;
  } catch (error) {
    // Se o context não estiver disponível, trata o erro
    return <div>Erro ao carregar dados de alimentação</div>;
  }
}

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

