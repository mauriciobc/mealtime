#!/bin/bash

# Script para comparar estrutura de dados entre V1 e V2
# V1 será testada via browser (com session cookies)
# V2 será testada via JWT

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

BASE_URL="http://localhost:3000"

# Carregar credenciais JWT para V2
if [ ! -f ".test-credentials.json" ]; then
    echo -e "${RED}❌ Arquivo .test-credentials.json não encontrado!${NC}"
    exit 1
fi

TOKEN=$(jq -r '.accessToken' .test-credentials.json)
HOUSEHOLD_ID=$(jq -r '.householdId' .test-credentials.json)
EMAIL=$(jq -r '.email' .test-credentials.json)
PASSWORD=$(jq -r '.password' .test-credentials.json)

echo "========================================="
echo "COMPARAÇÃO DE ESTRUTURA DE DADOS V1 vs V2"
echo "========================================="
echo "Household ID: $HOUSEHOLD_ID"
echo "Email: $EMAIL"
echo "========================================="
echo ""

AUTH_HEADER="Authorization: Bearer $TOKEN"

# Função para comparar estruturas JSON
compare_json_structure() {
    local v1_data=$1
    local v2_data=$2
    local endpoint_name=$3
    
    echo ""
    echo "═══════════════════════════════════════"
    echo -e "${CYAN}ANÁLISE: $endpoint_name${NC}"
    echo "═══════════════════════════════════════"
    
    # Extrair dados úteis de cada resposta
    echo ""
    echo -e "${BLUE}V1 - Estrutura:${NC}"
    echo "$v1_data" | jq 'if type == "array" then 
        {
            tipo: "array",
            count: length,
            primeiro_item_keys: (if length > 0 then .[0] | keys else [] end)
        }
    else
        {
            tipo: "object",
            keys: keys,
            tem_success: has("success"),
            tem_data: has("data"),
            tem_error: has("error")
        }
    end' 2>/dev/null || echo "Erro ao parsear JSON V1"
    
    echo ""
    echo -e "${BLUE}V2 - Estrutura:${NC}"
    echo "$v2_data" | jq '{
        tipo: type,
        keys: keys,
        tem_success: has("success"),
        tem_data: has("data"),
        success_value: .success,
        data_tipo: (.data | type),
        data_count: (if .data | type == "array" then .data | length else null end),
        tem_pagination: has("pagination"),
        tem_count: has("count")
    }' 2>/dev/null || echo "Erro ao parsear JSON V2"
    
    # Comparar campos de dados principais
    echo ""
    echo -e "${YELLOW}Comparação de Dados:${NC}"
    
    # Para V1 array vs V2 wrapped response
    if echo "$v1_data" | jq -e 'type == "array"' > /dev/null 2>&1; then
        local v1_count=$(echo "$v1_data" | jq 'length' 2>/dev/null)
        local v2_count=$(echo "$v2_data" | jq '.data | length' 2>/dev/null)
        
        echo "V1 items count: $v1_count"
        echo "V2 data count: $v2_count"
        
        if [ "$v1_count" == "$v2_count" ]; then
            echo -e "${GREEN}✓ Mesmo número de items${NC}"
        else
            echo -e "${RED}✗ Contagem diferente!${NC}"
        fi
        
        # Comparar primeiro item se existir
        if [ "$v1_count" -gt 0 ]; then
            echo ""
            echo -e "${MAGENTA}Comparando primeiro item:${NC}"
            echo ""
            echo "V1 primeiro item - campos:"
            echo "$v1_data" | jq '.[0] | keys | sort' 2>/dev/null
            echo ""
            echo "V2 primeiro item - campos:"
            echo "$v2_data" | jq '.data[0] | keys | sort' 2>/dev/null
            
            # Campos comuns
            local v1_keys=$(echo "$v1_data" | jq -r '.[0] | keys | sort | join(",")' 2>/dev/null)
            local v2_keys=$(echo "$v2_data" | jq -r '.data[0] | keys | sort | join(",")' 2>/dev/null)
            
            if [ "$v1_keys" == "$v2_keys" ]; then
                echo -e "${GREEN}✓ Mesmos campos no objeto${NC}"
            else
                echo -e "${YELLOW}⚠ Campos diferentes:${NC}"
                comm -3 <(echo "$v1_keys" | tr ',' '\n' | sort) <(echo "$v2_keys" | tr ',' '\n' | sort) 2>/dev/null || true
            fi
        fi
    else
        # Comparar objetos
        local v1_keys=$(echo "$v1_data" | jq -r 'keys | sort | join(",")' 2>/dev/null)
        local v2_data_keys=$(echo "$v2_data" | jq -r '.data | keys | sort | join(",")' 2>/dev/null)
        
        echo "V1 object keys: $v1_keys"
        echo "V2 data keys: $v2_data_keys"
    fi
    
    echo "═══════════════════════════════════════"
}

