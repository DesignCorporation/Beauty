/**
 * RSA Key Management for OIDC/RS256
 * Beauty Platform Auth Service
 *
 * Phase 1: RSA Key Infrastructure for OIDC
 * - Generate, store, and rotate RSA key pairs
 * - Support both HS256 (legacy) and RS256 (OIDC)
 * - Provide JWKS endpoint data
 */

import crypto from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

export interface RSAKeyPair {
  publicKey: string
  privateKey: string
  kid: string // Key ID for JWKS
  alg: string // Algorithm (always RS256)
  use: string // 'sig' for signing
  createdAt: Date
}

export interface JWKSKey {
  kty: string // 'RSA'
  use: string // 'sig'
  kid: string // Key ID
  n: string // Modulus
  e: string // Exponent
  alg: string // RS256
}

/**
 * Generate RSA key pair for OIDC signing
 * Returns PEM-formatted keys suitable for JWT signing/verification
 */
export function generateRSAKeyPair(): RSAKeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  })

  const kid = generateKeyId()

  return {
    publicKey,
    privateKey,
    kid,
    alg: 'RS256',
    use: 'sig',
    createdAt: new Date()
  }
}

/**
 * Generate unique Key ID (kid) for JWKS
 * Format: beautysvc_<timestamp>_<random>
 */
function generateKeyId(): string {
  const timestamp = Date.now().toString(36)
  const random = crypto.randomBytes(8).toString('hex')
  return `beautysvc_${timestamp}_${random}`
}

/**
 * Convert RSA public key to JWK format for JWKS endpoint
 * Required for OIDC discovery
 */
export function publicKeyToJWK(publicKeyPem: string, kid: string): JWKSKey {
  // Parse PEM to extract components
  const publicKey = crypto.createPublicKey({
    key: publicKeyPem,
    format: 'pem'
  })

  const jwk = publicKey.export({ format: 'jwk' }) as any

  return {
    kty: jwk.kty || 'RSA',
    use: 'sig',
    kid: kid,
    n: jwk.n || '',
    e: jwk.e || 'AQAB',
    alg: 'RS256'
  }
}

/**
 * Save RSA key pair to filesystem (for development)
 * In production, keys should be loaded from secure vaults (AWS KMS, HashiCorp Vault, etc.)
 */
export async function saveKeyPairToFile(
  keyPair: RSAKeyPair,
  dirPath: string = './keys'
): Promise<void> {
  try {
    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true })

    // Save private key (PROTECTED - should be in .gitignore)
    const privateKeyPath = path.join(dirPath, `rsa_private_${keyPair.kid}.pem`)
    await fs.writeFile(privateKeyPath, keyPair.privateKey, { mode: 0o600 })

    // Save public key (can be shared)
    const publicKeyPath = path.join(dirPath, `rsa_public_${keyPair.kid}.pem`)
    await fs.writeFile(publicKeyPath, keyPair.publicKey)

    // Save metadata
    const metadataPath = path.join(dirPath, `rsa_metadata_${keyPair.kid}.json`)
    await fs.writeFile(
      metadataPath,
      JSON.stringify(
        {
          kid: keyPair.kid,
          alg: keyPair.alg,
          use: keyPair.use,
          createdAt: keyPair.createdAt.toISOString(),
          privateKeyPath: privateKeyPath,
          publicKeyPath: publicKeyPath
        },
        null,
        2
      )
    )

    console.log(`✅ RSA key pair saved (kid: ${keyPair.kid})`)
  } catch (error) {
    console.error('❌ Failed to save RSA key pair:', error)
    throw error
  }
}

/**
 * Load RSA key pair from filesystem
 */
export async function loadKeyPairFromFile(
  kid: string,
  dirPath: string = './keys'
): Promise<RSAKeyPair | null> {
  try {
    const privateKeyPath = path.join(dirPath, `rsa_private_${kid}.pem`)
    const publicKeyPath = path.join(dirPath, `rsa_public_${kid}.pem`)
    const metadataPath = path.join(dirPath, `rsa_metadata_${kid}.json`)

    // Check if files exist
    try {
      await fs.access(privateKeyPath)
      await fs.access(publicKeyPath)
    } catch {
      return null
    }

    const privateKey = await fs.readFile(privateKeyPath, 'utf-8')
    const publicKey = await fs.readFile(publicKeyPath, 'utf-8')
    const metadataStr = await fs.readFile(metadataPath, 'utf-8')
    const metadata = JSON.parse(metadataStr)

    return {
      privateKey,
      publicKey,
      kid: metadata.kid,
      alg: metadata.alg,
      use: metadata.use,
      createdAt: new Date(metadata.createdAt)
    }
  } catch (error) {
    console.error(`❌ Failed to load RSA key pair (${kid}):`, error)
    return null
  }
}

/**
 * List all available RSA keys
 */
export async function listRSAKeys(dirPath: string = './keys'): Promise<string[]> {
  try {
    const files = await fs.readdir(dirPath)
    const kids = new Set<string>()

    files.forEach(file => {
      const match = file.match(/^rsa_\w+_(.+)\./)
      if (match) {
        const kid = match[1]
        if (kid) {
          kids.add(kid)
        }
      }
    })

    return Array.from(kids)
  } catch (error) {
    console.error('❌ Failed to list RSA keys:', error)
    return []
  }
}

/**
 * Configuration for RSA key management
 * Loaded from environment or defaults
 */
export const RSA_CONFIG = {
  // Paths and storage
  keysDirectory: process.env.RSA_KEYS_DIR || './keys',
  useVault: process.env.USE_RSA_VAULT === 'true', // For AWS KMS, etc.

  // Key rotation
  rotationInterval: parseInt(process.env.RSA_ROTATION_INTERVAL || '86400000'), // 24 hours
  maxKeysToKeep: parseInt(process.env.RSA_MAX_KEYS || '3'), // Keep last 3 keys

  // Algorithm
  algorithm: 'RS256',
  modulusLength: 2048,

  // OIDC/Discovery
  issuer: process.env.OIDC_ISSUER || 'https://beauty.designcorp.eu',
  jwksUrl: process.env.JWKS_URL || 'https://beauty.designcorp.eu/.well-known/jwks.json',

  // Backward compatibility
  supportHS256: process.env.SUPPORT_HS256 === 'true' // Temporary during migration
}

/**
 * Export functions for use in auth-service
 */
export const RSAKeyManager = {
  generateKeyPair: generateRSAKeyPair,
  publicKeyToJWK,
  saveKeyPair: saveKeyPairToFile,
  loadKeyPair: loadKeyPairFromFile,
  listKeys: listRSAKeys,
  generateKeyId,
  config: RSA_CONFIG
}

export default RSAKeyManager
