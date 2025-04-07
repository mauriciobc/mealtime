import { cache } from 'react';

// Função para obter parâmetros de forma assíncrona usando cache
export const getParams = cache(async <T extends Record<string, string>>(params: T): Promise<T> => {
  return await Promise.resolve(params);
});

// Função para obter um ID numérico de forma assíncrona
export const getNumericId = async (id: string): Promise<number> => {
  console.log(`[getNumericId] Received ID: '${id}', Type: ${typeof id}`); // Log input
  // Simplify parsing and add radix parameter
  const numericId = parseInt(id, 10);
  console.log(`[getNumericId] Parsed ID: ${numericId}, IsNaN: ${isNaN(numericId)}`); // Log result
  if (isNaN(numericId)) {
    throw new Error('ID inválido');
  }
  return numericId;
}; 