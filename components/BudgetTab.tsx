'use client'

import { useEffect, useState } from 'react'
import type { Budget } from '@/db/schema'

interface SummaryRow {
  category: string | null
  spent:    number
  count:    number
}

interface BudgetRow extends Budget {
  spent: number
  count: number
}

interface Props {
  month:           string
  onCategoryClick: (category: string) => void
}

const CATEGORIES = [
  'Groceries', 'Dining', 'Transport', 'Housing', 'Utilities',
  'Health', 'Shopping', 'Vacation',
  'Cuba', 'Kids', 'Subscriptions', 'Fun', 'Other',
]

const FIXED_CATEGORIES = ['Gym', 'Nico Therapy']

function ProgressBar({ spent, limit }: { spent: number; limit: number }) {
  const pct  = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0
  const over = spent > limit
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all ${over ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ── Pace banner ─────────────────────────────────────────────────────────────
function PaceBanner({
  month,
  totalSpent,
  totalLimit,
}: {
  month:      string
  totalSpent: number
  totalLimit: number
}) {
  if (totalLimit === 0) return null

  const today      = new Date()
  const [y, m]     = month.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()

  // How far through the month are we?
  let dayOfMonth: number
  if (today.getFullYear() === y && today.getMonth() === m - 1) {
    dayOfMonth = today.getDate()
  } else if (new Date(y, m - 1) < today) {
    dayOfMonth = daysInMonth   // past month — full
  } else {
    return null                // future month — nothing to show
  }

  const expectedPct  = dayOfMonth / daysInMonth            // 0–1
  const expectedAmt  = totalLimit * expectedPct
  const actualPct    = Math.min(totalSpent / totalLimit, 1) // capped at 100%
  const diff         = totalSpent - expectedAmt
  const over         = diff > 0
  const pctOfBudget  = Math.round(actualPct * 100)
  const expectedPctR = Math.round(expectedPct * 100)
  const spentRatio   = totalSpent / totalLimit
  const barColor     = spentRatio >= 1   ? 'bg-red-400'
                     : spentRatio >= 0.8 ? 'bg-orange-400'
                     : spentRatio >= 0.5 ? 'bg-yellow-400'
                     : 'bg-emerald-400'
  const textColor    = spentRatio >= 1   ? 'text-red-600'
                     : spentRatio >= 0.8 ? 'text-orange-600'
                     : spentRatio >= 0.5 ? 'text-yellow-600'
                     : 'text-emerald-600'
  const dotColor     = spentRatio >= 1   ? 'bg-red-400'
                     : spentRatio >= 0.8 ? 'bg-orange-400'
                     : spentRatio >= 0.5 ? 'bg-yellow-400'
                     : 'bg-emerald-400'

  return (
    <div className="bg-white rounded-xl border p-5 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-gray-700">
          Monthly pace
          <span className="ml-2 font-normal text-gray-400 text-xs">
            Day {dayOfMonth} of {daysInMonth}
          </span>
        </span>
        <span className={`font-semibold text-sm ${textColor}`}>
          {over ? '▲' : '▼'} ${Math.abs(diff).toFixed(2)} {over ? 'over pace' : 'under pace'}
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-5 bg-gray-100 rounded-full overflow-visible">
        {/* Actual spend fill */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${barColor}`}
          style={{ width: `${pctOfBudget}%` }}
        />
        {/* "Expected by today" tick mark */}
        <div
          className="absolute inset-y-0 w-0.5 bg-gray-500 z-10"
          style={{ left: `${expectedPctR}%` }}
          title={`Expected by day ${dayOfMonth}: $${expectedAmt.toFixed(2)}`}
        >
          {/* Triangle pointer above the bar */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-gray-500 text-[10px] leading-none select-none">▼</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>$0</span>
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${dotColor}`} />
            Spent {pctOfBudget}% — <span className="font-medium text-gray-600">${totalSpent.toFixed(2)}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-0.5 h-3 bg-gray-500 inline-block" />
            Expected {expectedPctR}% — <span className="font-medium text-gray-600">${expectedAmt.toFixed(2)}</span>
          </span>
        </span>
        <span>${totalLimit.toFixed(2)}</span>
      </div>
    </div>
  )
}

export function BudgetTab({ month, onCategoryClick }: Props) {
  const [budgets,  setBudgets]  = useState<Budget[]>([])
  const [summary,  setSummary]  = useState<SummaryRow[]>([])
  const [editing,    setEditing]    = useState<Record<string, string>>({})  // category → input value
  const [loading,    setLoading]    = useState(false)
  const [addCat,     setAddCat]     = useState('')
  const [addAmount,  setAddAmount]  = useState('')
  const [copying,    setCopying]    = useState(false)
  const [copyMsg,    setCopyMsg]    = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [bRes, sRes] = await Promise.all([
      fetch(`/api/budgets?month=${month}`),
      fetch(`/api/summary?month=${month}`),
    ])
    setBudgets(await bRes.json())
    setSummary(await sRes.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [month])  // eslint-disable-line react-hooks/exhaustive-deps

  async function saveBudget(category: string, value: string) {
    const limitAmount = parseFloat(value)
    if (isNaN(limitAmount) || limitAmount < 0) return
    await fetch('/api/budgets', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ month, category, limitAmount }),
    })
    setEditing((e) => { const n = { ...e }; delete n[category]; return n })
    load()
  }

  async function copyPreviousMonth() {
    setCopying(true)
    setCopyMsg(null)

    // Compute previous month string "YYYY-MM"
    const [y, m] = month.split('-').map(Number)
    const prevDate = new Date(y, m - 2)   // m is 1-based, -2 → previous month
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

    const res  = await fetch(`/api/budgets?month=${prevMonth}`)
    const prev: Budget[] = await res.json()

    if (prev.length === 0) {
      setCopyMsg('No budgets found for previous month')
      setCopying(false)
      return
    }

    // Only copy categories not already set in current month
    const existing = new Set(budgets.map((b) => b.category))
    const toAdd    = prev.filter((b) => !existing.has(b.category))

    await Promise.all(toAdd.map((b) =>
      fetch('/api/budgets', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ month, category: b.category, limitAmount: b.limitAmount }),
      })
    ))

    await load()
    setCopyMsg(
      toAdd.length > 0
        ? `Copied ${toAdd.length} budget${toAdd.length > 1 ? 's' : ''} from ${prevMonth}`
        : 'All categories already have budgets this month'
    )
    setCopying(false)
  }

  async function deleteBudget(category: string) {
    await fetch('/api/budgets', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ month, category }),
    })
    load()
  }

  // Merge budgets + actuals
  const spentMap  = Object.fromEntries(summary.map((r) => [r.category ?? '', r]))
  const limitMap  = Object.fromEntries(budgets.map((b) => [b.category, b]))

  // Categories that have either a budget or actual spending
  const activeSet = new Set([
    ...budgets.map((b) => b.category),
    ...summary.filter((r) => r.category).map((r) => r.category as string),
  ])

  const fixedSet = new Set(FIXED_CATEGORIES)

  const rows: BudgetRow[] = [...activeSet]
    .filter((cat) => !fixedSet.has(cat))
    .sort()
    .map((cat) => ({
      ...(limitMap[cat] ?? { id: 0, month, category: cat, limitAmount: 0 }),
      spent: spentMap[cat]?.spent ?? 0,
      count: spentMap[cat]?.count ?? 0,
    }))

  const fixedRows: BudgetRow[] = FIXED_CATEGORIES.map((cat) => ({
    ...(limitMap[cat] ?? { id: 0, month, category: cat, limitAmount: 0 }),
    spent: spentMap[cat]?.spent ?? 0,
    count: spentMap[cat]?.count ?? 0,
  }))

  const uncategorized   = spentMap['']
  const totalSpent      = rows.reduce((s, r) => s + r.spent, 0)
  const totalLimit      = rows.reduce((s, r) => s + r.limitAmount, 0)
  const fixedSpent      = fixedRows.reduce((s, r) => s + r.spent, 0)
  const grandTotalSpent = totalSpent + fixedSpent

  return (
    <div className="space-y-6">
      {/* Pace bar */}
      <PaceBanner month={month} totalSpent={totalSpent} totalLimit={totalLimit} />

      {/* Totals banner */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Spent',     value: `$${totalSpent.toFixed(2)}`,              color: 'text-red-600'   },
          { label: 'Budgeted',  value: `$${totalLimit.toFixed(2)}`,              color: 'text-gray-700'  },
          { label: 'Remaining', value: `$${(totalLimit - totalSpent).toFixed(2)}`, color: totalLimit - totalSpent >= 0 ? 'text-emerald-600' : 'text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Budget rows */}
      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-right">Spent</th>
              <th className="px-4 py-2 text-right">Limit</th>
              <th className="px-4 py-2 text-right">Left</th>
              <th className="px-4 py-2 w-40">Progress</th>
              <th className="px-4 py-2 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 && !loading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No data yet — categorize transactions or set a budget below</td></tr>
            )}
            {rows.map((r) => {
              const left = r.limitAmount - r.spent
              const isEditing = editing[r.category] !== undefined
              return (
                <tr key={r.category} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{r.category}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {r.spent > 0 ? (
                      <button
                        onClick={() => onCategoryClick(r.category)}
                        className="text-red-600 hover:underline hover:text-red-700 tabular-nums"
                        title={`View ${r.category} transactions`}
                      >
                        ${r.spent.toFixed(2)}
                      </button>
                    ) : (
                      <span className="text-gray-300">$0.00</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {isEditing ? (
                      <input
                        autoFocus
                        type="number"
                        min="0"
                        step="10"
                        value={editing[r.category]}
                        onChange={(e) => setEditing((ev) => ({ ...ev, [r.category]: e.target.value }))}
                        onBlur={() => saveBudget(r.category, editing[r.category])}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveBudget(r.category, editing[r.category])
                          if (e.key === 'Escape') setEditing((ev) => { const n = { ...ev }; delete n[r.category]; return n })
                        }}
                        className="w-24 text-right border rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    ) : (
                      <button
                        onClick={() => setEditing((ev) => ({ ...ev, [r.category]: String(r.limitAmount || '') }))}
                        className="text-gray-700 hover:text-blue-600 hover:underline"
                      >
                        {r.limitAmount > 0 ? `$${r.limitAmount.toFixed(2)}` : <span className="text-gray-300 italic">set limit</span>}
                      </button>
                    )}
                  </td>
                  <td className={`px-4 py-2 text-right tabular-nums ${r.limitAmount > 0 ? (left >= 0 ? 'text-emerald-600' : 'text-red-600 font-semibold') : 'text-gray-300'}`}>
                    {r.limitAmount > 0 ? `$${left.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-2">
                    {r.limitAmount > 0
                      ? <ProgressBar spent={r.spent} limit={r.limitAmount} />
                      : <div className="w-full bg-gray-100 rounded-full h-2" />}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {r.limitAmount > 0 && (
                      <button onClick={() => deleteBudget(r.category)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add budget / copy previous month */}
      <div className="flex items-center gap-4 flex-wrap">
      {CATEGORIES.filter((c) => !activeSet.has(c)).length > 0 && (
        <form
          className="flex items-center gap-3"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!addCat || !addAmount) return
            await saveBudget(addCat, addAmount)
            setAddCat('')
            setAddAmount('')
          }}
        >
          <select
            value={addCat}
            onChange={(e) => setAddCat(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="" disabled>+ Add budget for…</option>
            {CATEGORIES.filter((c) => !activeSet.has(c)).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {addCat && (
            <>
              <span className="text-gray-400 text-sm">limit $</span>
              <input
                autoFocus
                type="number"
                min="0"
                step="10"
                placeholder="0"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                className="w-28 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                type="submit"
                disabled={!addAmount}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => { setAddCat(''); setAddAmount('') }}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                Cancel
              </button>
            </>
          )}
        </form>
      )}

        <button
          type="button"
          onClick={copyPreviousMonth}
          disabled={copying}
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-40 whitespace-nowrap"
        >
          {copying ? 'Copying…' : '↩ Copy previous month'}
        </button>
        {copyMsg && <span className="text-xs text-gray-400">{copyMsg}</span>}
      </div>

      {/* Uncategorized warning */}
      {uncategorized && uncategorized.count > 0 && (
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          ⚠ {uncategorized.count} transaction{uncategorized.count > 1 ? 's' : ''} (${uncategorized.spent.toFixed(2)}) are uncategorized — assign categories in the Transactions tab.
        </p>
      )}

      {/* Fixed / excluded categories */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Fixed costs</h3>
          <span className="text-xs text-gray-400">not tracked in budget</span>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-right">Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fixedRows.map((r) => (
                <tr key={r.category} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-600">{r.category}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {r.spent > 0 ? (
                      <button
                        onClick={() => onCategoryClick(r.category)}
                        className="text-red-600 hover:underline hover:text-red-700 tabular-nums"
                      >
                        ${r.spent.toFixed(2)}
                      </button>
                    ) : (
                      <span className="text-gray-300">$0.00</span>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold text-gray-700">
                <td className="px-4 py-2">Total incl. fixed</td>
                <td className="px-4 py-2 text-right tabular-nums">${grandTotalSpent.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
