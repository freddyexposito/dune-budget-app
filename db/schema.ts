import { integer, primaryKey, real, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Accounts are defined in config/accounts.ts — no accounts table in the DB.

export const transactions = sqliteTable('transactions', {
  fitId:   text('fit_id').notNull(),
  acctId:  text('acct_id').notNull(),   // must match an acctId in config/accounts.ts
  date:    text('date').notNull(),              // "2026-05-27"
  month:   text('month').generatedAlwaysAs(sql`substr(date, 1, 7)`, { mode: 'stored' }),
  amount:  real('amount').notNull(),
  name:    text('name'),
  memo:    text('memo'),
  trnType: text('trn_type'),                   // "DEBIT", "CREDIT"
  category: text('category'),
}, (t) => ({
  pk: primaryKey({ columns: [t.fitId, t.acctId] }),
}))

export const rules = sqliteTable('rules', {
  id:       integer('id').primaryKey({ autoIncrement: true }),
  position: integer('position').notNull().default(0),  // lower = higher priority
  pattern:  text('pattern').notNull(),
  category: text('category').notNull(),
})

export const budgets = sqliteTable('budgets', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  month:       text('month').notNull(),
  category:    text('category').notNull(),
  limitAmount: real('limit_amount').notNull(),
}, (t) => ({
  uniq: unique().on(t.month, t.category),
}))

export type Transaction = typeof transactions.$inferSelect
export type Budget      = typeof budgets.$inferSelect
export type Rule        = typeof rules.$inferSelect
