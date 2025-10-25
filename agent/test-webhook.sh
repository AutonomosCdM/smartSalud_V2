#!/bin/bash
# Test script for WhatsApp webhook handler
# Simulates Twilio webhook POST request

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 Testing WhatsApp Webhook Handler${NC}\n"

# Check if wrangler dev is running
echo -e "${YELLOW}📋 Prerequisites:${NC}"
echo "1. Start local dev server: npm run dev"
echo "2. Then run this script in another terminal"
echo ""
read -p "Press Enter when dev server is running..."

# Local dev server URL
WEBHOOK_URL="http://localhost:8787/webhook/whatsapp"

echo -e "\n${YELLOW}Test 1: CONFIRM intent${NC}"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+525512345678" \
  -d "Body=Sí, confirmo mi cita" \
  -d "MessageSid=SM123456789" \
  -w "\nHTTP Status: %{http_code}\n\n"

sleep 2

echo -e "${YELLOW}Test 2: CANCEL intent${NC}"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+525512345678" \
  -d "Body=No puedo asistir, necesito cancelar" \
  -d "MessageSid=SM123456790" \
  -w "\nHTTP Status: %{http_code}\n\n"

sleep 2

echo -e "${YELLOW}Test 3: RESCHEDULE intent${NC}"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+525512345678" \
  -d "Body=Cambiar la fecha por favor" \
  -d "MessageSid=SM123456791" \
  -w "\nHTTP Status: %{http_code}\n\n"

sleep 2

echo -e "${YELLOW}Test 4: UNKNOWN intent${NC}"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+525512345678" \
  -d "Body=Hola, buenos días" \
  -d "MessageSid=SM123456792" \
  -w "\nHTTP Status: %{http_code}\n\n"

sleep 2

echo -e "${YELLOW}Test 5: Check agent state${NC}"
curl -X GET "http://localhost:8787/agent/info" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n\n"

echo -e "\n${GREEN}✅ Webhook tests completed!${NC}"
echo -e "${YELLOW}Check the wrangler dev console for intent detection logs.${NC}"
