---
name: kjob-mcp
description: Guide Claude when using the kjob MCP server. Triggers when the user shares a job offer, asks about their CV, or requests a cover letter / CV generation.
---

# kjob MCP — Workflow Guide

## Tools available

| Tool | Credits | Description |
|------|---------|-------------|
| `get_profile()` | Free | Candidate's structured CV + job preferences |
| `get_match_context(offerId)` | Free | Saved offer details + candidate CV |
| `save_cv(offerId, content, tone?)` | Free | Save a Claude-generated CV to kjob |
| `save_ldm(offerId, content, tone?)` | Free | Save a Claude-generated cover letter to kjob |
| `scan_offer(rawContent, sourceUrl?)` | 5 credits | Parse and save a job offer via kjob AI |

## Recommended workflow

### Session start
Call `get_profile()` immediately — free, gives you the full candidate context (experiences, skills, education, job preferences) without asking the user to repeat themselves.

### User shares a job offer
1. `scan_offer({ rawContent, sourceUrl? })` → returns `offerId`
2. `get_match_context({ offerId })` → returns offer details + candidate CV
3. Analyse fit yourself: score, strengths, gaps, concrete suggestions

### User asks to generate a CV
1. `get_match_context({ offerId })` if not already done
2. Generate `CvContentJson` yourself (see schema below)
3. `save_cv({ offerId, content: <CvContentJson>, tone? })` → saves to kjob, returns link

### User asks to generate a cover letter (LDM)
1. `get_match_context({ offerId })` if not already done
2. Generate `LdmContentJson` yourself (see schema below)
3. `save_ldm({ offerId, content: <LdmContentJson>, tone? })` → saves to kjob, returns link

---

## CvContentJson schema

```json
{
  "header": {
    "fullName": "string",
    "title": "string — job title adapted to the offer",
    "email": "string",
    "phone": "string | null",
    "location": "string | null"
  },
  "summary": "string — 2-3 punchy sentences tailored to the offer",
  "experience": [
    {
      "company": "string",
      "role": "string",
      "period": "string",
      "highlights": ["string — action verb + quantified result when possible"]
    }
  ],
  "education": [{ "institution": "string", "degree": "string", "year": "string" }],
  "skills": [{ "category": "string", "items": ["string"] }],
  "languages": [{ "name": "string", "level": "string" }]
}
```

**Generation rules:**
- Adapt summary and highlights to the offer requirements
- Prioritise skills matching the offer; group by category
- Use action verbs and metrics in highlights
- If `confirmedSkillsContext` is present, include those skills first
- Never invent information — only use data from `parsedCvJson`

---

## LdmContentJson schema

```json
{
  "greeting": "string — e.g. Madame, Monsieur,",
  "introduction": "string — 1 hook paragraph linking candidate to the role",
  "body": [
    "string — paragraph 1: key skills vs offer requirements",
    "string — paragraph 2: motivation + company fit"
  ],
  "conclusion": "string — call to action paragraph",
  "closing": "string — e.g. Dans l'attente de votre retour, je reste disponible pour un entretien.",
  "personalizations": [
    {
      "text": "string — excerpt from the letter that is offer-specific",
      "reason": "string — why this element is personalised"
    }
  ]
}
```

**Generation rules:**
- Tailor every paragraph to the specific offer and company
- Highlight experiences that match the requirements
- List all personalizations explicitly
- Write in French unless the profile/offer indicates otherwise
- Never invent information

---

## Rules

- **Never** call `/api/offers/{id}/match`, `/api/offers/{id}/generate/cv`, or `/api/offers/{id}/generate/ldm` — those cost credits. Do the work yourself and use `save_cv` / `save_ldm`.
- **403** on `get_profile` or `get_match_context` → user has no parsed CV, ask them to upload in kjob settings (Profile tab).
- **402** on `scan_offer` → insufficient credits.

---

## Installation

```sh
mkdir -p ~/.claude/skills/kjob-mcp
cp node_modules/@kjob/mcp-server/SKILL.md ~/.claude/skills/kjob-mcp/SKILL.md
```
