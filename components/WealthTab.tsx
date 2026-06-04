'use client'

import { useEffect, useState } from 'react'
import { WEALTH_CONFIG, type WealthAccount } from '@/config/wealth'
import { TrajectoryChart } from '@/components/TrajectoryChart'
import type { WealthSnapshot } from '@/db/schema'

const { accounts, retirementGoal, assumedReturnRate, monthlyContributions, owners } = WEALTH_CONFIG

const anchorOwner       = Object.entries(owners).reduce((a, b) => a[1].targetAge >= b[1].targetAge ? a : b)
const yearsToRetirement = anchorOwner[1].targetAge - anchorOwner[1].currentAge

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtFull(n: number) {
  return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// FV = PV*(1+r)^n + PMT*((1+r)^n - 1)/r
function fvAtYear(pv: number, years: number): number {
  const r   = assumedReturnRate
  const pmt = monthlyContributions * 12
  const g   = Math.pow(1 + r, years)
  return pv * g + pmt * (g - 1) / r
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  month: string
}

const GROUPS: { key: string; label: string }[] = [
  { key: 'RETIREMENT', label: 'Retirement' },
  { key: 'TAX-FREE',   label: 'Tax-Free' },
  { key: 'CASH',       label: 'Cash' },
]

export function WealthTab({ month }: Props) {
  const [snapshots,   setSnapshots]   = useState<WealthSnapshot[]>([])
  const [editingId,   setEditingId]   = useState<string | null>(null)  // which account is being edited
  const [inputValue,  setInputValue]  = useState('')
  const [savedMsg,    setSavedMsg]    = useState<string | null>(null)

  async function load() {
    const res  = await fetch(`/api/wealth/snapshots?month=${month}`)
    const rows: WealthSnapshot[] = await res.json()
    setSnapshots(rows)
  }

  useEffect(() => { load() }, [month])  // eslint-disable-line react-hooks/exhaustive-deps

  const balanceMap = Object.fromEntries(snapshots.map((s) => [s.accountId, s.balance]))

  function startEdit(accountId: string) {
    setEditingId(accountId)
    setInputValue(balanceMap[accountId] != null ? String(balanceMap[accountId]) : '')
  }

  async function commitEdit(accountId: string) {
    const balance = parseFloat(inputValue)
    if (!isNaN(balance) && balance >= 0) {
      await fetch('/api/wealth/snapshots', {
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

  // ── Derived stats ────────────────────────────────────────────────────────────
  const retirementAccounts = accounts.filter((a) => a.group === 'RETIREMENT')
  const totalInvested  = retirementAccounts.reduce((s, a) => s + (balanceMap[a.id] ?? 0), 0)
  const totalAll       = accounts.reduce((s, a) => s + (balanceMap[a.id] ?? 0), 0)
  const pctOfTarget    = retirementGoal > 0 ? Math.round((totalInvested / retirementGoal) * 100) : 0
  const projectedEnd   = fvAtYear(totalInvested, yearsToRetirement)
  const onPace         = projectedEnd >= retirementGoal

  return (
    <div className="space-y-6">

      {/* ── Header stats ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Invested (reg. accounts)', value: fmtFull(totalInvested), sub: null },
          { label: 'Of retirement target',     value: `${pctOfTarget}%`,      sub: `Goal: ${fmtFull(retirementGoal)}` },
          { label: 'Years to goal',            value: String(yearsToRetirement), sub: `Freddy 65 · Yirina 60` },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold mt-1 text-gray-800">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* ── Accounts + This month ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Accounts panel */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-700">Accounts</span>
            <span className="text-xs text-gray-400">Grouped by purpose</span>
          </div>

          {GROUPS.map(({ key, label }) => {
            const groupAccounts = accounts.filter((a) => a.group === key)
            if (groupAccounts.length === 0) return null
            return (
              <div key={key}>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                <div className="space-y-1">
                  {groupAccounts.map((a) => (
                    <AccountRow
                      key={a.id}
                      account={a}
                      balance={balanceMap[a.id]}
                      editing={editingId === a.id}
                      inputValue={inputValue}
                      onStartEdit={() => startEdit(a.id)}
                      onChange={setInputValue}
                      onCommit={() => commitEdit(a.id)}
                      onCancel={() => setEditingId(null)}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {/* Total */}
          <div className="pt-2 border-t flex justify-between text-sm font-semibold text-gray-700">
            <span>Total net worth</span>
            <span>{fmtFull(totalAll)}</span>
          </div>

          {/* Saved confirmation */}
          <div className="pt-1 h-5">
            {savedMsg && <span className="text-xs text-emerald-600">{savedMsg}</span>}
          </div>
        </div>

        {/* Retirement snapshot panel */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-700">Retirement snapshot — {new Date().getFullYear() + yearsToRetirement}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${onPace ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {onPace ? 'On pace' : 'Behind pace'}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Retirement accounts</span>
              <span className="font-medium text-gray-800">{fmtFull(totalInvested)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Projected at retirement</span>
              <span className="font-medium text-gray-800">{fmtFull(projectedEnd)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Target</span>
              <span className="font-medium text-gray-800">{fmtFull(retirementGoal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Assumed return</span>
              <span className="font-medium text-gray-800">{(assumedReturnRate * 100).toFixed(0)}% / yr</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Monthly contributions</span>
              <span className="font-medium text-gray-800">{fmtFull(monthlyContributions)} / mo</span>
            </div>
          </div>

          {/* RESP balances */}
          <div className="pt-3 border-t space-y-1">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Education (RESP)</p>
            {accounts.filter((a) => a.group === 'EDUCATION').map((a) => (
              <div key={a.id} className="flex items-center justify-between py-0.5">
                <span className="text-sm text-gray-700">{a.name}</span>
                {editingId === a.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">$</span>
                    <input
                      autoFocus
                      type="number"
                      min="0"
                      step="100"
                      placeholder="0"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onBlur={() => commitEdit(a.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter')  commitEdit(a.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="w-28 text-right border rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(a.id)}
                    className={`text-sm font-medium hover:text-blue-600 hover:underline ${balanceMap[a.id] != null ? 'text-gray-800' : 'text-gray-300 italic'}`}
                  >
                    {balanceMap[a.id] != null ? fmtFull(balanceMap[a.id]) : 'set balance'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Trajectory chart ── */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-gray-700">Trajectory to retirement ({new Date().getFullYear() + yearsToRetirement})</span>
          <span className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-blue-400 inline-block rounded" /> Projected</span>
            <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-gray-400 inline-block rounded border-dashed" style={{borderTop: '2px dashed #9ca3af', height: 0}} /> Target</span>
          </span>
        </div>
        <TrajectoryChart currentTotal={totalInvested} />
      </div>

    </div>
  )
}

// ── Account row (used inside the accounts panel) ──────────────────────────────

function AccountRow({
  account,
  balance,
  editing,
  inputValue,
  onStartEdit,
  onChange,
  onCommit,
  onCancel,
}: {
  account:     WealthAccount
  balance:     number | undefined
  editing:     boolean
  inputValue:  string
  onStartEdit: () => void
  onChange:    (v: string) => void
  onCommit:    () => void
  onCancel:    () => void
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-sm text-gray-700">{account.name}</span>
      <div className="flex items-center gap-3">
        {account.contributionRoom != null && !editing && (
          <span className="text-xs text-gray-400">{fmtFull(account.contributionRoom)} room</span>
        )}
        {editing ? (
          <div className="flex items-center gap-1">
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
              className="w-28 text-right border rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        ) : (
          <button
            onClick={onStartEdit}
            className={`text-sm font-medium hover:text-blue-600 hover:underline ${balance != null ? 'text-gray-800' : 'text-gray-300 italic'}`}
          >
            {balance != null ? fmtFull(balance) : 'set balance'}
          </button>
        )}
      </div>
    </div>
  )
}
