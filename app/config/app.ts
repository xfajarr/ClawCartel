import dotenv from 'dotenv'

dotenv.config()

const port = process.env.APP_PORT ?? '3000'

// Helper to decode base64 PEM key
const decodePemKey = (envVar: string, type: 'private' | 'public'): string => {
  const base64Key = process.env[envVar] ?? ''
  if (!base64Key) return ''

  const decoded = Buffer.from(base64Key, 'base64').toString('utf8')

  // If already has PEM headers, return as-is
  if (decoded.includes('-----BEGIN')) {
    return decoded
  }

  // Add PEM headers
  if (type === 'private') {
    return `-----BEGIN PRIVATE KEY-----\n${decoded}\n-----END PRIVATE KEY-----`
  }

  return `-----BEGIN PUBLIC KEY-----\n${decoded}\n-----END PUBLIC KEY-----`
}

const AppConfig = {
  app: {
    host: process.env.APP_HOST ?? '0.0.0.0',
    port: parseInt(port),
    gracefulShutdownTimeoutMs: parseInt(process.env.APP_GRACEFUL_SHUTDOWN_TIMEOUT_MS ?? '5000'),
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    url: process.env.APP_URL ?? `http://localhost:${port}`,
  },
  jwt: {
    privateKey: decodePemKey('JWT_PRIVATE_KEY', 'private'),
    publicKey: decodePemKey('JWT_PUBLIC_KEY', 'public'),
  },
  solana: {
    skipPreflight: process.env.SOLANA_SKIP_PREFLIGHT === 'true',
    rpcUrl: process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
    network: process.env.SOLANA_NETWORK ?? 'devnet',
  }
}

export default AppConfig
