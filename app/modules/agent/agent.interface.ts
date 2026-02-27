export type AgentRole = 'pm' | 'fe' | 'be_sc' | 'marketing'
export type AgentEventType = 'agent.started' | 'agent.delta' | 'agent.done' | 'agent.error' | 'run.done'

export interface StartRunBody {
  idea?: string
  prdText?: string
  source?: 'chat' | 'prd'
  mode?: 'single' | 'squad'
  role?: AgentRole
  parallel?: boolean
}

export interface RunParams {
  runId: string
}

export interface EventsQuery {
  fromSeq?: number
}

export interface StreamEvent {
  runId: string
  agentRunId: string
  role: AgentRole
  seq: number
  eventType: AgentEventType
  payload: Record<string, unknown>
  createdAt?: Date
}
