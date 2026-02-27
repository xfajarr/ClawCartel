import dotenv from 'dotenv'

dotenv.config()

const AppConfig = {
  app: {
    host: process.env.APP_HOST ?? '0.0.0.0',
    port: parseInt(process.env.APP_PORT ?? '3000'),
    gracefulShutdownTimeoutMs: parseInt(process.env.APP_GRACEFUL_SHUTDOWN_TIMEOUT_MS ?? '5000'),
  }
}

export default AppConfig
