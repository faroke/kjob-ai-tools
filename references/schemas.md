# kjob — Schemas

## ParsedOfferContent (for `create_offer`)

```json
{
  "title": "string | null",
  "company": "string | null",
  "location": "string | null",
  "contractType": "string | null — CDI, CDD, Freelance, Stage, Alternance…",
  "salary": "string | null",
  "description": "string | null — full job description, max 5000 chars",
  "requirements": ["string"],
  "benefits": ["string"]
}
```

---

## CvContentJson (for `save_cv`)

```json
{
  "header": {
    "fullName": "string",
    "title": "string — job title adapted to the offer",
    "email": "string",
    "phone": "string (optional)",
    "location": "string (optional)"
  },
  "summary": "string — 2-3 punchy sentences tailored to the offer",
  "experience": [
    {
      "company": "string",
      "role": "string",
      "period": "string",
      "highlights": ["string — action verb + quantified result"]
    }
  ],
  "education": [{ "institution": "string", "degree": "string", "year": "string" }],
  "skills": [
    { "category": "string — e.g. Langages, Frameworks, Outils", "items": ["string"] }
  ],
  "languages": [{ "name": "string", "level": "string" }]
}
```

> **Common mistakes — these WILL crash the frontend:**
> - `skills` must be `{ category, items[] }[]` — **never** a flat `string[]`
> - `experience[].highlights` must be `string[]` — **never** `description` or `summary`
> - `languages[].name` must be `name` — **never** `language`

**Generation rules:**
- Adapt summary and highlights to the offer requirements
- Group skills by category (Langages, Frameworks, Outils, Méthodologies…)
- Use action verbs and metrics in highlights
- If `confirmedSkillsContext` is present, include those skills first
- Never invent information — only use data from `parsedCvJson`

---

## LdmContentJson (for `save_ldm`)

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
