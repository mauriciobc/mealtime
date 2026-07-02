# Configuração do Servidor MCP da Netlify

## 📋 O que é o MCP da Netlify?

O **Model Context Protocol (MCP)** da Netlify permite que você interaja com sua conta e projetos da Netlify diretamente do Cursor. Com ele, você pode:

- 🔍 Consultar informações sobre seus sites e deploys
- 🚀 Fazer deploys direto do editor
- 📊 Ver logs e métricas
- ⚙️ Gerenciar configurações
- 🔄 Verificar status de builds

## 🛠️ Como Configurar

### 1. Obter o Token de Acesso Pessoal

1. Acesse: [https://app.netlify.com/user/applications#personal-access-tokens](https://app.netlify.com/user/applications#personal-access-tokens)
2. Clique em **"New access token"**
3. Dê um nome descritivo (ex: "Cursor MCP")
4. Selecione as permissões necessárias:
   - ✅ `sites:read` - Ver informações dos sites
   - ✅ `sites:write` - Fazer deploys e modificações
   - ✅ `deploys:read` - Ver informações de deploys
   - ✅ `builds:read` - Ver status de builds
5. Copie o token gerado (você só verá uma vez!)

### 2. Configurar Variável de Ambiente

Adicione o token no seu arquivo `.env` (nunca commite este arquivo!):

```bash
NETLIFY_PERSONAL_ACCESS_TOKEN=nfp_seu_token_aqui
```

### 3. Reiniciar o Cursor

Após adicionar a variável de ambiente:
1. Feche completamente o Cursor
2. Abra novamente o projeto
3. O servidor MCP será iniciado automaticamente

## ✅ Como Verificar se Está Funcionando

No Cursor, você pode:

1. **Verificar conexão**: Digite comandos como:
   - "Liste meus sites da Netlify"
   - "Mostre o último deploy"
   - "Qual o status do meu site?"

2. **Verificar no painel MCP**:
   - **Settings → Tools & MCP** — o servidor `netlify` deve aparecer como ativo

3. **Ver logs de conexão**:
   - Abra o Developer Tools (Ctrl+Shift+I ou Cmd+Option+I)
   - Vá para a aba Console
   - Procure por mensagens relacionadas ao MCP

## 🎯 Comandos Úteis

Aqui estão alguns exemplos de comandos que você pode usar no Cursor:

### Listar Sites
```
Liste todos os meus sites da Netlify
```

### Ver Informações de Deploy
```
Mostre informações sobre o último deploy do site mealtime
```

### Verificar Status
```
Qual o status do build atual?
```

### Fazer Deploy
```
Faça o deploy do branch atual para a Netlify
```

### Ver Logs
```
Mostre os logs do último deploy
```

## 🔧 Estrutura de Arquivos

A configuração do MCP está em:

```
.cursor/
└── mcp.json          # Configuração principal do servidor MCP
```

Conteúdo do arquivo:
```json
{
  "mcpServers": {
    "netlify": {
      "command": "npx",
      "args": [
        "-y",
        "@netlify/mcp"
      ],
      "env": {
        "NETLIFY_PERSONAL_ACCESS_TOKEN": "${NETLIFY_PERSONAL_ACCESS_TOKEN}"
      }
    }
  }
}
```

> **Nota**: O pacote oficial é `@netlify/mcp` (substitui o antigo `@netlify/mcp-server-netlify`). A variável correta é `NETLIFY_PERSONAL_ACCESS_TOKEN` (não `NETLIFY_AUTH_TOKEN`).

## 🐛 Troubleshooting (Solução de Problemas)

### Erro: "NETLIFY_PERSONAL_ACCESS_TOKEN not found"

**Problema**: A variável de ambiente não foi encontrada.

**Solução**:
1. Verifique se o arquivo `.env` existe na raiz do projeto
2. Certifique-se de que a variável está definida: `NETLIFY_PERSONAL_ACCESS_TOKEN=seu_token`
3. Reinicie o Cursor completamente
4. Se `${NETLIFY_PERSONAL_ACCESS_TOKEN}` não for resolvido automaticamente no Windows, coloque o token diretamente no `env` do arquivo global `%USERPROFILE%\.cursor\mcp.json`
5. Em alguns casos, pode ser necessário reiniciar o terminal/computador

### Erro: "Invalid token"

**Problema**: O token está incorreto ou expirado.

**Solução**:
1. Gere um novo token em: [https://app.netlify.com/user/applications#personal-access-tokens](https://app.netlify.com/user/applications#personal-access-tokens)
2. Revogue o token antigo por segurança
3. Atualize o arquivo `.env` com o novo token
4. Reinicie o Cursor

### Servidor MCP não inicia

**Problema**: O servidor não está sendo carregado.

**Solução**:
1. Verifique se o arquivo `.cursor/mcp.json` existe
2. Valide o JSON (use um validador online)
3. Verifique permissões do arquivo
4. Confirme que o pacote é `@netlify/mcp` (não o pacote antigo)
5. Reinicie o Cursor com logs:
   - No terminal: `CURSOR_DEBUG=1 cursor .`

### Comandos não funcionam

**Problema**: O Cursor não responde aos comandos da Netlify.

**Solução**:
1. Verifique se o servidor MCP está ativo em **Settings → Tools & MCP**
2. Tente comandos mais simples primeiro (ex: "liste sites")
3. Certifique-se de que sua conta Netlify tem sites configurados
4. Verifique se o token tem as permissões corretas

## 🔒 Segurança

### ⚠️ IMPORTANTE

- **NUNCA** commite o arquivo `.env` com o token
- **NUNCA** compartilhe seu token publicamente
- **SEMPRE** use `.gitignore` para excluir o `.env`
- **REVOGUE** tokens que não estão mais em uso
- **USE** tokens com permissões mínimas necessárias

### Verificar se .env está no .gitignore

Execute no terminal:
```bash
grep -q "^\.env$" .gitignore && echo "✅ .env está protegido" || echo "❌ ATENÇÃO: .env não está no .gitignore!"
```

Se não estiver, adicione:
```bash
echo ".env" >> .gitignore
```

## 📚 Recursos Adicionais

- [Repositório oficial netlify/netlify-mcp](https://github.com/netlify/netlify-mcp)
- [Documentação oficial do MCP](https://modelcontextprotocol.io)
- [Netlify API Documentation](https://docs.netlify.com/api/get-started/)
- [Netlify CLI](https://docs.netlify.com/cli/get-started/)

## 🆘 Suporte

Se você encontrar problemas:

1. **Consulte este documento** primeiro
2. **Verifique os logs** no Developer Tools do Cursor
3. **Teste o token** manualmente usando a API da Netlify
4. **Abra uma issue** no repositório do projeto se o problema persistir

## 📝 Changelog

- **v1.1.0** (2026-07-02): Atualizado para `@netlify/mcp` e `NETLIFY_PERSONAL_ACCESS_TOKEN`
- **v1.0.0** (2025-10-27): Configuração inicial do servidor MCP da Netlify
