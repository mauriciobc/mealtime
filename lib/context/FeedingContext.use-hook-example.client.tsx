'use client';

/**
 * EXEMPLO 5 - COMPONENTE CLIENT
 * 
 * Este é o componente client que consome Promises com o hook `use`.
 * Segue as melhores práticas do React 19:
 * 
 * ✅ 'use client' está no TOPO do arquivo
 * ✅ Componente é EXPORTADO para uso no server component
 * ✅ Usa tipagem FORTE com Promise<FeedingLog[]>
 * ✅ Integra-se perfeitamente com Suspense
 */

import { use } from 'react';
import type { FeedingLog } from '@/lib/types';

interface FeedingClientDataProps {
  feedingsPromise: Promise<FeedingLog[]>;
}

/**
 * Componente Client que consome uma Promise de dados de alimentação.
 * 
 * O hook `use` do React 19 automaticamente:
 * - Suspende o componente enquanto a Promise está pendente
 * - Re-renderiza quando a Promise resolve
 * - Propaga erros para o ErrorBoundary mais próximo
 * 
 * @param feedingsPromise - Promise tipada que retorna array de FeedingLog
 */
export function FeedingClientData({ feedingsPromise }: FeedingClientDataProps) {
  // O hook `use` consome a Promise e retorna os dados tipados
  const feedings = use(feedingsPromise);

  // Validação de dados (boa prática para dados vindos de API)
  if (!Array.isArray(feedings)) {
    throw new Error('Dados de alimentação inválidos');
  }

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">
        Alimentações Recentes ({feedings.length})
      </h3>
      {feedings.length === 0 ? (
        <p className="text-muted-foreground">
          Nenhuma alimentação registrada ainda.
        </p>
      ) : (
        <ul className="space-y-1">
          {feedings.map((feeding) => (
            <li 
              key={feeding.id} 
              className="p-2 border rounded-md"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">
                    {feeding.cat?.name || 'Gato desconhecido'}
                  </p>
                  {feeding.notes && (
                    <p className="text-sm text-muted-foreground">
                      {feeding.notes}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(feeding.timestamp).toLocaleString('pt-BR')}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

