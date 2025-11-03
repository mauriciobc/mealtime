#!/bin/bash

# Script para testar os novos endpoints V2 implementados
# Uso: ./scripts/test-v2-new-endpoints.sh [BASE_URL]

BASE_URL=${1:-"http://localhost:3000"}
API_URL="${BASE_URL}/api/v2"

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
TESTS_PASSED=0
TESTS_FAILED=0

# Função para fazer login e obter token
login() {
  local email="${TEST_EMAIL:-test@example.com}"
  local password="${TEST_PASSWORD:-password123}"
  
  echo -e "${YELLOW}🔐 Fazendo login...${NC}"
  
  RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/mobile" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"${password}\"}")
  
  TOKEN=$(echo $RESPONSE | jq -r '.access_token // .token // empty')
  
  if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo -e "${RED}❌ Falha ao fazer login${NC}"
    echo "Response: $RESPONSE"
    return 1
  fi
  
  echo -e "${GREEN}✅ Login realizado com sucesso${NC}"
  export AUTH_TOKEN="$TOKEN"
  return 0
}

# Função helper para fazer requisições autenticadas
api_request() {
  local method=$1
  local endpoint=$2
  local data=${3:-""}
  local token=${AUTH_TOKEN}
  
  if [ -z "$token" ]; then
    echo -e "${RED}❌ Token de autenticação não disponível${NC}"
    return 1
  fi
  
  if [ -z "$data" ]; then
    curl -s -w "\n%{http_code}" -X "$method" \
      "${API_URL}${endpoint}" \
      -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json"
  else
    curl -s -w "\n%{http_code}" -X "$method" \
      "${API_URL}${endpoint}" \
      -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json" \
      -d "$data"
  fi
}

# Função para testar endpoint
test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=${4:-""}
  local expected_status=${5:-200}
  
  echo -e "\n${YELLOW}🧪 Testando: ${name}${NC}"
  echo "   ${method} ${API_URL}${endpoint}"
  
  RESPONSE=$(api_request "$method" "$endpoint" "$data")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" -eq "$expected_status" ]; then
    SUCCESS=$(echo "$BODY" | jq -r '.success // empty')
    if [ "$SUCCESS" == "true" ] || [ "$SUCCESS" == "" ] || [ "$HTTP_CODE" == "404" ]; then
      echo -e "${GREEN}✅ Passou (${HTTP_CODE})${NC}"
      TESTS_PASSED=$((TESTS_PASSED + 1))
      if [ "$VERBOSE" == "1" ]; then
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
      fi
      return 0
    else
      echo -e "${RED}❌ Falhou: success=false${NC}"
      echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
      TESTS_FAILED=$((TESTS_FAILED + 1))
      return 1
    fi
  else
    echo -e "${RED}❌ Falhou: Esperado ${expected_status}, recebido ${HTTP_CODE}${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

