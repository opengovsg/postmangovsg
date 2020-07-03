interface MessageBulkInsertInterface {
  campaignId: number
  recipient: string
  params: { [key: string]: string }
}

interface ProtectedMessageRecordsInterface {
  campaignId: number
  recipient: string
  payload: string
  passwordHash: string
}

interface ProtectedMessageBulkInsertInterface
  extends ProtectedMessageRecordsInterface {
  id: string
}

interface TestHydrationResult {
  records: MessageBulkInsertInterface[]
  hydratedRecord: { body: string; subject?: string }
}
