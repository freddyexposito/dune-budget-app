'use client'

import { useEffect, useState } from 'react'
import type { Rule } from '@/db/schema'

const CATEGORIES = [
  'Groceries', 'Dining', 'Transport', 'Housing', 'Utilities',
  'Health', 'Shopping', 'Entertainment', 'Gym', 'Vacation',
  'Cuba', 'Kids', 'Subscriptions', 'Fun', 'Payment', 'Other',
]

interface Props {
  month: string
}

export function RulesTab({ month }: Props) {
  const [ruleList, setRuleList] = useState<Rule[]>([])
  const [pattern,  setPattern]  = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [applying, setApplying] = useState(false)
  const [applyMsg, setApplyMsg] = useState<string | null>(null)
  const [moving,   setMoving]   = useState<number | null>(null)  // id being moved

  async function load() {
    const res = await fetch('/api/rules')
    setRuleList(await res.json())
  }

  useEffect(() => { load() }, [])

  async function addRule(e: React.FormEvent) {
    e.preventDefault()
    if (!pattern.trim()) return
    await fetch('/api/rules', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ pattern: pattern.trim(), category }),
    })
    setPattern('')
    load()
  }

  async function deleteRule(id: number) {
    await fetch('/api/rules', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    load()
  }

  async function move(id: number, direction: 'up' | 'down') {
    setMoving(id)
    await fetch('/api/rules', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, direction }),
    })
    await load()
    setMoving(null)
  }

  async function applyToMonth(overwrite: boolean) {
    setApplying(true)
    setApplyMsg(null)
    const res = await fetch('/api/rules/apply', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ month, overwrite }),
    })
    const { categorized } = await res.json()
    setApplyMsg(`${categorized} transaction${categorized !== 1 ? 's' : ''} categorized`)
    setApplying(false)
  }

  return (
    <div className="space-y-8 max-w-2xl">

      {/* ── Add rule ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-700 mb-4">New rule</h3>
        <form onSubmit={addRule} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">If name contains…</label>
            <input
              type="text"
              placeholder="e.g. WAL-MART"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Set category to</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button
            type="submit"
            disabled={!pattern.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add rule
          </button>
        </form>
      </div>

      {/* ── Rule list ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-700">
            Rules <span className="text-gray-400 font-normal">({ruleList.length})</span>
          </h3>
          <p className="text-xs text-gray-400">Top = highest priority · first match wins</p>
        </div>

        {ruleList.length === 0 ? (
          <p className="px-5 py-8 text-center text-gray-400 text-sm">No rules yet — add one above.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-gray-400 bg-gray-50">
              <tr>
                <th className="px-3 py-2 w-16 text-center">Order</th>
                <th className="px-5 py-2 text-left">Pattern</th>
                <th className="px-5 py-2 text-left">→ Category</th>
                <th className="px-3 py-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ruleList.map((r, idx) => (
                <tr key={r.id} className={`hover:bg-gray-50 transition-opacity ${moving === r.id ? 'opacity-40' : ''}`}>

                  {/* Up / down buttons */}
                  <td className="px-3 py-1.5 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <button
                        onClick={() => move(r.id, 'up')}
                        disabled={idx === 0 || moving !== null}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed leading-none text-base"
                        title="Move up (higher priority)"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => move(r.id, 'down')}
                        disabled={idx === ruleList.length - 1 || moving !== null}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed leading-none text-base"
                        title="Move down (lower priority)"
                      >
                        ▼
                      </button>
                    </div>
                  </td>

                  <td className="px-5 py-2 font-mono text-xs text-gray-600">{r.pattern}</td>

                  <td className="px-5 py-2">
                    <span className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      {r.category}
                    </span>
                  </td>

                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => deleteRule(r.id)}
                      className="text-gray-300 hover:text-red-400 text-xs"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Apply ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border p-5 space-y-3">
        <h3 className="font-semibold text-gray-700">Apply rules</h3>
        <p className="text-sm text-gray-500">
          Rules run automatically on every import. Use these to apply them retroactively to <span className="font-medium">{month}</span>.
        </p>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => applyToMonth(false)}
            disabled={applying || ruleList.length === 0}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {applying ? 'Applying…' : 'Apply to uncategorized'}
          </button>
          <button
            onClick={() => applyToMonth(true)}
            disabled={applying || ruleList.length === 0}
            className="px-4 py-2 border text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Re-apply to all (overwrite)
          </button>
          {applyMsg && <span className="text-sm text-emerald-600">✓ {applyMsg}</span>}
        </div>
      </div>

    </div>
  )
}
