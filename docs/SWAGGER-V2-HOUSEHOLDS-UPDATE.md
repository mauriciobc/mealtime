# ✅ Swagger V2 - Atualização com Endpoints de Households

**Data:** 29 de Outubro de 2025  
**Status:** ✅ Completo e Validado

## 📋 Resumo

A documentação Swagger V2 foi atualizada com **todos os 9 novos endpoints** de households que foram implementados. O arquivo está **100% válido** e pronto para uso.

---

## 🆕 Endpoints Adicionados ao Swagger

### 1. **GET `/households`**
```yaml
Listar domicílios (v2)
- Descrição: Retorna todos os domicílios do usuário autenticado
- Autenticação: Bearer JWT
- Resposta 200: Lista de domicílios com membros
- Resposta 401: Não autorizado
```

### 2. **POST `/households`**
```yaml
Criar domicílio (v2)
- Descrição: Cria um novo domicílio e adiciona o usuário como admin
- Autenticação: Bearer JWT
- Body: { name: string }
- Resposta 201: Domicílio criado
- Resposta 400: Dados inválidos
- Resposta 401: Não autorizado
```

### 3. **GET `/households/{id}`**
```yaml
Buscar domicílio (v2)
- Descrição: Retorna detalhes de um domicílio específico
- Autenticação: Bearer JWT
- Params: id (UUID)
- Resposta 200: Detalhes completos (membros, gatos, owner, inviteCode)
- Resposta 403: Acesso negado
- Resposta 404: Domicílio não encontrado
```

### 4. **PATCH `/households/{id}`**
```yaml
Atualizar domicílio (v2)
- Descrição: Atualiza informações do domicílio (apenas admins)
- Autenticação: Bearer JWT
- Params: id (UUID)
- Body: { name?: string }
- Resposta 200: Domicílio atualizado
- Resposta 400: Dados inválidos
- Resposta 403: Apenas administradores
- Resposta 404: Domicílio não encontrado
```

### 5. **DELETE `/households/{id}`**
```yaml
Deletar domicílio (v2)
- Descrição: Deleta um domicílio e todos os dados relacionados (apenas admins)
- Autenticação: Bearer JWT
- Params: id (UUID)
- Resposta 200: Domicílio deletado com sucesso
- Resposta 403: Apenas administradores
- Resposta 404: Domicílio não encontrado
```

### 6. **GET `/households/{id}/members`**
```yaml
Listar membros (v2)
- Descrição: Retorna lista de membros do domicílio
- Autenticação: Bearer JWT
- Params: id (UUID)
- Resposta 200: Lista de membros (id, name, email, role, isCurrentUser)
- Resposta 403: Acesso negado
- Resposta 404: Domicílio não encontrado
```

### 7. **POST `/households/{id}/members`**
```yaml
Adicionar membro (v2)
- Descrição: Adiciona um novo membro ao domicílio por email (apenas admins)
- Autenticação: Bearer JWT
- Params: id (UUID)
- Body: { email: string, role: "admin"|"member" }
- Resposta 201: Membro adicionado
- Resposta 400: Usuário já é membro ou pertence a outro domicílio
- Resposta 403: Apenas administradores
- Resposta 404: Usuário não encontrado
```

### 8. **DELETE `/households/{id}/members/{userId}`**
```yaml
Remover membro (v2)
- Descrição: Remove um membro do domicílio (apenas admins)
- Autenticação: Bearer JWT
- Params: 
  - id (UUID) - ID do domicílio
  - userId (UUID) - ID do usuário a ser removido
- Resposta 200: Membro removido
- Resposta 400: Não é possível remover o último admin ou remover a si mesmo
- Resposta 403: Apenas administradores
- Resposta 404: Membro não encontrado
```

### 9. **GET `/households/{id}/feeding-logs`**
```yaml
Buscar logs de alimentação (v2)
- Descrição: Retorna logs de alimentação dos gatos do domicílio com paginação
- Autenticação: Bearer JWT
- Params: 
  - id (UUID) - ID do domicílio
- Query Params:
  - limit (integer, default: 100, max: 500) - Número máximo de registros
  - offset (integer, default: 0) - Número de registros para pular
  - catId (UUID, opcional) - Filtrar por gato específico
- Resposta 200: Lista de logs com paginação (data[], count, totalCount, pagination{})
- Resposta 403: Acesso negado
- Resposta 404: Domicílio não encontrado
```

---

## 📊 Estatísticas da Atualização

### Antes
```yaml
Endpoints de Households no Swagger V2: 4

/households/{id}/cats          GET, POST
/households/{id}/invite         POST
/households/{id}/invite-code    PATCH
```

### Depois
```yaml
Endpoints de Households no Swagger V2: 13

/households                           GET, POST        [NOVO]
/households/{id}                      GET, PATCH, DELETE [NOVO]
/households/{id}/members              GET, POST        [NOVO]
/households/{id}/members/{userId}     DELETE           [NOVO]
/households/{id}/feeding-logs         GET              [NOVO]
/households/{id}/cats                 GET, POST
/households/{id}/invite               POST
/households/{id}/invite-code          PATCH
```

**Total:** +9 novos endpoints documentados! 🎉

---

## ✅ Validação

O arquivo Swagger foi validado com sucesso:

```bash
$ npx @apidevtools/swagger-cli validate app/api/swagger-v2.yaml
✅ app/api/swagger-v2.yaml is valid
```

**Status:** Sem erros de sintaxe! ✨

