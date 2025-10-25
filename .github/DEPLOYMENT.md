# Deployment Guide

Complete guide for deploying smartSalud to production.

## Prerequisites

### Required Accounts

- [x] GitHub account with repository access
- [x] Cloudflare account (Workers, Durable Objects enabled)
- [x] Railway account
- [x] WhatsApp Business account (Twilio)
- [x] Groq API key
- [x] ElevenLabs API key

### Local Setup

- Node.js 20+
- Python 3.11+
- Git configured with SSH/HTTPS
- Railway CLI: `npm install -g @railway/cli`
- Wrangler CLI: `npm install -g wrangler`

## GitHub Setup

### 1. Configure Repository Secrets

Navigate to **Settings → Secrets and variables → Actions**

**Add the following secrets:**

#### Cloudflare

```bash
CLOUDFLARE_API_TOKEN=<your-cloudflare-api-token>
CLOUDFLARE_ACCOUNT_ID=<your-cloudflare-account-id>
```

**Getting Cloudflare credentials:**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click on your profile → API Tokens
3. Create Token → Use template: "Edit Cloudflare Workers"
4. Account ID: Find in Workers & Pages → Overview

#### Railway

```bash
RAILWAY_TOKEN=<your-railway-token>
```

**Getting Railway token:**

```bash
railway login
railway whoami --token
```

### 2. Enable GitHub Actions

Ensure Actions are enabled:

- **Settings → Actions → General**
- Select: "Allow all actions and reusable workflows"
- Enable: "Read and write permissions" for GITHUB_TOKEN

## Cloudflare Deployment

### Initial Setup

**1. Login to Cloudflare:**

```bash
npx wrangler login
```

**2. Create Durable Object namespace:**

```bash
npx wrangler durable-objects:create SmartSaludAgent
```

**3. Configure wrangler.toml:**

```toml
name = "smartsalud-agent"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[durable_objects.bindings]]
name = "AGENT"
class_name = "SmartSaludAgent"

[[migrations]]
tag = "v1"
new_classes = ["SmartSaludAgent"]

[vars]
BACKEND_API_URL = "https://smartsalud-api.railway.app"

[env.production]
name = "smartsalud-agent"
```

**4. Add secrets:**

```bash
cd agent
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put ELEVENLABS_API_KEY
npx wrangler secret put WHATSAPP_TOKEN
```

### Manual Deploy

```bash
cd agent
npm install
npm run build
npx wrangler deploy
```

**Verify deployment:**

```bash
curl https://smartsalud-agent.workers.dev/health
```

### Rollback

**View deployment history:**

```bash
npx wrangler deployments list
```

**Rollback to previous version:**

```bash
npx wrangler rollback --message "Rolling back due to issue X"
```

## Railway Deployment

### Initial Setup

**1. Login to Railway:**

```bash
railway login
```

**2. Create new project:**

```bash
cd backend
railway init
railway link
```

**3. Add PostgreSQL service:**

```bash
railway add --database postgres
```

**4. Configure environment variables:**

```bash
railway variables set DATABASE_URL="postgresql://..."
railway variables set GROQ_API_KEY="..."
railway variables set GOOGLE_CALENDAR_CREDENTIALS='{"type":"service_account",...}'
railway variables set WHATSAPP_TOKEN="..."
railway variables set CLOUDFLARE_AGENT_URL="https://smartsalud-agent.workers.dev"
```

### Manual Deploy

```bash
cd backend
railway up
```

**Run migrations:**

```bash
railway run alembic upgrade head
```

**Verify deployment:**

```bash
curl https://smartsalud-api.railway.app/health
```

### Database Management

**Access database console:**

```bash
railway run psql $DATABASE_URL
```

**Create backup:**

```bash
railway run pg_dump $DATABASE_URL > backup.sql
```

**Restore backup:**

```bash
railway run psql $DATABASE_URL < backup.sql
```

## Continuous Deployment

### Automatic Deployments

**Triggers:**

- Push to `main` branch → Deploys to production
- Push to `develop` branch → Runs CI only (no deploy)
- Pull requests → Runs CI only

**Workflow order:**

1. **CI Pipeline** (`ci.yml`)
   - Tests agent & backend
   - Security scan
   - Markdown lint
2. **Deploy Cloudflare** (`deploy-cloudflare.yml`)
   - Builds agent
   - Deploys to Workers
   - Verifies deployment
3. **Deploy Railway** (`deploy-railway.yml`)
   - Deploys backend
   - Runs migrations
   - Health check

### Deployment Status

**Check GitHub Actions:**

```bash
gh run list --workflow=deploy-cloudflare.yml --limit 5
gh run list --workflow=deploy-railway.yml --limit 5
```

**View logs:**

```bash
gh run view <run-id> --log
```

### Deployment Notifications

Configure Slack/Discord webhooks for notifications:

**Add to workflow files:**

```yaml
- name: Notify deployment
  if: always()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "Deployment ${{ job.status }}: ${{ github.event.head_commit.message }}"
      }
```

## Environment-Specific Configuration

### Development

```bash
# Agent
cd agent && npm run dev

# Backend
cd backend && uvicorn app.main:app --reload
```

### Staging (Optional)

Create staging environment in Cloudflare:

