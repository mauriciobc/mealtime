# Adicionando e Gerenciando Gatos

Aprenda como adicionar, editar e gerenciar os perfis dos seus gatos no MealTime.

---

## Tarefas de Gerenciamento de Gatos

| Tarefa | Quando Usar | Página |
|--------|-------------|--------|
| [Adicionar novo gato](#adicionando-um-novo-gato) | Primeiro gato ou novos felinos | `/cats/new` |
| [Editar informações](#editando-um-gato) | Atualizar dados do gato | `/cats/[id]/edit` |
| [Ver detalhes](#visualizando-detalhes-do-gato) | Ver histórico e estatísticas | `/cats/[id]` |
| [Excluir gato](#excluindo-um-gato) | Remover gato permanentemente | `/cats` |
| [Registrar peso](#registrando-peso) | Acompanhar crescimento | `/weight` |

---

## Adicionando um Novo Gato

![Formulário de novo gato](/user-guide/assets/screenshots/cats-new.png)

1. Acesse a página **Gatos** em `/cats`
2. Clique no botão **"Adicionar Gato"** no topo da página
3. Preencha as informações:

| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|--------------|
| Nome | Texto | Nome do seu gato | ✅ Sim |
| Foto | Arquivo | Imagem do gato (opcional) | ❌ Não |
| Data de Nascimento | Data | Data de nascimento (opcional) | ❌ Não |
| Peso (kg) | Número | Peso atual em quilogramas | ❌ Não |
| Intervalo Ideal Entre Refeições | Número | Horas entre refeições | ✅ Sim |
| Porção Recomendada | Número | Gramas por refeição | ❌ Não |
| Restrições Alimentares | Texto | Alergias ou restrições | ❌ Não |
| Observações Adicionais | Texto | Notas especiais | ❌ Não |

4. Clique em **"Adicionar Gato"** para salvar
5. Você será redirecionado para a lista de gatos

---

## Editando um Gato

1. Vá para a lista de gatos em `/cats`
2. No card do gato que deseja alterar, clique no botão **"Editar"** (ícone de lápis)
3. Modifique as informações desejadas
4. Clique em **"Salvar"** para confirmar as alterações
5. Você verá uma mensagem de sucesso

---

## Excluindo um Gato

1. Na lista de gatos (`/cats`), clique no botão **"Excluir"** (lixeira) no card do gato
2. Um modal de confirmação aparecerá
3. Clique em **"Confirmar"** para excluir permanentemente
4. **Atenção**: Esta ação não pode ser desfeita!

---

## Visualizando Detalhes do Gato

Clique no nome ou foto do gato na lista para ver uma página completa com:

- **Informações do Perfil**: Nome, foto, idade, peso atual
- **Histórico de Alimentações**: Lista de todas as refeições registradas
- **Estatísticas**: Média de porções, frequência de alimentações
- **Agendamentos**: Lembretes configurados para este gato
- **Gráfico de Peso**: Evolução do peso ao longo do tempo

---

## Registrando Peso

Para registrar o peso de um gato:

1. Vá para `/weight`
2. Selecione o gato no menu suspenso
3. Clique em **"Registrar Peso"**
4. Preencha o peso em kg e a data
5. Clique em **"Salvar"**

---

## Dicas

- **Mantenha o peso atualizado**: Registre o peso mensalmente para acompanhar a saúde
- **Configure o intervalo de refeições**: Isso ajuda nos lembretes automáticos
- **Adicione foto**: Facilita identificar cada gato em casas com múltiplos felinos
- **Anote restrições**: Muito importante para alertar cuidadores e visitantes

---

## Próximos Passos

Agora que você sabe gerenciar gatos, aprenda a:

- [Registrar Alimentações](/docs/feeding/recording-feedings) - Registre refeições diárias
- [Acompanhar Peso](/docs/weight/tracking-weight) - Monitore a saúde
- [Criar Agendamentos](/docs/schedules/managing-schedules) - Configure lembretes automáticos
- [Ver Estatísticas](/docs/statistics) - Analise padrões de alimentação
