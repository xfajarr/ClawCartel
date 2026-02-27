import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { FastifyInstance } from 'fastify'
import runService from '#app/modules/run/run.service'
import { AgentRole, StartRunBody, StreamEvent } from '#app/modules/agent/agent.interface'
import {
  AgentRun,
  EventType,
  InputType,
  Run,
} from '#app/modules/run/run.interface'
import Logger from '#app/utils/logger'

const execFileAsync = promisify(execFile)

const ROLE_AGENT_MAP: Record<AgentRole, string> = {
  pm: 'pm-agent',
  fe: 'fe-agent',
  'be_sc': 'be-sc-agent',
  marketing: 'marketing-agent',
}

const ROLES: AgentRole[] = ['pm', 'fe', 'be_sc', 'marketing']

const OPENCLAW_BIN = process.env.OPENCLAW_BIN ?? 'openclaw'
const OPENCLAW_TIMEOUT_SECONDS = parseInt(process.env.OPENCLAW_AGENT_TIMEOUT_SECONDS ?? '120')
const OPENCLAW_ENABLED = (process.env.OPENCLAW_AGENT_ENABLED ?? 'true') === 'true'
const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL
const OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN
const OPENCLAW_GATEWAY_PASSWORD = process.env.OPENCLAW_GATEWAY_PASSWORD

const OPENCLAW_BRIDGE_URL = process.env.OPENCLAW_BRIDGE_URL
const OPENCLAW_BRIDGE_TOKEN = process.env.OPENCLAW_BRIDGE_TOKEN

const ROLE_SYSTEM_PROMPT: Record<AgentRole, string> = {
  pm: 'You are PM agent. Lead direction, prioritize trade-offs, and keep discussion actionable.',
  fe: 'You are FE agent. Focus on frontend architecture, websocket rendering, and UX states.',
  'be_sc': 'You are BE+SC agent. Focus on backend APIs, persistence, queue flow, and Solana integration.',
  marketing: 'You are Marketing agent. Create concise positioning, launch copy, and GTM suggestions.',
}

const FALLBACK_LOGS: Record<AgentRole, string[]> = {
  pm: [
    'PM: Clarifying objective and expected output format',
    'PM: Defining scope and assigning specialist focus areas',
    'PM: Consolidating all points into a clear execution plan',
  ],
  fe: [
    'FE: Mapping chat + PRD input UX and live monitor UI states',
    'FE: Defining websocket event rendering and reconnect behavior',
    'FE: Proposing frontend milestones and acceptance checks',
  ],
  'be_sc': [
    'BE+SC: Designing run/event persistence and replay model',
    'BE+SC: Defining agent orchestration APIs and worker boundaries',
    'BE+SC: Mapping Solana integration entry points and idempotency',
  ],
  marketing: [
    'Marketing: Drafting core narrative and positioning statement',
    'Marketing: Building launch messaging angle per target persona',
    'Marketing: Turning output into concise campaign/action bullets',
  ],
}

function buildRolePrompt(role: AgentRole, inputText: string, mode: 'single' | 'squad'): string {
  return [
    ROLE_SYSTEM_PROMPT[role],
    `Mode: ${mode}.`,
    'Context: ClawCartel brainstorming execution.',
    `User input: ${inputText}`,
    'Respond with concise actionable output in plain text.',
    'Keep it under 8 bullet points and include concrete next actions.',
  ].join('\n')
}

async function checkGatewayConnectivity(): Promise<void> {
  if (!OPENCLAW_ENABLED) return

  if (OPENCLAW_BRIDGE_URL) {
    const res = await fetch(`${OPENCLAW_BRIDGE_URL.replace(/\/$/, '')}/health`, {
      headers: {
        ...(OPENCLAW_BRIDGE_TOKEN ? { Authorization: `Bearer ${OPENCLAW_BRIDGE_TOKEN}` } : {}),
      },
    })

    if (!res.ok) {
      throw new Error(`Bridge health check failed: ${res.status} ${res.statusText}`)
    }

    return
  }

  await execFileAsync(OPENCLAW_BIN, ['health', '--json'], {
    maxBuffer: 2 * 1024 * 1024,
    timeout: 15_000,
    env: {
      ...process.env,
      ...(OPENCLAW_GATEWAY_URL ? { OPENCLAW_GATEWAY_URL } : {}),
      ...(OPENCLAW_GATEWAY_TOKEN ? { OPENCLAW_GATEWAY_TOKEN } : {}),
      ...(OPENCLAW_GATEWAY_PASSWORD ? { OPENCLAW_GATEWAY_PASSWORD } : {}),
    },
  })
}

