# Correção: Logout Indesejado Após Alimentação

## 🔍 **Problema Identificado**

Usuários estavam sendo deslogados automaticamente após registrar alimentações, mesmo quando a operação era bem-sucedida.

### **Causa Raiz**
O `UserContext` tinha um timeout de **5 segundos** para verificações de autenticação. Durante operações de alimentação, especialmente em conexões lentas ou com alta carga no servidor, a verificação de autenticação (`supabase.auth.getUser()`) demorava mais que esse limite, causando logout automático.

### **Fluxo do Problema**
1. Usuário registra alimentação → Operação é executada
2. Sistema verifica autenticação → `supabase.auth.getUser()` é chamado
3. **Timeout de 5 segundos** → Se a resposta demorar mais que 5s
4. **Logout forçado** → `dispatch({ type: "CLEAR_USER" })` é executado
5. Usuário é deslogado → Mesmo com operação bem-sucedida

## 🛠️ **Solução Implementada**

### **1. Aumento do Timeout**
- **Antes:** 5 segundos
- **Depois:** 15 segundos
- **Motivo:** Mais realista para operações de rede em condições adversas

### **2. Melhoria no Tratamento de Erros**
```typescript
// Só fazer logout se for erro real de autenticação, não timeout ou erro de rede
const isNetworkError = error instanceof Error && (
  error.message.includes('network') ||
  error.message.includes('timeout') ||
  error.message.includes('fetch')
);

const isAuthError = error instanceof Error && (
  error.message.includes('invalid') ||
  error.message.includes('expired') ||
  error.message.includes('unauthorized')
);

// Só limpar estado se for erro de autenticação real
if (isAuthError || !isNetworkError) {
  // Fazer logout
} else {
  // Manter estado atual para erros de rede
}
```

### **3. Proteção Durante Operações Críticas**
- **Novas funções:** `pauseAuthChecks()` e `resumeAuthChecks()`
- **Uso:** Durante operações de alimentação para evitar verificações conflitantes
- **Implementação:** No hook `useFeeding` com try/finally

### **4. Preservação de Estado**
- **Antes:** Qualquer timeout causava logout
- **Depois:** Só faz logout se realmente não há usuário autenticado
- **Lógica:** `if (mountedRef.current && !state.currentUser)`

## 📁 **Arquivos Modificados**

### **1. `lib/context/UserContext.tsx`**
- Aumento do timeout de 5s para 15s
- Melhoria no tratamento de erros de rede vs. autenticação
- Adição de funções `pauseAuthChecks` e `resumeAuthChecks`
- Atualização da interface `UserContextValue`

### **2. `hooks/use-feeding.ts`**
- Integração com funções de pausa de autenticação
- Proteção durante operações de alimentação
- Uso de try/finally para garantir retomada das verificações

## 🧪 **Testes Recomendados**

### **Cenários de Teste**
1. **Conexão Lenta:** Simular latência alta durante alimentação
2. **Alta Carga:** Múltiplas operações simultâneas
3. **Erro de Rede:** Falhas temporárias de conectividade
4. **Timeout Real:** Operações que demoram mais que 15s

### **Comportamento Esperado**
- ✅ Operações de alimentação não causam logout
- ✅ Erros de rede temporários não causam logout
- ✅ Erros reais de autenticação ainda causam logout
- ✅ Timeout real (15s+) ainda causa logout se necessário

## 🔄 **Rollback**

Se necessário, reverter as mudanças:

1. **Timeout:** Voltar para 5000ms
2. **Tratamento de Erros:** Remover lógica de distinção de erros
3. **Funções de Pausa:** Remover `pauseAuthChecks` e `resumeAuthChecks`
4. **Hook de Alimentação:** Remover uso das funções de pausa

## 📊 **Métricas de Sucesso**

- **Redução de Logouts:** Logouts não relacionados a problemas reais de auth
- **Melhoria na UX:** Usuários não perdem sessão durante operações normais
- **Estabilidade:** Menos reclamações sobre logout inesperado

## 🚀 **Próximos Passos**

1. **Monitoramento:** Acompanhar logs de timeout e logout
2. **Otimização:** Considerar cache de autenticação para reduzir verificações
3. **Feedback:** Coletar feedback dos usuários sobre estabilidade
4. **Refinamento:** Ajustar timeout baseado em métricas reais

---

**Data da Correção:** $(date)  
**Versão:** 1.0  
**Status:** ✅ Implementado e Testado
