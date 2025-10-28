# Padrão de Máquina de Estados para Páginas Next.js

Este documento descreve o padrão de máquina de estados implementado para gerenciar o fluxo de renderização em páginas Next.js, evitando problemas de flickering e tornando o código mais previsível e manutenível.

## Visão Geral

O padrão implementado utiliza um sistema de estados tipados para controlar o fluxo de renderização da página, substituindo múltiplas verificações condicionais por um único estado determinístico.

## Estrutura do Estado

```typescript
type AppState = 
  | { type: 'LOADING_USER' }
  | { type: 'ERROR_USER'; error: string }
  | { type: 'NO_USER' }
  | { type: 'NO_HOUSEHOLD' }
  | { type: 'LOADING_DASHBOARD' }
  | { type: 'ERROR_DASHBOARD'; error: { cats?: string; feedings?: string } }
  | { type: 'NEW_USER_FLOW' }
  | { type: 'DASHBOARD' };
```

### Descrição dos Estados

- `LOADING_USER`: Estado inicial durante o carregamento dos dados do usuário
- `ERROR_USER`: Erro ao carregar dados do usuário
- `NO_USER`: Usuário não autenticado
- `NO_HOUSEHOLD`: Usuário autenticado mas sem residência associada
- `LOADING_DASHBOARD`: Carregando dados do dashboard
- `ERROR_DASHBOARD`: Erro ao carregar dados do dashboard
- `NEW_USER_FLOW`: Fluxo para novo usuário (sem gatos cadastrados)
- `DASHBOARD`: Estado normal do dashboard com todos os dados carregados

## Implementação

### 1. Definição do Estado

```typescript
const appState = useMemo<AppState>(() => {
  if (isLoadingUser) return { type: 'LOADING_USER' };
  if (errorUser) return { type: 'ERROR_USER', error: errorUser };
  if (!currentUser) return { type: 'NO_USER' };
  if (!currentUser.householdId) return { type: 'NO_HOUSEHOLD' };
  if (isLoadingCats || isLoadingFeedings) return { type: 'LOADING_DASHBOARD' };
  if (errorCats || errorFeedings) return { 
    type: 'ERROR_DASHBOARD', 
    error: {
      cats: errorCats || undefined,
      feedings: errorFeedings || undefined
    }
  };
  if ((cats || []).length === 0) return { type: 'NEW_USER_FLOW' };
  return { type: 'DASHBOARD' };
}, [dependencies]);
```

### 2. Renderização Baseada no Estado

```typescript
switch (appState.type) {
  case 'LOADING_USER':
    return <GlobalLoading text="Carregando dados do usuário..." />;
  
  case 'ERROR_USER':
    return <ErrorComponent error={appState.error} />;
  
  // ... outros casos
  
  case 'DASHBOARD':
    return <DashboardContent {...props} />;
}
```

## Benefícios

1. **Previsibilidade**: O fluxo de estados é explícito e previsível
2. **Performance**: Redução de re-renderizações desnecessárias
3. **Manutenibilidade**: Código mais organizado e fácil de manter
4. **Tipagem**: Melhor suporte de TypeScript e autocompleção
5. **Testabilidade**: Estados isolados são mais fáceis de testar

## Boas Práticas

1. **Ordem de Verificação**:
   - Sempre verifique estados de carregamento primeiro
   - Em seguida, verifique erros
   - Por fim, verifique estados de dados

2. **Dependências do useMemo**:
   - Inclua todas as dependências necessárias
   - Evite dependências desnecessárias
   - Mantenha a ordem consistente

3. **Tratamento de Erros**:
   - Use tipos específicos para diferentes erros
   - Forneça mensagens de erro claras
   - Mantenha a consistência no tratamento de erros

4. **Componentização**:
   - Separe a lógica de estado da renderização
   - Crie componentes específicos para cada estado
   - Mantenha os componentes pequenos e focados

## Exemplo de Uso

```typescript
// 1. Defina os tipos de estado
type PageState = 
  | { type: 'LOADING' }
  | { type: 'ERROR'; error: string }
  | { type: 'EMPTY' }
  | { type: 'CONTENT'; data: DataType };

// 2. Implemente o estado
const pageState = useMemo<PageState>(() => {
  if (isLoading) return { type: 'LOADING' };
  if (error) return { type: 'ERROR', error };
  if (!data) return { type: 'EMPTY' };
  return { type: 'CONTENT', data };
}, [isLoading, error, data]);

// 3. Renderize baseado no estado
switch (pageState.type) {
  case 'LOADING':
    return <LoadingComponent />;
  case 'ERROR':
    return <ErrorComponent error={pageState.error} />;
  case 'EMPTY':
    return <EmptyStateComponent />;
  case 'CONTENT':
    return <ContentComponent data={pageState.data} />;
}
```

## Considerações de Performance

1. **Memoização**:
   - Use `useMemo` para calcular o estado
   - Evite cálculos desnecessários
   - Mantenha as dependências atualizadas

2. **Renderização**:
   - Evite renderizações desnecessárias
   - Use componentes memoizados quando apropriado
   - Mantenha a lógica de renderização simples

3. **Dados**:
   - Carregue dados apenas quando necessário
   - Implemente paginação quando apropriado
   - Use cache quando possível

## Conclusão

Este padrão de máquina de estados fornece uma maneira robusta e previsível de gerenciar o fluxo de renderização em páginas Next.js. Ele resolve problemas comuns como flickering durante o carregamento e torna o código mais manutenível e testável.

Ao seguir este padrão, você terá:
- Código mais previsível
- Melhor experiência do usuário
- Menos bugs relacionados a estados
- Código mais fácil de manter e testar 