'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

/**
 * Página de Documentação da API
 * Exibe a documentação interativa usando Swagger UI
 */

export default function ApiDocsPage() {
  const [isSwaggerReady, setIsSwaggerReady] = useState(false);

  useEffect(() => {
    // Verifica periodicamente se o Swagger UI está disponível
    const checkSwaggerUI = setInterval(() => {
      if (typeof window !== 'undefined' && 
          window.SwaggerUIBundle && 
          window.SwaggerUIStandalonePreset) {
        clearInterval(checkSwaggerUI);
        setIsSwaggerReady(true);
      }
    }, 50);

    return () => clearInterval(checkSwaggerUI);
  }, []);

  useEffect(() => {
    if (!isSwaggerReady) return;

    // Aguarda o DOM estar pronto antes de inicializar
    const timer = setTimeout(() => {
      try {
        // Verificação de tipo segura antes de chamar
        const SwaggerUIBundle = window.SwaggerUIBundle;
        const SwaggerUIStandalonePreset = window.SwaggerUIStandalonePreset;
        
        if (!SwaggerUIBundle || !SwaggerUIStandalonePreset) {
          console.error('Swagger UI não está disponível');
          return;
        }

        SwaggerUIBundle({
          url: `/api/swagger?v=${Date.now()}`,
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          plugins: [
            SwaggerUIBundle.plugins.DownloadUrl
          ],
          layout: 'StandaloneLayout',
        });
      } catch (error) {
        console.error('Erro ao inicializar Swagger UI:', error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isSwaggerReady]);

  return (
    <>
      {/* CSS do Swagger UI - local com cache bust */}
      <link
        rel="stylesheet"
        type="text/css"
        href={`/swagger-ui/swagger-ui.css?v=${Date.now()}`}
      />

      {/* Scripts do Swagger UI via Next.js Script component */}
      <Script
        src={`/swagger-ui/swagger-ui-bundle.js?v=${Date.now()}`}
        strategy="afterInteractive"
      />
      <Script
        src={`/swagger-ui/swagger-ui-standalone-preset.js?v=${Date.now()}`}
        strategy="afterInteractive"
      />

      <div className="min-h-screen bg-white">
        {/* Container do Swagger UI - Fullscreen */}
        <div className="w-full">
          {!isSwaggerReady && (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Carregando documentação da API...</p>
              </div>
            </div>
          )}
          <div id="swagger-ui" />
        </div>

        {/* Estilos customizados para página limpa */}
        <style jsx global>{`
          body {
            margin: 0;
            padding: 0;
          }

          #swagger-ui {
            width: 100%;
          }

          /* Manter a topbar do Swagger UI padrão */
          .swagger-ui .topbar {
            display: flex !important;
          }

          /* Estilos para melhor visualização */
          .swagger-ui .info {
            margin: 2rem 0;
          }

          .swagger-ui .scheme-container {
            background: #f7f7f7;
            border-radius: 4px;
            padding: 1rem;
            margin: 1rem 0;
          }
        `}</style>
      </div>
    </>
  );
}

