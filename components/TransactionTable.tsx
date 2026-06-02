'use client'

import { useEffect, useRef, useState } from 'react'
import type { Transaction } from '@/db/schema'

// ── Category colours ────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  Payment:       'bg-gray-100    text-gray-600',
  Groceries:     'bg-green-100   text-green-700',
  Dining:        'bg-orange-100  text-orange-700',
  Transport:     'bg-blue-100    text-blue-700',
  Housing:       'bg-purple-100  text-purple-700',
  Health:        'bg-pink-100    text-pink-700',
  Shopping:      'bg-indigo-100  text-indigo-700',
  Gym:           'bg-teal-100    text-teal-700',
  Vacation:      'bg-sky-100     text-sky-700',
  Cuba:          'bg-amber-100   text-amber-700',
  Kids:          'bg-lime-100    text-lime-700',
  Subscriptions: 'bg-violet-100  text-violet-700',
  Fun:           'bg-fuchsia-100 text-fuchsia-700',
  'Nico Therapy': 'bg-cyan-100    text-cyan-700',
  Other:         'bg-slate-100   text-slate-600',
}

const CATEGORIES = Object.keys(CATEGORY_COLORS)

function rowKey(r: { fitId: string; acctId: string }) {
  return `${r.fitId}|${r.acctId}`
}

