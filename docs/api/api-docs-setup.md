# Documentação da API - Setup e Configuração

## 📚 Visão Geral

Este documento descreve a implementação da página de documentação interativa da API (`/api-docs`) usando Swagger UI.

## 🎯 Funcionalidades Implementadas

### 1. Página de Documentação (`/api-docs`)
- Interface interativa usando Swagger UI
- Carregamento via CDN (unpkg.com)
- Design integrado com o tema do MealTime
- Loading state enquanto o Swagger UI carrega
- Responsiva e acessível

### 2. Rota de API para Servir o Swagger YAML (`/api/swagger`)
- Serve o arquivo OpenAPI/Swagger YAML
- Content-Type correto: `application/x-yaml`
- Cache habilitado: `max-age=3600` (1 hora)
- Tratamento de erros robusto

## 📁 Arquivos Criados/Modificados

### Arquivos Criados:

1. **`app/api-docs/page.tsx`**
   - Componente React da página de documentação
   - Carrega Swagger UI dinamicamente via CDN
   - Integração com Next.js Script component
   - Estado de loading

2. **`app/api-docs/layout.tsx`**
   - Metadados da página
   - SEO otimizado
   - Robots: noindex (páginas técnicas não devem ser indexadas)

3. **`app/api/swagger/route.ts`**
   - API Route que serve o arquivo `swagger.yaml`
   - Lê do filesystem e retorna com headers apropriados

4. **`types/swagger-ui.d.ts`**
   - Declarações de tipos TypeScript para Swagger UI
   - Elimina necessidade de `@ts-ignore`

### Arquivos Modificados:

1. **`proxy.ts`**
   - Atualizada a Content Security Policy (CSP)
   - Adicionado `https://unpkg.com` aos domínios permitidos
   - Permitido para `script-src` e `style-src`

## 🔧 Content Security Policy (CSP)

A CSP foi atualizada para permitir o carregamento do Swagger UI via CDN:

```typescript
// Antes
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com ..."

// Depois
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com ... https://unpkg.com"
"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ... https://unpkg.com"
```

## 🚀 Como Usar

### Acessando a Documentação

1. **Desenvolvimento:**
   ```bash
   npm run dev
   # Acesse: http://localhost:3000/api-docs
   ```

2. **Produção:**
   ```
   https://seu-dominio.com/api-docs
   ```

### Testando as Rotas

1. **Página de Documentação:**
   ```bash
   curl -I http://localhost:3000/api-docs
   # Esperado: 200 OK, Content-Type: text/html
   ```

2. **Arquivo Swagger YAML:**
   ```bash
   curl http://localhost:3000/api/swagger
   # Esperado: 200 OK, Content-Type: application/x-yaml
   ```

## 📝 Documentação Atual

Atualmente, a documentação cobre:

- **GET /api/feedings/stats**
  - Estatísticas de alimentação dos gatos
  - Parâmetros: catId (opcional), days (1-90)
  - Autenticação: Header X-User-ID

### Adicionando Mais Documentação

Para adicionar documentação de outras rotas:

1. **Opção 1: Atualizar o arquivo existente**
   ```bash
   # Edite: app/api/feedings/stats/swagger.yaml
   # Adicione mais paths e endpoints
   ```

2. **Opção 2: Criar arquivo YAML separado**
   ```bash
   # Crie: app/api/cats/swagger.yaml
   # Atualize: app/api/swagger/route.ts
   # Para combinar múltiplos arquivos YAML
   ```

## 🎨 Customização

### Tema e Estilos

Os estilos do Swagger UI foram customizados em `app/api-docs/page.tsx`:

```tsx
<style jsx global>{`
  .swagger-container {
    background: hsl(var(--card));
    border-radius: 8px;
    padding: 1rem;
  }

  .swagger-ui .topbar {
    display: none; // Remove barra superior padrão
  }
  
  // ... mais customizações
`}</style>
```

### Configuração do Swagger UI

Para modificar a configuração do Swagger UI, edite em `app/api-docs/page.tsx`:

```typescript
window.SwaggerUIBundle({
  url: '/api/swagger',
  dom_id: '#swagger-ui',
  deepLinking: true, // Permite deep linking
  presets: [...],
  plugins: [...],
  layout: 'StandaloneLayout', // Layout usado
});
```

## 🔒 Segurança

### Content Security Policy

- Scripts permitidos: `'self'`, Google, unpkg.com
- Estilos permitidos: `'self'`, Google Fonts, unpkg.com
- Imagens permitidas: `'self'`, Supabase, Google, dicebear

### Headers de Segurança

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

## 📊 Performance

### Otimizações Implementadas

1. **Cache do YAML**
   - Cache-Control: `public, max-age=3600`
   - Reduz carga no servidor

2. **CDN para Swagger UI**
   - Carregado de unpkg.com (CDN global)
   - Versão específica (5.11.0) para estabilidade

3. **Loading State**
   - Mostra spinner enquanto carrega
   - Melhora experiência do usuário

## 🧪 Testes

### Testes Manuais Realizados

✅ Página `/api-docs` retorna 200 OK
✅ Rota `/api/swagger` retorna YAML válido
✅ CSP permite carregamento do Swagger UI
✅ Scripts carregam corretamente via CDN
✅ Interface renderiza corretamente

### Testes Sugeridos

- [ ] Testar em diferentes navegadores (Chrome, Firefox, Safari)
- [ ] Testar responsividade em mobile
- [ ] Testar com diferentes tamanhos de arquivos YAML
- [ ] Testar com múltiplas definições de API

## 🐛 Troubleshooting

### Problema: Swagger UI não carrega

**Sintomas:** Página fica em loading infinito

**Soluções:**
1. Verificar CSP no console do navegador
2. Confirmar que unpkg.com está acessível
3. Verificar se `/api/swagger` retorna YAML válido

```bash
curl http://localhost:3000/api/swagger
```

### Problema: YAML não encontrado

**Sintomas:** Erro 500 ao acessar `/api/swagger`

**Soluções:**
1. Verificar se arquivo existe:
   ```bash
   ls -la app/api/feedings/stats/swagger.yaml
   ```
2. Verificar permissões do arquivo
3. Verificar logs do servidor

### Problema: CSP bloqueia scripts

**Sintomas:** Erros de CSP no console

**Soluções:**
1. Verificar CSP em `proxy.ts`
2. Confirmar que unpkg.com está na lista de permitidos
3. Reiniciar servidor após alterações

## 🔄 Próximos Passos

### Melhorias Sugeridas

1. **Documentação Completa**
   - Adicionar todas as rotas da API
   - Incluir exemplos de requisição/resposta
   - Adicionar modelos de dados

2. **Autenticação**
   - Implementar autenticação no Swagger UI
   - Testar endpoints protegidos diretamente

3. **Versionamento**
   - Suportar múltiplas versões da API
   - Permitir alternar entre versões

4. **Download**
   - Botão para baixar especificação OpenAPI
   - Exportar para Postman Collection

## 📚 Recursos

- [Swagger UI Documentation](https://swagger.io/docs/open-source-tools/swagger-ui/)
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [Next.js Script Component](https://nextjs.org/docs/app/api-reference/components/script)

## ✅ Conclusão

A página `/api-docs` foi implementada com sucesso e está totalmente funcional. A documentação está integrada ao tema do MealTime e fornece uma interface interativa para explorar a API.

**Status:** ✅ Completo e Funcional
**Versão:** 1.0.0
**Data:** 28 de Outubro de 2025

