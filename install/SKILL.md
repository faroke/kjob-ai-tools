---
name: kjob-install
description: Guide Claude to help a user install and configure the kjob MCP server and skill. Triggers when a user asks to set up kjob with their AI agent, Claude Desktop, or Cursor.
---

# kjob — Installation Guide

## Steps

### 1. Generate an API key
Direct the user to **https://www.kjob.fr/app/profile** → section **MCP / Skills**.
The key is shown only once — ask them to copy it before closing.

### 2. Configure the MCP server
Add to the MCP client config, replacing `kjob_...` with the user's key.

**Claude Desktop** — `~/Library/Application Support/Claude/claude_desktop_config.json`
**Cursor** — `mcp.json`

```json
{
  "mcpServers": {
    "kjob": {
      "command": "npx",
      "args": ["-y", "@kjob/mcp-server"],
      "env": {
        "KJOB_API_URL": "https://www.kjob.fr",
        "KJOB_API_KEY": "kjob_..."
      }
    }
  }
}
```

Restart the MCP client after saving.

### 3. Install the workflow skill (Claude Code)

```sh
npx skills add faroke/kjob-ai-tools
```

This installs the kjob workflow guide so Claude knows how to use the MCP tools efficiently (0-credit offer parsing, CV/cover letter generation).

## Verification

After setup, ask the user to paste a job offer URL or raw text. Claude should be able to call `create_offer` and return an `offerId`.
