# 📋 FLUXOS DE USUÁRIO - TESTES MANUAIS

## 🎯 OBJETIVO
Documentar todos os fluxos principais de usuário para testes manuais, garantindo que todas as funcionalidades críticas sejam testadas regularmente.

---

## 🔐 FLUXO 1: AUTENTICAÇÃO

### 1.1 Cadastro de Novo Usuário
**Objetivo:** Verificar se usuários conseguem se registrar corretamente

**Passos:**
1. Acessar página de cadastro (`/signup`)
2. Preencher email válido
3. Preencher senha (mínimo 6 caracteres)
4. Clicar em "Cadastrar"
5. Verificar redirecionamento para login

**Critérios de Aceitação:**
- [ ] Formulário carrega corretamente
- [ ] Validação de email funciona
- [ ] Validação de senha funciona
- [ ] Cadastro é realizado com sucesso
- [ ] Redirecionamento para login funciona
- [ ] Mensagens de erro são claras

**Casos de Teste:**
- Email inválido
- Senha muito curta
- Email já cadastrado
- Campos vazios

### 1.2 Login de Usuário
**Objetivo:** Verificar se usuários conseguem fazer login

**Passos:**
1. Acessar página de login (`/login`)
2. Preencher email cadastrado
3. Preencher senha correta
4. Clicar em "Entrar"
5. Verificar redirecionamento para dashboard

**Critérios de Aceitação:**
- [ ] Formulário carrega corretamente
- [ ] Login com credenciais válidas funciona
- [ ] Redirecionamento para dashboard funciona
- [ ] Sessão é mantida
- [ ] Mensagens de erro são claras

**Casos de Teste:**
- Credenciais inválidas
- Email não cadastrado
- Senha incorreta
- Campos vazios

### 1.3 Logout
**Objetivo:** Verificar se logout funciona corretamente

**Passos:**
1. Estar logado na aplicação
2. Clicar no menu de usuário
3. Clicar em "Sair"
4. Verificar redirecionamento para login

**Critérios de Aceitação:**
- [ ] Logout funciona corretamente
- [ ] Sessão é encerrada
- [ ] Redirecionamento para login funciona
- [ ] Dados não ficam acessíveis

---

## 🐱 FLUXO 2: GERENCIAMENTO DE GATOS

### 2.1 Criar Novo Gato
**Objetivo:** Verificar se usuários conseguem adicionar novos gatos

**Passos:**
1. Acessar página de gatos (`/cats`)
2. Clicar em "Adicionar Gato"
3. Preencher nome do gato
4. Preencher data de nascimento (opcional)
5. Preencher peso (opcional)
6. Fazer upload de foto (opcional)
7. Clicar em "Salvar"

**Critérios de Aceitação:**
- [ ] Formulário carrega corretamente
- [ ] Validação de campos obrigatórios funciona
- [ ] Upload de foto funciona
- [ ] Gato é criado com sucesso
- [ ] Redirecionamento para lista funciona
- [ ] Gato aparece na lista

**Casos de Teste:**
- Nome vazio
- Data de nascimento futura
- Peso negativo
- Foto muito grande
- Foto formato inválido

### 2.2 Editar Gato
**Objetivo:** Verificar se edição de gatos funciona

**Passos:**
1. Acessar página de gatos
2. Clicar em um gato existente
3. Clicar em "Editar"
4. Modificar informações
5. Clicar em "Salvar"

**Critérios de Aceitação:**
- [ ] Formulário carrega com dados atuais
- [ ] Modificações são salvas
- [ ] Dados são atualizados na lista
- [ ] Foto pode ser alterada

### 2.3 Deletar Gato
**Objetivo:** Verificar se exclusão de gatos funciona

**Passos:**
1. Acessar página de gatos
2. Clicar em um gato existente
3. Clicar em "Deletar"
4. Confirmar exclusão

**Critérios de Aceitação:**
- [ ] Confirmação de exclusão aparece
- [ ] Gato é removido da lista
- [ ] Dados relacionados são limpos

---

## 🍽️ FLUXO 3: REGISTRO DE ALIMENTAÇÃO

### 3.1 Adicionar Alimentação
**Objetivo:** Verificar se registro de alimentação funciona

**Passos:**
1. Acessar página de alimentação (`/feedings`)
2. Clicar em "Adicionar Alimentação"
3. Selecionar gato
4. Preencher tipo de alimento
5. Preencher quantidade
6. Preencher horário
7. Adicionar observações (opcional)
8. Clicar em "Salvar"

**Critérios de Aceitação:**
- [ ] Formulário carrega corretamente
- [ ] Lista de gatos é carregada
- [ ] Validação de campos funciona
- [ ] Alimentação é registrada
- [ ] Aparece na lista de alimentações

**Casos de Teste:**
- Gato não selecionado
- Quantidade zero ou negativa
- Horário futuro
- Campos obrigatórios vazios

### 3.2 Editar Alimentação
**Objetivo:** Verificar se edição de alimentação funciona

**Passos:**
1. Acessar lista de alimentações
2. Clicar em uma alimentação
3. Clicar em "Editar"
4. Modificar informações
5. Salvar alterações

