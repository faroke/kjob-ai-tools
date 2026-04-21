# @kjob/mcp-server

MCP (Model Context Protocol) server that lets users launch kjob offer scans
from their own device — from Claude Desktop, Cursor, or any MCP client.

## Why this design is cheap for the owner

The server is **stdio-only**: each user runs it locally (via `npx`, or built
from this repo). It makes authenticated HTTPS calls to the existing kjob API.

- No extra hosting, containers, or domain to operate.
- No long-running process on the owner's infrastructure.
- Reuses the existing `personal_api_tokens` table and `/api/offers/scan`
  endpoint. The only server-side change is accepting `Authorization: Bearer
  kjob_*` in addition to Clerk sessions.
- Per-user rate limiting and credit consumption are enforced by the existing
  scan route — no duplicate logic.

## Tools exposed

| Tool          | Description                                                            |
| ------------- | ---------------------------------------------------------------------- |
| `scan_offer`  | Extracts a raw job offer (text/HTML) and saves it. Returns `offerId`.  |

## Install and run (end user)

1. Generate an API key in the kjob web app (Settings → API keys). Copy the
   `kjob_...` plaintext — it is shown only once.
2. Add the server to the MCP client config.

### Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "kjob": {
      "command": "npx",
      "args": ["-y", "@kjob/mcp-server"],
      "env": {
        "KJOB_API_URL": "https://www.kjob.fr",
        "KJOB_API_KEY": "kjob_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

### Cursor / other MCP clients

Same command and env vars; follow the client's MCP server registration docs.
