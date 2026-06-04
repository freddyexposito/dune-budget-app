import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { debtSnapshots } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month')
  if (!month)
    return NextResponse.json({ error: 'month required' }, { status: 400 })

  const rows = await db
    .select()
    .from(debtSnapshots)
    .where(eq(debtSnapshots.month, month))

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const { month, accountId, balance } = await req.json()
  if (!month || !accountId || balance == null)
    return NextResponse.json({ error: 'month, accountId, balance required' }, { status: 400 })

  const row = await db
    .insert(debtSnapshots)
    .values({ month, accountId, balance })
    .onConflictDoUpdate({
      target: [debtSnapshots.accountId, debtSnapshots.month],
      set: { balance },
    })
    .returning()

  return NextResponse.json(row[0])
}
