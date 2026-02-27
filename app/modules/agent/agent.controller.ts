import { FastifyReply, FastifyRequest } from 'fastify'
import {
  EventsQuery,
  RunParams,
  StartRunBody,
} from '#app/modules/agent/agent.interface'
import AgentService from '#app/modules/agent/agent.service'

const AgentController = {
  startRun: async (
    request: FastifyRequest<{ Body: StartRunBody }>,
    reply: FastifyReply
  ) => {
    const run = await AgentService.startRun(request.server, request.body)

    return reply.json(run, 201)
  },

  getRun: async (
    request: FastifyRequest<{ Params: RunParams }>,
    reply: FastifyReply
  ) => {
    const run = await AgentService.getRun(request.params.runId)

    return reply.json(run)
  },

  getEvents: async (
    request: FastifyRequest<{ Params: RunParams; Querystring: EventsQuery }>,
    reply: FastifyReply
  ) => {
    const events = await AgentService.getEvents(
      request.params.runId,
      request.query.fromSeq
    )

    return reply.json(events)
  },
}

export default AgentController
