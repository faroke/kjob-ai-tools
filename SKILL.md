---
name: kjob
description: kjob job application assistant. Provides /scan, /cv, /ldm and /kjob commands via the kjob MCP server. Triggers on any of these commands or when the user shares a job offer.
---

# kjob — Command Reference

## Tools

| Tool | Credits | Description |
|------|---------|-------------|
| `get_profile()` | Free | Candidate CV + preferences |
| `create_offer(rawContent, parsedContent, sourceUrl?)` | Free | Save a parsed offer |
| `get_match_context(offerId)` | Free | Offer details + candidate CV |
| `save_cv(offerId, content, tone?)` | Free | Save a generated CV |
| `save_ldm(offerId, content, tone?)` | Free | Save a generated cover letter |
| `scan_offer(rawContent, sourceUrl?)` | 5 credits | Parse via kjob AI — fallback only |

---

## /scan

Save a job offer to kjob. Input: URL or raw text.

1. `get_profile()` — if not already called this session
2. Extract `ParsedOfferContent` yourself from the raw text/HTML
3. `create_offer({ rawContent, parsedContent, sourceUrl? })` → `offerId`
4. Reply: `✓ Offre sauvegardée (offerId: …)`

---

## /cv [offerId]

Generate a tailored CV.

1. `get_match_context({ offerId })`
2. Generate `CvContentJson` — see [schemas](references/schemas.md)
3. `save_cv({ offerId, content })` → link
4. Reply with the link

---

## /ldm [offerId]

Generate a cover letter.

1. `get_match_context({ offerId })` — skip if already done
2. Generate `LdmContentJson` — see [schemas](references/schemas.md)
3. `save_ldm({ offerId, content })` → link
4. Reply with the link

---

## /kjob [offer_url_or_text]

Full workflow — scan → analyze → CV + LDM in one shot.

1. **Scan** — `/scan` → `offerId`
2. **Analyze** — score (0–100), top 3 strengths, top 3 gaps vs. candidate profile
3. **CV** — `/cv {offerId}` → link
4. **LDM** — `/ldm {offerId}` → link
5. **Summary:**
   ```
   ✓ kjob — {company} · {title}
   Match : {score}/100
   Atouts : …
   Axes d'amélioration : …
   CV  → {cv_link}
   LDM → {ldm_link}
   ```

---

## Rules

- **Always prefer `create_offer` over `scan_offer`** — extract `ParsedOfferContent` yourself, 0 credits.
- **Never** call `/api/offers/{id}/match`, `/api/offers/{id}/generate/cv`, or `/api/offers/{id}/generate/ldm` — those cost credits.
- **403** on `get_profile` or `get_match_context` → user has no parsed CV, ask them to upload at kjob.fr/app/profile (Profile tab).
- **402** on `scan_offer` → insufficient credits.

---

## Installation

```sh
npx skills add faroke/kjob-ai-tools
```
