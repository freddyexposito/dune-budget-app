/**
 * QFX/OFX parser — handles multi-account files.
 *
 * A single QFX exported from RBC (and other banks) can contain multiple
 * <CCSTMTRS> or <STMTRS> blocks — one per card/account.  The old approach of
 * reading the first <ACCTID> and all <STMTTRN> globally attributed every
 * transaction to the first account.  We now parse each statement block
 * independently so transactions stay scoped to the correct account.
 */

export interface ParsedAccount {
  acctId:   string
  acctType: string   // "SAVINGS" | "CHECKING" | "CREDITCARD"
  currency: string
}

export interface ParsedTransaction {
  fitId:   string
  date:    string    // "YYYY-MM-DD"
  amount:  number
  name:    string
  memo:    string
  trnType: string
}

export interface ParsedQfx {
  account:      ParsedAccount
  transactions: ParsedTransaction[]
}

// ── helpers ────────────────────────────────────────────────────────────────

function tag(content: string, name: string): string {
  const m = content.match(new RegExp(`<${name}>([^<\r\n]*)`, 'i'))
  return m ? m[1].trim() : ''
}

function allBlocks(content: string, name: string): string[] {
  const re = new RegExp(`<${name}>[\\s\\S]*?</${name}>`, 'gi')
  return content.match(re) ?? []
}

/** OFX date → "YYYY-MM-DD" (handles "20260527" and "20260527120000[-5:EST]") */
function parseDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length < 8) return raw
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

function parseTransactions(stmtBlock: string): ParsedTransaction[] {
  return allBlocks(stmtBlock, 'STMTTRN').map((b) => {
    const fitId = tag(b, 'FITID')
    if (!fitId) throw new Error(`QFX parse error: STMTTRN missing FITID near: ${b.slice(0, 80)}`)
    return {
      fitId,
      date:    parseDate(tag(b, 'DTPOSTED')),
      amount:  parseFloat(tag(b, 'TRNAMT') || '0'),
      name:    tag(b, 'NAME'),
      memo:    tag(b, 'MEMO'),
      trnType: tag(b, 'TRNTYPE'),
    }
  })
}

// ── main export ────────────────────────────────────────────────────────────

/**
 * Returns one entry per account found in the file.
 * Most files have one; RBC supplementary-card exports have two or more.
 */
export function parseQfx(raw: string): ParsedQfx[] {
  const body = raw.includes('<OFX>') ? raw.slice(raw.indexOf('<OFX>')) : raw

  const results: ParsedQfx[] = []

  // ── Credit-card accounts ─────────────────────────────────────────────────
  for (const block of allBlocks(body, 'CCSTMTRS')) {
    const acctId = tag(block, 'ACCTID')
    if (!acctId) continue
    results.push({
      account: {
        acctId,
        acctType: 'CREDITCARD',
        currency: tag(block, 'CURDEF') || 'CAD',
      },
      transactions: parseTransactions(block),
    })
  }

  // ── Bank accounts (SAVINGS / CHECKING) ───────────────────────────────────
  for (const block of allBlocks(body, 'STMTRS')) {
    const acctId = tag(block, 'ACCTID')
    if (!acctId) continue
    results.push({
      account: {
        acctId,
        acctType: tag(block, 'ACCTTYPE') || 'CHECKING',
        currency: tag(block, 'CURDEF') || 'CAD',
      },
      transactions: parseTransactions(block),
    })
  }

  if (results.length === 0) throw new Error('QFX parse error: no account blocks found')

  return results
}
