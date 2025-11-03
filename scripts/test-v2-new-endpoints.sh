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
  USER_ID_FROM_LOGIN=$(echo $RESPONSE | jq -r '.user.id // empty')
  
  if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo -e "${RED}❌ Falha ao fazer login${NC}"
    echo "Response: $RESPONSE"
    return 1
  fi
  
  echo -e "${GREEN}✅ Login realizado com sucesso${NC}"
  export AUTH_TOKEN="$TOKEN"
  export LOGGED_IN_USER_ID="$USER_ID_FROM_LOGIN"
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
  
  # Construir comando curl base com flags comuns e headers
  local curl_cmd=(curl -s -w "\n%{http_code}" -X "$method" \
    "${API_URL}${endpoint}" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json")
  
  # Adicionar -d apenas se data não estiver vazia
  if [ -n "$data" ]; then
    curl_cmd+=(-d "$data")
  fi
  
  # Executar curl em um único lugar
  "${curl_cmd[@]}"
}

# Função para testar endpoint
# Parâmetros:
#   $1: name - Nome do teste
#   $2: method - Método HTTP (GET, POST, PUT, etc)
#   $3: endpoint - Caminho do endpoint
#   $4: data - Dados JSON opcionais para enviar
#   $5: expected_status - Status HTTP esperado (padrão: 200)
#   $6: expected_success - Se definido, exige .success == "true" explicitamente (padrão: sempre exigido)
#                          Este parâmetro documenta a expectativa e pode ser usado para casos especiais futuros
#   $7: allow_404 - Se "true", permite 404 como sucesso mesmo sem verificação de success (padrão: false)
#                    Use apenas para endpoints que intencionalmente podem retornar 404
test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=${4:-""}
  local expected_status=${5:-200}
  local expected_success=${6:-""}
  local allow_404=${7:-"false"}
  
  echo -e "\n${YELLOW}🧪 Testando: ${name}${NC}"
  echo "   ${method} ${API_URL}${endpoint}"
  
  RESPONSE=$(api_request "$method" "$endpoint" "$data")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  # Verifica status HTTP
  if [ "$HTTP_CODE" -eq "$expected_status" ]; then
    SUCCESS=$(echo "$BODY" | jq -r '.success // empty')
    
    # Exceção: Se allow_404 está ativado e recebeu 404, considera sucesso (ignora verificação de success)
    if [ "$HTTP_CODE" == "404" ] && [ "$allow_404" == "true" ]; then
      echo -e "${GREEN}✅ Passou (${HTTP_CODE}) - 404 permitido explicitamente${NC}"
      TESTS_PASSED=$((TESTS_PASSED + 1))
      if [ "$VERBOSE" == "1" ]; then
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
      fi
      return 0
    fi
    
    # Regra padrão: 404 sempre é falha a menos que allow_404 esteja ativado
    if [ "$HTTP_CODE" == "404" ]; then
      echo -e "${RED}❌ Falhou: Recebido 404 (não esperado)${NC}"
      echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
      TESTS_FAILED=$((TESTS_FAILED + 1))
      return 1
    fi
    
    # Verificação de success: exige .success == "true" explicitamente
    # Se expected_success está definido OU comportamento padrão, ambos exigem success=true
    if [ "$SUCCESS" == "true" ]; then
      echo -e "${GREEN}✅ Passou (${HTTP_CODE})${NC}"
      TESTS_PASSED=$((TESTS_PASSED + 1))
      if [ "$VERBOSE" == "1" ]; then
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
      fi
      return 0
    else
      echo -e "${RED}❌ Falhou: Esperado success=true, mas recebido success=\"${SUCCESS}\" (vazio/ausente tratado como falha)${NC}"
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
if [ -n "$LOGGED_IN_USER_ID" ]; then
  USER_RESPONSE=$(api_request "GET" "/users/${LOGGED_IN_USER_ID}")
  USER_ID=$(echo "$USER_RESPONSE" | jq -r '.data.id // .id // empty')
else
  USER_RESPONSE=""
  USER_ID=""
fi

# Fallback: extrair de HOUSEHOLDS_RESPONSE se necessário
if [ -z "$USER_ID" ] || [ "$USER_ID" == "null" ]; then
  USER_ID=$(echo "$HOUSEHOLDS_RESPONSE" | jq -r '.data[0].owner_id // empty')
fi

# Definir como "unknown" apenas se ambos falharam
if [ -z "$USER_ID" ] || [ "$USER_ID" == "null" ]; then
  USER_ID="unknown"
fi

echo "Household ID: ${HOUSEHOLD_ID:-N/A}"
echo "Cat ID: ${CAT_ID:-N/A}"
echo "Feeding ID: ${FEEDING_ID:-N/A}"
echo "User ID: ${USER_ID:-N/A}"

