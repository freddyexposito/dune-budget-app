import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { budgets } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month')
  const rows = month
    ? await db.select().from(budgets).where(eq(budgets.month, month))
    : await db.select().from(budgets)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const { month, category, limitAmount } = await req.json()
  if (!month || !category || limitAmount == null)
    return NextResponse.json({ error: 'month, category, limitAmount required' }, { status: 400 })

  const row = await db
    .insert(budgets)
    .values({ month, category, limitAmount })
    .onConflictDoUpdate({
      target: [budgets.month, budgets.category],
      set: { limitAmount },
    })
    .returning()

  return NextResponse.json(row[0])
}

export async function DELETE(req: NextRequest) {
  const { month, category } = await req.json()
  await db.delete(budgets).where(and(eq(budgets.month, month), eq(budgets.category, category)))
  return NextResponse.json({ ok: true })
}
