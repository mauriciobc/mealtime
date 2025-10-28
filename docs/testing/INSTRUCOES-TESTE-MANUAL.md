# Instruções para Teste Manual do Sistema de Notificações

## 🚀 Início Rápido

### 1. Iniciar Servidor (se ainda não estiver rodando)
```bash
npm run dev
```

### 2. Acessar o Sistema
Abra seu navegador e acesse:
```
http://localhost:3000
```

---

## 🔐 Passo 1: Autenticação

### Opção A: Usar conta existente
1. Vá para `http://localhost:3000/login`
2. Faça login com suas credenciais
3. Aguarde a autenticação completar

### Opção B: Criar nova conta
1. Vá para `http://localhost:3000/signup`
2. Preencha o formulário de cadastro
3. Faça login com a nova conta

---

## 🧪 Passo 2: Acessar Página de Testes

Após fazer login, acesse:
```
http://localhost:3000/test-notifications
```

Esta página contém:
- ✅ Formulário para agendar notificações
- ✅ Botões de teste para criar notificações imediatas
- ✅ Seletor de gatos (se você tiver gatos cadastrados)
- ✅ Área de logs para visualizar operações
- ✅ Configurações de intervalo (minutos/segundos)

---

## 📋 Passo 3: Executar Testes

### Teste 1: Criar Notificação Imediata ✨

1. **Escolha um tipo de notificação**: Exemplo "Notificação de alimentação programada"
2. **Clique no botão**: Exemplo "Notificação de alimentação programada"
3. **Resultado Esperado**:
   - ✅ Notificação criada com sucesso
   - ✅ Mensagem "Notificação criada com sucesso!" aparece
   - ✅ Notificação aparece na lista
   - ✅ Log verde aparece na seção de logs

### Teste 2: Agendar Notificação 📅

1. **Preencha o formulário**:
   - Tipo: Selecione "feeding" ou "reminder"
   - Título: "Teste de Agendamento"
   - Mensagem: "Esta notificação será entregue no futuro"
   - Data/Hora de Entrega: Selecione uma data/hora futura
   - Cat ID (opcional): Deixe vazio ou selecione um gato
2. **Clique em "Agendar"**
3. **Resultado Esperado**:
   - ✅ Mensagem "Notificação agendada com sucesso!" aparece
   - ✅ Notificação aparece na lista com status "agendada"
   - ✅ Log verde aparece na seção de logs

### Teste 3: Testar com Intervalo ⏱️

1. **Configure o intervalo**:
   - Minutos: 0
   - Segundos: 30
2. **Selecione um gato** (se disponível)
3. **Escolha um tipo**: Exemplo "Lembrete de Alimentação"
4. **Clique em "Agendar"** (o botão com texto "Agendar (Lembrete de alimentação pendente)")
5. **Resultado Esperado**:
   - ✅ Notificação criada e agendada para 30 segundos no futuro
   - ✅ Mensagem de sucesso aparece
   - ✅ Após 30 segundos, a notificação deve ser "entregue"

### Teste 4: Verificar Logs 📊

1. **Role a página até a seção "Logs"**
2. **Verifique os seguintes elementos**:
   - ✅ Logs aparecem em ordem cronológica (mais recentes primeiro)
   - ✅ Cada log mostra:
     - Timestamp (data e hora)
     - Status (SUCCESS, ERROR, ou INFO)
     - Título e mensagem
     - Detalhes JSON (expandir para ver)
3. **Identifique logs de sucesso**: Deve aparecer em verde
4. **Identifique logs de erro**: Deve aparecer em vermelho (se houver)

### Teste 5: Marcar como Lida 👁️

1. **Crie uma notificação** (usando Teste 1)
2. **Encontre a notificação** na lista de notificações
3. **Clique na notificação**
4. **Resultado Esperado**:
   - ✅ Notificação muda de aparência (não destaca mais)
   - ✅ Indicador "Não lida" desaparece
   - ✅ Contador de não lidas diminui

### Teste 6: Remover Notificação 🗑️

1. **Crie uma notificação** (usando Teste 1)
2. **Passe o mouse sobre a notificação**
3. **Clique no ícone de lixeira** que aparece
4. **Resultado Esperado**:
   - ✅ Notificação é removida da lista
   - ✅ Contador de notificações diminui

---

## 🔍 Verificações Técnicas

### Console do Navegador (F12)

Abra o DevTools (F12) e verifique as seguintes mensagens:

#### ✅ Mensagens de Sucesso (Esperadas)

```
[METRIC] NotificationProvider initialized
[IndexedDBManager] Database opened successfully
[SupabaseNotificationService] getNotifications: page=1, limit=10
[NotificationProvider] New notification received
```

#### ⚠️ Mensagens de Aviso (Normais - Quando não autenticado)

```
[NotificationProvider] loadFromCache called with invalid currentUserId: undefined
```

Esta mensagem é normal quando você não está autenticado.

#### ❌ Mensagens de Erro (Problemas)

```
[NotificationProvider] userId validation failed
[SupabaseNotificationService] Missing required notification field
[IndexedDBManager] Error adding notification
```

Se aparecerem estas mensagens, há um problema que precisa ser investigado.

---

## 🎯 Checklist de Validação

Use este checklist para garantir que testou tudo:

### Configuração Inicial
- [ ] Servidor rodando (http://localhost:3000)
- [ ] Usuário autenticado no sistema
- [ ] DevTools aberto (F12)
- [ ] Página de testes carregada

### Testes Básicos
- [ ] Teste 1: Criar notificação imediata ✅
- [ ] Teste 2: Agendar notificação ✅
- [ ] Teste 3: Testar com intervalo ✅
- [ ] Teste 4: Verificar logs ✅
- [ ] Teste 5: Marcar como lida ✅
- [ ] Teste 6: Remover notificação ✅

### Verificações Técnicas
- [ ] Console sem erros críticos
- [ ] Logs aparecem na seção de logs
- [ ] Mensagens de sucesso aparecem
- [ ] IndexedDB contém dados (opcional: verificar DevTools > Application > IndexedDB)

---

## 🆘 Troubleshooting

### Problema: "Usuário não autenticado"
**Solução**: Faça login antes de acessar a página de testes

### Problema: Botões não funcionam
**Solução**: Verifique se está autenticado e se a página carregou completamente

### Problema: Notificações não aparecem
**Solução**: 
1. Verifique o console para erros
2. Verifique se você está autenticado
3. Tente recarregar a página

### Problema: Erro "Invalid userId"
**Solução**: Faça logout e login novamente

---

## 📸 Capturas de Tela Recomendadas

Durante os testes, tire capturas de tela de:
1. Página de testes carregada
2. Logs de sucesso
3. Notificações criadas
4. Console do navegador (F12)

---

## ✅ Resultado Esperado

Ao final dos testes, você deve ter:
- ✅ Múltiplas notificações criadas
- ✅ Logs verdes na seção de logs
- ✅ Console sem erros críticos
- ✅ Todas as funcionalidades testadas e funcionando

---

**Boa sorte nos testes! 🎉**

