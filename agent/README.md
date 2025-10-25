# smartSalud Agent - Cloudflare Workers

Autonomous appointment management agent built with Cloudflare Workers, Durable Objects, and multi-model AI orchestration.

## Architecture

### Core Components

1. **Scheduled Worker** (`src/workers/scheduled-reminders.ts`)
   - Runs every hour via cron trigger
   - Queries FastAPI backend for appointments 47-49h ahead
   - Sends WhatsApp reminders via Twilio
   - Tracks reminder status in backend database

2. **Multi-Model Intent Detection** (`src/lib/intent-detection.ts`)
   - Primary: Groq API (llama-3.3-70b-versatile)
   - Fallback: Cloudflare Workers AI (@cf/meta/llama-3.1-8b-instruct)
   - Last Resort: Regex patterns (Spanish/English)

3. **Twilio WhatsApp Integration** (`src/integrations/twilio-whatsapp.ts`)
   - Interactive confirmation messages
   - Alternative appointment slot suggestions
   - Escalation alerts to clinic staff

4. **Durable Object Agent** (`src/agent.ts`)
   - Persistent conversation state
   - Stateful multi-step workflows
   - Human-in-the-loop approval flows

## Setup

### Prerequisites

- Node.js >= 20.0.0
- npm or yarn
- Cloudflare account (for deployment)
- Groq API key (optional, for primary intent detection)
- Twilio account with WhatsApp enabled (for production)

### Installation

```bash
# Install dependencies
npm install

# Copy example environment file
cp .dev.vars.example .dev.vars

# Edit .dev.vars with your credentials (optional for local testing)
# - GROQ_API_KEY: Get from https://console.groq.com/keys
# - TWILIO_*: Get from https://console.twilio.com
```

### Local Development

```bash
# Start development server (with hot reload)
npm run dev

# Server runs on http://localhost:8787
```

### Type Checking

```bash
# Run TypeScript type checker
npm run type-check
```

## Testing

### Manual API Testing

```bash
# Health check
curl http://localhost:8787/health

# Agent info (conversation state)
curl http://localhost:8787/agent//info

# Test intent detection - Confirm
curl -X POST http://localhost:8787/agent//message \
  -H "Content-Type: application/json" \
  -d '{"from": "+5215512345678", "message": "Sí, confirmo mi cita"}'

# Test intent detection - Cancel
curl -X POST http://localhost:8787/agent//message \
  -H "Content-Type: application/json" \
  -d '{"from": "+5215512345678", "message": "No puedo, necesito cancelar"}'

# Test intent detection - Reschedule
curl -X POST http://localhost:8787/agent//message \
  -H "Content-Type: application/json" \
  -d '{"from": "+5215512345678", "message": "Quiero cambiar la fecha"}'
```

### Automated Testing

```bash
# Run test suite
npm test

# Watch mode (continuous testing)
npm run test:watch
```

### Test Script

Use the provided test script for quick validation:

```bash
# Make executable
chmod +x test-local.sh

# Run all tests
./test-local.sh
```

## Multi-Model Intent Detection

The agent implements a 3-tier fallback system for robust intent detection:

### 1. Primary: Groq API

- **Model**: llama-3.3-70b-versatile
- **Pros**: Fast (< 200ms), highly accurate, low cost
- **Requires**: GROQ_API_KEY environment variable
- **Use Case**: Production deployment

### 2. Fallback: Cloudflare Workers AI

- **Model**: @cf/meta/llama-3.1-8b-instruct
- **Pros**: Native to Cloudflare, no external API needed
- **Requires**: Cloudflare account login (wrangler login)
- **Use Case**: When Groq is unavailable

### 3. Last Resort: Regex Patterns

- **Patterns**: Spanish/English keyword matching
- **Pros**: Always available, zero latency, free
- **Cons**: Less accurate for ambiguous input
- **Use Case**: Development without API keys

Example fallback flow:

```typescript
// User input: "Sí, confirmo mi cita"

1. Try Groq → If GROQ_API_KEY not set, skip
2. Try Workers AI → If not logged in to Cloudflare, skip
3. Regex fallback → Matches /(sí|si|yes|confirmo)/i → Returns "confirm"
```

## Scheduled Worker

The scheduled worker runs every hour to send 48-hour appointment reminders.

### Cron Configuration

```toml
# wrangler.toml
[triggers]
crons = ["0 * * * *"]  # Every hour
```

### Manual Trigger (Local Development)

Miniflare (local dev) doesn't auto-trigger scheduled workers. To test:

