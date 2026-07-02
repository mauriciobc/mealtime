# Configuração do Servidor MCP da Supabase

## 📋 O que é o MCP da Supabase?

O **Model Context Protocol (MCP)** da Supabase permite que você interaja com seu projeto Supabase diretamente do Cursor. Com ele, você pode:

- 🔍 Consultar schema e tabelas do banco de dados
- 📊 Executar queries SQL (modo read-only configurado por padrão)
- 📋 Ver migrations e logs de serviços (API, Postgres, Auth, Edge Functions)
- ⚡ Listar e inspecionar Edge Functions
- 📚 Buscar na documentação oficial da Supabase
- 🛡️ Consultar advisors de segurança e performance

## 🛠️ Como Configurar

### 1. Configuração do Projeto

A configuração já está em `.cursor/mcp.json` na raiz do projeto:

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=acoiqeslybsolmzpqrim&read_only=true"
    }
  }
}
```

**Parâmetros de segurança:**
- `project_ref=acoiqeslybsolmzpqrim` — limita o acesso apenas ao projeto Mealtime
- `read_only=true` — impede alterações destrutivas no banco (sem `apply_migration` ou writes)

> O Supabase MCP **não exige token no `.env`**. A autenticação é feita via OAuth no Cursor.

### 2. Autenticar via OAuth

1. Reinicie o Cursor completamente após clonar ou atualizar o projeto
2. Abra **Settings → Tools & MCP** (ou **Cursor Settings → Features → MCP Servers**)
3. Localize o servidor `supabase` na lista
4. Ative o toggle do servidor, se estiver desabilitado
5. Clique em **Authenticate** — uma janela do navegador abrirá
6. Faça login na sua conta Supabase e autorize o acesso
7. Selecione a organização que contém o projeto Mealtime

### 3. Reiniciar o Cursor (se necessário)

Se as ferramentas não aparecerem após a autenticação:
1. Feche completamente o Cursor
2. Abra novamente o projeto
3. Verifique em **Settings → Tools & MCP** se o servidor está com status ativo

## ✅ Como Verificar se Está Funcionando

No Cursor, você pode:

1. **Verificar conexão**: Digite comandos como:
   - "Liste as tabelas do banco via MCP"
   - "Mostre o schema da tabela profiles"
   - "Quais são os advisors de segurança do projeto?"

2. **Verificar no painel MCP**:
   - **Settings → Tools & MCP** — o servidor `supabase` deve aparecer como ativo/conectado

3. **Ver logs de conexão**:
   - Abra o Developer Tools (Ctrl+Shift+I ou Cmd+Option+I)
   - Vá para a aba Console
   - Procure por mensagens relacionadas ao MCP

## 🎯 Comandos Úteis

### Listar Tabelas
```
Liste todas as tabelas do banco de dados Supabase via MCP
```

### Consultar Schema
```
Mostre as colunas da tabela feeding_logs
```

### Executar SQL (read-only)
```
Execute uma query para contar quantos gatos existem na tabela cats
```

### Ver Logs
```
Mostre os logs recentes do Postgres via MCP
```

### Edge Functions
```
Liste as Edge Functions do projeto Supabase
```

### Documentação
```
Busque na documentação da Supabase como configurar RLS
```

## 🔧 Estrutura de Arquivos

```
.cursor/
└── mcp.json          # Configuração do servidor MCP (commitado no repo)
```

O Cursor mescla configurações de:
- **Projeto**: `.cursor/mcp.json` (compartilhado com o time via git)
- **Global**: `%USERPROFILE%\.cursor\mcp.json` (Windows) ou `~/.cursor/mcp.json` (macOS/Linux)

Se o mesmo servidor aparecer nos dois, a config do projeto tem prioridade.

## 🐛 Troubleshooting (Solução de Problemas)

### Servidor MCP não aparece ou não inicia

**Problema**: O servidor `supabase` não está listado ou não conecta.

**Solução**:
1. Verifique se `.cursor/mcp.json` existe e o JSON é válido
2. Reinicie o Cursor completamente
3. Vá em **Settings → Tools & MCP** e habilite o servidor manualmente

### Erro de autenticação / OAuth expirado

**Problema**: O Cursor não consegue acessar o projeto Supabase.

**Solução**:
1. Em **Settings → Tools & MCP**, clique em **Authenticate** novamente no servidor `supabase`
2. Certifique-se de autorizar a organização correta (a que contém o projeto Mealtime)
3. Reinicie o Cursor após reautenticar

### Queries de escrita falham

**Problema**: Comandos como `apply_migration` ou INSERT/UPDATE/DELETE não funcionam.

**Solução**: Isso é esperado — `read_only=true` está ativo por segurança. Para habilitar escrita, remova `&read_only=true` da URL em `.cursor/mcp.json` (use apenas em ambiente de desenvolvimento, nunca em produção).

### Ferramentas de conta não aparecem

**Problema**: Comandos como "liste todos os meus projetos" não funcionam.

**Solução**: Esperado quando `project_ref` está definido — o servidor fica limitado ao projeto Mealtime. Remova `?project_ref=...` da URL se precisar de ferramentas de conta (não recomendado para uso diário).

### Comandos não funcionam

**Problema**: O Cursor não responde aos comandos da Supabase.

**Solução**:
1. Verifique se o servidor MCP está ativo em **Settings → Tools & MCP**
2. Tente comandos explícitos: "Use as ferramentas MCP da Supabase para listar tabelas"
3. Mantenha a opção de aprovar tool calls manualmente ativada nas configurações do Cursor

### Variável `${...}` não resolve no Windows

**Problema**: O Supabase usa URL remota com OAuth, então não há variáveis de ambiente necessárias. Se você migrar para autenticação manual com PAT (CI), use o arquivo global `%USERPROFILE%\.cursor\mcp.json` com o token no campo `headers`.

## 🔒 Segurança

### ⚠️ IMPORTANTE

- **NÃO conecte o MCP a dados de produção** — use apenas em desenvolvimento
- **Mantenha `read_only=true`** para uso diário
- **Mantenha `project_ref`** para limitar o escopo ao projeto Mealtime
- **Revise cada tool call** antes de aprovar no Cursor (proteção contra prompt injection)
- **Não dê o MCP para usuários finais** — é uma ferramenta de desenvolvedor

### Modo read-only

Com `read_only=true`, o MCP executa queries como um usuário Postgres somente-leitura. Isso impede:
- `apply_migration`
- INSERT, UPDATE, DELETE, DROP, etc.

Para remover o modo read-only (apenas se necessário):
```json
"url": "https://mcp.supabase.com/mcp?project_ref=acoiqeslybsolmzpqrim"
```

## 📚 Recursos Adicionais

- [Documentação oficial do Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Repositório supabase/mcp](https://github.com/supabase/mcp)
- [Supabase Security Best Practices (MCP)](https://supabase.com/docs/guides/getting-started/mcp#security-risks)

## 🆘 Suporte

Se você encontrar problemas:

1. **Consulte este documento** primeiro
2. **Verifique os logs** no Developer Tools do Cursor
3. **Reautentique** via Settings → Tools & MCP → Authenticate
4. **Abra uma issue** no repositório do projeto se o problema persistir

## 📝 Changelog

- **v1.0.0** (2026-07-02): Configuração inicial do servidor MCP da Supabase (OAuth, read-only, project_ref)
