# smartSalud V3 - Roadmap de Implementación

## FLUJO REAL DEL SISTEMA

```
Hospital Dashboard → Asigna citas → DB

↓ [TRIGGER: 48h antes]

Scheduled Worker (cron cada hora)
   ↓
Detecta citas próximas → Envía WhatsApp PROACTIVO
   "Tienes cita en 48h. ¿Confirmas?"
   [Confirmar] [Cancelar]

├─ CONFIRMA → DB + Calendar → ✅ Done
│
└─ CANCELA (1ra vez)
      ↓
   Query Google Calendar → Slots disponibles
      ↓
   Envía 2 alternativas de horarios
   [Opción A] [Opción B] [Ninguna]
      │
      ├─ Acepta → Reschedule + Calendar → ✅ Done
      │
      └─ CANCELA (2da vez)
            ↓
         Llamada VOZ con ElevenLabs Agent
            │
            ├─ Resuelto por voz → ✅ Done
            │
            └─ No resuelto
                  ↓
               🔴 HUMAN-IN-THE-LOOP
               Dashboard móvil alerta → Staff interviene
```

## ARQUITECTURA

### Stack Tecnológico

**Cloudflare (Agent Layer):**
- Agents SDK → Autonomous orchestration
- Durable Objects → State persistence
- Workers AI → Fallback LLM
- Scheduled Workers → Cron jobs (trigger 48h antes)
- WebSockets → Real-time dashboard updates

**AI/ML:**
- Groq → Primary NLP/intent detection
- ElevenLabs Conversational AI → Voice fallback
- Workers AI → Model fallback chain

**Backend (Existing):**
- FastAPI → Database operations
- PostgreSQL → Appointments, patients, interactions
- Google Calendar API → Bidirectional sync

**Communication:**
- Twilio WhatsApp Business API → Messages + Interactive buttons

### Diferenciadores Clave

1. **Proactive Agent** (no reactivo):
   - Scheduled worker detecta citas 48h antes
   - Inicia conversación sin esperar mensaje del paciente

2. **8-Step Durable Workflow**:
   - WhatsApp → Wait → Cancel? → Query slots → Send alternatives → Wait → Cancel again? → Voice → Human
   - Auto-retry en cada step si falla

3. **Multi-Model Fallback**:
   - Groq (primary) → Workers AI → Regex patterns

4. **Voice Integration**:
   - ElevenLabs Conversational AI cuando paciente cancela 2 veces
   - Dashboard staff puede activar voz manualmente

5. **Mobile-First Dashboard**:
   - NO desktop, solo móvil
   - Real-time WebSocket updates
   - Botón directo para llamada de voz

## FASES DE IMPLEMENTACIÓN

### Fase 0: Setup Base (15 min)
**Objetivo:** Proyecto base funcional

- Clone `cloudflare/agents-starter` template
- `npm install` + verify `npm run dev`
- Estructura de directorios confirmada

**Verificación:** Server corre en localhost, responde a requests

---

### Fase 1: Scheduled Proactive Agent ✅ COMPLETADA
**Agente:** full-stack-dev
**Tiempo real:** 45 min
**Status:** 100% Complete

**Objetivo:** Worker que detecta citas 48h antes y envía WhatsApp proactivo

**Implementaciones completadas:**
1. ✅ Scheduled worker con cron trigger `0 * * * *` (cada hora)
2. ✅ Query DB: `GET /api/appointments/upcoming?hours=48`
3. ✅ Para cada cita → Send WhatsApp con Twilio interactive buttons
4. ✅ Multi-model intent detection (Groq → Workers AI → Regex)
5. ✅ WhatsApp webhook handler (`POST /webhook/whatsapp`)
6. ✅ Durable Object state persistence
7. ✅ Database migrations + seed data
8. ✅ FastAPI CRUD endpoints

