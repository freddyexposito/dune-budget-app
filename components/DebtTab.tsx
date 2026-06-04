'use client'

import { useEffect, useState } from 'react'
import { DEBT_CONFIG, type DebtAccount } from '@/config/debt'
import type { DebtSnapshot } from '@/db/schema'

const { accounts } = DEBT_CONFIG

function fmtFull(n: number) {
  return '$' + Math.abs(n).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function PayoffBar({ current, original }: { current: number; original: number }) {
  if (original === 0) return null
  const paidPct = Math.min(Math.max((1 - current / original) * 100, 0), 100)
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div
        className="h-2 rounded-full bg-emerald-400 transition-all"
        style={{ width: `${paidPct}%` }}
      />
    </div>
  )
}

// ── Debt row ──────────────────────────────────────────────────────────────────

function DebtRow({
  account,
  balance,
  prevBalance,
  editing,
  inputValue,
  onStartEdit,
  onChange,
  onCommit,
  onCancel,
}: {
  account:     DebtAccount
  balance:     number | undefined
  prevBalance: number | undefined
  editing:     boolean
  inputValue:  string
  onStartEdit: () => void
  onChange:    (v: string) => void
  onCommit:    () => void
  onCancel:    () => void
}) {
  const isOffset  = account.type === 'TFSA_OFFSET'
  const paidPct   = account.originalAmount > 0 && balance != null
    ? Math.round((1 - balance / account.originalAmount) * 100)
    : null
  const monthDiff = balance != null && prevBalance != null ? prevBalance - balance : null

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 font-medium text-gray-700">{account.name}</td>

      {/* Balance */}
      <td className="px-4 py-3 text-right tabular-nums">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <span className="text-xs text-gray-400">$</span>
            <input
              autoFocus
              type="number"
              min="0"
              step="100"
              placeholder="0"
              value={inputValue}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onCommit}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  onCommit()
                if (e.key === 'Escape') onCancel()
              }}
              className="w-32 text-right border rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        ) : (
          <button
            onClick={onStartEdit}
            className={`font-medium hover:text-blue-600 hover:underline tabular-nums ${
              balance != null
                ? isOffset ? 'text-emerald-600' : 'text-red-600'
                : 'text-gray-300 italic'
            }`}
          >
            {balance != null ? (isOffset ? `+${fmtFull(balance)}` : fmtFull(balance)) : 'set balance'}
          </button>
        )}
      </td>

      {/* Month change */}
      <td className="px-4 py-3 text-right tabular-nums text-sm">
        {monthDiff != null && monthDiff !== 0 ? (
          <span className={isOffset
            ? (monthDiff < 0 ? 'text-emerald-600' : 'text-gray-400')
            : (monthDiff > 0 ? 'text-emerald-600' : 'text-red-500')
          }>
            {isOffset
              ? (monthDiff < 0 ? `▲ ${fmtFull(-monthDiff)}` : `▼ ${fmtFull(monthDiff)}`)
              : (monthDiff > 0 ? `▼ ${fmtFull(monthDiff)}` : `▲ ${fmtFull(-monthDiff)}`)}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>

      {/* Progress */}
      <td className="px-4 py-3 w-36">
        {account.originalAmount > 0 && balance != null ? (
          <div className="space-y-0.5">
            <PayoffBar current={balance} original={account.originalAmount} />
            <p className="text-[10px] text-gray-400 text-right">{paidPct}% paid off</p>
          </div>
        ) : (
          <div className="w-full bg-gray-100 rounded-full h-2" />
        )}
      </td>
    </tr>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  month: string
}

function prevMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 2)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function DebtTab({ month }: Props) {
  const [snapshots,  setSnapshots]  = useState<DebtSnapshot[]>([])
  const [prevSnaps,  setPrevSnaps]  = useState<DebtSnapshot[]>([])
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [savedMsg,   setSavedMsg]   = useState<string | null>(null)

  async function load() {
    const [cur, prev] = await Promise.all([
      fetch(`/api/debt/snapshots?month=${month}`).then((r) => r.json()),
      fetch(`/api/debt/snapshots?month=${prevMonth(month)}`).then((r) => r.json()),
    ])
    setSnapshots(cur)
    setPrevSnaps(prev)
  }

  useEffect(() => { load() }, [month])  // eslint-disable-line react-hooks/exhaustive-deps

  const balanceMap     = Object.fromEntries(snapshots.map((s) => [s.accountId, s.balance]))
  const prevBalanceMap = Object.fromEntries(prevSnaps.map((s)  => [s.accountId, s.balance]))

  function startEdit(accountId: string) {
    setEditingId(accountId)
    setInputValue(balanceMap[accountId] != null ? String(balanceMap[accountId]) : '')
  }

  async function commitEdit(accountId: string) {
    const balance = parseFloat(inputValue)
    if (!isNaN(balance) && balance >= 0) {
      await fetch('/api/debt/snapshots', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ month, accountId, balance }),
      })
      await load()
      setSavedMsg(`Saved for ${month}`)
      setTimeout(() => setSavedMsg(null), 3000)
    }
    setEditingId(null)
  }

  // ── Derived totals ────────────────────────────────────────────────────────

  const debtAccounts   = accounts.filter((a) => a.type !== 'TFSA_OFFSET')
  const offsetAccounts = accounts.filter((a) => a.type === 'TFSA_OFFSET')

  const totalDebt   = debtAccounts.reduce((s, a)   => s + (balanceMap[a.id] ?? 0), 0)
  const totalOffset = offsetAccounts.reduce((s, a) => s + (balanceMap[a.id] ?? 0), 0)
  const netDebt     = totalDebt - totalOffset

  const prevTotalDebt   = debtAccounts.reduce((s, a)   => s + (prevBalanceMap[a.id] ?? 0), 0)
  const prevTotalOffset = offsetAccounts.reduce((s, a) => s + (prevBalanceMap[a.id] ?? 0), 0)
  const prevNetDebt     = prevTotalDebt - prevTotalOffset
  const netDebtChange   = prevNetDebt > 0 ? prevNetDebt - netDebt : null

  return (
    <div className="space-y-6">

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total debt</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{fmtFull(totalDebt)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">TFSA offset</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">+{fmtFull(totalOffset)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Net debt</p>
          <p className="text-2xl font-bold mt-1 text-gray-800">{fmtFull(netDebt)}</p>
          {netDebtChange != null && netDebtChange !== 0 && (
            <p className={`text-xs mt-0.5 ${netDebtChange > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {netDebtChange > 0 ? `▼ ${fmtFull(netDebtChange)} vs last month` : `▲ ${fmtFull(-netDebtChange)} vs last month`}
            </p>
          )}
        </div>
      </div>

      {/* ── Detail table ── */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-2 text-left">Account</th>
              <th className="px-4 py-2 text-right">Balance</th>
              <th className="px-4 py-2 text-right">vs last month</th>
              <th className="px-4 py-2 w-36">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {accounts.map((a) => (
              <DebtRow
                key={a.id}
                account={a}
                balance={balanceMap[a.id]}
                prevBalance={prevBalanceMap[a.id]}
                editing={editingId === a.id}
                inputValue={inputValue}
                onStartEdit={() => startEdit(a.id)}
                onChange={setInputValue}
                onCommit={() => commitEdit(a.id)}
                onCancel={() => setEditingId(null)}
              />
            ))}

            {/* Net row */}
            <tr className="bg-gray-50 font-semibold text-gray-700">
              <td className="px-4 py-2">Net debt</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtFull(netDebt)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-sm">
                {netDebtChange != null && netDebtChange !== 0 ? (
                  <span className={netDebtChange > 0 ? 'text-emerald-600' : 'text-red-500'}>
                    {netDebtChange > 0 ? `▼ ${fmtFull(netDebtChange)}` : `▲ ${fmtFull(-netDebtChange)}`}
                  </span>
                ) : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-2" />
            </tr>
          </tbody>
        </table>
      </div>

      {savedMsg && <p className="text-xs text-emerald-600">{savedMsg}</p>}
    </div>
  )
}
