# Correções de Segurança CORS

## Problema Identificado

O arquivo `next.config.mjs` tinha configurações CORS inseguras nas linhas 124-145:

1. **Origem hardcoded**: A origem era definida estaticamente baseada no ambiente
2. **Access-Control-Allow-Credentials sempre true**: Credenciais eram permitidas para qualquer origem
3. **Header X-User-ID exposto**: Header sensível estava sendo permitido nos CORS headers
4. **Falta de validação de origem**: Não havia verificação dinâmica de origens permitidas

## Solução Implementada

### 1. Middleware Personalizado (`middleware.ts`)

Criado um middleware que:
- Verifica dinamicamente a origem da requisição
- Só permite `Access-Control-Allow-Credentials: true` para origens válidas
- Usa variáveis de ambiente para configurar origens permitidas
- Remove o header `X-User-ID` dos headers permitidos

### 2. Configuração de Variáveis de Ambiente

Adicionadas as seguintes variáveis:
- `ALLOWED_ORIGINS`: Lista de origens permitidas separadas por vírgula
- `PRODUCTION_ORIGIN`: Origem principal de produção

### 3. Headers CORS Seguros

- **Access-Control-Allow-Origin**: Definido dinamicamente baseado na origem da requisição
- **Access-Control-Allow-Credentials**: Só enviado para origens válidas
- **Access-Control-Allow-Headers**: Removido `X-User-ID`, mantido `Authorization`

## Arquivos Modificados

1. `next.config.mjs` - Removidos headers CORS inseguros
2. `middleware.ts` - Criado middleware para CORS seguro
3. `.env.local` - Adicionadas configurações de CORS
4. `.env.example` - Documentação das novas variáveis

## Benefícios de Segurança

1. **Prevenção de CSRF**: Credenciais só são permitidas para origens confiáveis
2. **Validação de origem**: Verificação dinâmica em runtime
3. **Headers sensíveis protegidos**: X-User-ID removido dos headers permitidos
4. **Configuração flexível**: Suporte a múltiplas origens via variáveis de ambiente

## Configuração para Produção

Para produção, configure as variáveis de ambiente:

```bash
ALLOWED_ORIGINS=https://mealtime.app.br,https://www.mealtime.app.br
PRODUCTION_ORIGIN=https://mealtime.app.br
```

## Teste de Segurança

Para verificar se a correção está funcionando:

1. Teste com origem válida: Deve retornar `Access-Control-Allow-Credentials: true`
2. Teste com origem inválida: Deve retornar `Access-Control-Allow-Origin: *` (sem credenciais)
3. Verifique que `X-User-ID` não está mais nos headers permitidos
