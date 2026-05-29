'use client'

import { useRef, useState } from 'react'

interface AccountResult {
  acctId:   string
  total:    number
  inserted: number
  skipped:  number
}

export function QfxUpload({ onSuccess }: { onSuccess?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [result, setResult]  = useState<AccountResult[] | null>(null)
  const [error, setError]    = useState<string | null>(null)

  async function handleFile(file: File) {
    if (!file.name.endsWith('.qfx') && !file.name.endsWith('.ofx')) {
      setError('Please select a .qfx or .ofx file')
      return
    }
    setStatus('uploading')
    setError(null)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res  = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      setResult(json.accounts)
      setStatus('done')
      onSuccess?.()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".qfx,.ofx"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {status === 'idle' && (
        <>
          <p className="text-2xl mb-2">📂</p>
          <p className="font-medium text-gray-700">Drop a .qfx file here or click to browse</p>
          <p className="text-sm text-gray-400 mt-1">Supports QFX and OFX formats</p>
        </>
      )}

      {status === 'uploading' && (
        <p className="text-gray-500 animate-pulse">Parsing &amp; importing…</p>
      )}

      {status === 'done' && result && (
        <div className="text-green-700 space-y-2">
          <p className="text-lg font-semibold">✓ Import complete — {result.length} account{result.length > 1 ? 's' : ''}</p>
          {result.map((r) => (
            <div key={r.acctId} className="text-sm border-t border-green-200 pt-1">
              <span className="font-mono text-xs">{r.acctId}</span>
              <span className="ml-2">{r.inserted} new · {r.skipped} skipped</span>
            </div>
          ))}
          <p className="text-xs text-gray-400 mt-2 cursor-pointer underline" onClick={(e) => { e.stopPropagation(); setStatus('idle'); setResult(null) }}>Import another file</p>
        </div>
      )}

      {status === 'error' && (
        <div className="text-red-600 space-y-1">
          <p className="font-medium">⚠ {error}</p>
          <p className="text-xs underline" onClick={(e) => { e.stopPropagation(); setStatus('idle') }}>Try again</p>
        </div>
      )}
    </div>
  )
}