```bash
# Use --test-scheduled flag to trigger scheduled worker via fetch
curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"
```

### Backend API Integration

The scheduled worker expects the following endpoint from FastAPI backend:

**GET** `/api/appointments/upcoming?hours=48`

**Response Format:**
```json
{
  "appointments": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "patient_name": "Juan Pérez",
      "patient_phone": "+5215512345678",
      "doctor_name": "Dr. María González",
      "specialty": "Cardiología",
      "appointment_date": "2024-03-15T14:30:00Z",
      "appointment_time": "14:30",
      "status": "pending"
    }
  ]
}
```

## Environment Variables

### Required for Production

Set via `wrangler secret put <KEY_NAME>`:

```bash
# Groq API for intent detection (primary)
wrangler secret put GROQ_API_KEY

# Twilio WhatsApp integration
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_WHATSAPP_NUMBER  # Format: whatsapp:+14155238886
```

### Optional

```bash
# ElevenLabs voice synthesis (future feature)
wrangler secret put ELEVENLABS_API_KEY
```

### Non-Secret (wrangler.toml)

```toml
[vars]
BACKEND_API_URL = "https://smartsalud-api.railway.app"
ENVIRONMENT = "production"
```

## Deployment

### Deploy to Cloudflare Workers

```bash
# Deploy to production
npm run deploy

# Deploy to staging
wrangler deploy --env staging

# Deploy to dev
wrangler deploy --env dev
```

### Verify Deployment

```bash
# Check health
curl https://smartsalud-agent.YOURSUBDOMAIN.workers.dev/health

# Test intent detection
curl -X POST https://smartsalud-agent.YOURSUBDOMAIN.workers.dev/agent//message \
  -H "Content-Type: application/json" \
  -d '{"from": "+5215512345678", "message": "Confirmo"}'
```

## Project Structure

```
agent/
├── src/
│   ├── index.ts                    # Worker entry point
│   ├── agent.ts                    # Durable Object implementation
│   ├── lib/
│   │   └── intent-detection.ts     # Multi-model intent detection
│   ├── integrations/
│   │   └── twilio-whatsapp.ts      # Twilio WhatsApp service
│   └── workers/
│       └── scheduled-reminders.ts  # Cron-triggered reminder worker
├── wrangler.toml                   # Cloudflare Workers config
├── package.json
├── tsconfig.json
├── .dev.vars.example               # Example environment variables
└── README.md
```

## Development Roadmap

### Phase 0+1: Setup + Scheduled Agent ✅ COMPLETED

- [x] Initialize Cloudflare Worker with Durable Objects
- [x] Implement multi-model intent detection (Groq → Workers AI → Regex)
- [x] Create scheduled worker for 48h reminders
- [x] Integrate Twilio WhatsApp messaging
- [x] Local development environment with hot reload
- [x] Type-safe TypeScript implementation

### Phase 2: Durable Workflows (Next)

- [ ] Implement 8-step confirmation workflow
- [ ] Add state persistence across restarts
- [ ] Workflow retry logic with exponential backoff
- [ ] Calendar integration (Google Calendar API)
- [ ] Voice call escalation (Twilio Voice)

### Phase 3: Dashboard + Voice Interface

**Staff Dashboard (Desktop):**
- [ ] WebSocket broadcasting from agent
- [ ] Live appointment status updates
- [ ] Desktop monitoring UI (React)
- [ ] Conversation history viewer

**Patient Voice Interface:**
- [ ] ElevenLabs Conversational AI widget
- [ ] Voice call link generation
- [ ] Outcome reporting to workflow
- [ ] DB persistence of conversations

### Phase 4: Human-in-the-Loop

- [ ] Complex case detection
- [ ] Approval workflow UI
- [ ] Physician dashboard
- [ ] Override mechanisms

## Performance Metrics

Based on local testing with regex fallback:

- Intent detection latency: < 5ms
- Health endpoint: < 10ms
- Durable Object state persistence: < 50ms

With Groq API (expected in production):

- Intent detection latency: < 200ms
- Total message processing: < 300ms

## Troubleshooting

### Workers AI "Not logged in" error

```bash
# Login to Cloudflare
wrangler login

# Verify authentication
wrangler whoami
```

### TypeScript compilation errors

```bash
# Clear build cache
rm -rf .wrangler node_modules
npm install
npm run type-check
```

### Scheduled worker not triggering locally

Miniflare doesn't auto-trigger scheduled workers. Use:

```bash
# Manual trigger via HTTP
curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"
```

## License

Proprietary - smartSalud V3 Hackathon Project
