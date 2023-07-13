import { InferModel } from "drizzle-orm";
import { pgTable, date, varchar, integer } from "drizzle-orm/pg-core";

export const apiKeys = pgTable("api_keys", {
  id: integer("id").primaryKey(),
  userId: integer("user_id").notNull(), // omit foreign key reference for now
  label: varchar("label", { length: 255 }).notNull(),
  hash: varchar("hash", { length: 255 }).notNull(),
  lastFive: varchar("last_five", { length: 5 }).notNull(),
  validUntil: date("valid_until").notNull(),
  notificationContacts: varchar("notification_contacts", {
    length: 255,
  }).array(),
  createdAt: date("created_at").notNull(),
  updatedAt: date("updated_at").notNull(),
  deletedAt: date("deleted_at"),
});

export type ApiKey = InferModel<typeof apiKeys>;