---

## 🎨 Características da Documentação

### Padrão de Resposta V2
Todos os endpoints usam o schema `ApiResponse`:
```yaml
ApiResponse:
  type: object
  required: [success]
  properties:
    success: boolean
    data: object
    count: integer
    error: string
```

### Autenticação
Todos os endpoints requerem:
```yaml
security:
  - BearerAuth: []
```

### Descrições Detalhadas
- ✅ Cada endpoint tem descrição clara em português
- ✅ Parâmetros documentados com tipos e formatos
- ✅ Exemplos de request/response
- ✅ Todos os códigos de status HTTP documentados

### Validações Documentadas
- ✅ UUIDs validados
- ✅ Campos obrigatórios marcados
- ✅ Enums com valores permitidos
- ✅ Limites numéricos (min/max) especificados

---

## 🌐 Como Acessar a Documentação

### Desenvolvimento Local
```
http://localhost:3000/api-docs
```

### Produção
```
https://seu-app.netlify.app/api-docs
```

---

## 📚 Exemplos de Uso (via Swagger UI)

### 1. Criar Household
```http
POST /api/v2/households
Authorization: Bearer {seu-token-jwt}
Content-Type: application/json

{
  "name": "Minha Casa"
}
```

### 2. Listar Membros
```http
GET /api/v2/households/{id}/members
Authorization: Bearer {seu-token-jwt}
```

### 3. Adicionar Membro
```http
POST /api/v2/households/{id}/members
Authorization: Bearer {seu-token-jwt}
Content-Type: application/json

{
  "email": "amigo@example.com",
  "role": "member"
}
```

### 4. Buscar Logs com Filtros
```http
GET /api/v2/households/{id}/feeding-logs?limit=20&catId={cat-uuid}
Authorization: Bearer {seu-token-jwt}
```

---

## 🔄 Comparação com API V1

### Paridade Completa
A documentação Swagger V2 agora tem **paridade completa** com a API V1 de households, mas com:

- ✅ **Autenticação JWT** (vs cookies)
- ✅ **Respostas padronizadas** com formato V2
- ✅ **Validação rigorosa** de tipos e formatos
- ✅ **Paginação documentada** para logs
- ✅ **Códigos HTTP precisos** para cada cenário

---

## 🎯 Benefícios para Desenvolvedores

### 1. **Documentação Interativa**
- Testar endpoints diretamente no Swagger UI
- Ver exemplos de request/response
- Copiar exemplos de código

### 2. **Geração Automática de Clientes**
- Swagger Codegen pode gerar clientes automaticamente
- Suporte para múltiplas linguagens (TypeScript, Python, Java, etc.)

### 3. **Validação de Contratos**
- Garantir que implementação corresponde à documentação
- Detectar breaking changes

### 4. **Onboarding Rápido**
- Novos desenvolvedores podem entender a API rapidamente
- Exemplos práticos de uso

---

## 📝 Notas Técnicas

### Formato OpenAPI
- **Versão:** 3.0.0
- **Formato:** YAML
- **Local:** `app/api/swagger-v2.yaml`

### Tags Organizacionais
```yaml
tags:
  - name: Cats
  - name: Feedings
  - name: Weight
  - name: Goals
  - name: Schedules
  - name: Households  ← Expandida com 9 novos endpoints
```

### Schemas Reutilizáveis
- `ApiResponse` - Resposta padrão V2
- `Cat` - Schema de gatos
- `BearerAuth` - Esquema de autenticação JWT

---

## ✅ Checklist de Implementação

- [x] Adicionar endpoint GET /households
- [x] Adicionar endpoint POST /households
- [x] Adicionar endpoint GET /households/{id}
- [x] Adicionar endpoint PATCH /households/{id}
- [x] Adicionar endpoint DELETE /households/{id}
- [x] Adicionar endpoint GET /households/{id}/members
- [x] Adicionar endpoint POST /households/{id}/members
- [x] Adicionar endpoint DELETE /households/{id}/members/{userId}
- [x] Adicionar endpoint GET /households/{id}/feeding-logs
- [x] Validar sintaxe YAML
- [x] Testar no Swagger UI (local)
- [x] Documentar parâmetros de paginação
- [x] Documentar códigos de erro

---

## 🚀 Próximos Passos

### Recomendações:

1. **Atualizar Swagger V1**
   - Marcar endpoints V1 como `deprecated: true`
   - Adicionar avisos de migração para V2

2. **Adicionar Exemplos Completos**
   - Adicionar exemplos de responses para cada status code
   - Incluir exemplos de erros comuns

3. **Integração com Testes**
   - Usar Swagger para gerar testes automatizados
   - Validar responses contra schemas

4. **Versionamento**
   - Considerar changelog automático quando endpoints mudam
   - Documentar breaking changes

---

## ✅ Conclusão

A documentação Swagger V2 está agora **100% completa** para households com:

- ✅ **13 endpoints** totalmente documentados
- ✅ **Sintaxe validada** sem erros
- ✅ **Paridade completa** com API V1
- ✅ **Pronta para uso** por desenvolvedores

**Status:** Pronto para produção! 🎉

---

## 📞 Suporte

Para dúvidas sobre a documentação:
- Consulte o arquivo: `app/api/swagger-v2.yaml`
- Acesse o Swagger UI: `http://localhost:3000/api-docs`
- Veja exemplos práticos em: `docs/API-V2-HOUSEHOLDS-COMPLETE.md`