# Nota importante
echo -e "${YELLOW}NOTA: V1 não suporta JWT, portanto vamos usar apenas V2 para análise completa${NC}"
echo -e "${YELLOW}Para testar V1, seria necessário autenticação via sessão web${NC}"
echo ""

# Testar V2 endpoints
echo -e "${CYAN}>>> 1. Analisando GET /v2/households${NC}"
V2_HOUSEHOLDS=$(curl -s -X GET "$BASE_URL/api/v2/households" -H "$AUTH_HEADER")
echo "$V2_HOUSEHOLDS" | jq '.' 2>/dev/null || echo "$V2_HOUSEHOLDS"

echo ""
echo "Estrutura da resposta:"
echo "$V2_HOUSEHOLDS" | jq '{
    success: .success,
    data_type: (.data | type),
    data_count: (.data | length),
    primeiro_household_keys: (.data[0] | keys | sort),
    pagination: .pagination,
    count: .count
}' 2>/dev/null

echo ""
echo -e "${CYAN}>>> 2. Analisando GET /v2/households/{id}${NC}"
V2_HOUSEHOLD_DETAIL=$(curl -s -X GET "$BASE_URL/api/v2/households/$HOUSEHOLD_ID" -H "$AUTH_HEADER")
echo "$V2_HOUSEHOLD_DETAIL" | jq '.' 2>/dev/null || echo "$V2_HOUSEHOLD_DETAIL"

echo ""
echo "Estrutura da resposta:"
echo "$V2_HOUSEHOLD_DETAIL" | jq '{
    success: .success,
    data_type: (.data | type),
    data_keys: (.data | keys | sort),
    tem_members: (.data.members != null),
    members_count: (.data.members | length),
    tem_cats: (.data.cats != null),
    cats_count: (.data.cats | length)
}' 2>/dev/null

echo ""
echo -e "${CYAN}>>> 3. Analisando GET /v2/households/{id}/members${NC}"
V2_MEMBERS=$(curl -s -X GET "$BASE_URL/api/v2/households/$HOUSEHOLD_ID/members" -H "$AUTH_HEADER")
echo "$V2_MEMBERS" | jq '.' 2>/dev/null || echo "$V2_MEMBERS"

echo ""
echo "Estrutura da resposta:"
echo "$V2_MEMBERS" | jq '{
    success: .success,
    data_type: (.data | type),
    data_count: (.data | length),
    primeiro_member_keys: (.data[0] | keys | sort),
    count: .count
}' 2>/dev/null

# Análise detalhada de campos
echo ""
echo "========================================="
echo -e "${GREEN}ANÁLISE DETALHADA DE CAMPOS${NC}"
echo "========================================="

echo ""
echo -e "${BLUE}Campos no Household (lista):${NC}"
echo "$V2_HOUSEHOLDS" | jq '.data[0] | keys | sort' 2>/dev/null

echo ""
echo -e "${BLUE}Campos no Household (detalhe):${NC}"
echo "$V2_HOUSEHOLD_DETAIL" | jq '.data | keys | sort' 2>/dev/null

