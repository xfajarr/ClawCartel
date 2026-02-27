import { FastifyInstance } from 'fastify'

import UserRoutes from '#app/modules/user/user.route'

export default function (app: FastifyInstance) {
  app.register(UserRoutes, { prefix: '/user' })
}
