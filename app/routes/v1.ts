import { FastifyInstance } from 'fastify'

import UserRoutes from '#app/modules/user/user.route'
import UploadRoutes from '#app/modules/upload/upload.route'

export default function (app: FastifyInstance) {
  app.register(UserRoutes, { prefix: '/user' })
  app.register(UploadRoutes, { prefix: '/upload' })
}
