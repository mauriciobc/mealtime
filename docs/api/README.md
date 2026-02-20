# MealTime API Specification Doc

**App:** MealTime

| Version | Date         | Author                | Description                |
|---------|--------------|----------------------|----------------------------|
| 1.0     | 10-Jun-2024  | Mauricio (mealtime)  | Especificação inicial      |

---

## Index
1. Autenticação
   - login (signin)
   - logout (signout)
   - cadastro (signup)
2. Gatos
3. Alimentações
4. Residências
5. Agendamentos
6. Notificações
7. Peso
8. Perfil
9. Usuários
10. Estatísticas

## Conventions
- Todos os endpoints retornam JSON.
- Parâmetros obrigatórios, salvo indicação de [opcional].
- Autenticação via Bearer Token (exceto login/cadastro).
- Status codes seguem padrão HTTP (veja tabela abaixo).

## Status Codes
| Status | Descrição                  |
|--------|----------------------------|
| 200    | OK                         |
| 201    | Created                    |
| 400    | Bad request                |
| 401    | Authentication failure     |
| 403    | Forbidden                  |
| 404    | Resource not found         |
| 409    | Conflict                   |
| 500    | Internal Server Error      |

---

# Métodos

## 1. Autenticação
### 1.1 Login
**Request**
- Method: POST
- URL: `/api/auth/signin`
- Body:
```json
{
  "email": "usuario@email.com",
  "password": "senha"
}
```
**Response**
- 200: `{ "token": "<jwt_token>" }`
- 401: `{ "error": "Credenciais inválidas." }`
- 400: `{ "error": "Campos obrigatórios ausentes." }`

### 1.2 Logout
**Request**
- Method: POST
- URL: `/api/auth/signout`
- Header: Authorization: Bearer <token>
**Response**
- 200: `{ "success": true }`
- 401: `{ "error": "Não autenticado." }`

### 1.3 Cadastro
**Request**
- Method: POST
- URL: `/api/auth/signup`
- Body:
```json
{
  "email": "usuario@email.com",
  "password": "senha",
  "name": "Nome Completo"
}
```
**Response**
- 201: `{ "token": "<jwt_token>" }`
- 400: `{ "error": "Dados inválidos." }`

---

## 2. Gatos
### 2.1 Listar gatos
**Request**
- Method: GET
- URL: `/api/cats`
- Header: Authorization: Bearer <token>
**Response**
- 200: `[{ "id": "...", "name": "...", "gender": "male" | "female" | null, ... }]`

### 2.2 Criar gato
**Request**
- Method: POST
- URL: `/api/cats`
- Body: `{ "name": "Mimi", "householdId": "...", "gender": "female" [opcional], ... }`
- Campo **gender** [opcional]: `"male"`, `"female"` ou omitido (null).
**Response**
- 201: `{ "id": "...", "name": "Mimi", "gender": "female" | null, ... }`

### 2.3 Detalhes do gato
**Request**
- Method: GET
- URL: `/api/cats/:id`
**Response**
- 200: `{ "id": "...", "name": "Mimi", "gender": "male" | "female" | null, ... }`
- 404: `{ "error": "Gato não encontrado." }`

### 2.4 Atualizar gato
**Request**
- Method: PUT
- URL: `/api/cats/:id`
- Body: `{ "name": "Novo Nome", "gender": "male" | "female" | null [opcional], ... }`
**Response**
- 200: `{ "id": "...", "name": "Novo Nome", "gender": "male" | "female" | null, ... }`

### 2.5 Remover gato
**Request**
- Method: DELETE
- URL: `/api/cats/:id`
**Response**
- 200: `{ "success": true }`

### 2.6 Próxima alimentação
**Request**
- Method: GET
- URL: `/api/cats/:catId/next-feeding`
**Response**
- 200: `{ "nextFeeding": "2024-06-10T08:00:00Z" }`

---

## 3. Alimentações
### 3.1 Listar alimentações
**Request**
- Method: GET
- URL: `/api/feedings?householdId=...`
**Response**
- 200: `[{ "id": "...", "catId": "...", ... }]`

### 3.2 Registrar alimentação
**Request**
- Method: POST
- URL: `/api/feedings`
- Body: `{ "catId": "...", "amount": 30, ... }`
**Response**
- 201: `{ "id": "...", ... }`

### 3.3 Detalhes de alimentação
**Request**
- Method: GET
- URL: `/api/feedings/:id`
**Response**
- 200: `{ "id": "...", ... }`
- 404: `{ "error": "Registro não encontrado." }`

### 3.4 Remover alimentação
**Request**
- Method: DELETE
- URL: `/api/feedings/:id`
**Response**
- 200: `{ "success": true }`

### 3.5 Alimentação em lote
**Request**
- Method: POST
- URL: `/api/feedings/batch`
- Body: `{ "logs": [ ... ] }`
**Response**
- 201: `{ "count": 2, "logs": [ ... ] }`

### 3.6 Estatísticas
**Request**
- Method: GET
- URL: `/api/feedings/stats?catId=...&days=...`
**Response**
- 200: `{ "totals": { ... }, ... }`