function chunkText(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const lines = trimmed
    .split(/\n+/)
    .map(l => l.trim())
    .filter(Boolean)

  if (lines.length > 1) return lines

  return trimmed
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean)
}

async function runOpenClawAgent(
  role: AgentRole,
  inputText: string,
  mode: 'single' | 'squad'
): Promise<{
  text: string
  meta: {
    model?: string
    provider?: string
    sessionId?: string
    usage?: Record<string, unknown>
    runId?: string
  }
}> {
  const agentId = ROLE_AGENT_MAP[role]
  const prompt = buildRolePrompt(role, inputText, mode)

  if (OPENCLAW_BRIDGE_URL) {
    const res = await fetch(`${OPENCLAW_BRIDGE_URL.replace(/\/$/, '')}/api/agent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(OPENCLAW_BRIDGE_TOKEN ? { Authorization: `Bearer ${OPENCLAW_BRIDGE_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        agentId,
        role,
        message: prompt,
        timeoutSeconds: OPENCLAW_TIMEOUT_SECONDS,
      }),
    })

    if (!res.ok) {
      throw new Error(`Bridge agent call failed: ${res.status} ${res.statusText}`)
    }

    const parsed = await res.json() as {
      text?: string
      meta?: {
        model?: string
        provider?: string
        sessionId?: string
        usage?: Record<string, unknown>
        runId?: string
      }
    }

    return {
      text: parsed?.text?.trim() || 'No response text from bridge agent.',
      meta: parsed?.meta ?? {},
    }
  }

  const args = [
    'agent',
    '--agent',
    agentId,
    '--message',
    prompt,
    '--json',
    '--timeout',
    String(OPENCLAW_TIMEOUT_SECONDS),
    '--verbose',
    'off',
  ]

  const { stdout } = await execFileAsync(OPENCLAW_BIN, args, {
    maxBuffer: 8 * 1024 * 1024,
    env: {
      ...process.env,
      ...(OPENCLAW_GATEWAY_URL ? { OPENCLAW_GATEWAY_URL } : {}),
      ...(OPENCLAW_GATEWAY_TOKEN ? { OPENCLAW_GATEWAY_TOKEN } : {}),
      ...(OPENCLAW_GATEWAY_PASSWORD ? { OPENCLAW_GATEWAY_PASSWORD } : {}),
    },
  })

  const parsed = JSON.parse(stdout)
  const payloads = parsed?.result?.payloads ?? []
  const text = payloads
    .map((p: { text?: string }) => p?.text ?? '')
    .filter(Boolean)
    .join('\n')
    .trim()

  return {
    text: text || 'No response text from OpenClaw agent.',
    meta: {
      model: parsed?.result?.meta?.agentMeta?.model,
      provider: parsed?.result?.meta?.agentMeta?.provider,
      sessionId: parsed?.result?.meta?.agentMeta?.sessionId,
      usage: parsed?.result?.meta?.agentMeta?.lastCallUsage ?? parsed?.result?.meta?.agentMeta?.usage,
      runId: parsed?.runId,
    },
  }
}

async function appendAndBroadcast(
  app: FastifyInstance,
  runId: string,
  agentRun: AgentRun,
  role: AgentRole,
  eventType: EventType,
  payload: Record<string, unknown>
): Promise<StreamEvent> {
  const event = await runService.createAgentEvent({
    runId,
    agentRunId: agentRun.id,
    eventType,
    payload,
  })

  const streamEvent: StreamEvent = {
    runId,
    agentRunId: agentRun.id,
    role,
    seq: Number(event.seq),
    eventType,
    payload,
    createdAt: event.createdAt,
  }

  app.io.to(`run:${runId}`).emit('agent_event', streamEvent)

  return streamEvent
}