# Main
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}  Teste dos Novos Endpoints V2${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"

# Login
if ! login; then
  echo -e "${RED}❌ Não foi possível fazer login. Encerrando testes.${NC}"
  exit 1
fi

# Obter IDs necessários (assumindo que existem dados de teste)
echo -e "\n${YELLOW}📋 Obtendo dados necessários...${NC}"

# Obter primeiro household
HOUSEHOLDS_RESPONSE=$(api_request "GET" "/households")
HOUSEHOLD_ID=$(echo "$HOUSEHOLDS_RESPONSE" | jq -r '.data[0].id // empty')

# Obter primeiro gato
CATS_RESPONSE=$(api_request "GET" "/cats")
CAT_ID=$(echo "$CATS_RESPONSE" | jq -r '.data[0].id // empty')

# Obter primeira alimentação
if [ -n "$HOUSEHOLD_ID" ]; then
  FEEDINGS_RESPONSE=$(api_request "GET" "/feedings?householdId=${HOUSEHOLD_ID}")
  FEEDING_ID=$(echo "$FEEDINGS_RESPONSE" | jq -r '.data[0].id // empty')
fi

# Obter userId do próprio perfil
USER_RESPONSE=$(api_request "GET" "/users/${AUTH_TOKEN}" 2>/dev/null || api_request "GET" "/users/$(echo $CATS_RESPONSE | jq -r '.data[0].owner_id // empty')")
USER_ID=$(echo "$HOUSEHOLDS_RESPONSE" | jq -r '.data[0].owner_id // empty' || echo "unknown")

echo "Household ID: ${HOUSEHOLD_ID:-N/A}"
echo "Cat ID: ${CAT_ID:-N/A}"
echo "Feeding ID: ${FEEDING_ID:-N/A}"
echo "User ID: ${USER_ID:-N/A}"

# ==================== FASE 1: CATS ====================
echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}  FASE 1: Gatos (Cats)${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"

if [ -n "$CAT_ID" ]; then
  # GET /api/v2/cats/{catId}
  test_endpoint "GET /cats/{catId}" "GET" "/cats/${CAT_ID}" "" 200
  
  # PUT /api/v2/cats/{catId}
  test_endpoint "PUT /cats/{catId}" "PUT" "/cats/${CAT_ID}" '{"name":"Gato Atualizado"}' 200
  
  # DELETE /api/v2/cats/{catId} - Não testamos delete pois apaga o gato
  echo -e "${YELLOW}⏭️  Pulando DELETE /cats/{catId} (deletaria o gato)${NC}"
else
  echo -e "${YELLOW}⏭️  Pulando testes de gatos (nenhum gato encontrado)${NC}"
fi

# ==================== FASE 2: FEEDINGS ====================
echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}  FASE 2: Alimentações (Feedings)${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"

if [ -n "$FEEDING_ID" ]; then
  # PUT /api/v2/feedings/{id}
  test_endpoint "PUT /feedings/{id}" "PUT" "/feedings/${FEEDING_ID}" '{"notes":"Nota atualizada"}' 200
else
  echo -e "${YELLOW}⏭️  Pulando PUT /feedings/{id} (nenhuma alimentação encontrada)${NC}"
fi

# ==================== FASE 3: STATISTICS ====================
echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}  FASE 3: Estatísticas${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"

test_endpoint "GET /statistics" "GET" "/statistics" "" 200
test_endpoint "GET /statistics?period=30dias" "GET" "/statistics?period=30dias" "" 200

# ==================== FASE 5: PROFILE ====================
echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}  FASE 5: Perfil Público${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"

if [ -n "$USER_ID" ] && [ "$USER_ID" != "unknown" ]; then
  # GET /api/v2/profile/{idOrUsername}
  test_endpoint "GET /profile/{idOrUsername}" "GET" "/profile/${USER_ID}" "" 200
  
  # PUT /api/v2/profile/{idOrUsername}
  test_endpoint "PUT /profile/{idOrUsername}" "PUT" "/profile/${USER_ID}" '{"full_name":"Nome Atualizado"}' 200
else
  echo -e "${YELLOW}⏭️  Pulando testes de perfil (user ID não disponível)${NC}"
fi

# ==================== FASE 6: HOUSEHOLDS JOIN ====================
echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}  FASE 6: Households Join${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"

# Este teste precisa de um código de convite válido
echo -e "${YELLOW}⏭️  Teste de POST /households/join requer código de convite válido${NC}"

# ==================== FASE 7: SCHEDULED NOTIFICATIONS ====================
echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}  FASE 7: Notificações Agendadas${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"

# GET /api/v2/scheduled-notifications
test_endpoint "GET /scheduled-notifications" "GET" "/scheduled-notifications" "" 200

# POST /api/v2/scheduled-notifications
FUTURE_DATE=$(date -u -d '+1 hour' +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v+1H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "")
if [ -n "$FUTURE_DATE" ]; then
  test_endpoint "POST /scheduled-notifications" "POST" "/scheduled-notifications" \
    "{\"type\":\"reminder\",\"title\":\"Teste\",\"message\":\"Mensagem de teste\",\"scheduledFor\":\"${FUTURE_DATE}\"}" 201
fi

# POST /api/v2/scheduled-notifications/deliver
test_endpoint "POST /scheduled-notifications/deliver" "POST" "/scheduled-notifications/deliver" "" 200

# ==================== RESUMO ====================
echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}  RESUMO DOS TESTES${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Testes passaram: ${TESTS_PASSED}${NC}"
echo -e "${RED}❌ Testes falharam: ${TESTS_FAILED}${NC}"
TOTAL=$((TESTS_PASSED + TESTS_FAILED))
if [ $TOTAL -gt 0 ]; then
  PERCENTAGE=$((TESTS_PASSED * 100 / TOTAL))
  echo -e "📊 Taxa de sucesso: ${PERCENTAGE}%"
fi

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}🎉 Todos os testes passaram!${NC}"
  exit 0
else
  echo -e "\n${RED}⚠️  Alguns testes falharam${NC}"
  exit 1
fi

