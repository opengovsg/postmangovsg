import { integer, pgTable, varchar } from 'drizzle-orm/pg-core'

// underspecified, just specifying the columns we need for now
export const users = pgTable('users', {
  id: integer('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
})
