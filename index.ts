import '#app/config/env'
import Fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import routes from '#app/routes/index'
import AppConfig from '#app/config/app'
import FastifyUtil from '#app/utils/fastify'
import Logger from '#app/utils/logger'
import { registerSocket } from '#app/utils/socket'

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss.l',
      },
    },
  },
  disableRequestLogging: true,
});

(async () => {
  try {
    FastifyUtil.setResponseLogger(fastify)
    FastifyUtil.decorateReply(fastify)
    FastifyUtil.setErrorHandler(fastify)
    FastifyUtil.setJsonParser(fastify)

    await FastifyUtil.registerHelmet(fastify)
    await FastifyUtil.registerCors(fastify)
    await FastifyUtil.registerRateLimit(fastify)
    await FastifyUtil.registerMultipart(fastify)
    await fastify.register(fastifyJwt, {
      secret: {
        private: AppConfig.jwt.privateKey,
        public: AppConfig.jwt.publicKey,
      },
      sign: { algorithm: 'RS256' },
    })

    // Swagger documentation
    await fastify.register(fastifySwagger, {
      openapi: {
        info: {
          title: 'ClawCartel API',
          description: 'AI Agent Squad - Autonomous Discussion & Code Generation',
          version: '1.0.0',
        },
        servers: [
          { url: 'http://localhost:3000', description: 'Local development' },
        ],
        tags: [
          { name: 'Autonomous', description: 'Autonomous multi-agent discussion & code generation' },
          { name: 'Agent', description: 'Legacy agent endpoints' },
          { name: 'Auth', description: 'Authentication' },
          { name: 'User', description: 'User management' },
          { name: 'Run', description: 'Run management' },
        ],
      },
    })
    await fastify.register(fastifySwaggerUi, {
      routePrefix: '/documentation',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
    })

    await fastify.register(routes)

    registerSocket(fastify)

    await fastify.ready()

    const { host, port } = AppConfig.app
    await fastify.listen({ host, port })
  } catch (e) {
    Logger.error(e, 'Error starting server: ')
    process.exit(1)
  }
})()
