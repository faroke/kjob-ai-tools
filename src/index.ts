#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

const API_URL = process.env.KJOB_API_URL?.replace(/\/$/, '')
const API_KEY = process.env.KJOB_API_KEY

if (!API_URL) {
  console.error('KJOB_API_URL is required (e.g. https://your-kjob.app)')
  process.exit(1)
}
if (!API_KEY || !API_KEY.startsWith('kjob_')) {
  console.error('KJOB_API_KEY is required and must start with "kjob_"')
  process.exit(1)
}

const MatchContextInputSchema = z.object({
  offerId: z.string().uuid('offerId must be a valid UUID'),
})

const ScanInputSchema = z.object({
  rawContent: z
    .string()
    .min(1, 'rawContent is required')
    .max(100_000, 'rawContent exceeds 100 000 characters'),
  sourceUrl: z.string().url().max(2048).optional(),
})

type ScanResult =
  | { ok: true; offerId: string }
  | { ok: false; code: string; message: string }

async function scanOffer(input: z.infer<typeof ScanInputSchema>): Promise<ScanResult> {
  const res = await fetch(`${API_URL}/api/offers/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(input),
  })

  if (res.status === 401) return { ok: false, code: 'UNAUTHORIZED', message: 'Invalid API key' }
  if (res.status === 402)
    return { ok: false, code: 'INSUFFICIENT_CREDITS', message: 'Not enough credits to scan' }
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => '')
    return { ok: false, code: `HTTP_${res.status}`, message: body.slice(0, 500) || res.statusText }
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let idx: number
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)

      let event = 'message'
      const dataLines: string[] = []
      for (const line of rawEvent.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
      }
      if (dataLines.length === 0) continue

      try {
        const data = JSON.parse(dataLines.join('\n'))
        if (event === 'complete' && typeof data?.offerId === 'string') {
          return { ok: true, offerId: data.offerId }
        }
        if (event === 'error') {
          return {
            ok: false,
            code: typeof data?.code === 'string' ? data.code : 'EXTRACTION_FAILED',
            message: 'Scan failed',
          }
        }
      } catch {
        // ignore malformed event
      }
    }
  }

  return { ok: false, code: 'STREAM_CLOSED', message: 'Stream ended without a result' }
}

const server = new Server(
  { name: 'kjob-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_profile',
      description:
        'Fetch the candidate\'s structured CV and job preferences. Call this at the start of a session to understand who you are helping — no offerId needed. Returns parsedCvJson (experiences, skills, education), confirmedSkillsContext, and job preferences (targetRole, targetSectors, targetLocation, targetSalaryRange).',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_match_context',
      description:
        'Fetch offer details and candidate CV data for a local match analysis. Use this to analyse fit WITHOUT spending kjob credits — do the scoring yourself based on the returned data.',
      inputSchema: {
        type: 'object',
        required: ['offerId'],
        properties: {
          offerId: {
            type: 'string',
            description: 'The offer UUID returned by scan_offer.',
          },
        },
      },
    },
    {
      name: 'scan_offer',
      description:
        'Scan a raw job offer (text or HTML) with kjob. Extracts title, company, location, requirements, etc. and saves it as an Offer. Returns the offerId on success. Costs credits.',
      inputSchema: {
        type: 'object',
        required: ['rawContent'],
        properties: {
          rawContent: {
            type: 'string',
            maxLength: 100000,
            description: 'Raw offer content (plain text or HTML), up to 100 000 characters.',
          },
          sourceUrl: {
            type: 'string',
            format: 'uri',
            maxLength: 2048,
            description: 'Optional URL the offer was copied from.',
          },
        },
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name === 'get_profile') {
    const res = await fetch(`${API_URL}/api/mcp/profile`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })

    if (res.status === 401) {
      return { isError: true, content: [{ type: 'text', text: 'UNAUTHORIZED: Invalid API key' }] }
    }
    if (res.status === 404) {
      return { isError: true, content: [{ type: 'text', text: 'NOT_FOUND: Profile not found' }] }
    }
    if (res.status === 403) {
      return { isError: true, content: [{ type: 'text', text: 'FORBIDDEN: No CV parsed — ask the user to upload their CV in kjob settings first' }] }
    }
    if (!res.ok) {
      return { isError: true, content: [{ type: 'text', text: `HTTP_${res.status}: ${res.statusText}` }] }
    }

    const data = await res.json()
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
  }

  if (req.params.name === 'get_match_context') {
    const parsed = MatchContextInputSchema.safeParse(req.params.arguments ?? {})
    if (!parsed.success) {
      return {
        isError: true,
        content: [
          { type: 'text', text: `Invalid input: ${parsed.error.issues[0]?.message ?? 'bad args'}` },
        ],
      }
    }

    const res = await fetch(
      `${API_URL}/api/mcp/match-context/${parsed.data.offerId}`,
      { headers: { Authorization: `Bearer ${API_KEY}` } }
    )

    if (res.status === 401) {
      return { isError: true, content: [{ type: 'text', text: 'UNAUTHORIZED: Invalid API key' }] }
    }
    if (res.status === 404) {
      return { isError: true, content: [{ type: 'text', text: 'NOT_FOUND: Offer not found' }] }
    }
    if (res.status === 403) {
      return { isError: true, content: [{ type: 'text', text: 'FORBIDDEN: No CV parsed for this profile' }] }
    }
    if (!res.ok) {
      return { isError: true, content: [{ type: 'text', text: `HTTP_${res.status}: ${res.statusText}` }] }
    }

    const data = await res.json()
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
  }

  if (req.params.name !== 'scan_offer') {
    return {
      isError: true,
      content: [{ type: 'text', text: `Unknown tool: ${req.params.name}` }],
    }
  }

  const parsed = ScanInputSchema.safeParse(req.params.arguments ?? {})
  if (!parsed.success) {
    return {
      isError: true,
      content: [
        { type: 'text', text: `Invalid input: ${parsed.error.issues[0]?.message ?? 'bad args'}` },
      ],
    }
  }

  const result = await scanOffer(parsed.data)
  if (!result.ok) {
    return {
      isError: true,
      content: [{ type: 'text', text: `${result.code}: ${result.message}` }],
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: `Offer created. offerId=${result.offerId}\nOpen: ${API_URL}/app/offers?offerId=${result.offerId}`,
      },
    ],
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error('kjob-mcp fatal:', err)
  process.exit(1)
})
