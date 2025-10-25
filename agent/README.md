# smartSalud Agent

Cloudflare Worker implementation of the autonomous appointment management agent.

## Structure

```
agent/
├── src/
│   ├── index.ts          # Worker entry point
│   ├── agent.ts          # Durable Object implementation
│   ├── workflows/        # Multi-step workflows (TODO)
│   └── models/           # Multi-model orchestration (TODO)
├── wrangler.toml         # Cloudflare configuration
├── package.json
└── tsconfig.json
```

## Development

```bash
npm install
npm run dev
```

Visit: http://localhost:8787/health

## Deployment

```bash
npm run deploy
```

Or use GitHub Actions (automatic on push to main).

## Testing

```bash
npm test
```

## Configuration

See [wrangler.toml](wrangler.toml) for environment configuration.

Secrets (set via wrangler):

```bash
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put ELEVENLABS_API_KEY
npx wrangler secret put WHATSAPP_TOKEN
```
