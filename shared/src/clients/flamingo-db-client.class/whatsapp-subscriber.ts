import { InferModel } from 'drizzle-orm'
import { pgEnum, pgTable, date, varchar, integer } from 'drizzle-orm/pg-core'

const whatsappContentLanguageEnum = pgEnum('whatsapp_content_language', [
  'english',
  'chinese',
  'malay',
  'tamil',
])

export const whatsappSubscribers = pgTable('whatsapp_subscribers', {
  phoneNumber: varchar('phoneNumber', { length: 255 }).primaryKey(),
  whatsappId: varchar('phoneNumber', { length: 255 }),
  language: whatsappContentLanguageEnum('language').array(),
  submissionDate: date('submissionDate'),
  submissionId: varchar('submissionId', { length: 255 }).array(),
  apiClientId: integer('apiClientId'),
  unsubscribeId: varchar('unsubscribeId', { length: 255 }).array(),
  unsubscribeDate: date('unsubscribeDate'),
  createdAt: date('createdAt'),
  updatedAt: date('updatedAt'),
})

export type WhatsAppSubscribers = InferModel<typeof whatsappSubscribers>
