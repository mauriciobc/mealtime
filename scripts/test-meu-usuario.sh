#!/bin/bash

# Script para testar SEU usuário mauriciobc@gmail.com
# EDITE A LINHA ABAIXO COM SUA SENHA REAL!

EMAIL="mauriciobc@gmail.com"
SENHA="#M4ur1c10"

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║   🧪 TESTANDO API COM SEU USUÁRIO                                   ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📧 Email: $EMAIL"
echo "🔑 Senha: $(echo $SENHA | sed 's/./*/g')"
echo ""

if [ "$SENHA" = "COLOQUE_SUA_SENHA_AQUI" ]; then
  echo "❌ ERRO: Você precisa editar este script e colocar sua senha!"
  echo ""
  echo "📝 Abra o arquivo e edite a linha:"
  echo "   scripts/test-meu-usuario.sh"
  echo ""
  echo "   Procure por: SENHA=\"COLOQUE_SUA_SENHA_AQUI\""
  echo "   Mude para:   SENHA=\"suasenhareal\""
  echo ""
  exit 1
fi

cd /home/mauriciobc/Documentos/Code/mealtime

node scripts/test-mobile-auth.js "$EMAIL" "$SENHA"

