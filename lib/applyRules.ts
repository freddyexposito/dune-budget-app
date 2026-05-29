import { db } from '@/db'
import { rules, transactions } from '@/db/schema'
import { and, eq, isNull, or } from 'drizzle-orm'

/**
 * Applies all rules to transactions.
 *
 * @param fitIds  Optional list of fitId+acctId pairs to limit scope (e.g. freshly imported rows).
 *                When omitted, runs against all uncategorized transactions.
 * @param overwrite  When true, overwrites existing categories too.
 * @returns Number of transactions that were categorized.
 */
export async function applyRules({
  scope,
  overwrite = false,
  month,
}: {
  scope?:     { fitId: string; acctId: string }[]
  overwrite?: boolean
  month?:     string
} = {}): Promise<number> {
  const allRules = await db.select().from(rules).orderBy(rules.position)
  if (allRules.length === 0) return 0

  // Fetch candidate transactions
  const filters = []
  if (!overwrite) filters.push(isNull(transactions.category))
  if (month)      filters.push(eq(transactions.month, month))

  const candidates = await db
    .select({ fitId: transactions.fitId, acctId: transactions.acctId, name: transactions.name })
    .from(transactions)
    .where(filters.length ? and(...filters) : undefined)

  // If scope is provided, limit to those rows
  const targets = scope
    ? candidates.filter((c) =>
        scope.some((s) => s.fitId === c.fitId && s.acctId === c.acctId)
      )
    : candidates

  let count = 0

  for (const trn of targets) {
    const nameLower = (trn.name ?? '').toLowerCase()

    // First matching rule wins
    const match = allRules.find((r) => nameLower.includes(r.pattern.toLowerCase()))
    if (!match) continue

    await db
      .update(transactions)
      .set({ category: match.category })
      .where(and(eq(transactions.fitId, trn.fitId), eq(transactions.acctId, trn.acctId)))

    count++
  }

  return count
}
