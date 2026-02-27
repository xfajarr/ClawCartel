import { FastifyInstance } from 'fastify'
import runService from '#app/modules/run/run.service'
import { AgentRole, StartRunBody, StreamEvent } from '#app/modules/agent/agent.interface'
import {
  AgentRun,
  EventType,
  InputType,
  Run,
} from '#app/modules/run/run.interface'

const ROLE_AGENT_MAP: Record<AgentRole, string> = {
  pm: 'pm-agent',
  fe: 'fe-agent',
  'be_sc': 'be-sc-agent',
  marketing: 'marketing-agent',
}

const ROLES: AgentRole[] = ['pm', 'fe', 'be_sc', 'marketing']

const ROLE_LOGS: Record<AgentRole, string[]> = {
  pm: [
    'PM: Breaking down the project scope and constraints',
    'PM: Assigning FE, BE+SC, and Marketing workstreams',
    'PM: Consolidating outputs into one execution plan',
  ],
  fe: [
    'FE: Defining mobile flow for chat/PRD input and run timeline',
    'FE: Mapping websocket event rendering for agent bubbles',
    'FE: Preparing reconnect + replay behavior using seq cursor',
  ],
  'be_sc': [
    'BE+SC: Designing run/event persistence schema and indexing',
    'BE+SC: Preparing Solana Devnet execution integration points',
    'BE+SC: Finalizing API contract for run start and status tracking',
  ],
  marketing: [
    'Marketing: Drafting ClawCartel narrative for hackathon judges',
    'Marketing: Preparing launch message based on agent output timeline',
    'Marketing: Proposing concise product positioning and CTA',
  ],
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

const AgentService = {
  startRun: async (app: FastifyInstance, body: StartRunBody): Promise<Run> => {
    const inputText = body.prdText?.trim() || body.idea?.trim() || ''
    const inputType: InputType = body.source ?? (body.prdText ? 'prd' : 'chat')

    const run = await runService.createRun({
      inputType,
      inputText,
      status: 'planning',
    })

    const agentRuns = await Promise.all(
      ROLES.map(role =>
        runService.createAgentRun({
          runId: run.id,
          role,
          agentId: ROLE_AGENT_MAP[role],
          status: 'queued',
        })
      )
    )

    await Promise.all(
      agentRuns.map(async agentRun => {
        const role = agentRun.role as AgentRole

        await runService.updateAgentRun(agentRun.id, {
          status: 'running',
          startedAt: new Date(),
        })

        await appendAndBroadcast(app, run.id, agentRun, role, 'agent.started', {
          message: `${role} started`,
          source: 'backend-simulated',
        })

        for (const line of ROLE_LOGS[role]) {
          await appendAndBroadcast(app, run.id, agentRun, role, 'agent.delta', {
            message: line,
            source: 'backend-simulated',
          })
        }

        await appendAndBroadcast(app, run.id, agentRun, role, 'agent.done', {
          message: `${role} completed`,
          source: 'backend-simulated',
        })

        await runService.updateAgentRun(agentRun.id, {
          status: 'completed',
          endedAt: new Date(),
        })
      })
    )

    await runService.updateRun(run.id, { status: 'completed' })

    const pmAgentRun = agentRuns.find(a => a.role === 'pm') ?? agentRuns[0]
    if (pmAgentRun) {
      await appendAndBroadcast(app, run.id, pmAgentRun, 'pm', 'run.done', {
        message: 'Run completed',
        source: 'backend-simulated',
      })
    }

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
