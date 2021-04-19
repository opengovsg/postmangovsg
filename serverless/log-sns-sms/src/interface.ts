export interface LogEvent {
  id: string
  timestamp: number
  message: string
}

// Reference https://docs.aws.amazon.com/sns/latest/dg/sms_stats_cloudwatch.html
export interface SmsDeliveryEvent {
  notification: { messageId: string; timestamp: string }
  delivery: Record<string, string | number>
  status: 'SUCCESS' | 'FAILURE'
}
