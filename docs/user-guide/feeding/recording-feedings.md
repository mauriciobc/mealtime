# Registrando Alimentações

Aprenda como registrar as refeições dos seus gatos no MealTime.

---

## Tarefas de Alimentação

| Tarefa | Quando Usar | Página |
|--------|-------------|--------|
| [Registro rápido](#registro-rápido) | Registro em 10 segundos | Dashboard (botão +) |
| [Registro completo](#registro-completo) | Detalhes adicionais | `/feedings/new` |
| [Ver histórico](#histórico-de-alimentações) | Visualizar registros passados | `/feedings` |
| [Buscar registros](#buscando-registros) | Encontrar alimentação específica | `/feedings` |

---

## Registro Rápido

![Botão flutuante no dashboard](/user-guide/assets/screenshots/dashboard-fab.png)

A maneira mais rápida de registrar uma alimentação:

1. Na **tela inicial (Dashboard)**, localize o botão flutuante **"+"** no canto inferior direito
2. Toque no botão **"+"** ou **"Registrar nova alimentação"**
3. Uma modal abre automaticamente
4. **Selecione o gato** (obrigatório)
5. Ajuste a **quantidade** em gramas se necessário
6. Toque em **"Salvar"** ✅

Pronto! A alimentação foi registrada em menos de 10 segundos.

---

## Registro Completo

![Histórico de Alimentações](/user-guide/assets/screenshots/feedings-history.png)

Para um registro detalhado com mais informações:

1. Acesse **Alimentações** em `/feedings`
2. Clique no botão **"Registrar"** no topo da página
3. Preencha os campos:

| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|--------------|
| Gato | Seleção | Selecione o gato | ✅ Sim |
| Data/Hora | DataTime | Momento da refeição (padrão: agora) | ✅ Sim |
| Porção | Número | Quantidade em gramas | ✅ Sim |
| Tipo de Refeição | Seleção | Tipo de refeição | ❌ Não |
| Tipo de Alimento | Seleção | Tipo de alimento | ❌ Não |
| Notas | Texto | Observações | ❌ Não |

4. Adicione observações se necessário
5. Clique em **"Salvar"**

---

## Tipos de Refeição

| Tipo | Descrição |
|------|-----------|
| Café da Manhã | Primeira refeição do dia |
| Almoço | Refeição do meio-dia |
| Jantar | Refeição da noite |
| Lanche | Refeição intermediária |

---

## Tipos de Alimento

| Tipo | Descrição |
|------|-----------|
| Ração Seca | Ração comercial seca |
| Ração Úmida | Ração úmida/lata |
| Petisco | Snack ou recompensa |
| Outro | Outro tipo de alimento |
| Casa | Alimentação caseira |

---

## Histórico de Alimentações

Para visualizar o histórico completo:

1. Vá para **Alimentações** em `/feedings`
2. Veja a lista completa de registros ordenada por data
3. Cada cartão mostra: gato, quantidade, horário

---

## Buscando Registros

1. Na página de histórico (`/feedings`), use o campo de busca
2. Procure por: nome do gato, notas, data
3. Resultados aparecem em tempo real

---

## Ordenação

- **Mais recentes primeiro** (padrão): Mais recentes no topo
- **Mais antigos primeiro**: Mais antigos no topo

---

## Dicas

- **Registre logo após a alimentação** para maior precisão no horário
- **Use o botão flutuante** para registros rápidos do dia a dia
- **Adicione notas** sobre apetite ou comportamentos (ex: "comeu pouco")
- **Configure porções padrão** no perfil do gato para preenchimento automático
- **Revise o histórico** semanalmente para identificar padrões

---

## Próximos Passos

- [Criar Agendamentos](/docs/schedules/managing-schedules) - Automatize lembretes
- [Acompanhar Peso](/docs/weight/tracking-weight) - Monitore saúde
- [Ver Estatísticas](/docs/statistics) - Analise tendências
