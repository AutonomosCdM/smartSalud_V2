# smartSalud Backend

FastAPI backend for database operations and external integrations.

## Structure

```
backend/
├── app/
│   ├── main.py           # FastAPI application
│   ├── models/           # SQLAlchemy models (TODO)
│   ├── routes/           # API endpoints (TODO)
│   ├── services/         # Business logic (TODO)
│   └── __init__.py
├── alembic/              # Database migrations (TODO)
├── tests/                # Test suite (TODO)
├── requirements.txt
└── README.md
```

## Development

**Setup:**

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Run:**

```bash
uvicorn app.main:app --reload
```

Visit: http://localhost:8000/docs

## Database

**Initialize migrations:**

```bash
alembic init alembic
```

**Create migration:**

```bash
alembic revision --autogenerate -m "Initial schema"
```

**Apply migrations:**

```bash
alembic upgrade head
```

## Testing

```bash
pytest tests/ --cov=app
```

## Deployment

Deploy to Railway automatically via GitHub Actions on push to main.

**Manual deploy:**

```bash
railway up
```

## Environment Variables

Required in `.env` or Railway:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
GOOGLE_CALENDAR_CREDENTIALS={"type":"service_account",...}
GROQ_API_KEY=your_groq_key
WHATSAPP_TOKEN=your_whatsapp_token
CLOUDFLARE_AGENT_URL=https://smartsalud-agent.workers.dev
```
