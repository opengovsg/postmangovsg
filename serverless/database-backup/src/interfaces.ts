import crypto from 'crypto'

export interface EncryptionConfig {
  algorithm: crypto.CipherGCMTypes
  keySize: number
  keyEncryptionAlgorithm: string
  keyEncryptionPublicKey: string
}

export interface DatabaseConfig {
  databaseUri: string
  useIam: boolean
  ssl: { mode: string; cert: string }
}

export interface RdsEvent {
  eventId: string
  message: string
}

export interface Cronitor {
  run: () => Promise<void>
  complete: () => Promise<void>
  fail: (message?: string) => Promise<void>
}
