# Configuração do Servidor MCP do Supabase

## 📋 O que é o MCP do Supabase?

O **Model Context Protocol (MCP)** do Supabase permite que você interaja com seus projetos Supabase diretamente do Cursor. Com ele, você pode:

- 🔍 Listar tabelas, extensões e migrações do banco de dados
- 📝 Executar queries SQL e aplicar migrações
- 🚀 Gerenciar Edge Functions
- 📊 Consultar logs e advisors de performance
- 🔑 Obter URLs e chaves do projeto
- 📖 Buscar na documentação do Supabase
- 🌿 Gerenciar branches (experimental, requer plano pago)

## 🛠️ Como Configurar

### 1. Obter o Personal Access Token (PAT) do Supabase

1. Acesse: [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
2. Clique em **"Generate new token"**
3. Dê um nome descritivo (ex: "Cursor MCP")
4. Selecione as permissões necessárias:
   - ✅ `Organization` - Acesso à organização
   - ✅ `Projects` - Acesso aos projetos
   - ✅ `Database` - Acesso ao banco de dados
   - ✅ `Edge Functions` - Acesso às Edge Functions
5. Clique em **"Generate token"**
6. **IMPORTANTE**: Copie o token gerado imediatamente (você só verá uma vez!)

### 2. Configurar Variável de Ambiente

Adicione o token no seu arquivo `.env.local` (nunca commite este arquivo!):

```bash
SUPABASE_ACCESS_TOKEN=sbp_seu_token_aqui
```

### 3. Instalar o Pacote MCP do Supabase

O pacote já está adicionado como `devDependency` no `package.json`. Para instalá-lo:

```bash
npm install
```

Isso instalará `@supabase/mcp-server-supabase` e suas dependências (incluindo `zod`).

### 4. Reiniciar o Cursor

Após adicionar a variável de ambiente e instalar o pacote:

1. Feche completamente o Cursor
2. Abra novamente o projeto
3. O servidor MCP será iniciado automaticamente

## ✅ Como Verificar se Está Funcionando

No Cursor, você pode:

1. **Verificar conexão**: Digite comandos como:
   - "Liste as tabelas do banco de dados Supabase"
   - "Mostre as migrações do projeto"
   - "Qual o URL do projeto Supabase?"

2. **Ver logs de conexão**:
   - Abra o Developer Tools (Ctrl+Shift+I ou Cmd+Option+I)
   - Vá para a aba Console
   - Procure por mensagens relacionadas ao MCP do Supabase

3. **Testar com um comando simples**:
   - "Liste as tabelas do schema public no Supabase"

## 🎯 Comandos Úteis

Aqui estão exemplos de comandos que você pode usar no Cursor:

### Database

```
Liste todas as tabelas do banco de dados Supabase
Liste as extensões instaladas no Postgres
Mostre as migrações do projeto
```

### Queries SQL

```
Execute uma query para contar quantos registros existem na tabela cats
Mostre a estrutura da tabela feedings
```

### Edge Functions

```
Liste todas as Edge Functions do projeto
Mostre o código da Edge Function send-scheduled-notifications
```

### Logs e Debugging

```
Mostre os logs recentes do serviço postgres
Liste os advisors de segurança do projeto
```

### Documentação

```
Busque na documentação do Supabase sobre Row Level Security
Como funciona o Realtime no Supabase?
```

## 🔧 Estrutura de Arquivos

A configuração do MCP está em:

```
.cursor/
└── mcp.json          # Configuração principal do servidor MCP
```

Conteúdo relevante do arquivo:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}"
      }
    }
  }
}
```

## 🔒 Segurança

### ⚠️ IMPORTANTE

- **NUNCA** commite o arquivo `.env.local` com o token
- **NUNCA** compartilhe seu token publicamente
- **SEMPRE** use `.gitignore` para excluir o `.env.local`
- **REVOGUE** tokens que não estão mais em uso
- **USE** tokens com permissões mínimas necessárias
- **DEFINA** uma data de expiração para o token
- **NÃO conecte ao produção**: Use o MCP com um projeto de desenvolvimento

### Modo Read-Only

Para maior segurança, você pode restringir o MCP a apenas leitura. No entanto, isso requer configurar o servidor MCP via URL HTTP em vez do pacote stdio. Consulte a [documentação oficial](https://supabase.com/docs/guides/getting-started/mcp#read-only-mode) para mais detalhes.

### Escopo por Projeto

Recomendamos restringir o MCP a um projeto específico. Com o pacote `@supabase/mcp-server-supabase`, o acesso é controlado pelas permissões do seu token.

### Verificar se .env.local está no .gitignore

Execute no terminal:

```bash
grep -q "^\.env\.local$" .gitignore && echo "✅ .env.local está protegido" || echo "❌ ATENÇÃO: .env.local não está no .gitignore!"
```

Se não estiver, adicione:

```bash
echo ".env.local" >> .gitignore
```

## 🐛 Troubleshooting (Solução de Problemas)

### Erro: "SUPABASE_ACCESS_TOKEN not found"

**Problema**: A variável de ambiente não foi encontrada.

**Solução**:

1. Verifique se o arquivo `.env.local` existe na raiz do projeto
2. Certifique-se de que a variável está definida: `SUPABASE_ACCESS_TOKEN=sbp_seu_token`
3. Verifique se o nome da variável está correto no arquivo `mcp.json`
4. Reinicie o Cursor completamente
5. Em alguns casos, pode ser necessário reiniciar o terminal/computador

### Erro: "Invalid token" ou "401 Unauthorized"

**Problema**: O token está incorreto, expirado ou sem permissões suficientes.

**Solução**:

1. Gere um novo token em: https://supabase.com/dashboard/account/tokens
2. Revogue o token antigo por segurança
3. Atualize o arquivo `.env.local` com o novo token
4. Reinicie o Cursor

### Erro: "Cannot find package 'zod'"

**Problema**: O pacote `@supabase/mcp-server-supabase` não encontrou a dependência peer `zod`.

**Solução**:

1. Certifique-se de que instalou as dependências do projeto:
   ```bash
   npm install
   ```
2. O projeto já inclui `zod` nas dependências. Se o erro persistir, reinstale:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Servidor MCP não inicia

**Problema**: O servidor não está sendo carregado.

**Solução**:

1. Verifique se o arquivo `.cursor/mcp.json` existe e contém a configuração do Supabase
2. Valide o JSON (use um validador online)
3. Verifique permissões do arquivo
4. Reinicie o Cursor com logs:
   - No terminal: `CURSOR_DEBUG=1 cursor .`

### Comandos não funcionam

**Problema**: O Cursor não responde aos comandos do Supabase.

**Solução**:

1. Verifique se o servidor MCP está ativo (veja logs no Developer Tools)
2. Tente comandos mais simples primeiro (ex: "liste as tabelas")
3. Certifique-se de que o token tem as permissões corretas
4. Verifique se você está autenticado corretamente

## 📚 Recursos Adicionais

- [Documentação oficial do Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp)
- [Repositório do Supabase MCP](https://github.com/supabase-community/supabase-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/introduction)
- [Supabase Dashboard](https://supabase.com/dashboard)

## 🆘 Suporte

Se você encontrar problemas:

1. **Consulte este documento** primeiro
2. **Verifique os logs** no Developer Tools do Cursor
3. **Teste o token** manualmente usando a API do Supabase
4. **Abra uma issue** no repositório do projeto se o problema persistir

## 📝 Changelog

- **v1.0.0** (2025-05-10): Configuração inicial do servidor MCP do Supabase
