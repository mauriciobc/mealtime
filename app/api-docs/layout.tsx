import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentação da API - MealTime',
  description: 'Documentação interativa das rotas da API do MealTime para gerenciamento de alimentação de gatos',
  robots: {
    index: false, // Não indexar páginas de documentação técnica
    follow: true,
  },
};

/**
 * Layout minimalista para a página de documentação da API
 * Sem navbar, topbar ou outros elementos de navegação
 * Este layout substitui o layout raiz apenas para /api-docs
 */
export default function ApiDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

