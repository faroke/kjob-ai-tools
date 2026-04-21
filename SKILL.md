---
name: kjob-mcp
description: Guide Claude when using the kjob MCP server tools. Triggers when the user shares a job offer or asks about their applications, CV, or job search.
---

# kjob MCP — Workflow Guide

## Tools available

| Tool | Description | Credits |
|------|-------------|---------|
| `get_profile` | Fetch the candidate's structured CV + job preferences | Free |
| `get_match_context(offerId)` | Fetch a saved offer + candidate CV for local matching | Free |
| `scan_offer(rawContent, sourceUrl?)` | Parse and save a job offer via kjob AI | Costs credits |

## Recommended workflow

### Session start
Call `get_profile()` immediately to load the candidate's context — experiences, skills, education, and job preferences. This lets you give informed, personalised answers without asking the user to repeat themselves.

### User shares a job offer (URL or pasted text)
1. Call `scan_offer({ rawContent, sourceUrl? })` — extracts and saves the offer. Returns `offerId`.
2. Call `get_match_context({ offerId })` — returns the offer details + candidate CV.
3. Analyse the fit yourself and present:
   - Estimated fit score (e.g. 7/10)
   - Key strengths matching the requirements
   - Gaps or missing skills
   - Concrete suggestions (keywords to add, angles to highlight)

## Rules

- **Always call `get_profile` first** when starting a new session — it's free and gives full context.
- **Do NOT call the kjob match API** (`/api/offers/{id}/match`) — that triggers a Gemini call and costs credits. Use `get_match_context` + your own analysis instead.
- If `get_profile` or `get_match_context` returns **403**, the user has no parsed CV. Tell them to upload their CV in kjob settings (Profile tab).
- If `scan_offer` returns **402**, the user has insufficient credits.

## Installation

Copy this file to your Claude Code skills directory:

```sh
mkdir -p ~/.claude/skills/kjob-mcp
cp SKILL.md ~/.claude/skills/kjob-mcp/SKILL.md
```
