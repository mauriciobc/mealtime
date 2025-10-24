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

import { useActionState, useOptimistic, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// ============================================================================
// EXEMPLO 1: Action Básica com useActionState
// ============================================================================

// Server Action (em um arquivo separado na prática)
async function submitFeedingAction(prevState: any, formData: FormData) {
  'use server';
  
  try {
    const catId = formData.get('catId') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const notes = formData.get('notes') as string;

    // Simula delay de rede
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Validação
    if (!catId || !amount) {
      return {
        error: 'Campos obrigatórios faltando',
        success: false,
      };
    }

    // Salva no banco
    const response = await fetch('/api/feedings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catId, amount, notes }),
    });

    if (!response.ok) {
      throw new Error('Erro ao salvar alimentação');
    }

    return {
      error: null,
      success: true,
      message: 'Alimentação registrada com sucesso!',
    };

  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      success: false,
    };
  }
}

// Componente do formulário usando React Actions
export function FeedingFormWithActions({ catId }: { catId: string }) {
  // useActionState retorna: [state, action, isPending]
  const [state, formAction, isPending] = useActionState(
    submitFeedingAction,
    { error: null, success: false }
  );

  return (
    <form action={formAction} className="space-y-4">
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
// EXEMPLO 2: Optimistic Updates com useOptimistic
// ============================================================================

interface FeedingLog {
  id: string;
  catId: string;
  amount: number;
  notes: string;
  timestamp: Date;
}

async function addFeedingOptimisticAction(formData: FormData) {
  'use server';
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const newLog: FeedingLog = {
    id: Math.random().toString(),
    catId: formData.get('catId') as string,
    amount: parseFloat(formData.get('amount') as string),
    notes: formData.get('notes') as string || '',
    timestamp: new Date(),
  };

  return newLog;
}

export function FeedingListWithOptimistic({
  initialLogs
}: {
  initialLogs: FeedingLog[]
}) {
  const [isPending, startTransition] = useTransition();
  
  // useOptimistic permite atualizar a UI imediatamente antes da resposta do servidor
  const [optimisticLogs, addOptimisticLog] = useOptimistic(
    initialLogs,
    (state, newLog: FeedingLog) => [...state, newLog]
  );

  async function handleSubmit(formData: FormData) {
    // Adiciona o log otimisticamente na UI
    const tempLog: FeedingLog = {
      id: 'temp-' + Date.now(),
      catId: formData.get('catId') as string,
      amount: parseFloat(formData.get('amount') as string),
      notes: formData.get('notes') as string || '',
      timestamp: new Date(),
    };

    startTransition(async () => {
      addOptimisticLog(tempLog);
      
      // Envia para o servidor em background
      await addFeedingOptimisticAction(formData);
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

async function validateAndSubmit(prevState: any, formData: FormData) {
  'use server';
  
  const amount = formData.get('amount');
  const notes = formData.get('notes');

  // Validação no servidor
  const errors: Record<string, string> = {};

  if (!amount) {
    errors.amount = 'Quantidade é obrigatória';
  } else if (parseFloat(amount as string) <= 0) {
    errors.amount = 'Quantidade deve ser maior que zero';
  }

  if (notes && (notes as string).length > 500) {
    errors.notes = 'Observações muito longas (máximo 500 caracteres)';
  }

  if (Object.keys(errors).length > 0) {
    return { errors, success: false };
  }

  // Salva no banco
  try {
    await fetch('/api/feedings', {
      method: 'POST',
      body: JSON.stringify({
        amount: parseFloat(amount as string),
        notes: notes || '',
      }),
    });

    return { errors: {}, success: true };
  } catch (error) {
    return {
      errors: { submit: 'Erro ao salvar no servidor' },
      success: false,
    };
  }
}

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

