#!/bin/bash

# Script para testar compatibilidade entre V1 e V2 das APIs de Households
# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"

# Carregar credenciais do arquivo JSON
if [ ! -f ".test-credentials.json" ]; then
    echo -e "${RED}❌ Arquivo .test-credentials.json não encontrado!${NC}"
    exit 1
fi

TOKEN=$(jq -r '.accessToken' .test-credentials.json)
HOUSEHOLD_ID=$(jq -r '.householdId' .test-credentials.json)

echo "========================================="
echo "TESTE DE COMPATIBILIDADE V1 vs V2"
echo "========================================="
echo "Token: ${TOKEN:0:30}..."
echo "Household ID: $HOUSEHOLD_ID"
echo "========================================="
echo ""

AUTH_HEADER="Authorization: Bearer $TOKEN"

# Função para comparar respostas
compare_responses() {
    local v1_resp=$1
    local v2_resp=$2
    local endpoint=$3
    
    echo ""
    echo "═══════════════════════════════════════"
    echo -e "${CYAN}COMPARAÇÃO: $endpoint${NC}"
    echo "═══════════════════════════════════════"
    
    # Extrair status codes
    local v1_status=$(echo "$v1_resp" | grep "HTTP_STATUS" | cut -d: -f2)
    local v2_status=$(echo "$v2_resp" | grep "HTTP_STATUS" | cut -d: -f2)
    
    # Extrair bodies
    local v1_body=$(echo "$v1_resp" | sed '/HTTP_STATUS/d')
    local v2_body=$(echo "$v2_resp" | sed '/HTTP_STATUS/d')
    
    echo ""
    echo -e "${BLUE}V1 Response (Status: $v1_status):${NC}"
    echo "$v1_body" | jq '.' 2>/dev/null || echo "$v1_body"
    
    echo ""
    echo -e "${BLUE}V2 Response (Status: $v2_status):${NC}"
    echo "$v2_body" | jq '.' 2>/dev/null || echo "$v2_body"
    
    # Comparar status codes
    echo ""
    if [ "$v1_status" == "$v2_status" ]; then
        echo -e "${GREEN}✓ Status codes compatíveis: $v1_status${NC}"
    else
        echo -e "${YELLOW}⚠ Status codes diferentes: V1=$v1_status, V2=$v2_status${NC}"
    fi
    
    # Verificar se ambos têm success
    local v1_success=$(echo "$v1_body" | jq -r '.success // empty' 2>/dev/null)
    local v2_success=$(echo "$v2_body" | jq -r '.success // empty' 2>/dev/null)
    
    if [ "$v1_success" == "true" ] && [ "$v2_success" == "true" ]; then
        echo -e "${GREEN}✓ Ambas as versões retornaram sucesso${NC}"
    elif [ "$v1_success" == "false" ] && [ "$v2_success" == "false" ]; then
        echo -e "${YELLOW}⚠ Ambas as versões retornaram erro${NC}"
    elif [ -n "$v1_success" ] && [ -n "$v2_success" ]; then
        echo -e "${RED}✗ Incompatibilidade: V1 success=$v1_success, V2 success=$v2_success${NC}"
    fi
    
    echo "═══════════════════════════════════════"
}

# 1. Testar GET /households (V1) vs GET /v2/households (V2)
echo -e "${CYAN}>>> 1. Testando GET /households (listar)${NC}"
V1_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/households" -H "$AUTH_HEADER")
V2_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/v2/households" -H "$AUTH_HEADER")
compare_responses "$V1_RESP" "$V2_RESP" "GET /households (listar)"

# 2. Testar GET /households/{id} (V1) vs GET /v2/households/{id} (V2)
echo -e "${CYAN}>>> 2. Testando GET /households/{id} (buscar específico)${NC}"
V1_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/households/$HOUSEHOLD_ID" -H "$AUTH_HEADER")
V2_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/v2/households/$HOUSEHOLD_ID" -H "$AUTH_HEADER")
compare_responses "$V1_RESP" "$V2_RESP" "GET /households/{id}"

