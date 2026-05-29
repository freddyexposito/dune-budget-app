import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { transactions } from '@/db/schema'
import { parseQfx } from '@/lib/parser/qfx'
import { findAccount } from '@/config/accounts'
import { applyRules } from '@/lib/applyRules'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const text   = await file.text()
    const parsed = parseQfx(text)   // ParsedQfx[]

    const summary = []

    for (const { account, transactions: trns } of parsed) {
      // Skip any account not defined in the config (spouse's card, etc.)
      const config = findAccount(account.acctId)
      if (!config) {
        summary.push({ acctId: account.acctId, skippedAccount: true })
        continue
      }

      let inserted = 0
      let skipped  = 0
      const newRows: { fitId: string; acctId: string }[] = []

      for (const t of trns) {
        const result = await db
          .insert(transactions)
          .values({
            fitId:   t.fitId,
            acctId:  account.acctId,
            date:    t.date,
            amount:  t.amount,
            name:    t.name,
            memo:    t.memo,
            trnType: t.trnType,
          })
          .onConflictDoNothing()

        if ((result.changes ?? 0) > 0) {
          inserted++
          newRows.push({ fitId: t.fitId, acctId: account.acctId })
        } else {
          skipped++
        }
      }

      // Auto-categorize newly imported transactions using rules
      const categorized = newRows.length > 0
        ? await applyRules({ scope: newRows })
        : 0

      summary.push({
        acctId:      account.acctId,
        nickname:    config.nickname,
        total:       trns.length,
        inserted,
        skipped,
        categorized,
      })
    }

    return NextResponse.json({ accounts: summary })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
