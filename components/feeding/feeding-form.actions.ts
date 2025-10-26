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

    // Validação
    if (!catId || !amount) {
      return {
        error: 'Campos obrigatórios faltando',
        success: false,
      };
    }

    // Construi URL absoluta para funcionar no servidor em produção
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const apiUrl = `${baseUrl}/api/feedings`;

    // Salva no banco
    const response = await fetch(apiUrl, {
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
  const catId = formData.get('catId') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const notes = formData.get('notes') as string || '';

  // Validação básica
  if (!catId || isNaN(amount) || amount <= 0) {
    throw new Error('Dados inválidos: catId ou quantidade ausente/inválida');
  }

  // Construi URL absoluta para funcionar no servidor
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'http://localhost:3000';
  const apiUrl = `${baseUrl}/api/feedings`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catId, amount, notes }),
    });

    if (!response.ok) {
      throw new Error(`Erro do servidor: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const apiUrl = new URL('/api/feedings', baseUrl).toString();

    const parsedAmount = parseFloat(amount as string);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        catId,
        amount: parsedAmount,
        notes,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        errors: { submit: `Erro ao salvar no servidor: ${response.status} ${errorBody}` },
        success: false,
      };
    }

    return { errors: {}, success: true };
  } catch (error) {
    return {
      errors: { submit: error instanceof Error ? error.message : 'Erro ao salvar no servidor' },
      success: false,
    };
  }
}