```toml
[env.staging]
name = "smartsalud-agent-staging"
vars = { BACKEND_API_URL = "https://smartsalud-staging.railway.app" }
```

Deploy to staging:

```bash
npx wrangler deploy --env staging
```

### Production

Production deployments happen automatically via GitHub Actions on push to `main`.

## Monitoring & Observability

### Cloudflare Analytics

**View in dashboard:**

- Workers & Pages → smartsalud-agent → Analytics
- Metrics: Requests, errors, CPU time, Durable Objects usage

**CLI:**

```bash
npx wrangler tail
```

### Railway Logs

**View logs:**

```bash
railway logs --service smartsalud-backend
railway logs --service smartsalud-backend --follow
```

**Set up log drains:**

```bash
railway logs:add <drain-url>
```

### Health Checks

**Agent health:**

```bash
curl https://smartsalud-agent.workers.dev/health
```

**Backend health:**

```bash
curl https://smartsalud-api.railway.app/health
```

**Setup monitoring:**

- Use [UptimeRobot](https://uptimerobot.com) for health check monitoring
- Configure alerts for downtime

## Troubleshooting

### Deployment Fails

**Cloudflare:**

1. Check wrangler.toml syntax
2. Verify account ID and API token
3. Check Durable Object bindings
4. View deployment logs: `npx wrangler tail`

**Railway:**

1. Check requirements.txt
2. Verify environment variables
3. Check database connection
4. View logs: `railway logs`

### Agent Not Responding

1. Check Worker logs: `npx wrangler tail`
2. Verify secrets are set: `npx wrangler secret list`
3. Test locally: `npm run dev`
4. Check rate limits in Cloudflare dashboard

### Backend Errors

1. Check Railway logs: `railway logs`
2. Verify DATABASE_URL is correct
3. Run migrations: `railway run alembic upgrade head`
4. Test database connection: `railway run python -c "from app.db import engine; print(engine.connect())"`

### Database Migration Issues

**Reset migrations (DANGER - loses data):**

```bash
railway run alembic downgrade base
railway run alembic upgrade head
```

**Safe migration:**

```bash
railway run alembic revision --autogenerate -m "description"
railway run alembic upgrade head
```

## Security Best Practices

### Secrets Management

- ✅ Use GitHub Secrets for CI/CD credentials
- ✅ Use Wrangler secrets for Cloudflare Worker env vars
- ✅ Use Railway variables for backend config
- ❌ NEVER commit secrets to git
- ❌ NEVER log secrets in application code

### Access Control

**Cloudflare:**

- Use scoped API tokens (not Global API Key)
- Enable "Edit Cloudflare Workers" permission only
- Rotate tokens every 90 days

**Railway:**

- Use project-specific tokens
- Rotate tokens after team member leaves
- Use least-privilege IAM roles

### HTTPS Only

- ✅ Cloudflare Workers enforce HTTPS automatically
- ✅ Railway provides free TLS certificates
- ✅ Configure HSTS headers

## Backup & Recovery

### Database Backups

**Automatic (Railway):**

- Railway Pro plan includes automatic daily backups
- Retention: 7 days

**Manual backup:**

```bash
railway run pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### Configuration Backups

**Backup critical configs:**

```bash
# Wrangler config
cp agent/wrangler.toml backups/wrangler-$(date +%Y%m%d).toml

# Environment files (encrypted)
railway variables > backups/railway-vars-$(date +%Y%m%d).txt
```

### Disaster Recovery

**Complete system restore:**

1. Deploy agent: `cd agent && npx wrangler deploy`
2. Deploy backend: `cd backend && railway up`
3. Restore database: `railway run psql $DATABASE_URL < backup.sql`
4. Verify health: `curl <agent-url>/health && curl <backend-url>/health`

## Performance Optimization

### Cloudflare Workers

- Use Durable Objects for stateful operations only
- Implement caching for read-heavy operations
- Minimize external API calls
- Use Workers AI for inference when possible

### Backend

- Enable database connection pooling
- Add indexes for frequent queries
- Use Redis for caching (Railway Redis add-on)
- Implement rate limiting

### Monitoring

**Set alerts for:**

- Response time > 2s
- Error rate > 1%
- CPU usage > 80%
- Memory usage > 80%

## Cost Optimization

### Cloudflare

**Free tier includes:**

- 100,000 requests/day
- 10ms CPU time per request
- Durable Objects: 1GB storage

**Paid tier ($5/month):**

- Unlimited requests
- Workers AI included

### Railway

**Starter plan ($5/month):**

- 512MB RAM
- 1GB storage
- Fair use bandwidth

**Optimize costs:**

- Use connection pooling
- Implement query caching
- Scale horizontally when needed

## Release Checklist

Before each production deployment:

- [ ] All tests pass locally
- [ ] Code review approved
- [ ] Environment variables updated
- [ ] Database migrations tested
- [ ] Security scan clean
- [ ] Documentation updated
- [ ] Rollback plan prepared
- [ ] Monitoring configured
- [ ] Team notified

## Support

**Issues:** https://github.com/AutonomosCdM/smartSalud_V2/issues

**Docs:**

- [CLAUDE.md](../.claude/CLAUDE.md)
- [MCP Setup](../.claude/mcp-setup.md)
- [Roadmap](../.claude/roadmap.md)
