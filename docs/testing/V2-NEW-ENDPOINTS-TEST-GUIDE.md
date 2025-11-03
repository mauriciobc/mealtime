# Guia de Testes - Novos Endpoints V2

Este documento fornece instruções detalhadas para testar os novos endpoints V2 implementados.

---

## 📋 Pré-requisitos

1. Servidor rodando: `npm run dev` ou servidor de produção
2. Usuário de teste criado (use `create-test-user.ts` se necessário)
3. Token JWT ou sessão Supabase válida
4. Dados de teste no banco (households, cats, feedings, etc.)

---

## 🔐 Autenticação

### Mobile (JWT)
```bash
# Fazer login
curl -X POST http://localhost:3000/api/auth/mobile \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Salvar token
export TOKEN="seu-token-aqui"
```

### Web (Supabase Session)
Apenas use cookies do navegador após login no app web.

---

## 🧪 Testes por Endpoint

### Fase 1: Gatos (Cats)

#### GET /api/v2/cats/{catId}
```bash
curl -X GET "http://localhost:3000/api/v2/cats/{catId}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Validações**:
- ✅ Retorna gato com relacionamentos
- ✅ 403 se usuário não é membro do household do gato
- ✅ 404 se gato não existe

#### PUT /api/v2/cats/{catId}
```bash
curl -X PUT "http://localhost:3000/api/v2/cats/{catId}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gato Atualizado",
    "weight": 4.5,
    "photoUrl": "https://example.com/photo.jpg"
  }'
```

**Validações**:
- ✅ Atualiza apenas campos fornecidos
- ✅ Valida peso (0-50kg)
- ✅ Valida data de nascimento (não pode ser futuro)
- ✅ 400 para dados inválidos

#### DELETE /api/v2/cats/{catId}
```bash
curl -X DELETE "http://localhost:3000/api/v2/cats/{catId}" \
  -H "Authorization: Bearer $TOKEN"
```

**Validações**:
- ✅ Deleta gato e registros relacionados
- ✅ 403 se não autorizado
- ✅ Transação atômica

---

### Fase 2: Alimentações (Feedings)

#### PUT /api/v2/feedings/{id}
```bash
curl -X PUT "http://localhost:3000/api/v2/feedings/{id}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "notes": "Nota atualizada",
    "meal_type": "manual",
    "unit": "g"
  }'
```

**Validações**:
- ✅ Atualiza apenas campos fornecidos
- ✅ 403 se não é membro do household
- ✅ 404 se alimentação não existe

---

### Fase 3: Estatísticas (Statistics)

#### GET /api/v2/statistics
```bash
# Período padrão (7 dias)
curl -X GET "http://localhost:3000/api/v2/statistics" \
  -H "Authorization: Bearer $TOKEN"

# Período específico
curl -X GET "http://localhost:3000/api/v2/statistics?period=30dias&catId={catId}" \
  -H "Authorization: Bearer $TOKEN"
```

**Validações**:
- ✅ Retorna estatísticas consolidadas
- ✅ Períodos válidos: 7dias, 30dias, 3meses
- ✅ 400 para período inválido

---

### Fase 4: Upload (Upload)

#### POST /api/v2/upload
```bash
curl -X POST "http://localhost:3000/api/v2/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "type=cat"
```

**Validações**:
- ✅ Aceita apenas imagens
- ✅ Processa e valida imagem
- ✅ Retorna URL da imagem
- ✅ 400 para arquivo inválido

---

### Fase 5: Perfil Público (Profile)

#### GET /api/v2/profile/{idOrUsername}
```bash
# Por ID
curl -X GET "http://localhost:3000/api/v2/profile/{userId}" \
  -H "Authorization: Bearer $TOKEN"

# Por username
curl -X GET "http://localhost:3000/api/v2/profile/username123" \
  -H "Authorization: Bearer $TOKEN"
```

**Validações**:
- ✅ Detecta UUID vs username automaticamente
- ✅ Retorna perfil completo
- ✅ 404 se não encontrado

#### PUT /api/v2/profile/{idOrUsername}
```bash
curl -X PUT "http://localhost:3000/api/v2/profile/{userId}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Nome Completo",
    "username": "novo_username",
    "avatar_url": "https://example.com/avatar.jpg"
  }'
```

**Validações**:
- ✅ 403 se tentar atualizar outro usuário
- ✅ Validação com Zod schema
- ✅ Atualiza apenas campos fornecidos

---

### Fase 6: Households Join

#### POST /api/v2/households/join
```bash
curl -X POST "http://localhost:3000/api/v2/households/join" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inviteCode": "ABC123"
  }'