# ==================== FASE 1: CATS ====================
echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}  FASE 1: Gatos (Cats)${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"

if [ -n "$CAT_ID" ]; then
  # GET /api/v2/cats/{catId} - Exige success=true explicitamente
  test_endpoint "GET /cats/{catId}" "GET" "/cats/${CAT_ID}" "" 200 "true"
  
  # PUT /api/v2/cats/{catId} - Exige success=true explicitamente
  test_endpoint "PUT /cats/{catId}" "PUT" "/cats/${CAT_ID}" '{"name":"Gato Atualizado"}' 200 "true"
  
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
  # PUT /api/v2/feedings/{id} - Exige success=true explicitamente
  test_endpoint "PUT /feedings/{id}" "PUT" "/feedings/${FEEDING_ID}" '{"notes":"Nota atualizada"}' 200 "true"
  
  # Testes de validação do campo amount
  echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
  echo -e "${YELLOW}  Testes de Validação: Campo amount${NC}"
  echo -e "${YELLOW}═══════════════════════════════════════${NC}"
  
  # Teste 1: null deve ser rejeitado (400 Bad Request)
  echo -e "\n${YELLOW}🧪 Testando: PUT /feedings/{id} com amount=null (deve falhar)${NC}"
  RESPONSE=$(api_request "PUT" "/feedings/${FEEDING_ID}" '{"amount":null}')
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  if [ "$HTTP_CODE" -eq 400 ]; then
    echo -e "${GREEN}✅ Teste passou: null foi rejeitado corretamente${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}❌ Teste falhou: null deveria ser rejeitado (esperado 400, recebido ${HTTP_CODE})${NC}"
    echo "Response: $(echo "$RESPONSE" | sed '$d')"
    ((TESTS_FAILED++))
  fi
  
  # Teste 2: número positivo deve ser aceito (200 OK)
  test_endpoint "PUT /feedings/{id} com amount positivo" "PUT" "/feedings/${FEEDING_ID}" '{"amount":150.5}' 200 "true"
  
  # Teste 3: número zero deve ser rejeitado (400 Bad Request)
  echo -e "\n${YELLOW}🧪 Testando: PUT /feedings/{id} com amount=0 (deve falhar)${NC}"
  RESPONSE=$(api_request "PUT" "/feedings/${FEEDING_ID}" '{"amount":0}')
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  if [ "$HTTP_CODE" -eq 400 ]; then
    echo -e "${GREEN}✅ Teste passou: 0 foi rejeitado corretamente${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}❌ Teste falhou: 0 deveria ser rejeitado (esperado 400, recebido ${HTTP_CODE})${NC}"
    echo "Response: $(echo "$RESPONSE" | sed '$d')"
    ((TESTS_FAILED++))
  fi
  
  # Teste 4: número negativo deve ser rejeitado (400 Bad Request)
  echo -e "\n${YELLOW}🧪 Testando: PUT /feedings/{id} com amount negativo (deve falhar)${NC}"
  RESPONSE=$(api_request "PUT" "/feedings/${FEEDING_ID}" '{"amount":-10}')
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  if [ "$HTTP_CODE" -eq 400 ]; then
    echo -e "${GREEN}✅ Teste passou: número negativo foi rejeitado corretamente${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}❌ Teste falhou: número negativo deveria ser rejeitado (esperado 400, recebido ${HTTP_CODE})${NC}"
    echo "Response: $(echo "$RESPONSE" | sed '$d')"
    ((TESTS_FAILED++))
  fi
  
  # Teste 5: omitir amount deve ser permitido (200 OK) - atualizar apenas outros campos
  test_endpoint "PUT /feedings/{id} sem amount" "PUT" "/feedings/${FEEDING_ID}" '{"notes":"Sem amount"}' 200 "true"
else
  echo -e "${YELLOW}⏭️  Pulando PUT /feedings/{id} (nenhuma alimentação encontrada)${NC}"
fi

# ==================== FASE 3: STATISTICS ====================
echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}  FASE 3: Estatísticas${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"

# GET /api/v2/statistics - Exige success=true explicitamente
test_endpoint "GET /statistics" "GET" "/statistics" "" 200 "true"
# GET /api/v2/statistics?period=30dias - Exige success=true explicitamente
test_endpoint "GET /statistics?period=30dias" "GET" "/statistics?period=30dias" "" 200 "true"

# ==================== FASE 5: PROFILE ====================
echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}  FASE 5: Perfil Público${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"

if [ -n "$USER_ID" ] && [ "$USER_ID" != "unknown" ]; then
  # GET /api/v2/profile/{idOrUsername} - Exige success=true explicitamente
  test_endpoint "GET /profile/{idOrUsername}" "GET" "/profile/${USER_ID}" "" 200 "true"
  
  # PUT /api/v2/profile/{idOrUsername} - Exige success=true explicitamente
  test_endpoint "PUT /profile/{idOrUsername}" "PUT" "/profile/${USER_ID}" '{"full_name":"Nome Atualizado"}' 200 "true"
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

# GET /api/v2/scheduled-notifications - Exige success=true explicitamente
test_endpoint "GET /scheduled-notifications" "GET" "/scheduled-notifications" "" 200 "true"

# POST /api/v2/scheduled-notifications - Exige success=true explicitamente
FUTURE_DATE=$(date -u -d '+1 hour' +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v+1H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "")
if [ -n "$FUTURE_DATE" ]; then
  test_endpoint "POST /scheduled-notifications" "POST" "/scheduled-notifications" \
    "{\"type\":\"reminder\",\"title\":\"Teste\",\"message\":\"Mensagem de teste\",\"scheduledFor\":\"${FUTURE_DATE}\"}" 201 "true"
fi

# POST /api/v2/scheduled-notifications/deliver - Exige success=true explicitamente
test_endpoint "POST /scheduled-notifications/deliver" "POST" "/scheduled-notifications/deliver" "" 200 "true"

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

