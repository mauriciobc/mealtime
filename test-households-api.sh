#!/bin/bash

# Script para testar todos os endpoints V2 de Households
# Cores para output
RED='\033[0:31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"
TEST_EMAIL="test_$(date +%s)@example.com"
TEST_PASSWORD="Test@123456"
TEST_FULL_NAME="Test User"
TEST_HOUSEHOLD_NAME="Casa de Teste"

echo "========================================="
echo "TESTE DOS ENDPOINTS V2 - HOUSEHOLDS"
echo "========================================="
echo ""

# Função para imprimir resultados
print_result() {
    local title=$1
    local status=$2
    local response=$3
    
    echo ""
    echo "----------------------------------------"
    echo "TESTE: $title"
    echo "Status HTTP: $status"
    echo "Resposta:"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    echo "----------------------------------------"
}

# 1. Registrar usuário de teste
echo ">>> Registrando usuário de teste..."
REGISTER_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/auth/mobile/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"full_name\":\"$TEST_FULL_NAME\",\"household_name\":\"$TEST_HOUSEHOLD_NAME\"}")

HTTP_STATUS=$(echo "$REGISTER_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
REGISTER_BODY=$(echo "$REGISTER_RESPONSE" | sed '/HTTP_STATUS/d')

print_result "Registro de Usuário" "$HTTP_STATUS" "$REGISTER_BODY"

# Extrair token (assumindo que vem na resposta)
TOKEN=$(echo "$REGISTER_BODY" | jq -r '.token // .access_token // .data.token // .data.access_token // empty' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo ""
    echo "${RED}❌ Não foi possível obter o token de autenticação${NC}"
    echo "Tentando login..."
    
    # Tentar login se o registro falhou
    LOGIN_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/auth/mobile" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
    
    HTTP_STATUS=$(echo "$LOGIN_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
    LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '/HTTP_STATUS/d')
    
    print_result "Login de Usuário" "$HTTP_STATUS" "$LOGIN_BODY"
    
    TOKEN=$(echo "$LOGIN_BODY" | jq -r '.token // .access_token // .data.token // .data.access_token // empty' 2>/dev/null)
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo ""
    echo "${RED}❌ Falha na autenticação. Abortando testes.${NC}"
    exit 1
fi

echo ""
echo "${GREEN}✓ Token obtido com sucesso!${NC}"
echo "Token: ${TOKEN:0:20}..."

# Headers com autenticação
AUTH_HEADER="Authorization: Bearer $TOKEN"

echo ""
echo "========================================="
echo "INICIANDO TESTES DOS ENDPOINTS"
echo "========================================="

# 2. Testar POST /api/v2/households - Criar household
echo ""
echo ">>> 1. Testando POST /api/v2/households - Criar household"
CREATE_HOUSEHOLD_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/v2/households" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"name":"Minha Casa de Teste"}')

HTTP_STATUS=$(echo "$CREATE_HOUSEHOLD_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
CREATE_HOUSEHOLD_BODY=$(echo "$CREATE_HOUSEHOLD_RESPONSE" | sed '/HTTP_STATUS/d')

print_result "POST /api/v2/households" "$HTTP_STATUS" "$CREATE_HOUSEHOLD_BODY"

# Extrair ID do household criado
HOUSEHOLD_ID=$(echo "$CREATE_HOUSEHOLD_BODY" | jq -r '.data.id // empty' 2>/dev/null)

if [ -z "$HOUSEHOLD_ID" ] || [ "$HOUSEHOLD_ID" == "null" ]; then
    echo ""
    echo "${YELLOW}⚠ Não foi possível obter o ID do household criado${NC}"
fi

# 3. Testar GET /api/v2/households - Listar households
echo ""
echo ">>> 2. Testando GET /api/v2/households - Listar households"
LIST_HOUSEHOLDS_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/v2/households" \
  -H "$AUTH_HEADER")

HTTP_STATUS=$(echo "$LIST_HOUSEHOLDS_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
LIST_HOUSEHOLDS_BODY=$(echo "$LIST_HOUSEHOLDS_RESPONSE" | sed '/HTTP_STATUS/d')

print_result "GET /api/v2/households" "$HTTP_STATUS" "$LIST_HOUSEHOLDS_BODY"

# Se não temos household ID, tentar extrair da lista
if [ -z "$HOUSEHOLD_ID" ] || [ "$HOUSEHOLD_ID" == "null" ]; then
    HOUSEHOLD_ID=$(echo "$LIST_HOUSEHOLDS_BODY" | jq -r '.data[0].id // empty' 2>/dev/null)
fi

if [ -z "$HOUSEHOLD_ID" ] || [ "$HOUSEHOLD_ID" == "null" ]; then
    echo ""
    echo "${RED}❌ Nenhum household disponível para testes. Abortando.${NC}"
    exit 1
fi

echo ""
echo "${GREEN}✓ Household ID para testes: $HOUSEHOLD_ID${NC}"

# 4. Testar GET /api/v2/households/{id} - Obter household específico
echo ""
echo ">>> 3. Testando GET /api/v2/households/{id} - Obter household específico"
GET_HOUSEHOLD_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/v2/households/$HOUSEHOLD_ID" \
  -H "$AUTH_HEADER")

HTTP_STATUS=$(echo "$GET_HOUSEHOLD_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
GET_HOUSEHOLD_BODY=$(echo "$GET_HOUSEHOLD_RESPONSE" | sed '/HTTP_STATUS/d')

print_result "GET /api/v2/households/$HOUSEHOLD_ID" "$HTTP_STATUS" "$GET_HOUSEHOLD_BODY"

# 5. Testar PATCH /api/v2/households/{id} - Atualizar household
echo ""
echo ">>> 4. Testando PATCH /api/v2/households/{id} - Atualizar household"
UPDATE_HOUSEHOLD_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PATCH "$BASE_URL/api/v2/households/$HOUSEHOLD_ID" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"name":"Casa de Teste Atualizada"}')

HTTP_STATUS=$(echo "$UPDATE_HOUSEHOLD_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
UPDATE_HOUSEHOLD_BODY=$(echo "$UPDATE_HOUSEHOLD_RESPONSE" | sed '/HTTP_STATUS/d')

print_result "PATCH /api/v2/households/$HOUSEHOLD_ID" "$HTTP_STATUS" "$UPDATE_HOUSEHOLD_BODY"

# 6. Testar GET /api/v2/households/{id}/members - Listar membros
echo ""
echo ">>> 5. Testando GET /api/v2/households/{id}/members - Listar membros"
LIST_MEMBERS_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/v2/households/$HOUSEHOLD_ID/members" \
  -H "$AUTH_HEADER")

HTTP_STATUS=$(echo "$LIST_MEMBERS_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
LIST_MEMBERS_BODY=$(echo "$LIST_MEMBERS_RESPONSE" | sed '/HTTP_STATUS/d')

print_result "GET /api/v2/households/$HOUSEHOLD_ID/members" "$HTTP_STATUS" "$LIST_MEMBERS_BODY"

# 7. Testar PATCH /api/v2/households/{id}/invite-code - Regenerar código de convite
echo ""
echo ">>> 6. Testando PATCH /api/v2/households/{id}/invite-code - Regenerar código"
REGEN_CODE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PATCH "$BASE_URL/api/v2/households/$HOUSEHOLD_ID/invite-code" \
  -H "$AUTH_HEADER")

HTTP_STATUS=$(echo "$REGEN_CODE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
REGEN_CODE_BODY=$(echo "$REGEN_CODE_RESPONSE" | sed '/HTTP_STATUS/d')

print_result "PATCH /api/v2/households/$HOUSEHOLD_ID/invite-code" "$HTTP_STATUS" "$REGEN_CODE_BODY"

# 8. Testar POST /api/v2/households/{id}/invite - Convidar membro
echo ""
echo ">>> 7. Testando POST /api/v2/households/{id}/invite - Convidar membro"
INVITE_EMAIL="invited_$(date +%s)@example.com"
INVITE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/v2/households/$HOUSEHOLD_ID/invite" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d "{\"email\":\"$INVITE_EMAIL\"}")

HTTP_STATUS=$(echo "$INVITE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
INVITE_BODY=$(echo "$INVITE_RESPONSE" | sed '/HTTP_STATUS/d')

print_result "POST /api/v2/households/$HOUSEHOLD_ID/invite" "$HTTP_STATUS" "$INVITE_BODY"

# 9. Testar GET /api/v2/households/{id}/feeding-logs - Listar logs de alimentação
echo ""
echo ">>> 8. Testando GET /api/v2/households/{id}/feeding-logs - Listar logs"
FEEDING_LOGS_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/v2/households/$HOUSEHOLD_ID/feeding-logs" \
  -H "$AUTH_HEADER")

HTTP_STATUS=$(echo "$FEEDING_LOGS_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
FEEDING_LOGS_BODY=$(echo "$FEEDING_LOGS_RESPONSE" | sed '/HTTP_STATUS/d')

print_result "GET /api/v2/households/$HOUSEHOLD_ID/feeding-logs" "$HTTP_STATUS" "$FEEDING_LOGS_BODY"

# 10. Testar DELETE /api/v2/households/{id} - Deletar household (por último)
echo ""
echo ">>> 9. Testando DELETE /api/v2/households/{id} - Deletar household"
echo "${YELLOW}⚠ Pulando delete para preservar dados de teste${NC}"
# Descomente a linha abaixo se quiser testar o delete
# DELETE_HOUSEHOLD_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X DELETE "$BASE_URL/api/v2/households/$HOUSEHOLD_ID" \
#   -H "$AUTH_HEADER")

echo ""
echo "========================================="
echo "${GREEN}✓ TESTES CONCLUÍDOS!${NC}"
echo "========================================="
echo ""
echo "Household ID usado nos testes: $HOUSEHOLD_ID"
echo "Email do usuário de teste: $TEST_EMAIL"
echo ""

