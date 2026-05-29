'use client'

import { useEffect, useState } from 'react'
import { QfxUpload } from '@/components/QfxUpload'
import { TransactionTable } from '@/components/TransactionTable'
import { BudgetTab } from '@/components/BudgetTab'
import { RulesTab } from '@/components/RulesTab'
import type { AccountConfig } from '@/config/accounts'

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export default function Home() {
  const [accounts,        setAccounts]        = useState<AccountConfig[]>([])
  const [acctId,          setAcctId]          = useState<string | null>(null)
  const [month,           setMonth]           = useState(currentMonth())
  const [tab,             setTab]             = useState<'import' | 'transactions' | 'budget' | 'rules'>('import')
  const [filterCategory,  setFilterCategory]  = useState<string | null>(null)

  async function loadAccounts() {
    const res = await fetch('/api/accounts')
    const data: AccountConfig[] = await res.json()
    setAccounts(data)
    if (data.length && !acctId) setAcctId(data[0].acctId)
  }

  useEffect(() => { loadAccounts() }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  function drillIntoCategory(category: string) {
    setFilterCategory(category)
    setTab('transactions')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-800">💰 Dune Budget</h1>

        <select
          value={acctId ?? ''}
          onChange={(e) => setAcctId(e.target.value || null)}
          className="ml-4 border rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.acctId} value={a.acctId}>
              {a.nickname ?? a.acctId} ({a.acctType})
            </option>
          ))}
        </select>

        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm"
        />

        <nav className="ml-auto flex gap-2">
          {(['import', 'transactions', 'budget', 'rules'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {t === 'import' ? '⬆ Import' : t === 'transactions' ? '📋 Transactions' : t === 'budget' ? '📊 Budget' : '⚡ Rules'}
            </button>
          ))}
        </nav>
      </header>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {tab === 'import' && (
          <div className="max-w-xl mx-auto">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Import QFX file</h2>
            <QfxUpload onSuccess={() => { loadAccounts(); setTab('transactions') }} />
          </div>
        )}

        {tab === 'transactions' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Transactions — {month}
            </h2>
            <TransactionTable
              month={month}
              acctId={acctId}
              filterCategory={filterCategory}
              onClearCategory={() => setFilterCategory(null)}
            />
          </div>
        )}

        {tab === 'budget' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Budget — {month}
            </h2>
            <BudgetTab month={month} acctId={acctId} onCategoryClick={drillIntoCategory} />
          </div>
        )}

        {tab === 'rules' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Auto-categorization rules</h2>
            <RulesTab month={month} />
          </div>
        )}
      </div>
    </main>
  )
}
