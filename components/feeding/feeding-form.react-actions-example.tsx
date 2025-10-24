/**
 * EXEMPLO DE MIGRAÇÃO PARA REACT 19 - React Actions
 * 
 * Este arquivo demonstra como migrar formulários tradicionais para React Actions.
 * 
 * VANTAGENS dos React Actions:
 * 1. Estados de pending automáticos (não precisa de useState para loading)
 * 2. Error handling integrado
 * 3. Optimistic updates mais fáceis
 * 4. Melhor UX com estados de transição
 * 5. Integração nativa com formulários HTML
 */

'use client';

import { useActionState, useOptimistic, useTransition, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  submitFeedingAction,
  addFeedingOptimisticAction,
  validateAndSubmit,
} from './feeding-form.actions';
import type { FeedingLog } from './types';

// ============================================================================
// EXEMPLO 1: Action Básica com useActionState
// ============================================================================

// As Server Actions agora estão em './feeding-form.actions.ts'
// Componente do formulário usando React Actions
export function FeedingFormWithActions({ catId }: { catId: string }) {
  // useActionState retorna: [state, action, isPending]
  const [state, formAction, isPending] = useActionState(
    submitFeedingAction,
    { error: null, success: false, message: '' }
  );

  // Ref para o formulário, permitindo acesso ao elemento DOM
  const formRef = useRef<HTMLFormElement | null>(null);

  // Observa state.success e reseta o formulário quando a submissão é bem-sucedida
  useEffect(() => {
    if (state.success && formRef.current) {
      // Reseta todos os campos do formulário
      formRef.current.reset();
      
      // Opcionalmente, volta o foco para o primeiro campo
      const firstInput = formRef.current.querySelector('input[type="number"]') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="catId" value={catId} />

      <div>
        <label htmlFor="amount">Quantidade (g)</label>
        <Input
          id="amount"
          name="amount"
          type="number"
          required
          disabled={isPending}
        />
      </div>

      <div>
        <label htmlFor="notes">Observações</label>
        <Textarea
          id="notes"
          name="notes"
          disabled={isPending}
        />
      </div>

      {state.error && (
        <div className="text-red-500 text-sm">{state.error}</div>
      )}

      {state.success && (
        <div className="text-green-500 text-sm">{state.message}</div>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Salvando...' : 'Registrar Alimentação'}
      </Button>
    </form>
  );
}

// ============================================================================
// EXEMPLO 2: Optimistic Updates com useOptimistic (COM TRATAMENTO DE ERRO)
// ============================================================================

/**
 * Este exemplo demonstra como implementar optimistic updates ROBUSTOS com:
 * 
 * ✅ ROLLBACK automático em caso de falha
 * ✅ SINCRONIZAÇÃO do log temporário com o log real do servidor
 * ✅ FEEDBACK visual ao usuário (toast de sucesso/erro)
 * ✅ TRATAMENTO de erros completo (try/catch)
 * ✅ AÇÃO DE RETRY para tentar novamente
 * 
 * FLUXO:
 * 1. Usuário submete o formulário
 * 2. UI atualiza imediatamente com log temporário (id: "temp-123...")
 * 3. Ação do servidor é chamada em background
 * 4a. SUCESSO: Log temporário é substituído pelo log real (com id do servidor)
 * 4b. FALHA: Log temporário é removido (rollback) e toast de erro é exibido
 * 
 * CORREÇÃO DO BUG ORIGINAL:
 * - Antes: addOptimisticLog nunca era revertido se a ação falhasse
 * - Depois: Implementado rollback completo com tipo 'remove' na action
 */

// A Server Action addFeedingOptimisticAction está em './feeding-form.actions.ts'
// O tipo FeedingLog está em './types.ts'

// Tipo para ações otimistas (adicionar, atualizar, remover)
type OptimisticAction = 
  | { type: 'add'; log: FeedingLog }
  | { type: 'update'; tempId: string; log: FeedingLog }
  | { type: 'remove'; tempId: string };

export function FeedingListWithOptimistic({
  initialLogs
}: {
  initialLogs: FeedingLog[]
}) {
  const [isPending, startTransition] = useTransition();
  
  // useOptimistic com reducer que suporta múltiplas ações
  const [optimisticLogs, updateOptimisticLogs] = useOptimistic(
    initialLogs,
    (state, action: OptimisticAction) => {
      switch (action.type) {
        case 'add':
          // Adiciona um novo log temporário
          return [...state, action.log];
        
        case 'update':
          // Substitui o log temporário pelo log real do servidor
          return state.map(log => 
            log.id === action.tempId ? action.log : log
          );
        
        case 'remove':
          // Remove o log temporário (rollback)
          return state.filter(log => log.id !== action.tempId);
        
        default:
          return state;
      }
    }
  );

  async function handleSubmit(formData: FormData) {
    // Cria um log temporário para atualização otimista da UI
    const tempId = 'temp-' + Date.now();
    const tempLog: FeedingLog = {
      id: tempId,
      catId: formData.get('catId') as string,
      amount: parseFloat(formData.get('amount') as string),
      notes: formData.get('notes') as string || '',
      timestamp: new Date(),
    };

    // startTransition para atualização não-bloqueante da UI
    startTransition(async () => {
      // 1️⃣ Adiciona o log otimisticamente (UI mostra imediatamente)
      updateOptimisticLogs({ type: 'add', log: tempLog });
      
      try {
        // 2️⃣ Envia para o servidor e aguarda resposta
        const serverLog = await addFeedingOptimisticAction(formData);
        
        // 3️⃣ SUCESSO: Substitui o log temporário pelo log real do servidor
        updateOptimisticLogs({ 
          type: 'update', 
          tempId: tempId, 
          log: serverLog 
        });
        
        // Feedback de sucesso ao usuário
        toast.success('Alimentação registrada!', {
          description: `${serverLog.amount}g adicionados com sucesso`,
        });

      } catch (error) {
        // 4️⃣ FALHA: Remove o log temporário (rollback)
        updateOptimisticLogs({ type: 'remove', tempId: tempId });
        
        // Log do erro para debugging
        console.error('Erro ao adicionar alimentação:', error);
        
        // Feedback de erro ao usuário
        toast.error('Erro ao salvar', {
          description: error instanceof Error 
            ? error.message 
            : 'Não foi possível registrar a alimentação. Tente novamente.',
          action: {
            label: 'Tentar novamente',
            onClick: () => handleSubmit(formData),
          },
        });
      }
    });
  }

  return (
    <div>
      <form action={handleSubmit} className="mb-4">
        <input type="hidden" name="catId" value="cat-1" />
        <Input name="amount" type="number" placeholder="Quantidade" required />
        <Input name="notes" placeholder="Observações" />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Adicionando...' : 'Adicionar'}
        </Button>
      </form>

      <div className="space-y-2">
        {optimisticLogs.map(log => (
          <div
            key={log.id}
            className={log.id.startsWith('temp-') ? 'opacity-50' : ''}
          >
            <strong>{log.amount}g</strong> - {log.notes || 'Sem observações'}
            {log.id.startsWith('temp-') && (
              <span className="ml-2 text-xs text-gray-500">(salvando...)</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLO 3: Validação Progressiva
// ============================================================================

// A Server Action validateAndSubmit está em './feeding-form.actions.ts'

export function FeedingFormWithValidation() {
  const [state, formAction, isPending] = useActionState(
    validateAndSubmit,
    { errors: {}, success: false }
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="amount">Quantidade (g)</label>
        <Input
          id="amount"
          name="amount"
          type="number"
          required
          disabled={isPending}
          aria-invalid={!!state.errors?.amount}
          aria-describedby="amount-error"
        />
        {state.errors?.amount && (
          <p id="amount-error" className="text-red-500 text-sm mt-1">
            {state.errors.amount}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="notes">Observações</label>
        <Textarea
          id="notes"
          name="notes"
          disabled={isPending}
          aria-invalid={!!state.errors?.notes}
          aria-describedby="notes-error"
        />
        {state.errors?.notes && (
          <p id="notes-error" className="text-red-500 text-sm mt-1">
            {state.errors.notes}
          </p>
        )}
      </div>

      {state.errors?.submit && (
        <div className="text-red-500 text-sm">{state.errors.submit}</div>
      )}

      {state.success && (
        <div className="text-green-500 text-sm">
          Alimentação registrada com sucesso!
        </div>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Salvando...' : 'Registrar'}
      </Button>
    </form>
  );
}

// ============================================================================
// COMPARAÇÃO: ANTES vs DEPOIS
// ============================================================================

/*
// ANTES (React 18 - Forma Tradicional)
function FeedingFormOld() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData(e.currentTarget);
      const response = await fetch('/api/feedings', {
        method: 'POST',
        body: JSON.stringify({
          amount: formData.get('amount'),
          notes: formData.get('notes'),
        }),
      });

      if (!response.ok) throw new Error('Erro ao salvar');
      
      setSuccess(true);
      setIsLoading(false);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="amount" type="number" disabled={isLoading} />
      <textarea name="notes" disabled={isLoading} />
      {error && <div>{error}</div>}
      {success && <div>Sucesso!</div>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
}

// DEPOIS (React 19 - com Actions)
function FeedingFormNew() {
  const [state, formAction, isPending] = useActionState(
    submitFeedingAction,
    { error: null, success: false }
  );

  return (
    <form action={formAction}>
      <input name="amount" type="number" disabled={isPending} />
      <textarea name="notes" disabled={isPending} />
      {state.error && <div>{state.error}</div>}
      {state.success && <div>Sucesso!</div>}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
}
*/

// ============================================================================
// GUIA DE MIGRAÇÃO
// ============================================================================

/**
 * QUANDO USAR REACT ACTIONS:
 * 
 * ✅ USE para:
 * - Formulários que fazem mutações (POST, PUT, DELETE)
 * - Quando você precisa de estados de loading automáticos
 * - Optimistic updates
 * - Melhor acessibilidade (formulários HTML nativos)
 * 
 * ❌ NÃO USE para:
 * - Formulários apenas de visualização
 * - Quando você precisa de controle granular do estado
 * - Validação complexa do lado do cliente
 * 
 * VANTAGENS:
 * 1. Menos código boilerplate
 * 2. Estados automáticos (isPending, error, success)
 * 3. Melhor progressiv enhancement
 * 4. Funciona sem JavaScript habilitado
 * 5. Optimistic updates integrados
 * 
 * DESVANTAGENS:
 * 1. Requer Server Actions ou API Routes
 * 2. Menos controle sobre o fluxo
 * 3. Curva de aprendizado
 */

