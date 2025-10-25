#!/bin/bash
# Test script for local smartSalud agent development

echo "🧪 Testing smartSalud Agent locally..."
echo ""

# Test 1: Health check
echo "1️⃣ Testing health endpoint..."
curl -s http://localhost:8787/health | jq .
echo ""

# Test 2: Agent info
echo "2️⃣ Testing agent info endpoint..."
curl -s http://localhost:8787/agent/info | jq .
echo ""

# Test 3: Intent detection - Confirm
echo "3️⃣ Testing intent detection (CONFIRM)..."
curl -s -X POST http://localhost:8787/agent/message \
  -H "Content-Type: application/json" \
  -d '{"from": "+5215512345678", "message": "Sí, confirmo mi cita"}' | jq .
echo ""

# Test 4: Intent detection - Cancel
echo "4️⃣ Testing intent detection (CANCEL)..."
curl -s -X POST http://localhost:8787/agent/message \
  -H "Content-Type: application/json" \
  -d '{"from": "+5215512345678", "message": "No puedo, necesito cancelar"}' | jq .
echo ""

# Test 5: Intent detection - Reschedule
echo "5️⃣ Testing intent detection (RESCHEDULE)..."
curl -s -X POST http://localhost:8787/agent/message \
  -H "Content-Type: application/json" \
  -d '{"from": "+5215512345678", "message": "Quiero cambiar la fecha"}' | jq .
echo ""

echo "✅ Local testing complete!"
