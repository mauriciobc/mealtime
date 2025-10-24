/**
 * SERVER ACTIONS para formulários de alimentação
 * 
 * Este arquivo contém apenas server actions que são chamadas pelos
 * componentes cliente. A diretiva 'use server' no topo marca TODAS
 * as funções exportadas como server actions.
 */

'use server';

import type { FeedingLog } from '@/components/feeding/types';

// ============================================================================
// ACTION 1: Submissão básica de formulário
// ============================================================================

export async function submitFeedingAction(prevState: any, formData: FormData) {
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

// ============================================================================
// ACTION 2: Adição com optimistic updates (COM TRATAMENTO DE ERRO)
// ============================================================================

export async function addFeedingOptimisticAction(formData: FormData) {
  // Simula delay de rede
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const catId = formData.get('catId') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const notes = formData.get('notes') as string || '';

  // Validação básica
  if (!catId || isNaN(amount) || amount <= 0) {
    throw new Error('Dados inválidos: catId ou quantidade ausente/inválida');
  }

  // Simula erro de rede aleatório (10% de chance) para demonstrar rollback
  if (Math.random() < 0.1) {
    throw new Error('Erro de rede: não foi possível conectar ao servidor');
  }

  // Simula chamada à API real
  try {
    const response = await fetch('/api/feedings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catId, amount, notes }),
    });

    if (!response.ok) {
      throw new Error(`Erro do servidor: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Retorna o log com o ID real do servidor
    const newLog: FeedingLog = {
      id: data.id || Math.random().toString(), // Usa ID do servidor ou fallback
      catId,
      amount,
      notes,
      timestamp: new Date(data.timestamp || Date.now()),
    };

    return newLog;

  } catch (error) {
    // Propaga o erro para ser tratado no componente cliente
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro desconhecido ao salvar alimentação');
  }
}

// ============================================================================
// ACTION 3: Validação e submissão
// ============================================================================

export async function validateAndSubmit(prevState: any, formData: FormData) {
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

