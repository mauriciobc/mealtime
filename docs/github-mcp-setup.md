# Configuração do Servidor MCP do GitHub

## 📋 O que é o MCP do GitHub?

O **Model Context Protocol (MCP)** do GitHub permite que você interaja com seus repositórios e recursos do GitHub diretamente do Cursor. Com ele, você pode:

- 🔍 Consultar informações sobre repositórios, issues e pull requests
- ✏️ Criar e atualizar issues e pull requests
- 📝 Criar e editar arquivos diretamente no GitHub
- 🔄 Gerenciar branches e merges
- 📊 Ver notificações e atividades
- 🚀 Gerenciar workflows e deployments
- 🔎 Buscar código e usuários

## 🛠️ Como Configurar

### 1. Obter o Token de Acesso Pessoal do GitHub

1. Acesse: [https://github.com/settings/tokens](https://github.com/settings/tokens)
2. Clique em **"Generate new token"** → **"Generate new token (classic)"**
3. Dê um nome descritivo (ex: "Cursor MCP GitHub")
4. Selecione as permissões necessárias:
   - ✅ `repo` - Acesso completo aos repositórios (inclui todos os sub-permissões)
     - `repo:status` - Acesso ao status do commit
     - `repo_deployment` - Acesso aos deployments
     - `public_repo` - Acesso a repositórios públicos
     - `repo:invite` - Acesso para convidar colaboradores
     - `security_events` - Acesso a eventos de segurança
   - ✅ `workflow` - Atualizar arquivos de workflow do GitHub Actions
   - ✅ `write:packages` - Upload de pacotes
   - ✅ `read:packages` - Download de pacotes
   - ✅ `delete:packages` - Deletar pacotes
   - ✅ `admin:org` - Acesso administrativo completo à organização (se necessário)
   - ✅ `gist` - Criar e atualizar gists
   - ✅ `notifications` - Acesso a notificações
   - ✅ `user` - Acesso ao perfil do usuário
   - ✅ `delete_repo` - Deletar repositórios (opcional, use com cuidado)

5. Clique em **"Generate token"**
6. **IMPORTANTE**: Copie o token gerado imediatamente (você só verá uma vez!)
   - O token terá o formato: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 2. Configurar Variável de Ambiente

Adicione o token no seu arquivo `.env` (nunca commite este arquivo!):

```bash
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_seu_token_aqui
```

Ou, se o servidor MCP usar outro nome de variável:

```bash
GITHUB_TOKEN=ghp_seu_token_aqui
```

### 3. Configurar o Arquivo MCP

⚠️ **IMPORTANTE**: O Cursor usa configuração **global** para MCP servers. O arquivo deve estar em:

- **Linux/macOS**: `~/.cursor/mcp.json`
- **Windows**: `%USERPROFILE%\.cursor\mcp.json`

Edite o arquivo global `~/.cursor/mcp.json` e adicione ou atualize a configuração do GitHub:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "seu_token_aqui"
      }
    }
  }
}
```

**Nota**: 
- Use o pacote correto: `@modelcontextprotocol/server-github` (não `@github/mcp-server`)
- Use a variável correta: `GITHUB_PERSONAL_ACCESS_TOKEN` (não `GITHUB_PAT`)
- Você pode colocar o token diretamente no arquivo ou usar uma variável de ambiente do sistema

### 4. Reiniciar o Cursor

Após adicionar a variável de ambiente e configurar o MCP:

1. Feche completamente o Cursor
2. Abra novamente o projeto
3. O servidor MCP será iniciado automaticamente

## ✅ Como Verificar se Está Funcionando

No Cursor, você pode:

1. **Verificar conexão**: Digite comandos como:
   - "Liste meus repositórios do GitHub"
   - "Mostre minhas notificações"
   - "Qual o status do meu perfil no GitHub?"

2. **Ver logs de conexão**: 
   - Abra o Developer Tools (Ctrl+Shift+I ou Cmd+Option+I)
   - Vá para a aba Console
   - Procure por mensagens relacionadas ao MCP do GitHub

3. **Testar com um comando simples**:
   - "Me mostre informações sobre meu perfil do GitHub"

## 🎯 Comandos Úteis

Aqui estão alguns exemplos de comandos que você pode usar no Cursor:

### Informações do Usuário
```
Mostre informações sobre meu perfil do GitHub
```

### Listar Repositórios
```
Liste todos os meus repositórios do GitHub
```

### Gerenciar Issues
```
Liste as issues abertas do repositório mealtime
Crie uma nova issue no repositório mealtime com o título "Nova funcionalidade"
```

### Gerenciar Pull Requests
```
Liste os pull requests abertos do repositório mealtime
Crie um pull request do branch feature/nova-funcionalidade para main
```

### Ver Notificações
```
Mostre minhas notificações do GitHub
```

### Buscar Código
```
Busque código relacionado a "authentication" no GitHub
```

### Gerenciar Arquivos
```
Crie um arquivo README.md no repositório mealtime
Atualize o arquivo package.json no repositório mealtime
```

## 🔧 Estrutura de Arquivos

A configuração do MCP está em:

```
~/.cursor/
└── mcp.json          # Configuração GLOBAL do servidor MCP (Linux/macOS)
```

**Localização:**
- **Linux/macOS**: `~/.cursor/mcp.json`
- **Windows**: `%USERPROFILE%\.cursor\mcp.json`

⚠️ **IMPORTANTE**: O Cursor prioriza a configuração global. Configurações por projeto (`.cursor/mcp.json` no projeto) podem não funcionar.

A variável de ambiente pode estar no:

```
.env                  # Variáveis de ambiente do projeto (NUNCA commitar!)
```

Ou diretamente no arquivo `mcp.json` (menos seguro, mas mais simples).

## 🐛 Troubleshooting (Solução de Problemas)

### Erro: "401 Bad credentials"

**Problema**: O token não está configurado ou é inválido.

**Solução**:
1. Verifique se o arquivo `.env` existe na raiz do projeto
2. Certifique-se de que a variável está definida: `GITHUB_PERSONAL_ACCESS_TOKEN=ghp_seu_token`
3. Verifique se o token não expirou (tokens podem ter data de expiração)
4. Gere um novo token se necessário
5. Reinicie o Cursor completamente
6. Em alguns casos, pode ser necessário reiniciar o terminal/computador

### Erro: "GITHUB_PERSONAL_ACCESS_TOKEN not found"

**Problema**: A variável de ambiente não foi encontrada.

**Solução**:
1. Verifique se o arquivo `.env` existe na raiz do projeto
2. Certifique-se de que a variável está definida corretamente
3. Verifique se o nome da variável está correto no arquivo `mcp.json`
4. Reinicie o Cursor completamente

### Erro: "403 Forbidden"

**Problema**: O token não tem as permissões necessárias.

**Solução**:
1. Acesse [https://github.com/settings/tokens](https://github.com/settings/tokens)
2. Edite o token existente ou crie um novo
3. Certifique-se de selecionar todas as permissões necessárias (veja seção 1)
4. Salve e atualize o token no arquivo `.env`
5. Reinicie o Cursor

### Servidor MCP não inicia

**Problema**: O servidor não está sendo carregado.

**Solução**:
1. Verifique se o arquivo `.cursor/mcp.json` existe
2. Valide o JSON (use um validador online)
3. Verifique permissões do arquivo
4. Verifique se o pacote `@modelcontextprotocol/server-github` está disponível
5. Reinicie o Cursor com logs: 
   - No terminal: `CURSOR_DEBUG=1 cursor .`

### Comandos não funcionam

**Problema**: O Cursor não responde aos comandos do GitHub.

**Solução**:
1. Verifique se o servidor MCP está ativo (veja logs no Developer Tools)
2. Tente comandos mais simples primeiro (ex: "mostre meu perfil")
3. Certifique-se de que o token tem as permissões corretas
4. Verifique se você está autenticado corretamente

## 🔒 Segurança

### ⚠️ IMPORTANTE

- **NUNCA** commite o arquivo `.env` com o token
- **NUNCA** compartilhe seu token publicamente
- **SEMPRE** use `.gitignore` para excluir o `.env`
- **REVOGUE** tokens que não estão mais em uso
- **USE** tokens com permissões mínimas necessárias
- **DEFINA** uma data de expiração para o token
- **MONITORE** o uso do token regularmente

### Verificar se .env está no .gitignore

Execute no terminal:
```bash
grep -q "^\.env$" .gitignore && echo "✅ .env está protegido" || echo "❌ ATENÇÃO: .env não está no .gitignore!"
```

Se não estiver, adicione:
```bash
echo ".env" >> .gitignore
```

### Rotação de Tokens

É uma boa prática rotacionar tokens regularmente:

1. Gere um novo token
2. Atualize o `.env` com o novo token
3. Teste a conexão
4. Revogue o token antigo

## 📚 Recursos Adicionais

- [Documentação oficial do MCP](https://modelcontextprotocol.io)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [GitHub CLI](https://cli.github.com/)

## 🆘 Suporte

Se você encontrar problemas:

1. **Consulte este documento** primeiro
2. **Verifique os logs** no Developer Tools do Cursor
3. **Teste o token** manualmente usando a API do GitHub:
   ```bash
   curl -H "Authorization: token ghp_seu_token" https://api.github.com/user
   ```
4. **Abra uma issue** no repositório do projeto se o problema persistir

## 📝 Changelog

- **v1.0.0** (2025-01-27): Configuração inicial do servidor MCP do GitHub
