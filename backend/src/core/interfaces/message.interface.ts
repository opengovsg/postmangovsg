export interface MessageBulkInsertInterface {
  campaignId: number
  recipient: string
  params: { [key: string]: string }
}

export interface ProtectedMessageRecordInterface {
  campaignId: number
  id: string
  recipient: string
  payload: string
  passwordHash: string
}
