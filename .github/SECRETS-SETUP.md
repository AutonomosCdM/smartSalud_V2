# GitHub Secrets Setup Guide

Quick guide to configure all required secrets for CI/CD deployment.

## Required Secrets

Navigate to: **Settings → Secrets and variables → Actions → New repository secret**

### 1. Cloudflare Secrets

#### CLOUDFLARE_API_TOKEN

**How to get it:**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use template: "Edit Cloudflare Workers"
4. Select permissions:
   - Account: Workers Scripts (Edit)
   - Account: Workers KV Storage (Edit)
   - Account: Durable Objects (Edit)
5. Copy the token (only shown once!)

**Value format:**

```
your-cloudflare-api-token-here
```

#### CLOUDFLARE_ACCOUNT_ID

**How to get it:**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click on "Workers & Pages"
3. Account ID is shown in the right sidebar
4. Or find in URL: `https://dash.cloudflare.com/<account-id>/...`

**Value format:**

```
abc123def456ghi789jkl012mno345pq
```

### 2. Railway Secret

#### RAILWAY_TOKEN

**How to get it:**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Get your token
railway whoami --token
```

**Value format:**

```
your-railway-token-here
```

## Optional: Set up Secrets Locally

### Cloudflare Agent (.dev.vars)

Create `agent/.dev.vars`:

```bash
GROQ_API_KEY=your_groq_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
WHATSAPP_TOKEN=your_whatsapp_token
BACKEND_API_URL=http://localhost:8000
```

**Important:** `.dev.vars` is in `.gitignore` - never commit this file!

### Backend (.env)

Create `backend/.env`:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/smartsalud
GOOGLE_CALENDAR_CREDENTIALS={"type":"service_account",...}
GROQ_API_KEY=your_groq_api_key
WHATSAPP_TOKEN=your_whatsapp_token
CLOUDFLARE_AGENT_URL=http://localhost:8787
```

**Important:** `.env` is in `.gitignore` - never commit this file!

## Verify Setup

After adding secrets, test deployments:

**1. Check CI Pipeline:**

```bash
# Make a small change and push
echo "# Test" >> README.md
git add README.md
git commit -m "test: Verify CI pipeline"
git push origin main
```

**2. Check GitHub Actions:**

- Go to **Actions** tab in GitHub
- All 3 workflows should run:
  - ✅ CI Pipeline
  - ✅ Deploy to Cloudflare (may fail if no Cloudflare account yet)
  - ✅ Deploy to Railway (may fail if no Railway project yet)

## Troubleshooting

### "Invalid API Token"

- Verify token has Workers Scripts edit permission
- Check token hasn't expired (tokens can expire)
- Regenerate token if needed

### "Account ID not found"

- Double-check the account ID from Cloudflare dashboard
- Ensure no extra spaces when pasting
- Account ID should be 32 characters (hex format)

### "Railway token invalid"

- Re-run `railway login && railway whoami --token`
- Verify Railway CLI is up to date: `npm update -g @railway/cli`
- Check Railway project exists: `railway list`

## Security Best Practices

- ✅ Use repository secrets, not environment variables
- ✅ Rotate tokens every 90 days
- ✅ Use scoped tokens (minimum permissions needed)
- ❌ Never commit secrets to git
- ❌ Never share tokens in chat/email
- ❌ Never use Global API Key (use scoped tokens)

## Next Steps

After secrets are configured:

1. **Create Cloudflare Worker:**
   ```bash
   cd agent
   npm install
   npx wrangler deploy
   ```

2. **Create Railway Project:**
   ```bash
   cd backend
   railway init
   railway up
   ```

3. **Verify Deployments:**
   - Agent: `https://smartsalud-agent.workers.dev/health`
   - Backend: `https://smartsalud-api.railway.app/health`

4. **Set Production Secrets:**
   ```bash
   # Cloudflare (from agent/ directory)
   npx wrangler secret put GROQ_API_KEY
   npx wrangler secret put ELEVENLABS_API_KEY
   npx wrangler secret put WHATSAPP_TOKEN

   # Railway (from backend/ directory)
   railway variables set GROQ_API_KEY=...
   railway variables set WHATSAPP_TOKEN=...
   ```

## Support

Issues with secrets setup? Check:

- [Cloudflare Docs](https://developers.cloudflare.com/workers/wrangler/ci-cd/)
- [Railway Docs](https://docs.railway.app/deploy/deployments)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
