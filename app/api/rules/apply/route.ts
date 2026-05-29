import { NextRequest, NextResponse } from 'next/server'
import { applyRules } from '@/lib/applyRules'

export const runtime = 'nodejs'

/**
 * POST /api/rules/apply
 * Body: { month?: string, overwrite?: boolean }
 *
 * Applies all rules to transactions.
 * - If month is provided, limits to that month.
 * - overwrite=false (default): only touches uncategorized transactions.
 * - overwrite=true: re-categorizes everything, including already-categorized rows.
 */
export async function POST(req: NextRequest) {
  const { month, overwrite = false } = await req.json().catch(() => ({}))

  const count = await applyRules({ month, overwrite })

  return NextResponse.json({ categorized: count })
}
