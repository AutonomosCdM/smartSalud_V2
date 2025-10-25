#!/bin/bash

# Test script for Phase 2 Durable Workflow
# Tests the 8-step appointment confirmation workflow

BASE_URL="http://localhost:8787"
PATIENT_PHONE="+5215512345678"

echo "🧪 Testing Phase 2: Durable Workflow"
echo "===================================="
echo ""

# Test 1: Start a workflow
echo "📝 Test 1: Starting workflow..."
WORKFLOW_START=$(curl -s -X POST "${BASE_URL}/agent/${PATIENT_PHONE}/workflow/start" \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "test-apt-001",
    "patientPhone": "+5215512345678",
    "appointmentDetails": {
      "doctorName": "Dr. María González",
      "doctorId": "doc-001",
      "date": "2025-10-27",
      "time": "14:30",
      "dateTime": "2025-10-27 14:30",
      "specialty": "Cardiología",
      "patientId": "pat-001"
    }
  }')

echo "Response:"
echo "$WORKFLOW_START" | jq '.'
echo ""

# Extract workflow ID
WORKFLOW_ID=$(echo "$WORKFLOW_START" | jq -r '.workflowId')
echo "Workflow ID: $WORKFLOW_ID"
echo ""

sleep 2

# Test 2: Check workflow status
echo "📊 Test 2: Checking workflow status..."
WORKFLOW_STATUS=$(curl -s "${BASE_URL}/agent/${PATIENT_PHONE}/workflow/status")
echo "Response:"
echo "$WORKFLOW_STATUS" | jq '.'
echo ""

sleep 2

# Test 3: Simulate patient CONFIRM response
echo "✅ Test 3: Patient confirms appointment..."
CONFIRM_RESPONSE=$(curl -s -X POST "${BASE_URL}/agent/${PATIENT_PHONE}/message" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+5215512345678",
    "message": "Sí, confirmo mi cita",
    "messageSid": "SM_test_001"
  }')

echo "Response:"
echo "$CONFIRM_RESPONSE" | jq '.'
echo ""

sleep 2

# Test 4: Check final workflow status
echo "🏁 Test 4: Checking final workflow status..."
FINAL_STATUS=$(curl -s "${BASE_URL}/agent/${PATIENT_PHONE}/workflow/status")
echo "Response:"
echo "$FINAL_STATUS" | jq '.'
echo ""

echo "===================================="
echo "✅ Workflow test completed!"
echo ""
echo "Expected behavior:"
echo "1. Workflow starts and sends initial reminder (Step 1)"
echo "2. Workflow enters WAITING state (Step 2)"
echo "3. Patient confirms - workflow processes response"
echo "4. Workflow completes with outcome: CONFIRMED"
echo ""
echo "Check logs above for:"
echo "- 🚀 Workflow started"
echo "- 📍 Executing steps"
echo "- 📨 Patient response received"
echo "- 🏁 Workflow completed"
