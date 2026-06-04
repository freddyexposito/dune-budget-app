'use client'

import { useEffect, useState } from 'react'
import { WEALTH_CONFIG } from '@/config/wealth'
import { DEBT_CONFIG } from '@/config/debt'
import { TrajectoryChart, yearsToRetirement } from '@/components/TrajectoryChart'
import type { Budget } from '@/db/schema'

// ── helpers ───────────────────────────────────────────────────────────────────

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

function fmt(n: number) {
  return '$' + Math.abs(n).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// ── Pace bar ──────────────────────────────────────────────────────────────────

function PaceBar({ totalSpent, totalLimit, month }: { totalSpent: number; totalLimit: number; month: string }) {
  if (totalLimit === 0) return null

  const today       = new Date()
  const [y, m]      = month.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()

  let dayOfMonth: number
  if (today.getFullYear() === y && today.getMonth() === m - 1) {
    dayOfMonth = today.getDate()
  } else if (new Date(y, m - 1) < today) {
    dayOfMonth = daysInMonth
  } else {
    return null
  }

  const spentRatio  = totalSpent / totalLimit
  const expectedPct = Math.round((dayOfMonth / daysInMonth) * 100)
  const spentPct    = Math.min(Math.round(spentRatio * 100), 100)
  const diff        = totalSpent - totalLimit * (dayOfMonth / daysInMonth)
  const over        = diff > 0

  const barColor  = spentRatio >= 1   ? 'bg-red-400'
                  : spentRatio >= 0.8 ? 'bg-orange-400'
                  : spentRatio >= 0.5 ? 'bg-yellow-400'
                  : 'bg-emerald-400'
  const textColor = spentRatio >= 1   ? 'text-red-600'
                  : spentRatio >= 0.8 ? 'text-orange-600'
                  : spentRatio >= 0.5 ? 'text-yellow-600'
                  : 'text-emerald-600'

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-gray-500">
        <span>Day {dayOfMonth} of {daysInMonth}</span>
        <span className={`font-semibold ${textColor}`}>
          {over ? '▲' : '▼'} {fmt(Math.abs(diff))} {over ? 'over pace' : 'under pace'}
        </span>
      </div>
      <div className="relative h-4 bg-gray-100 rounded-full overflow-visible">
        <div className={`absolute inset-y-0 left-0 rounded-full ${barColor}`} style={{ width: `${spentPct}%` }} />
        <div className="absolute inset-y-0 w-0.5 bg-gray-500 z-10" style={{ left: `${expectedPct}%` }}>
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-gray-500 text-[9px]">▼</div>
        </div>
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>Spent {fmt(totalSpent)} <span className="font-medium text-gray-600">({spentPct}%)</span></span>
        <span>Budget {fmt(totalLimit)}</span>
      </div>
    </div>
  )
}

// ── Wealth group card ─────────────────────────────────────────────────────────

