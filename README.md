# smartSalud V3 🏥

Autonomous AI agent for medical appointment management via WhatsApp. Built for Cloudflare Hackathon 2025.

[![CI Pipeline](https://github.com/AutonomosCdM/smartSalud_V2/actions/workflows/ci.yml/badge.svg)](https://github.com/AutonomosCdM/smartSalud_V2/actions/workflows/ci.yml)
[![Deploy to Cloudflare](https://github.com/AutonomosCdM/smartSalud_V2/actions/workflows/deploy-cloudflare.yml/badge.svg)](https://github.com/AutonomosCdM/smartSalud_V2/actions/workflows/deploy-cloudflare.yml)
[![Deploy to Railway](https://github.com/AutonomosCdM/smartSalud_V2/actions/workflows/deploy-railway.yml/badge.svg)](https://github.com/AutonomosCdM/smartSalud_V2/actions/workflows/deploy-railway.yml)

## 🎯 Problem

Medical clinics lose **30% of appointments to no-shows**. Manual confirmation calls are slow, expensive, and error-prone.

## 💡 Solution

**smartSalud** is an **autonomous AI agent** that:

- ✅ Maintains conversational context across WhatsApp messages
- ✅ Executes durable multi-step workflows (confirm → calendar → reminder)
- ✅ Orchestrates multiple AI models with automatic fallback
- ✅ Provides real-time updates via WebSockets
- ✅ Requires human-in-the-loop approval for complex cases

**Result:** 70% reduction in no-shows (pilot data)

## 🏗️ Architecture

```text
WhatsApp Message
    ↓
Cloudflare Agent (Durable Object)
    ├─ State: Conversation history, pending actions
    ├─ Multi-model: Groq → Workers AI → Regex fallback
    ├─ Workflows: Confirm → Calendar → Reminder → Follow-up
    ├─ Human-in-Loop: Physician approval for edge cases
    └─ Real-time: WebSocket broadcast to dashboard
    ↓
FastAPI Backend (Railway)
    ├─ Database operations (PostgreSQL)
    └─ Business logic validation
```

## 🚀 Tech Stack

**Agent Layer (Cloudflare):**

- Cloudflare Agents SDK - Autonomous orchestration
- Durable Objects - State persistence
- Workers AI - LLM fallback
- WebSockets - Real-time updates

**AI/ML:**

- Groq - Primary NLP (fast, high-quality)
- ElevenLabs - Voice synthesis
- Workers AI - Fallback inference

**Backend (Railway):**

- FastAPI - REST API & data layer
- PostgreSQL - Relational database
- Alembic - Database migrations

**Integrations:**

- WhatsApp Business API
- Google Calendar API

## 📦 Project Structure

```text
smartSalud_V3/
├── agent/                    # Cloudflare Agent
│   ├── src/
│   │   ├── index.ts         # Worker entry point
│   │   ├── agent.ts         # Agent implementation
│   │   ├── workflows/       # Durable workflows
│   │   └── models/          # Multi-model orchestration
│   ├── wrangler.toml        # Cloudflare config
│   └── package.json
├── backend/                  # FastAPI Backend
│   ├── app/
│   │   ├── main.py
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/
│   ├── requirements.txt
│   └── alembic/
├── .github/
│   └── workflows/           # CI/CD pipelines
│       ├── ci.yml
│       ├── deploy-cloudflare.yml
│       └── deploy-railway.yml
├── .claude/
│   ├── CLAUDE.md            # Development guide
│   └── mcp-setup.md         # MCP integration guide
└── README.md
```

## 🛠️ Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Cloudflare account
- Railway account
- WhatsApp Business account

### Local Development

**Agent (Cloudflare):**

```bash
cd agent
npm install
npm run dev
# Agent running on http://localhost:8787
```

**Backend (FastAPI):**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# API running on http://localhost:8000
```

## 🚢 Deployment

### Automatic Deployment (Recommended)

Deployments happen automatically via GitHub Actions:

- **Push to `main`** → Deploys to production
- **Pull Request** → Runs CI tests only

### Manual Deployment

**Cloudflare Agent:**

```bash
cd agent
npx wrangler deploy
```

**Railway Backend:**

```bash
cd backend
railway up
```

## 🔐 Environment Variables

### Required Secrets (GitHub)

Add these to **Settings → Secrets and variables → Actions**:

**Cloudflare:**

- `CLOUDFLARE_API_TOKEN` - API token with Workers deploy permission
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

**Railway:**

- `RAILWAY_TOKEN` - Railway API token

### Agent Environment (.dev.vars)

```bash
GROQ_API_KEY=your_groq_key
ELEVENLABS_API_KEY=your_elevenlabs_key
WHATSAPP_TOKEN=your_whatsapp_token
BACKEND_API_URL=https://smartsalud-api.railway.app
```

### Backend Environment (.env)

```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
GOOGLE_CALENDAR_CREDENTIALS={"type":"service_account",...}
GROQ_API_KEY=your_groq_key
```

## 📊 CI/CD Pipeline

### Workflows

**CI Pipeline** (`ci.yml`):

- Runs on every push/PR
- Tests agent & backend
- Security scanning with Trivy
- Markdown linting

**Deploy Cloudflare** (`deploy-cloudflare.yml`):

- Triggers on push to `main` (agent changes)
- Builds and deploys agent to Cloudflare Workers
- Automatic rollback on failure

**Deploy Railway** (`deploy-railway.yml`):

- Triggers on push to `main` (backend changes)
- Deploys backend to Railway
- Runs database migrations
- Health check verification

### Monitoring

**Production URLs:**

- Agent: `https://smartsalud-agent.workers.dev`
- Backend: `https://smartsalud-api.railway.app`
- Dashboard: `https://dashboard.smartsalud.app`

**Health Checks:**

- Backend: `GET /health`
- Agent: `GET /health`

## 🧪 Testing

**Agent:**

```bash
cd agent
npm test
npm run type-check
```

**Backend:**

```bash
cd backend
pytest tests/ --cov=app
```

## 📖 Documentation

- [CLAUDE.md](.claude/CLAUDE.md) - Complete development guide
- [MCP Setup](.claude/mcp-setup.md) - Context7 & MCP integration
- [Roadmap](.claude/roadmap.md) - 4-phase implementation plan

## 🎥 Demo Script (5 minutes)

**Min 0-1: Problem**
"Clínicas pierden 30% citas por no-shows. Confirmaciones manuales son lentas."

**Min 1-2: Solución Agéntica**
"smartSalud es un AUTONOMOUS AGENT con estado persistente, workflows durables, y múltiples modelos LLM."

**Min 2-4: Live Demo**

1. Enviar WhatsApp: "Confirmo mi cita"
2. Mostrar: Agent procesa → Workflow ejecuta → Dashboard actualiza en tiempo real
3. Enviar: "Quiero cambiar para medianoche"
4. Mostrar: Human-in-loop → Médico aprueba/rechaza

**Min 4-5: Impacto**
"70% reducción no-shows. 3 modelos LLM. Workflows durables. Real-time WebSockets."

## 🏆 Hackathon Alignment

| Feature                  | Points | Implementation                  |
| ------------------------ | ------ | ------------------------------- |
| Multiple Models          | ⭐⭐⭐   | Groq + ElevenLabs + Workers AI  |
| Autonomous Behavior      | ⭐⭐⭐⭐ | Proactive, stateful workflows   |
| State Management         | ⭐⭐⭐   | Durable Objects                 |
| Real-time Updates        | ⭐⭐⭐   | WebSockets                      |
| Human-in-the-Loop        | ⭐⭐⭐⭐ | Physician approval system       |
| Multi-step Workflows     | ⭐⭐⭐   | Durable, retry-enabled          |
| Cloudflare Integration   | ⭐⭐⭐⭐ | Agents SDK + DO + Workers AI    |

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

MIT License - See [LICENSE](LICENSE) for details

## 👥 Team

**Autónomos CdM** - Cloudflare Hackathon 2025

## 🙏 Acknowledgments

- Cloudflare Agents SDK
- Groq for lightning-fast inference
- ElevenLabs for natural voice synthesis
- Railway for seamless backend hosting
