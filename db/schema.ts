import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const entries = sqliteTable('entries', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  owner: text('owner').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  created: integer('created').notNull()
}, table=>[
 index("entries_kind_created").on(table.kind,table.created),
 index("entries_owner_kind").on(table.owner,table.kind),
 index("entries_subject_kind_created").on(table.subject,table.kind,table.created)
]);
