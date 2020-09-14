export interface EncryptionConfig {
  algorithm: string
  key: string
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
