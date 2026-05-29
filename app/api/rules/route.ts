import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { rules } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function GET() {
  const rows = await db.select().from(rules).orderBy(rules.position)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const { pattern, category } = await req.json()
  if (!pattern?.trim() || !category?.trim())
    return NextResponse.json({ error: 'pattern and category required' }, { status: 400 })

  // New rules go to the end
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(position), 0)` })
    .from(rules)

  const row = await db
    .insert(rules)
    .values({ pattern: pattern.trim(), category: category.trim(), position: max + 1 })
    .returning()

  return NextResponse.json(row[0])
}

export async function PATCH(req: NextRequest) {
  // { id, direction: 'up' | 'down' }  — swap with adjacent rule
  const { id, direction } = await req.json()
  if (!id || !direction) return NextResponse.json({ error: 'id and direction required' }, { status: 400 })

  const allRules = await db.select().from(rules).orderBy(rules.position)
  const idx      = allRules.findIndex((r) => r.id === id)
  if (idx === -1) return NextResponse.json({ error: 'rule not found' }, { status: 404 })

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= allRules.length)
    return NextResponse.json({ ok: true })  // already at edge, no-op

  const a = allRules[idx]
  const b = allRules[swapIdx]

  // Swap positions
  await db.update(rules).set({ position: b.position }).where(eq(rules.id, a.id))
  await db.update(rules).set({ position: a.position }).where(eq(rules.id, b.id))

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await db.delete(rules).where(eq(rules.id, id))
  return NextResponse.json({ ok: true })
}