function WealthCard({
  icon, label, accounts, balanceMap,
}: {
  icon:       string
  label:      string
  accounts:   typeof WEALTH_CONFIG.accounts
  balanceMap: Record<string, number>
}) {
  const total = accounts.reduce((s, a) => s + (balanceMap[a.id] ?? 0), 0)
  return (
    <div className="bg-white rounded-xl border p-4 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-gray-700">{icon} {label}</span>
        <span className="text-base font-bold text-gray-800">{fmt(total)}</span>
      </div>
      <div className="space-y-0.5 pt-1 border-t">
        {accounts.map((a) => (
          <div key={a.id} className="flex justify-between text-xs text-gray-500">
            <span>{a.name}</span>
            <span className={balanceMap[a.id] != null ? 'text-gray-700 font-medium' : 'text-gray-300'}>
              {balanceMap[a.id] != null ? fmt(balanceMap[a.id]) : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SummaryPage() {
  const month = currentMonth()

  const [budgets,        setBudgets]        = useState<Budget[]>([])
  const [spentMap,       setSpentMap]       = useState<Record<string, number>>({})
  const [wealthBalances, setWealthBalances] = useState<Record<string, number>>({})
  const [debtBalances,   setDebtBalances]   = useState<Record<string, number>>({})
  const [loading,        setLoading]        = useState(true)

  useEffect(() => {
    async function load() {
      const [budgetRes, summaryRes, wealthRes, debtRes] = await Promise.all([
        fetch(`/api/budgets?month=${month}`).then((r) => r.json()),
        fetch(`/api/summary?month=${month}`).then((r) => r.json()),
        fetch(`/api/wealth/snapshots?month=${month}`).then((r) => r.json()),
        fetch(`/api/debt/snapshots?month=${month}`).then((r) => r.json()),
      ])

      setBudgets(budgetRes)
      setSpentMap(Object.fromEntries(summaryRes.map((r: { category: string; spent: number }) => [r.category ?? '', r.spent])))
      setWealthBalances(Object.fromEntries(wealthRes.map((s: { accountId: string; balance: number }) => [s.accountId, s.balance])))
      setDebtBalances(Object.fromEntries(debtRes.map((s: { accountId: string; balance: number }) => [s.accountId, s.balance])))
      setLoading(false)
    }
    load()
  }, [month])

  // ── Budget totals ────────────────────────────────────────────────────────────
  const FIXED = new Set(['Gym', 'Nico Therapy'])
  const totalSpent  = budgets.filter((b) => !FIXED.has(b.category)).reduce((s, b) => s + (spentMap[b.category] ?? 0), 0)
  const totalLimit  = budgets.filter((b) => !FIXED.has(b.category)).reduce((s, b) => s + b.limitAmount, 0)
  const remaining   = totalLimit - totalSpent

  // ── Wealth groups ────────────────────────────────────────────────────────────
  const { accounts: wAccounts } = WEALTH_CONFIG
  const retirement  = wAccounts.filter((a) => a.group === 'RETIREMENT')
  const taxFree     = wAccounts.filter((a) => a.group === 'TAX-FREE')
  const cash        = wAccounts.filter((a) => a.group === 'CASH')
  const education   = wAccounts.filter((a) => a.group === 'EDUCATION')

  const totalRetirement = retirement.reduce((s, a) => s + (wealthBalances[a.id] ?? 0), 0)
  const totalTaxFree    = taxFree.reduce((s, a)    => s + (wealthBalances[a.id] ?? 0), 0)
  const totalCash       = cash.reduce((s, a)       => s + (wealthBalances[a.id] ?? 0), 0)
  const totalEducation  = education.reduce((s, a)  => s + (wealthBalances[a.id] ?? 0), 0)
  const totalAssets     = totalRetirement + totalTaxFree + totalCash + totalEducation

  // ── Debt ─────────────────────────────────────────────────────────────────────
  const { accounts: dAccounts } = DEBT_CONFIG
  const debtOnly    = dAccounts.filter((a) => a.type !== 'TFSA_OFFSET')
  const offsetAccts = dAccounts.filter((a) => a.type === 'TFSA_OFFSET')
  const totalDebt   = debtOnly.reduce((s, a)    => s + (debtBalances[a.id] ?? 0), 0)
  const totalOffset = offsetAccts.reduce((s, a) => s + (debtBalances[a.id] ?? 0), 0)
  const netDebt     = totalDebt - totalOffset

  const netWorth = totalAssets - netDebt

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">💰 Dune Budget</h1>
          <span className="text-sm text-gray-400">{month}</span>
        </div>

        {/* ── Budget ── */}
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">📊 Budget</p>
          <PaceBar totalSpent={totalSpent} totalLimit={totalLimit} month={month} />
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { label: 'Spent',     value: fmt(totalSpent),  color: 'text-red-600'     },
              { label: 'Budgeted',  value: fmt(totalLimit),  color: 'text-gray-700'    },
              { label: 'Remaining', value: fmt(remaining),   color: remaining >= 0 ? 'text-emerald-600' : 'text-red-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                <p className={`text-sm font-bold mt-0.5 ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Wealth cards ── */}
        <WealthCard icon="🏦" label="Retirement"  accounts={retirement} balanceMap={wealthBalances} />

        {/* ── Trajectory chart ── */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-gray-700">📈 Retirement trajectory</span>
            <span className="text-xs text-gray-400">to {new Date().getFullYear() + yearsToRetirement}</span>
          </div>
          <TrajectoryChart currentTotal={totalRetirement} />
        </div>

        <WealthCard icon="🌿" label="Tax-Free"    accounts={taxFree}    balanceMap={wealthBalances} />
        <WealthCard icon="💵" label="Cash"        accounts={cash}       balanceMap={wealthBalances} />
        <WealthCard icon="🎓" label="Education"   accounts={education}  balanceMap={wealthBalances} />

        {/* ── Debt ── */}
        <div className="bg-white rounded-xl border p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">🏠 Debt</span>
            <span className="text-base font-bold text-gray-800">{fmt(netDebt)} net</span>
          </div>
          <div className="space-y-0.5 pt-1 border-t">
            {debtOnly.map((a) => (
              <div key={a.id} className="flex justify-between text-xs text-gray-500">
                <span>{a.name}</span>
                <span className={debtBalances[a.id] != null ? 'text-red-600 font-medium' : 'text-gray-300'}>
                  {debtBalances[a.id] != null ? fmt(debtBalances[a.id]) : '—'}
                </span>
              </div>
            ))}
            {offsetAccts.map((a) => (
              <div key={a.id} className="flex justify-between text-xs text-gray-500">
                <span>{a.name}</span>
                <span className={debtBalances[a.id] != null ? 'text-emerald-600 font-medium' : 'text-gray-300'}>
                  {debtBalances[a.id] != null ? `+${fmt(debtBalances[a.id])}` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Net worth ── */}
        <div className="bg-gray-800 rounded-xl p-4 flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-300">Net Worth</span>
          <span className={`text-2xl font-bold ${netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmt(netWorth)}
          </span>
        </div>

        {/* Link back */}
        <p className="text-center text-xs text-gray-400 pb-4">
          <a href="/" className="hover:underline">← Full dashboard</a>
        </p>

      </div>
    </main>
  )
}
