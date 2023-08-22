import { date, pgEnum, pgTable } from 'drizzle-orm/pg-core'

export const govsgMessages = pgTable('govsg_messages', {
  status: pgEnum('enum_govsg_messages_status', [
    'UNSENT',
    'ACCEPTED',
    'SENT',
    'DELIVERED',
    'READ',
    'ERROR',
    'INVALID_RECIPIENT',
    'DELETED',
  ])('status').notNull(),
  updatedAt: date('updated_at').notNull(),
})
