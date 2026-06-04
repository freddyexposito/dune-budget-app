import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { wealthSnapshots } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export const runtime = 'nodejs'

// GET /api/wealth/snapshots?month=YYYY-MM
export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month')
  if (!month)
    return NextResponse.json({ error: 'month required' }, { status: 400 })

  const rows = await db
    .select()
    .from(wealthSnapshots)
    .where(eq(wealthSnapshots.month, month))

  return NextResponse.json(rows)
}

// POST /api/wealth/snapshots  { month, accountId, balance }
export async function POST(req: NextRequest) {
  const { month, accountId, balance } = await req.json()
  if (!month || !accountId || balance == null)
    return NextResponse.json({ error: 'month, accountId, balance required' }, { status: 400 })

  const row = await db
    .insert(wealthSnapshots)
    .values({ month, accountId, balance })
    .onConflictDoUpdate({
      target: [wealthSnapshots.accountId, wealthSnapshots.month],
      set: { balance },
    })
    .returning()

  return NextResponse.json(row[0])
}

// DELETE /api/wealth/snapshots  { month, accountId }
export async function DELETE(req: NextRequest) {
  const { month, accountId } = await req.json()
  await db
    .delete(wealthSnapshots)
    .where(and(eq(wealthSnapshots.month, month), eq(wealthSnapshots.accountId, accountId)))
  return NextResponse.json({ ok: true })
}