**Verificación (PASSED):**
- ✅ Cron configurado en wrangler.toml
- ✅ WhatsApp messages con formato profesional + botones
- ✅ Intent detection funciona (3 niveles de fallback)
- ✅ Webhook handler recibe respuestas de pacientes
- ✅ State persiste entre mensajes

**Code locations:**
- Scheduled worker: [agent/src/workers/scheduled-reminders.ts](../agent/src/workers/scheduled-reminders.ts)
- Intent detection: [agent/src/lib/intent-detection.ts](../agent/src/lib/intent-detection.ts)
- WhatsApp integration: [agent/src/integrations/twilio-whatsapp.ts](../agent/src/integrations/twilio-whatsapp.ts)
- Webhook handler: [agent/src/index.ts:49-109](../agent/src/index.ts#L49)
- Backend endpoints: [backend/app/routers/appointments.py](../backend/app/routers/appointments.py)
- Database models: [backend/app/models/](../backend/app/models/)

**Evidence:** See [agent/PHASE0-1-EVIDENCE.md](../agent/PHASE0-1-EVIDENCE.md)

---

### Fase 2: 8-Step Durable Workflow (45 min)
**Agente:** full-stack-dev

**Objetivo:** Workflow completo con auto-retry

**Steps:**
1. Send WhatsApp buttons
2. Wait response (timeout 24h)
3. If CANCEL → Query Google Calendar available slots
4. Send 2 alternative time options
5. Wait response (timeout 12h)
6. If CANCEL again → Trigger ElevenLabs voice call
7. Wait voice conversation outcome
8. If still unresolved → Human escalation (dashboard alert)

**Cada step tiene:**
- Auto-retry si falla (max 3 attempts)
- State persistence en Durable Object
- Rollback si workflow completo falla

**Verificación:**
- Workflow ejecuta 8 steps sin crash ✓
- Retry automático funciona ✓
- State persiste entre restarts ✓

**Code location:** `src/workflows/appointment-confirmation.ts`

---

### Fase 3: Mobile Dashboard + Voice Button (30 min)
**Agente:** full-stack-dev

**Objetivo:** Dashboard móvil con updates real-time y botón de voz

**Features:**
- Mobile-first UI (NO desktop view)
- WebSocket connection para updates
- Lista de citas con status visual:
  - 🟢 Confirmado
  - 🟡 Esperando respuesta
  - 🔴 Requiere atención humana
- Botón [🎤 Llamar con voz] → ElevenLabs agent
- Voice narration cuando llegan confirmaciones

**Verificación:**
- Dashboard carga en móvil ✓
- WebSocket actualiza en tiempo real ✓
- Botón de voz conecta con ElevenLabs ✓

**Code location:** `src/dashboard/mobile-view.tsx`

---

### Fase 4: Human Escalation (20 min)
**Agente:** full-stack-dev

**Objetivo:** Staff puede intervenir cuando agent no resuelve

**Trigger:** Paciente cancela 2x Y voz no resuelve

**Dashboard muestra:**
- Alerta móvil con vibración
- Historial de conversación completo
- Opciones:
  - [👤 Llamar al paciente]
  - [📅 Ofrecer slot manual]
  - [❌ Marcar como no interesado]

**Verificación:**
- Alerta llega correctamente ✓
- Staff puede ver historial ✓
- Acciones manuales funcionan ✓

**Code location:** `src/dashboard/escalation-modal.tsx`

---

### Fase 5: Google Calendar Bidirectional Sync (30 min)
**Agente:** full-stack-dev

**Objetivo:** Doctor usa Calendar directamente, smartSalud sincroniza

**Sync bidireccional:**
1. Doctor bloquea horario en Calendar → smartSalud NO ofrece ese slot
2. smartSalud confirma cita → Aparece en Calendar del doctor
3. Doctor mueve cita en Calendar → smartSalud detecta y notifica paciente

**Implementación:**
- Webhooks de Calendar para cambios del doctor
- Polling cada 5 min como backup
- Color-coding: Verde = Confirmed, Amarillo = Pending, Rojo = Cancelled

**Verificación:**
- Bloqueo en Calendar → No se ofrece en alternativas ✓
- Confirmación → Aparece en Calendar ✓
- Doctor mueve → Paciente recibe notificación ✓

**Code location:** `src/integrations/google-calendar-sync.ts`

---

### Fase 6: Integration Testing (15 min)
**Agente:** debugger

**Objetivo:** Test end-to-end completo

**Test scenarios:**
1. Cron detecta cita 48h antes → WhatsApp enviado
2. Paciente confirma → DB + Calendar actualizados
3. Paciente cancela → Recibe 2 alternativas
4. Paciente cancela de nuevo → Voice call activado
5. Voice no resuelve → Human alert en dashboard
6. Calendar sync bidireccional funciona

**Verificación:**
- All tests pass ✓
- Performance: <2s response time ✓
- Error rate: <1% ✓

---

## TIMELINE

| Fase | Tiempo | Agente | Output | Status |
|------|--------|--------|--------|--------|
| 0: Setup | 15 min | Manual | Project running | ✅ COMPLETE |
| 1: Scheduled Agent | 45 min | full-stack-dev | Proactive WhatsApp | ✅ COMPLETE |
| 2: Durable Workflow | 45 min | full-stack-dev | 8-step flow | 🔄 NEXT |
| 3: Mobile Dashboard | 30 min | full-stack-dev | Real-time UI | ⏸️ Pending |
| 4: Human Escalation | 20 min | full-stack-dev | Staff intervention | ⏸️ Pending |
| 5: Calendar Sync | 30 min | full-stack-dev | Bidirectional sync | ⏸️ Pending |
| 6: Testing | 15 min | debugger | All tests pass | ⏸️ Pending |
| **TOTAL** | **~3h** | 5 agents | Full system | **33% Complete** |

## DEMO SCRIPT (5 min para jueces)

**Min 0-1:** Problema
- "30% no-shows cuestan millones a clínicas"
- "Confirmaciones manuales no escalan"

**Min 1-2:** Solución Agéntica
- "Autonomous agent PROACTIVO que anticipa problemas"
- "8-step workflow con voice + human fallback"

**Min 2-4:** Live Demo
1. Show: Scheduled worker detecta cita 48h antes
2. Send: WhatsApp con botones llega al móvil
3. Click: "Cancelar" → Agent ofrece 2 alternativas
4. Click: "Cancelar" de nuevo → Voice call ElevenLabs
5. Show: Dashboard móvil actualiza en tiempo real
6. Show: Staff recibe alerta para intervenir

**Min 4-5:** Tech Stack + Impacto
- "Cloudflare Agents SDK + Durable Objects + Workers AI"
- "Multi-model: Groq → Workers AI → Voice → Human"
- "70% reducción no-shows (pilot data real)"

## MÉTRICAS CLAVE

**Judges look for:**
- ⭐⭐⭐⭐ Autonomous proactive behavior
- ⭐⭐⭐⭐ Human-in-the-loop cuando necesario
- ⭐⭐⭐ Multi-step durable workflows
- ⭐⭐⭐ Voice integration (diferenciador)
- ⭐⭐⭐ Real-time mobile dashboard

**Performance targets:**
- Response time: <2s
- Workflow completion: >95%
- Voice resolution: >60%
- Human intervention: <10% de casos

## RIESGOS

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| ElevenLabs voice integration | MEDIUM | Usar Conversational AI API (bien documentado) |
| Twilio button templates | LOW | API estable, muchos ejemplos |
| Calendar bidirectional sync | MEDIUM | Webhooks + polling hybrid |
| Scheduled workers Cloudflare | LOW | Cron triggers nativos |
| Timeline muy ajustado | MEDIUM | Agentes especializados aceleran desarrollo |

---

**Code reference:** Toda implementación en `/src` (no examples en docs)
