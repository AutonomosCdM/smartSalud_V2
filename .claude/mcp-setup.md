# MCP Setup & Context7 Integration

## Context7 MCP Server

### What is Context7?

Context7 is an MCP server that fetches **up-to-date, version-specific documentation** directly from source repositories. Instead of relying on outdated LLM training data, Context7 pulls current docs for any library/framework.

### Installation Status

✅ **INSTALLED** - Context7 has been added to `~/.claude/mcp_config.json`

**Configuration:**
```json
"context7": {
  "command": "npx",
  "args": ["-y", "@upstash/context7-mcp"]
}
```

**Note:** Restart Claude Code for the configuration to take effect.

### How to Use Context7

Simply add `use context7 for [library]` to your prompt:

**Examples:**

```
"Show me how to create a Durable Object in Cloudflare Workers. use context7 for cloudflare workers"

"How do I implement multi-model fallback with Groq? use context7 for groq-sdk"

"What's the latest API for ElevenLabs voice synthesis? use context7 for elevenlabs"

"Show me Cloudflare Agents SDK workflow patterns. use context7 for cloudflare agents"
```

### When to Use Context7

**ALWAYS use Context7 when:**
- Starting work with a new library/framework
- Checking current API syntax
- Verifying method signatures
- Looking for new features in recent versions
- Debugging issues that might be version-related

**Critical for smartSalud:**
- Cloudflare Agents SDK (constantly evolving)
- Cloudflare Workers AI models
- Durable Objects API
- Groq SDK
- WhatsApp Business API

### Rate Limits

**Without API Key:** Standard rate limits (sufficient for development)

**With API Key:** Higher limits + private repo access
- Get API key from: https://context7.com/dashboard
- Add to config: `"env": { "CONTEXT7_API_KEY": "your-key" }`

## Cloudflare Agents & MCP

### Overview

Cloudflare Agents natively support MCP, allowing agents to use external tools and resources through the Model Context Protocol.

### Architecture

```text
Cloudflare Agent
    ↓
MCP Client (embedded in agent)
    ↓
MCP Servers (local or remote)
    ├─ Context7 (documentation)
    ├─ Filesystem (file operations)
    ├─ Memory (persistent knowledge)
    └─ Custom tools
```

### Connection Types

**Remote MCP Servers:**
- Use HTTP + Server-Sent Events
- Require OAuth authorization
- Best for: Production deployments, team collaboration

**Local MCP Servers:**
- Use stdio transport
- Run on same machine as agent
- Best for: Development, testing, private tools

### Implementing MCP in Cloudflare Agent

**Basic Pattern:**

```typescript
// In your Cloudflare Agent
import { Agent } from 'agents'

export class SmartSaludAgent extends Agent {
  // MCP client is automatically available

  async handlePatientMessage(message: string, patientId: string) {
    // Use Context7 to get latest Groq API docs
    const groqDocs = await this.mcp.queryResource('context7', {
      library: 'groq-sdk',
      query: 'chat completion streaming'
    })

    // Use Memory to recall patient history
    const patientHistory = await this.mcp.query('memory', {
      entity: `patient_${patientId}`,
      type: 'conversation_history'
    })

    // Process with context
    return this.generateResponse(message, patientHistory, groqDocs)
  }
}
```

### Best Practices for MCP in Agents

**1. Design Focused Tools**
- Create narrow, specific tools rather than wrapping entire APIs
- Example: `confirmAppointment()` vs generic `apiCall()`

**2. Scope Permissions**
- Deploy multiple MCP servers with limited permissions
- Don't give agent filesystem access to entire system
- Limit to specific directories or operations

**3. Detailed Descriptions**
- Provide clear parameter descriptions
- Help agent understand when to use each tool
- Include examples in tool metadata

**4. Evaluation Testing**
- Test agent + MCP integration after changes
- Catch regressions early
- Verify tool usage is correct

### MCP Servers for smartSalud

**Recommended Setup:**

```json
{
  "mcpServers": {
    "context7": {
      "purpose": "Get latest docs for Cloudflare, Groq, etc.",
      "use": "Before implementing any external API"
    },
    "memory": {
      "purpose": "Store/recall patient conversation history",
      "use": "Track appointments, preferences, medical notes"
    },
    "filesystem": {
      "purpose": "Read/write local files if needed",
      "use": "Log generation, local cache"
    },
    "github": {
      "purpose": "Search code examples, reference implementations",
      "use": "Find working patterns from other projects"
    }
  }
}
```

### Integration Workflow

**Development Cycle:**

1. **Research Phase:**
   ```
   "use context7 for cloudflare agents" → Get latest API
   ```

2. **Implementation Phase:**
   ```typescript
   // Agent uses MCP tools during execution
   const result = await this.mcp.call('memory', 'store', {
     patient: patientId,
     appointment: appointmentData
   })
   ```

3. **Testing Phase:**
   ```
   Deploy agent → Test with MCP → Verify tool usage
   ```

4. **Iteration Phase:**
   ```
   Use github MCP to find similar implementations
   Use context7 to check for API updates
   ```

## Verification Steps

After restart, verify Context7 is working:

```bash
# List available MCP servers
claude mcp list

# Should show "context7" in the list
```

Then test in Claude Code:
```
"What's the latest Cloudflare Agents SDK API? use context7 for cloudflare agents"
```

## Troubleshooting

**Context7 not showing up:**
1. Verify Node.js is installed: `node --version` (need v18+)
2. Check config file: `cat ~/.claude/mcp_config.json`
3. Restart Claude Code completely
4. Try manual install: `npx -y @upstash/context7-mcp --help`

**Rate limit errors:**
1. Get API key from https://context7.com/dashboard
2. Add to config:
   ```json
   "context7": {
     "command": "npx",
     "args": ["-y", "@upstash/context7-mcp"],
     "env": {
       "CONTEXT7_API_KEY": "your-key-here"
     }
   }
   ```

## Resources

- Context7 GitHub: https://github.com/upstash/context7
- Context7 Dashboard: https://context7.com/dashboard
- Cloudflare MCP Docs: https://developers.cloudflare.com/agents/model-context-protocol/
- MCP Specification: https://modelcontextprotocol.io/
