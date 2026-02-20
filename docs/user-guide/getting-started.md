# Primeiros Passos

Bem-vindo ao MealTime! Este guia vai ajudá-lo a começar a usar o aplicativo para gerenciar a alimentação dos seus gatos.

---

## Tarefas Rápidas

| Tarefa | Descrição | Tempo |
|--------|-----------|-------|
| [Criar conta](#criando-uma-conta) | Registrar um novo usuário | 2 min |
| [Fazer login](#fazendo-login) | Entrar no aplicativo | 1 min |
| [Adicionar primeiro gato](#adicionando-o-primeiro-gato) | Registrar seu felino | 3 min |
| [Criar residência](#criando-uma-residência) | Configurar ambiente | 2 min |
| [Registrar alimentação](#registrando-uma-alimentação) | Primeira refeição registrada | 1 min |

---

## Criando uma Conta

![Tela de Cadastro](/user-guide/assets/screenshots/signup.png)

1. Acesse a página de cadastro em `/signup`
2. Preencha os campos:
   - **Nome Completo**: Seu nome completo
   - **Email**: Seu endereço de email
   - **Senha**: Uma senha segura (mínimo 6 caracteres)
   - **Confirme sua senha**: Repita a senha
3. Clique em **"Criar conta com Email"**
4. Você também pode usar **"Criar conta com Google"** para login rápido

---

## Fazendo Login

![Tela de Login](/user-guide/assets/screenshots/login.png)

1. Acesse a página de login em `/login`
2. Insira seu email e senha
3. Clique em **"Entrar com Email"**
4. Ou use **"Entrar com Google"** para login com Google

---

## Adicionando o Primeiro Gato

![Lista de Gatos](/user-guide/assets/screenshots/cats-list.png)

Após fazer login pela primeira vez:

1. **Na tela inicial**, clique no botão **"Cadastrar meu primeiro gato"** (ou vá para `/cats/new`)
2. Preencha as informações obrigatórias:
   - **Nome**: Nome do seu gato (obrigatório)
   - **Intervalo Ideal Entre Refeições**: Horas entre refeições (padrão: 8h)
3. Informações opcionais:
   - **Foto**: Adicione uma foto do gato
   - **Data de Nascimento**: Para calcular a idade
   - **Peso**: Peso atual em kg
   - **Porção Recomendada**: Gramas por refeição
   - **Restrições**: Alergias ou restrições alimentares
   - **Observações**: Notas especiais
4. Clique em **"Adicionar Gato"**

---

## Criando uma Residência

![Lista de Residências](/user-guide/assets/screenshots/households.png)

1. Na tela inicial, clique em **"Ir para configurações de residência"**
2. Ou vá para `/households/new`
3. Digite um nome para a residência (ex: "Casa Principal")
4. Clique em **"Criar"**

---

## Registrando uma Alimentação

![Dashboard com botão flutuante](/user-guide/assets/screenshots/dashboard.png)

1. Na tela inicial, clique no botão flutuante **"+"** ou **"Registrar nova alimentação"**
2. Selecione o gato
3. Escolha a quantidade (gramas)
4. Opcional: selecione tipo de refeição e alimento
5. Clique em **"Salvar"**

---

## Navegação Básica

O MealTime possui uma barra de navegação inferior com acesso rápido às principais funcionalidades:

| Item | Rota | Função |
|------|------|--------|
| 🏠 Início | `/` | Dashboard com estatísticas e resumo |
| 🐱 Gatos | `/cats` | Gerenciar perfis dos gatos |
| 🏠 Domicílios | `/households` | Gerenciar residências |
| 📅 Agenda | `/schedules` | Ver agendamentos |
| ⚖️ Peso | `/weight` | Acompanhar peso |
| 📊 Estatísticas | `/statistics` | Ver gráficos e dados |

---

## Dicas Úteis

- Use o botão flutuante **"+"** para registrar alimentações rapidamente
- Ative as **notificações push** para receber lembretes
- Configure **metas de peso** para acompanhar a saúde do seu gato
- Crie **agendamentos** para alertas automáticos de alimentação

---

## Próximos Passos

Agora que você sabe o básico, explore as outras seções do guia:

- [Adicionando Gatos](/docs/cats/managing-cats) - Gerencie múltiplos gatos
- [Registrando Alimentações](/docs/feeding/recording-feedings) - Aprenda todas as opções
- [Criando Residências](/docs/households/creating-households) - Convide familiares
- [Configurando Agendamentos](/docs/schedules/managing-schedules) - Automatize lembretes

---

*MealTime - O melhor cuidado para o seu gato!* 🐈