```

**Validações**:
- ✅ 404 se código inválido
- ✅ 400 se já é membro
- ✅ 400 se já pertence a outro domicílio
- ✅ Cria notificações para outros membros

---

### Fase 7: Notificações Agendadas

#### GET /api/v2/scheduled-notifications
```bash
curl -X GET "http://localhost:3000/api/v2/scheduled-notifications?delivered=false&limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN"
```

**Validações**:
- ✅ Paginação funcionando
- ✅ Filtro por `delivered`
- ✅ Máximo 100 por página

#### POST /api/v2/scheduled-notifications
```bash
FUTURE_DATE=$(date -u -d '+1 hour' +"%Y-%m-%dT%H:%M:%SZ")

curl -X POST "http://localhost:3000/api/v2/scheduled-notifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"reminder\",
    \"title\": \"Lembrete de alimentação\",
    \"message\": \"É hora de alimentar seu gato\",
    \"scheduledFor\": \"${FUTURE_DATE}\",
    \"catId\": \"{catId}\"
  }"
```

**Validações**:
- ✅ 400 se `scheduledFor` é data no passado
- ✅ 400 se campos obrigatórios ausentes

#### POST /api/v2/scheduled-notifications/deliver
```bash
curl -X POST "http://localhost:3000/api/v2/scheduled-notifications/deliver" \
  -H "Authorization: Bearer $TOKEN"
```

**Validações**:
- ✅ Processa notificações vencidas
- ✅ Cria notificações reais
- ✅ Marca como entregues
- ✅ Filtra lembretes se gato já foi alimentado

---

## 🔧 Script de Teste Automatizado

Execute o script criado:

```bash
# Testar no localhost
./scripts/test-v2-new-endpoints.sh

# Testar em servidor específico
./scripts/test-v2-new-endpoints.sh https://mealtime.app
```

O script:
- ✅ Faz login automaticamente
- ✅ Obtém IDs necessários (households, cats, etc.)
- ✅ Testa todos os endpoints
- ✅ Mostra resumo de sucessos/falhas

---

## 📊 Checklist de Teste Manual

### Testes Básicos (Por Endpoint)
- [ ] Endpoint retorna 200/201 em caso de sucesso
- [ ] Resposta tem formato `{ success: true, data: ... }`
- [ ] Endpoint retorna 401 sem autenticação
- [ ] Endpoint retorna 403 quando acesso negado
- [ ] Endpoint retorna 404 quando recurso não existe
- [ ] Endpoint retorna 400 para dados inválidos

### Testes de Autorização
- [ ] Não pode acessar dados de outro household
- [ ] Não pode atualizar perfil de outro usuário
- [ ] Não pode deletar gato sem ser membro do household

### Testes de Validação
- [ ] Campos obrigatórios validados
- [ ] Tipos de dados validados (UUID, números, etc.)
- [ ] Valores fora de range rejeitados
- [ ] Datas inválidas rejeitadas

### Testes de Funcionalidade
- [ ] GET retorna dados corretos
- [ ] PUT atualiza apenas campos fornecidos
- [ ] DELETE remove registros relacionados
- [ ] Paginação funciona corretamente
- [ ] Filtros funcionam corretamente

---

## 🐛 Troubleshooting

### Erro 401 (Não autorizado)
- Verificar se token JWT é válido e não expirado
- Verificar formato: `Authorization: Bearer <token>`
- Para web, verificar cookies de sessão

### Erro 403 (Acesso negado)
- Verificar se usuário é membro do household
- Verificar se usuário está tentando acessar próprio recurso
- Verificar logs para detalhes

### Erro 400 (Dados inválidos)
- Verificar formato JSON
- Verificar tipos de dados (UUID, números, etc.)
- Verificar campos obrigatórios
- Verificar resposta para `details` com erros específicos

### Erro 500 (Erro interno)
- Verificar logs do servidor
- Verificar conexão com banco de dados
- Verificar se dados de teste existem

---

## 📝 Exemplos de Respostas

### Sucesso (200)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Gato",
    ...
  }
}
```

### Erro de Validação (400)
```json
{
  "success": false,
  "error": "Dados inválidos",
  "details": {
    "name": {
      "_errors": ["String must contain at least 1 character(s)"]
    }
  }
}
```

### Erro de Autorização (403)
```json
{
  "success": false,
  "error": "Acesso negado: Usuário não pertence a este domicílio"
}
```

---

**Última atualização**: 2025-01-28

