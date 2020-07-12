interface MessageBulkInsertInterface {
  campaignId: number
  recipient: string
  params: { [key: string]: string }
}

interface ProtectedMessageRecordInterface {
  campaignId: number
  recipient: string
  payload: string
  passwordHash: string
}

interface TestHydrationResult {
  records: MessageBulkInsertInterface[]
  hydratedRecord: { body: string; subject?: string }
}
