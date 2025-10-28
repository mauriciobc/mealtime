/**
 * Declarações de tipos para Swagger UI
 * Carregado via CDN na página de documentação da API
 */

interface SwaggerUIOptions {
  url?: string;
  dom_id?: string;
  deepLinking?: boolean;
  presets?: any[];
  plugins?: any[];
  layout?: string;
}

interface Window {
  SwaggerUIBundle?: {
    (options: SwaggerUIOptions): void;
    presets: {
      apis: any;
    };
    plugins: {
      DownloadUrl: any;
    };
  };
  SwaggerUIStandalonePreset?: any;
}