# 3. Testar GET /households/{id}/members (V1) vs GET /v2/households/{id}/members (V2)
echo -e "${CYAN}>>> 3. Testando GET /households/{id}/members${NC}"
V1_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/households/$HOUSEHOLD_ID/members" -H "$AUTH_HEADER")
V2_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/v2/households/$HOUSEHOLD_ID/members" -H "$AUTH_HEADER")
compare_responses "$V1_RESP" "$V2_RESP" "GET /households/{id}/members"

# 4. Testar GET /households/{id}/cats (V1) vs GET /v2/households/{id}/cats (V2)
echo -e "${CYAN}>>> 4. Testando GET /households/{id}/cats${NC}"
V1_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/households/$HOUSEHOLD_ID/cats" -H "$AUTH_HEADER")
V2_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/v2/households/$HOUSEHOLD_ID/cats" -H "$AUTH_HEADER")
compare_responses "$V1_RESP" "$V2_RESP" "GET /households/{id}/cats"

# 5. Testar GET /households/{id}/feeding-logs (V1) vs GET /v2/households/{id}/feeding-logs (V2)
echo -e "${CYAN}>>> 5. Testando GET /households/{id}/feeding-logs${NC}"
V1_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/households/$HOUSEHOLD_ID/feeding-logs" -H "$AUTH_HEADER")
V2_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/v2/households/$HOUSEHOLD_ID/feeding-logs" -H "$AUTH_HEADER")
compare_responses "$V1_RESP" "$V2_RESP" "GET /households/{id}/feeding-logs"

# 6. Testar GET /households/{id}/invite-code (V1) vs PATCH /v2/households/{id}/invite-code (V2)
echo -e "${CYAN}>>> 6. Testando códigos de convite${NC}"
echo -e "${YELLOW}Nota: V1 usa GET, V2 usa PATCH - funcionalidades diferentes${NC}"
V1_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/households/$HOUSEHOLD_ID/invite-code" -H "$AUTH_HEADER")
V2_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PATCH "$BASE_URL/api/v2/households/$HOUSEHOLD_ID/invite-code" -H "$AUTH_HEADER")

echo ""
echo "═══════════════════════════════════════"
echo -e "${CYAN}V1 GET /households/{id}/invite-code${NC}"
echo "═══════════════════════════════════════"
V1_STATUS=$(echo "$V1_RESP" | grep "HTTP_STATUS" | cut -d: -f2)
V1_BODY=$(echo "$V1_RESP" | sed '/HTTP_STATUS/d')
echo "Status: $V1_STATUS"
echo "$V1_BODY" | jq '.' 2>/dev/null || echo "$V1_BODY"

echo ""
echo "═══════════════════════════════════════"
echo -e "${CYAN}V2 PATCH /v2/households/{id}/invite-code${NC}"
echo "═══════════════════════════════════════"
V2_STATUS=$(echo "$V2_RESP" | grep "HTTP_STATUS" | cut -d: -f2)
V2_BODY=$(echo "$V2_RESP" | sed '/HTTP_STATUS/d')
echo "Status: $V2_STATUS"
echo "$V2_BODY" | jq '.' 2>/dev/null || echo "$V2_BODY"
echo "═══════════════════════════════════════"

# Resumo final
echo ""
echo "========================================="
echo -e "${GREEN}RESUMO DA COMPATIBILIDADE${NC}"
echo "========================================="
echo ""
echo -e "${BLUE}Endpoints Testados:${NC}"
echo "1. GET /households - Listar households"
echo "2. GET /households/{id} - Buscar household"
echo "3. GET /households/{id}/members - Listar membros"
echo "4. GET /households/{id}/cats - Listar gatos"
echo "5. GET /households/{id}/feeding-logs - Listar logs"
echo "6. Códigos de convite (funcionalidades diferentes)"
echo ""
echo -e "${YELLOW}Observações:${NC}"
echo "- V1 está marcada como DEPRECATED"
echo "- V2 usa estrutura de resposta padronizada (success/data)"
echo "- V2 inclui paginação em alguns endpoints"
echo "- Algumas funcionalidades mudaram (ex: invite-code)"
echo ""
echo "========================================="

