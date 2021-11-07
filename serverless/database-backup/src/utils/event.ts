import { RdsEvent } from '../interfaces'

export const RDS_EVENTS = {
  BACKUP_COMPLETE: 'RDS-EVENT-0169',
}

export const parseRdsEvents = (event: any): Array<RdsEvent> => {
  return event.Records.map((record: any) => {
    const snsMessage = JSON.parse(record.Sns.Message)
    const eventId = snsMessage['Event ID'].split('#').pop()
    return {
      eventId,
      message: snsMessage['Event Message'],
    }
  })
}
