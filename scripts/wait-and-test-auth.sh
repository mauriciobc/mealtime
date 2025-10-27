#!/bin/bash

# Script que aguarda o servidor dev iniciar e então executa os testes

echo "🔄 Aguardando o servidor inicializar em http://localhost:3000..."
echo ""

# Aguardar até 60 segundos para o servidor iniciar
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Servidor está rodando!"
    echo ""
    sleep 2  # Aguardar mais 2 segundos para garantir que está totalmente inicializado
    break
  fi
  
  ATTEMPT=$((ATTEMPT + 1))
  echo "⏳ Tentativa $ATTEMPT/$MAX_ATTEMPTS..."
  sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo "❌ Timeout: Servidor não iniciou em tempo hábil"
  exit 1
fi

# Executar o script de teste
echo "🚀 Iniciando testes da API..."
echo ""

# Verificar se foram passados email e senha como argumentos
if [ $# -eq 2 ]; then
  node /home/mauriciobc/Documentos/Code/mealtime/scripts/test-mobile-auth.js "$1" "$2"
else
  node /home/mauriciobc/Documentos/Code/mealtime/scripts/test-mobile-auth.js
fi