async function executeRole(
  app: FastifyInstance,
  run: Run,
  agentRun: AgentRun,
  role: AgentRole,
  inputText: string,
  mode: 'single' | 'squad'
): Promise<void> {
  await runService.updateAgentRun(agentRun.id, {
    status: 'running',
    startedAt: new Date(),
  })

  const runtimeSource = OPENCLAW_ENABLED
    ? (OPENCLAW_BRIDGE_URL ? 'bridge' : 'openclaw')
    : 'fallback'

  await appendAndBroadcast(app, run.id, agentRun, role, 'agent.started', {
    message: `${role} started`,
    source: runtimeSource,
    agentId: ROLE_AGENT_MAP[role],
    mode,
  })

  try {
    let latestAgentMeta: Record<string, unknown> | undefined

    if (OPENCLAW_ENABLED) {
      await appendAndBroadcast(app, run.id, agentRun, role, 'agent.delta', {
        message: `${role}: contacting ${OPENCLAW_BRIDGE_URL ? 'bridge endpoint' : 'OpenClaw agent'}...`,
        source: runtimeSource,
      })

      const result = await runOpenClawAgent(role, inputText, mode)
      latestAgentMeta = result.meta
      const chunks = chunkText(result.text)

      if (chunks.length === 0) {
        await appendAndBroadcast(app, run.id, agentRun, role, 'agent.delta', {
          message: `${role}: no content returned`,
          source: runtimeSource,
          agentMeta: result.meta,
        })
      } else {
        for (const chunk of chunks) {
          await appendAndBroadcast(app, run.id, agentRun, role, 'agent.delta', {
            message: chunk,
            source: runtimeSource,
            agentMeta: result.meta,
          })
        }
      }
    } else {
      for (const line of FALLBACK_LOGS[role]) {
        await appendAndBroadcast(app, run.id, agentRun, role, 'agent.delta', {
          message: line,
          source: 'fallback',
        })
      }
    }

    await appendAndBroadcast(app, run.id, agentRun, role, 'agent.done', {
      message: `${role} completed`,
      source: runtimeSource,
      ...(latestAgentMeta ? { agentMeta: latestAgentMeta } : {}),
    })

    await runService.updateAgentRun(agentRun.id, {
      status: 'completed',
      endedAt: new Date(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown agent error'

    await appendAndBroadcast(app, run.id, agentRun, role, 'agent.error', {
      message,
      source: runtimeSource,
    })

    await runService.updateAgentRun(agentRun.id, {
      status: 'failed',
      endedAt: new Date(),
    })
  }
}

async function processRun(
  app: FastifyInstance,
  run: Run,
  inputText: string,
  mode: 'single' | 'squad',
  roles: AgentRole[],
  parallel: boolean
): Promise<void> {
  const agentRuns = await Promise.all(
    roles.map(role =>
      runService.createAgentRun({
        runId: run.id,
        role,
        agentId: ROLE_AGENT_MAP[role],
        status: 'queued',
      })
    )
  )

  await runService.updateRun(run.id, { status: 'executing' })

  if (parallel) {
    await Promise.all(
      agentRuns.map(agentRun => executeRole(app, run, agentRun, agentRun.role as AgentRole, inputText, mode))
    )
  } else {
    for (const agentRun of agentRuns) {
      await executeRole(app, run, agentRun, agentRun.role as AgentRole, inputText, mode)
    }
  }

  const latest = await runService.getRunWithAgentRuns(run.id)
  const hasFailure = latest?.agentRuns.some(a => a.status === 'failed') ?? false

  await runService.updateRun(run.id, {
    status: hasFailure ? 'failed' : 'completed',
  })

  const pmOrFirst = agentRuns.find(a => a.role === 'pm') ?? agentRuns[0]
  if (pmOrFirst) {
    await appendAndBroadcast(app, run.id, pmOrFirst, (pmOrFirst.role as AgentRole), 'run.done', {
      message: hasFailure ? 'Run completed with errors' : 'Run completed',
      source: OPENCLAW_ENABLED ? (OPENCLAW_BRIDGE_URL ? 'bridge' : 'openclaw') : 'fallback',
      mode,
      parallel,
      roles,
    })
  }
}

const AgentService = {
  startRun: async (app: FastifyInstance, body: StartRunBody): Promise<Run> => {
    const inputText = body.prdText?.trim() || body.idea?.trim() || ''
    if (!inputText) {
      throw new Error('idea or prdText is required')
    }

    const inputType: InputType = body.source ?? (body.prdText ? 'prd' : 'chat')
    const mode: 'single' | 'squad' = body.mode ?? 'squad'
    const roles: AgentRole[] = mode === 'single'
      ? [body.role ?? 'pm']
      : ROLES
    const parallel = mode === 'squad' ? (body.parallel ?? true) : false

    const run = await runService.createRun({
      inputType,
      inputText,
      status: 'planning',
    })

    try {
      await checkGatewayConnectivity()
    } catch (error) {
      await runService.updateRun(run.id, { status: 'failed' })
      const message = error instanceof Error ? error.message : 'Gateway connectivity check failed'
      throw new Error(`OpenClaw gateway unreachable: ${message}`)
    }

    void processRun(app, run, inputText, mode, roles, parallel)
      .catch(async (error) => {
        Logger.error({ err: error, runId: run.id }, 'Agent run processing failed')
        await runService.updateRun(run.id, { status: 'failed' })
      })

    const latestRun = await runService.getRun(run.id)

    return latestRun ?? run
  },

  getRun: (runId: string) => runService.getRunWithAgentRuns(runId),

  getEvents: (runId: string, fromSeq?: number) =>
    runService.replayEvents(runId, {
      fromSeq,
    }),
}

export default AgentService