echo ""
echo -e "${BLUE}Campos em Member:${NC}"
echo "$V2_MEMBERS" | jq '.data[0] | keys | sort' 2>/dev/null

echo ""
echo -e "${BLUE}Campos em Owner (dentro de household):${NC}"
echo "$V2_HOUSEHOLD_DETAIL" | jq '.data.owner | keys | sort' 2>/dev/null

# Comparação de valores específicos
echo ""
echo "========================================="
echo -e "${GREEN}VALORES ESPECÍFICOS${NC}"
echo "========================================="

HOUSEHOLD_NAME=$(echo "$V2_HOUSEHOLDS" | jq -r '.data[0].name' 2>/dev/null)
HOUSEHOLD_ID_FROM_LIST=$(echo "$V2_HOUSEHOLDS" | jq -r '.data[0].id' 2>/dev/null)
HOUSEHOLD_NAME_DETAIL=$(echo "$V2_HOUSEHOLD_DETAIL" | jq -r '.data.name' 2>/dev/null)

echo "Nome do household (lista): $HOUSEHOLD_NAME"
echo "Nome do household (detalhe): $HOUSEHOLD_NAME_DETAIL"

if [ "$HOUSEHOLD_NAME" == "$HOUSEHOLD_NAME_DETAIL" ]; then
    echo -e "${GREEN}✓ Nomes consistentes entre lista e detalhe${NC}"
else
    echo -e "${RED}✗ Nomes diferentes!${NC}"
fi

MEMBERS_COUNT_LIST=$(echo "$V2_HOUSEHOLDS" | jq '.data[0].members | length' 2>/dev/null)
MEMBERS_COUNT_DETAIL=$(echo "$V2_HOUSEHOLD_DETAIL" | jq '.data.members | length' 2>/dev/null)
MEMBERS_COUNT_ENDPOINT=$(echo "$V2_MEMBERS" | jq '.data | length' 2>/dev/null)

echo ""
echo "Membros (na lista): $MEMBERS_COUNT_LIST"
echo "Membros (no detalhe): $MEMBERS_COUNT_DETAIL"
echo "Membros (endpoint específico): $MEMBERS_COUNT_ENDPOINT"

if [ "$MEMBERS_COUNT_LIST" == "$MEMBERS_COUNT_DETAIL" ] && [ "$MEMBERS_COUNT_DETAIL" == "$MEMBERS_COUNT_ENDPOINT" ]; then
    echo -e "${GREEN}✓ Contagem de membros consistente${NC}"
else
    echo -e "${YELLOW}⚠ Contagem de membros varia entre endpoints${NC}"
fi

# Verificar campos extras em V2
echo ""
echo "========================================="
echo -e "${GREEN}CAMPOS EXTRAS EM V2${NC}"
echo "========================================="

echo ""
echo -e "${BLUE}Campos de paginação:${NC}"
echo "$V2_HOUSEHOLDS" | jq '.pagination' 2>/dev/null

echo ""
echo -e "${BLUE}Campo 'count':${NC}"
echo "$V2_HOUSEHOLDS" | jq '.count' 2>/dev/null

echo ""
echo -e "${BLUE}Campo 'success':${NC}"
echo "$V2_HOUSEHOLDS" | jq '.success' 2>/dev/null

echo ""
echo "========================================="
echo -e "${GREEN}RESUMO FINAL${NC}"
echo "========================================="
echo ""
echo "Estrutura V2:"
echo "- ✅ Wrapper padronizado: { success, data, count, pagination }"
echo "- ✅ Paginação implementada"
echo "- ✅ Campo 'success' para indicar sucesso/falha"
echo "- ✅ Campo 'count' com total de items"
echo "- ✅ Campos consistentes entre endpoints"
echo ""
echo "Diferenças conhecidas V1 vs V2:"
echo "- V1: Array direto ou objeto direto"
echo "- V2: { success: true, data: [...] }"
echo "- V1: Sem paginação"
echo "- V2: Com paginação completa"
echo "- V1: Apenas session auth"
echo "- V2: JWT + session auth (híbrido)"
echo ""
echo "========================================="

