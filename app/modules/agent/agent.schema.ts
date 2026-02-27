const AgentSchema = {
  startRun: {
    body: {
      type: 'object',
      anyOf: [
        { required: ['idea'] },
        { required: ['prdText'] },
      ],
      properties: {
        idea: { type: 'string', minLength: 1 },
        prdText: { type: 'string', minLength: 1 },
        source: { type: 'string', enum: ['chat', 'prd'] },
        mode: { type: 'string', enum: ['single', 'squad'], default: 'squad' },
        role: { type: 'string', enum: ['pm', 'fe', 'be_sc', 'marketing'] },
        parallel: { type: 'boolean', default: true },
      },
    },
  },
  runParams: {
    params: {
      type: 'object',
      required: ['runId'],
      properties: {
        runId: { type: 'string' },
      },
    },
  },
  eventsQuery: {
    querystring: {
      type: 'object',
      properties: {
        fromSeq: { type: 'number', minimum: 1 },
      },
    },
  },
}

export default AgentSchema
