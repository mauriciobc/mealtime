/**
 * SERVER ACTIONS para formulários de alimentação
 * 
 * Este arquivo contém apenas server actions que são chamadas pelos
 * componentes cliente. A diretiva 'use server' no topo marca TODAS
 * as funções exportadas como server actions.
 */

'use server';

import type { FeedingLog } from '@/components/feeding/types';
import type { V2Envelope } from '@/lib/api/v2-client';

async function v2ServerPost<T>(path: string, body: unknown): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
  const apiUrl = new URL(path, baseUrl).toString();

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  const json = (await response.json().catch(() => ({}))) as V2Envelope<T> & T;

  if (!response.ok || json.success === false) {
    const message =
      (typeof json === 'object' && json && 'error' in json && json.error) ||
      response.statusText ||
      'Request failed';
    throw new Error(String(message));
  }

  if (typeof json === 'object' && json !== null && 'data' in json) {
    return json.data as T;
  }

  return json as T;
}

// ============================================================================
// ACTION 1: Submissão básica de formulário
// ============================================================================

export async function submitFeedingAction(prevState: any, formData: FormData) {
  try {
    const catId = formData.get('catId') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const notes = formData.get('notes') as string;

    // Validação
    if (!catId || !amount) {
      return {
        error: 'Campos obrigatórios faltando',
        success: false,
      };
    }

    await v2ServerPost('/api/v2/feedings', { catId, amount, notes });

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

// ============================================================================
// ACTION 2: Adição com optimistic updates (COM TRATAMENTO DE ERRO)
// ============================================================================

export async function addFeedingOptimisticAction(formData: FormData) {
  const catId = formData.get('catId') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const notes = formData.get('notes') as string || '';

  // Validação básica
  if (!catId || isNaN(amount) || amount <= 0) {
    throw new Error('Dados inválidos: catId ou quantidade ausente/inválida');
  }

  try {
    const data = await v2ServerPost<{ id: string; fed_at?: string; timestamp?: string }>(
      '/api/v2/feedings',
      { catId, amount, notes }
    );
    
    // Requer ID do servidor - lança erro se ausente
    if (!data.id) {
      throw new Error('Servidor não retornou ID para o registro de alimentação');
    }
    
    // Retorna o log com o ID real do servidor
    const newLog: FeedingLog = {
      id: data.id,
      catId,
      amount,
      notes,
      timestamp: new Date(data.fed_at || data.timestamp || Date.now()),
    };

    return newLog;

  } catch (error) {
    // Propaga o erro para ser tratado no componente cliente
    if (error instanceof Error) {
      throw new Error(String(error));
    }
    throw new Error('Erro desconhecido ao salvar alimentação');
  }
}

// ============================================================================
// ACTION 3: Validação e submissão
// ============================================================================

export async function validateAndSubmit(prevState: any, formData: FormData) {
  const catId = formData.get('catId') as string;
  const amount = formData.get('amount');
  const notes = formData.get('notes') as string || '';

  // Validação no servidor
  const errors: Record<string, string> = {};

  if (!catId) {
    errors.catId = 'ID do gato é obrigatório';
  }

  if (!amount) {
    errors.amount = 'Quantidade é obrigatória';
  } else {
    const parsedAmount = parseFloat(amount as string);
    if (isNaN(parsedAmount)) {
      errors.amount = 'Quantidade deve ser um número válido';
    } else if (parsedAmount <= 0) {
      errors.amount = 'Quantidade deve ser maior que zero';
    }
  }

  if (notes.length > 500) {
    errors.notes = 'Observações muito longas (máximo 500 caracteres)';
  }

  if (Object.keys(errors).length > 0) {
    return { errors, success: false };
  }

  // Salva no banco
  try {
    const parsedAmount = parseFloat(amount as string);
    
    await v2ServerPost('/api/v2/feedings', {
      catId,
      amount: parsedAmount,
      notes,
    });

    return { errors: {}, success: true };
  } catch (error) {
    return {
      errors: { submit: error instanceof Error ? error.message : 'Erro ao salvar no servidor' },
      success: false,
    };
  }
}