### 3.7 Última alimentação do gato
**Request**
- Method: GET
- URL: `/api/feedings/last/:catId`
**Response**
- 200: `{ "id": "...", ... }`

---

## 4. Residências
### 4.1 Listar residências
**Request**
- Method: GET
- URL: `/api/households`
**Response**
- 200: `[{ "id": "...", "name": "Casa", ... }]`

### 4.2 Criar residência
**Request**
- Method: POST
- URL: `/api/households`
- Body: `{ "name": "Casa Nova" }`
**Response**
- 201: `{ "id": "...", "name": "Casa Nova", ... }`

### 4.3 Detalhes da residência
**Request**
- Method: GET
- URL: `/api/households/:id`
**Response**
- 200: `{ "id": "...", "name": "Casa", ... }`

### 4.4 Atualizar residência
**Request**
- Method: PUT
- URL: `/api/households/:id`
- Body: `{ "name": "Novo Nome" }`
**Response**
- 200: `{ "id": "...", "name": "Novo Nome", ... }`

### 4.5 Remover residência
**Request**
- Method: DELETE
- URL: `/api/households/:id`
**Response**
- 200: `{ "success": true }`

#### Sub-recursos
- `/api/households/:id/members` — membros
- `/api/households/:id/cats` — gatos
- `/api/households/:id/feeding-logs` — logs de alimentação
- `/api/households/:id/invite` — convites
- `/api/households/:id/invite-code` — código de convite

---

## 5. Agendamentos
### 5.1 Listar agendamentos
**Request**
- Method: GET
- URL: `/api/schedules`
**Response**
- 200: `[{ ... }]`

### 5.2 Criar agendamento
**Request**
- Method: POST
- URL: `/api/schedules`
- Body: `{ ... }`
**Response**
- 201: `{ ... }`

### 5.3 Detalhes do agendamento
**Request**
- Method: GET
- URL: `/api/schedules/:id`
**Response**
- 200: `{ ... }`

### 5.4 Atualizar agendamento
**Request**
- Method: PUT
- URL: `/api/schedules/:id`
- Body: `{ ... }`
**Response**
- 200: `{ ... }`

### 5.5 Remover agendamento
**Request**
- Method: DELETE
- URL: `/api/schedules/:id`
**Response**
- 200: `{ "success": true }`

---

## 6. Notificações
### 6.1 Listar notificações
**Request**
- Method: GET
- URL: `/api/notifications`
**Response**
- 200: `[{ ... }]`

### 6.2 Inscrever para notificações
**Request**
- Method: POST
- URL: `/api/notifications/subscribe`
**Response**
- 200: `{ "success": true }`

### 6.3 Cancelar inscrição
**Request**
- Method: POST
- URL: `/api/notifications/unsubscribe`
**Response**
- 200: `{ "success": true }`

### 6.4 Contar não lidas
**Request**
- Method: GET
- URL: `/api/notifications/unread-count`
**Response**
- 200: `{ "count": 2 }`

### 6.5 Marcar todas como lidas
**Request**
- Method: POST
- URL: `/api/notifications/read-all`
**Response**
- 200: `{ "success": true }`

### 6.6 Checagem de alimentação
**Request**
- Method: POST
- URL: `/api/notifications/feeding-check`
**Response**
- 200: `{ "checked": true }`

---

## 7. Peso
### 7.1 Listar logs de peso
**Request**
- Method: GET
- URL: `/api/weight/logs`
**Response**
- 200: `[{ ... }]`

### 7.2 Adicionar log de peso
**Request**
- Method: POST
- URL: `/api/weight/logs`
- Body: `{ ... }`
**Response**
- 201: `{ ... }`

### 7.3 Listar metas de peso
**Request**
- Method: GET
- URL: `/api/weight/goals`
**Response**
- 200: `[{ ... }]`

### 7.4 Definir meta de peso
**Request**
- Method: POST
- URL: `/api/weight/goals`
- Body: `{ ... }`
**Response**
- 201: `{ ... }`

---

## 8. Perfil
### 8.1 Detalhes do perfil
**Request**
- Method: GET
- URL: `/api/profile/:idOrUsername`
**Response**
- 200: `{ ... }`

---

## 9. Usuários
### 9.1 Detalhes do usuário
**Request**
- Method: GET
- URL: `/api/users/:id`
**Response**
- 200: `{ ... }`

### 9.2 Preferências do usuário
**Request**
- Method: GET
- URL: `/api/users/:id/preferences`
**Response**
- 200: `{ ... }`

### 9.3 Atualizar preferências
**Request**
- Method: PUT
- URL: `/api/users/:id/preferences`
- Body: `{ ... }`
**Response**
- 200: `{ ... }`

---

## 10. Estatísticas
### 10.1 Estatísticas gerais
**Request**
- Method: GET
- URL: `/api/statistics`
**Response**
- 200: `{ ... }`

---

## Glossary
- **Client:** Aplicativo cliente.
- **Status:** Código HTTP da resposta.
- Todas as respostas são em JSON.
- Todos os parâmetros são obrigatórios, salvo indicação de [opcional].
- Os tipos aceitos para cada parâmetro estão indicados nos exemplos. 