**Critérios de Aceitação:**
- [ ] Dados atuais são carregados
- [ ] Modificações são salvas
- [ ] Lista é atualizada

### 3.3 Deletar Alimentação
**Objetivo:** Verificar se exclusão de alimentação funciona

**Passos:**
1. Acessar lista de alimentações
2. Clicar em uma alimentação
3. Clicar em "Deletar"
4. Confirmar exclusão

**Critérios de Aceitação:**
- [ ] Confirmação aparece
- [ ] Alimentação é removida
- [ ] Lista é atualizada

---

## ⚖️ FLUXO 4: CONTROLE DE PESO

### 4.1 Registrar Peso
**Objetivo:** Verificar se registro de peso funciona

**Passos:**
1. Acessar página de peso (`/weight`)
2. Clicar em "Adicionar Peso"
3. Selecionar gato
4. Preencher peso
5. Preencher data
6. Adicionar observações (opcional)
7. Salvar

**Critérios de Aceitação:**
- [ ] Formulário carrega corretamente
- [ ] Lista de gatos é carregada
- [ ] Validação funciona
- [ ] Peso é registrado
- [ ] Aparece no histórico

### 4.2 Visualizar Histórico
**Objetivo:** Verificar se histórico de peso é exibido

**Passos:**
1. Acessar página de peso
2. Selecionar gato
3. Verificar gráfico de evolução
4. Verificar lista de registros

**Critérios de Aceitação:**
- [ ] Gráfico é exibido corretamente
- [ ] Lista de registros é carregada
- [ ] Dados estão corretos
- [ ] Filtros funcionam

---

## 🔔 FLUXO 5: NOTIFICAÇÕES

### 5.1 Configurar Notificações
**Objetivo:** Verificar se configuração de notificações funciona

**Passos:**
1. Acessar configurações (`/settings`)
2. Ir para seção de notificações
3. Ativar/desativar notificações
4. Configurar horários
5. Salvar configurações

**Critérios de Aceitação:**
- [ ] Configurações são salvas
- [ ] Notificações são enviadas
- [ ] Horários são respeitados

### 5.2 Receber Notificações
**Objetivo:** Verificar se notificações são recebidas

**Passos:**
1. Configurar notificações
2. Aguardar horário programado
3. Verificar recebimento
4. Verificar conteúdo

**Critérios de Aceitação:**
- [ ] Notificações chegam no horário
- [ ] Conteúdo está correto
- [ ] Links funcionam

---

## ⚙️ FLUXO 6: CONFIGURAÇÕES

### 6.1 Configurações de Perfil
**Objetivo:** Verificar se configurações de perfil funcionam

**Passos:**
1. Acessar perfil (`/profile`)
2. Modificar informações pessoais
3. Alterar foto de perfil
4. Salvar alterações

**Critérios de Aceitação:**
- [ ] Dados são salvos
- [ ] Foto é atualizada
- [ ] Mudanças são refletidas

### 6.2 Configurações de Aplicação
**Objetivo:** Verificar se configurações gerais funcionam

**Passos:**
1. Acessar configurações
2. Modificar preferências
3. Salvar alterações
4. Verificar aplicação das mudanças

**Critérios de Aceitação:**
- [ ] Configurações são aplicadas
- [ ] Mudanças persistem
- [ ] Interface é atualizada

---

## 📊 FLUXO 7: ESTATÍSTICAS

### 7.1 Visualizar Estatísticas
**Objetivo:** Verificar se estatísticas são exibidas corretamente

**Passos:**
1. Acessar estatísticas (`/statistics`)
2. Selecionar período
3. Selecionar gato
4. Verificar gráficos e dados

**Critérios de Aceitação:**
- [ ] Dados são carregados
- [ ] Gráficos são exibidos
- [ ] Filtros funcionam
- [ ] Dados estão corretos

---

## 🔄 FLUXO 8: RESPONSIVIDADE

### 8.1 Teste Mobile
**Objetivo:** Verificar se aplicação funciona em dispositivos móveis

**Passos:**
1. Acessar aplicação em dispositivo móvel
2. Testar navegação
3. Testar formulários
4. Testar funcionalidades principais

**Critérios de Aceitação:**
- [ ] Interface se adapta
- [ ] Navegação funciona
- [ ] Formulários são usáveis
- [ ] Performance é adequada

### 8.2 Teste Tablet
**Objetivo:** Verificar se aplicação funciona em tablets

**Passos:**
1. Acessar aplicação em tablet
2. Testar layout
3. Testar interações
4. Verificar usabilidade

**Critérios de Aceitação:**
- [ ] Layout é adequado
- [ ] Interações funcionam
- [ ] Usabilidade é boa

---

## 📝 NOTAS IMPORTANTES

### Frequência de Testes
- **Testes críticos:** Semanalmente
- **Testes completos:** Mensalmente
- **Testes de regressão:** Após cada deploy

### Ambientes de Teste
- **Desenvolvimento:** Para testes rápidos
- **Staging:** Para testes completos
- **Produção:** Para validação final

### Documentação de Problemas
- Registrar todos os problemas encontrados
- Incluir screenshots quando necessário
- Descrever passos para reproduzir
- Priorizar por severidade 