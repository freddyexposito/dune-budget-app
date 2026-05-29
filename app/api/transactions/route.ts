import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { transactions } from '@/db/schema'
import { and, eq, like } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const month   = searchParams.get('month')   // "2026-05"
  const acctId  = searchParams.get('acctId')
  const search  = searchParams.get('search')  // matches name or memo

  const category = searchParams.get('category')

  const filters = []
  if (month)    filters.push(eq(transactions.month,    month))
  if (acctId)   filters.push(eq(transactions.acctId,   acctId))
  if (search)   filters.push(like(transactions.name,   `%${search}%`))
  if (category) filters.push(eq(transactions.category, category))

  const rows = await db
    .select()
    .from(transactions)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(transactions.date)

  return NextResponse.json(rows)
}

export async function PATCH(req: NextRequest) {
  // Accepts: { fitId, acctId, category? } or { fitId, acctId, memo? }
  const { fitId, acctId, ...fields } = await req.json()
  if (!fitId || !acctId) return NextResponse.json({ error: 'fitId and acctId required' }, { status: 400 })

  const allowed: Partial<typeof transactions.$inferInsert> = {}
  if ('category' in fields) allowed.category = fields.category
  if ('memo'     in fields) allowed.memo     = fields.memo

  if (Object.keys(allowed).length === 0)
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  await db
    .update(transactions)
    .set(allowed)
    .where(and(eq(transactions.fitId, fitId), eq(transactions.acctId, acctId)))

  return NextResponse.json({ ok: true })
}
