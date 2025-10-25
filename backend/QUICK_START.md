# FastAPI Backend - Quick Start Guide

## Start the Server

```bash
cd /Users/autonomos_dev/Projects/smartSalud_V3/backend
source venv/bin/activate
uvicorn app.main:app --reload
```

Server runs at: **http://localhost:8000**

---

## Key Endpoints

### Get Upcoming Appointments (48h window)
```bash
curl "http://localhost:8000/api/appointments/upcoming?hours=48"
```

### Confirm Appointment
```bash
curl -X POST "http://localhost:8000/api/appointments/{id}/confirm" \
  -H "Content-Type: application/json" \
  -d '{"confirmed": true}'
```

### Get Alternative Slots
```bash
curl "http://localhost:8000/api/appointments/{id}/alternatives"
```

### Reschedule Appointment
```bash
curl -X POST "http://localhost:8000/api/appointments/{id}/reschedule" \
  -H "Content-Type: application/json" \
  -d '{"new_date": "2025-10-28T10:00:00"}'
```

### Cancel Appointment
```bash
curl -X POST "http://localhost:8000/api/appointments/{id}/cancel"
```

---

## Database Commands

### Run Migrations
```bash
alembic upgrade head
```

### Create New Migration
```bash
alembic revision --autogenerate -m "Description"
```

### Seed Test Data
```bash
python -m app.seed
```

### Check Database
```bash
psql -d smartsalud_db -U smartsalud_user
```

---

## API Documentation

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **OpenAPI JSON:** http://localhost:8000/openapi.json

---

## Database Details

- **Database:** smartsalud_db
- **User:** smartsalud_user
- **Password:** smartsalud_pass
- **Connection String:** `postgresql://smartsalud_user:smartsalud_pass@localhost:5432/smartsalud_db`

---

## Project Structure

```
backend/
├── app/
│   ├── models/          # SQLAlchemy models
│   │   ├── patient.py
│   │   ├── appointment.py
│   │   └── conversation.py
│   ├── routers/         # API endpoints
│   │   └── appointments.py
│   ├── database.py      # DB config
│   ├── schemas.py       # Pydantic schemas
│   ├── seed.py          # Seed script
│   └── main.py          # FastAPI app
├── alembic/             # Migrations
├── requirements.txt
└── .env                 # Environment variables
```

---

## Environment Variables (.env)

```bash
DATABASE_URL=postgresql://smartsalud_user:smartsalud_pass@localhost:5432/smartsalud_db
ENVIRONMENT=development
DEBUG=true
```

---

## Troubleshooting

### Port already in use
```bash
lsof -ti:8000 | xargs kill -9
```

### Database connection failed
```bash
# Check if PostgreSQL is running
brew services list

# Restart PostgreSQL
brew services restart postgresql@14
```

### Reset database
```bash
# Drop and recreate
psql postgres -c "DROP DATABASE smartsalud_db;"
psql postgres -c "CREATE DATABASE smartsalud_db OWNER smartsalud_user;"
alembic upgrade head
python -m app.seed
```

---

**For detailed setup information, see:** [SETUP_COMPLETE.md](./SETUP_COMPLETE.md)
