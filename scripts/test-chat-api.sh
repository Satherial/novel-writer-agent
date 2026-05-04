#!/bin/bash

# Script per testare l'API di chat e verificare il tool calling

echo "=== TEST CHAT API WITH TOOL CALLING ==="
echo ""

# Leggi il token di sessione (questo è un placeholder - in produzione useresti un vero token)
read -p "Inserisci il tuo user ID (o premi Enter per generarne uno): " USER_ID
USER_ID=${USER_ID:-"test-user-123"}

read -p "Inserisci token di sessione (oppure Enter): " SESSION_TOKEN
SESSION_TOKEN=${SESSION_TOKEN:-"test-token"}

# Test 1: Chiedi di elencare i progetti
echo ""
echo "--- TEST 1: Listare i progetti ---"
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=$SESSION_TOKEN" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Elencami i miei progetti"
      }
    ],
    "projectId": null,
    "saveToDb": false
  }' \
  2>&1 | head -100

echo ""
echo ""
echo "--- TEST 2: Listare i file di un progetto ---"
read -p "Inserisci un project ID da testare (o premi Enter per saltare): " PROJECT_ID

if [ -n "$PROJECT_ID" ]; then
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -H "Cookie: next-auth.session-token=$SESSION_TOKEN" \
    -d "{
      \"messages\": [
        {
          \"role\": \"user\",
          \"content\": \"Quali file ho in questo progetto?\"
        }
      ],
      \"projectId\": \"$PROJECT_ID\",
      \"saveToDb\": false
    }" \
    2>&1 | head -100
fi

echo ""
echo "=== VERIFICA I LOG DEL SERVER PER: ==="
echo "  [Chat API] ⚡ TOOL CALL RILEVATO!"
echo "  [Tool] listUserProjects called"
echo "  [Tool] listProjectFiles called"
