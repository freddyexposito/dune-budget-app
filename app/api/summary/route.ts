import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { transactions } from '@/db/schema'
import { and, eq, sql } from 'drizzle-orm'

export const runtime = 'nodejs'

/**
 * GET /api/summary?month=2026-05[&acctId=...]
 * Returns actual spending per category for the given month.
 * Only counts expenses (amount < 0). Uncategorized transactions
 * are grouped under the key "".
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const month  = searchParams.get('month')
  const acctId = searchParams.get('acctId')

  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

  const filters = [
    eq(transactions.month, month),
    sql`${transactions.amount} < 0`,   // expenses only
  ]
  if (acctId) filters.push(eq(transactions.acctId, acctId))

  const rows = await db
    .select({
      category: transactions.category,
      spent:    sql<number>`round(sum(abs(${transactions.amount})), 2)`,
      count:    sql<number>`count(*)`,
    })
    .from(transactions)
    .where(and(...filters))
    .groupBy(transactions.category)

  return NextResponse.json(rows)
}
