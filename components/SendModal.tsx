'use client'

import React, { useMemo, useState } from 'react'

export default function SendModal({
  open,
  onClose,
  onConfirm,
  title,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (to: `0x${string}`) => Promise<void>
  title: string
}) {
  const [to, setTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const isValid = useMemo(() => /^0x[a-fA-F0-9]{40}$/.test(to.trim()), [to])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-4 border-t">
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold truncate">{title}</div>
          <button className="text-sm text-neutral-500" onClick={onClose} disabled={busy}>
            Close
          </button>
        </div>

        <div className="mt-3">
          <label className="text-xs text-neutral-500">Recipient address</label>
          <input
            className="mt-1 w-full rounded-xl border p-3 text-sm"
            placeholder="0x…"
            value={to}
            onChange={(e) => {
              setTo(e.target.value)
              setErr(null)
            }}
          />
          {err ? <div className="mt-2 text-xs text-red-600">{err}</div> : null}
        </div>

        <button
          className="mt-4 w-full rounded-2xl border px-4 py-3 text-sm font-semibold disabled:opacity-50"
          disabled={!isValid || busy}
          onClick={async () => {
            setBusy(true)
            setErr(null)
            try {
              await onConfirm(to.trim() as `0x${string}`)
              onClose()
              setTo('')
            } catch (e: any) {
              setErr(e?.shortMessage || e?.message || 'Send failed')
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
