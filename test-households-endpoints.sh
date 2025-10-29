#!/bin/bash

# Script para testar todos os endpoints V2 de Households usando credenciais existentes
# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"

# Carregar credenciais do arquivo JSON
if [ ! -f ".test-credentials.json" ]; then
    echo -e "${RED}❌ Arquivo .test-credentials.json não encontrado!${NC}"
    echo "Execute: npx ts-node --transpile-only create-test-user.ts"
    exit 1
fi

TOKEN=$(jq -r '.accessToken' .test-credentials.json)
USER_ID=$(jq -r '.userId' .test-credentials.json)
HOUSEHOLD_ID=$(jq -r '.householdId' .test-credentials.json)
EMAIL=$(jq -r '.email' .test-credentials.json)

echo "========================================="
echo "TESTE DOS ENDPOINTS V2 - HOUSEHOLDS"
echo "========================================="
echo "Email: $EMAIL"
echo "User ID: $USER_ID"
echo "Household ID: $HOUSEHOLD_ID"
echo "Token: ${TOKEN:0:30}..."
echo "========================================="
echo ""

# Headers com autenticação
AUTH_HEADER="Authorization: Bearer $TOKEN"

# Função para imprimir resultados
print_result() {
    local title=$1
    local status=$2
    local response=$3
    
    echo ""
    echo "----------------------------------------"
    if [ "$status" -ge 200 ] && [ "$status" -lt 300 ]; then
        echo -e "${GREEN}✓ TESTE: $title${NC}"
    elif [ "$status" -ge 400 ]; then
        echo -e "${RED}✗ TESTE: $title${NC}"
    else
        echo -e "${YELLOW}⚠ TESTE: $title${NC}"
    fi
    echo "Status HTTP: $status"
    echo "Resposta:"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    echo "----------------------------------------"
}

# 1. Testar GET /api/v2/households - Listar households
echo ""
echo -e "${BLUE}>>> 1. Testando GET /api/v2/households - Listar households${NC}"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/v2/households" \
  -H "$AUTH_HEADER")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
print_result "GET /api/v2/households" "$HTTP_STATUS" "$BODY"

# 2. Testar POST /api/v2/households - Criar novo household
echo ""
echo -e "${BLUE}>>> 2. Testando POST /api/v2/households - Criar novo household${NC}"
NEW_HOUSEHOLD_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/v2/households" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"name":"Casa Nova para Testes"}')
HTTP_STATUS=$(echo "$NEW_HOUSEHOLD_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$NEW_HOUSEHOLD_RESPONSE" | sed '/HTTP_STATUS/d')
print_result "POST /api/v2/households" "$HTTP_STATUS" "$BODY"

# Extrair ID do novo household
NEW_HOUSEHOLD_ID=$(echo "$BODY" | jq -r '.data.id // empty' 2>/dev/null)
if [ -n "$NEW_HOUSEHOLD_ID" ] && [ "$NEW_HOUSEHOLD_ID" != "null" ]; then
    echo -e "${GREEN}✓ Novo Household ID: $NEW_HOUSEHOLD_ID${NC}"
    TEST_HOUSEHOLD_ID="$NEW_HOUSEHOLD_ID"
else
    TEST_HOUSEHOLD_ID="$HOUSEHOLD_ID"
fi

# 3. Testar GET /api/v2/households/{id} - Obter household específico
echo ""
echo -e "${BLUE}>>> 3. Testando GET /api/v2/households/{id} - Obter household específico${NC}"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/v2/households/$TEST_HOUSEHOLD_ID" \
  -H "$AUTH_HEADER")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
print_result "GET /api/v2/households/$TEST_HOUSEHOLD_ID" "$HTTP_STATUS" "$BODY"

# 4. Testar PATCH /api/v2/households/{id} - Atualizar household
echo ""
echo -e "${BLUE}>>> 4. Testando PATCH /api/v2/households/{id} - Atualizar household${NC}"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PATCH "$BASE_URL/api/v2/households/$TEST_HOUSEHOLD_ID" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"name":"Casa Atualizada"}')
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
print_result "PATCH /api/v2/households/$TEST_HOUSEHOLD_ID" "$HTTP_STATUS" "$BODY"

# 5. Testar GET /api/v2/households/{id}/members - Listar membros
echo ""
echo -e "${BLUE}>>> 5. Testando GET /api/v2/households/{id}/members - Listar membros${NC}"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/v2/households/$TEST_HOUSEHOLD_ID/members" \
  -H "$AUTH_HEADER")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
print_result "GET /api/v2/households/$TEST_HOUSEHOLD_ID/members" "$HTTP_STATUS" "$BODY"

# 6. Testar PATCH /api/v2/households/{id}/invite-code - Regenerar código de convite
echo ""
echo -e "${BLUE}>>> 6. Testando PATCH /api/v2/households/{id}/invite-code - Regenerar código${NC}"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PATCH "$BASE_URL/api/v2/households/$TEST_HOUSEHOLD_ID/invite-code" \
  -H "$AUTH_HEADER")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
print_result "PATCH /api/v2/households/$TEST_HOUSEHOLD_ID/invite-code" "$HTTP_STATUS" "$BODY"

# 7. Testar POST /api/v2/households/{id}/invite - Convidar membro
echo ""
echo -e "${BLUE}>>> 7. Testando POST /api/v2/households/{id}/invite - Convidar membro${NC}"
INVITE_EMAIL="invited_$(date +%s)@example.com"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/v2/households/$TEST_HOUSEHOLD_ID/invite" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d "{\"email\":\"$INVITE_EMAIL\"}")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
print_result "POST /api/v2/households/$TEST_HOUSEHOLD_ID/invite" "$HTTP_STATUS" "$BODY"

# 8. Testar GET /api/v2/households/{id}/feeding-logs - Listar logs de alimentação
echo ""
echo -e "${BLUE}>>> 8. Testando GET /api/v2/households/{id}/feeding-logs - Listar logs${NC}"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/v2/households/$TEST_HOUSEHOLD_ID/feeding-logs" \
  -H "$AUTH_HEADER")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
print_result "GET /api/v2/households/$TEST_HOUSEHOLD_ID/feeding-logs" "$HTTP_STATUS" "$BODY"

# 9. Testar GET /api/v2/households/{id}/cats - Listar gatos (endpoint adicional)
echo ""
echo -e "${BLUE}>>> 9. Testando GET /api/v2/households/{id}/cats - Listar gatos${NC}"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/v2/households/$TEST_HOUSEHOLD_ID/cats" \
  -H "$AUTH_HEADER")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
print_result "GET /api/v2/households/$TEST_HOUSEHOLD_ID/cats" "$HTTP_STATUS" "$BODY"

# 10. Resumo final
echo ""
echo "========================================="
echo -e "${GREEN}✓ TESTES CONCLUÍDOS!${NC}"
echo "========================================="
echo "Household ID testado: $TEST_HOUSEHOLD_ID"
echo "Email usado: $EMAIL"
echo ""
echo "Nota: Testes de DELETE, aceitar/rejeitar convites foram"
echo "omitidos para preservar os dados de teste."
echo "========================================="

