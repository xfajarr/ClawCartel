const AuthSchema = {
  siwsNonce: {
    body: {
      type: 'object',
      required: ['address'],
      properties: {
        address: { type: 'string', description: 'Solana wallet public key (base58)' },
      },
    },
    response: {
      200: {
        type: 'object',
        required: ['nonce', 'message', 'expiresAt'],
        properties: {
          nonce: { type: 'string', description: 'One-time nonce for SIWS' },
          message: { type: 'string', description: 'Message to sign (CAIP-74 format)' },
          expiresAt: { type: 'string', format: 'date-time', description: 'Nonce expiry time' },
        },
      },
    },
  },

  siwsVerify: {
    body: {
      type: 'object',
      required: ['address', 'message', 'signature'],
      properties: {
        address: { type: 'string', description: 'Solana wallet public key (base58)' },
        message: { type: 'string', description: 'SIWS message that was signed' },
        signature: { type: 'string', description: 'Ed25519 signature (base58)' },
      },
    },
    response: {
      200: {
        type: 'object',
        required: ['token', 'userId', 'walletAddress'],
        properties: {
          token: { type: 'string', description: 'RS256 JWT — use as Bearer token' },
          userId: { type: 'integer', description: 'Authenticated user id' },
          walletAddress: { type: ['string', 'null'], description: 'Wallet address' },
        },
      },
    },
  },
}

export default AuthSchema