// ── CategoryPicker ──────────────────────────────────────────────────────────
function CategoryPicker({
  value,
  onChange,
  placeholder,
}: {
  value:       string | null
  onChange:    (cat: string) => void
  placeholder?: string           // shown instead of "⚠ unset" — used in bulk bar
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const colorClass = value ? CATEGORY_COLORS[value] ?? 'bg-gray-100 text-gray-600' : null

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-opacity hover:opacity-80 ${
          value
            ? colorClass
            : placeholder
              ? 'bg-blue-50 text-blue-600 border border-blue-200'
              : 'bg-red-50 text-red-500 border border-red-200'
        }`}
      >
        {value ?? placeholder ?? '⚠ unset'}
        <span className="opacity-50 text-[10px]">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 w-44 bg-white border rounded-xl shadow-lg py-1 max-h-72 overflow-y-auto">
          {!placeholder && (
            <>
              <button
                onClick={() => { onChange(''); setOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-red-300 inline-block" />
                ⚠ unset
              </button>
              <div className="border-t my-1" />
            </>
          )}
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { onChange(cat); setOpen(false) }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2 ${value === cat ? 'font-semibold' : ''}`}
            >
              <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${CATEGORY_COLORS[cat]}`}>
                {cat}
              </span>
              {value === cat && <span className="ml-auto text-blue-500">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── TransactionTable ────────────────────────────────────────────────────────
interface Props {
  month:           string
  acctId:          string | null
  filterCategory?: string | null
  onClearCategory?: () => void
}

export function TransactionTable({ month, acctId, filterCategory, onClearCategory }: Props) {
  const [rows, setRows]               = useState<Transaction[]>([])
  const [search, setSearch]           = useState('')
  const [loading, setLoading]         = useState(false)
  const [editingMemo, setEditingMemo] = useState<{ fitId: string; acctId: string; value: string } | null>(null)
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [bulkApplying, setBulkApplying] = useState(false)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ month })
    if (acctId)         params.set('acctId',   acctId)
    if (search)         params.set('search',   search)
    if (filterCategory) params.set('category', filterCategory)
    const res = await fetch(`/api/transactions?${params}`)
    setRows(await res.json())
    setLoading(false)
    setSelected(new Set())
  }

  useEffect(() => { load() }, [month, acctId, search, filterCategory])  // eslint-disable-line react-hooks/exhaustive-deps

  async function patch(fitId: string, thisAcctId: string, fields: Record<string, string>) {
    await fetch('/api/transactions', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ fitId, acctId: thisAcctId, ...fields }),
    })
    setRows((prev) => prev.map((r) =>
      r.fitId === fitId && r.acctId === thisAcctId ? { ...r, ...fields } : r
    ))
  }

  async function saveMemo() {
    if (!editingMemo) return
    await patch(editingMemo.fitId, editingMemo.acctId, { memo: editingMemo.value })
    setEditingMemo(null)
  }

  // ── Selection helpers ────────────────────────────────────────────────────
  const allKeys      = rows.map(rowKey)
  const allSelected  = allKeys.length > 0 && allKeys.every((k) => selected.has(k))
  const someSelected = allKeys.some((k) => selected.has(k)) && !allSelected

  function toggleRow(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allKeys))
    }
  }

  // ── Bulk apply ───────────────────────────────────────────────────────────
  async function applyBulkCategory(category: string) {
    setBulkApplying(true)
    const targets = rows.filter((r) => selected.has(rowKey(r)))
    await Promise.all(targets.map((r) => patch(r.fitId, r.acctId, { category })))
    setSelected(new Set())
    setBulkApplying(false)
  }

  const selectedCount = selected.size

  // ── Totals ───────────────────────────────────────────────────────────────
  const totalExpenses = rows.filter(r => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0)
  const totalCredits  = rows.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0)

  return (
    <div className="space-y-3">
      {/* Active category filter pill */}
      {filterCategory && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filtered by:</span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[filterCategory] ?? 'bg-gray-100 text-gray-600'}`}>
            {filterCategory}
            <button
              onClick={onClearCategory}
              className="opacity-60 hover:opacity-100 ml-0.5"
              title="Clear filter"
            >
              ✕
            </button>
          </span>
        </div>
      )}

      <input
        type="search"
        placeholder="Search by name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      />

      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {/* ── Results summary ─────────────────────────────────────────────── */}
      {rows.length > 0 && !loading && (
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{rows.length} transaction{rows.length !== 1 ? 's' : ''}</span>
          <span className="text-gray-300">·</span>
          <span className="text-red-600 font-medium">${totalExpenses.toFixed(2)} spent</span>
          {totalCredits > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-emerald-600 font-medium">${totalCredits.toFixed(2)} credited</span>
            </>
          )}
        </div>
      )}

      {/* ── Bulk action bar ─────────────────────────────────────────────── */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm">
          <span className="font-semibold">{selectedCount} selected</span>
          <span className="opacity-40">·</span>
          <span className="opacity-80 text-xs">Set category:</span>
          <CategoryPicker
            value={null}
            placeholder="Pick category…"
            onChange={applyBulkCategory}
          />
          {bulkApplying && <span className="opacity-60 text-xs animate-pulse">Applying…</span>}
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-white/60 hover:text-white text-xs underline"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected }}
                  onChange={toggleAll}
                  className="rounded cursor-pointer accent-blue-600"
                />
              </th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Memo</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2 text-left">Category</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 && !loading && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">No transactions</td></tr>
            )}
            {rows.map((r) => {
              const key        = rowKey(r)
              const isSelected = selected.has(key)
              return (
                <tr
                  key={key}
                  className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}
                  onClick={() => toggleRow(key)}
                >
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(key)}
                      className="rounded cursor-pointer accent-blue-600"
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-gray-500">{r.date}</td>
                  <td className="px-3 py-2 max-w-xs truncate">{r.name}</td>

                  {/* Editable memo */}
                  <td className="px-3 py-2 max-w-xs" onClick={(e) => e.stopPropagation()}>
                    {editingMemo?.fitId === r.fitId && editingMemo?.acctId === r.acctId ? (
                      <input
                        autoFocus
                        value={editingMemo.value}
                        onChange={(e) => setEditingMemo({ ...editingMemo, value: e.target.value })}
                        onBlur={saveMemo}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter')  saveMemo()
                          if (e.key === 'Escape') setEditingMemo(null)
                        }}
                        className="w-full border rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    ) : (
                      <span
                        title="Click to edit"
                        onClick={() => setEditingMemo({ fitId: r.fitId, acctId: r.acctId, value: r.memo ?? '' })}
                        className="block truncate text-gray-400 cursor-pointer hover:text-gray-700 hover:underline decoration-dotted"
                      >
                        {r.memo || <span className="italic text-gray-300">add note…</span>}
                      </span>
                    )}
                  </td>

                  <td className={`px-3 py-2 text-right font-mono tabular-nums ${r.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {r.amount < 0 ? '-' : '+'}${Math.abs(r.amount).toFixed(2)}
                  </td>

                  {/* Category picker */}
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <CategoryPicker
                      value={r.category ?? null}
                      onChange={(cat) => patch(r.fitId, r.acctId, { category: cat })}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
