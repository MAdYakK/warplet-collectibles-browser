'use client'

import React, { useEffect, useMemo, useState } from 'react'

export default function SendModal({
  open,
  onClose,
  title,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  title: string
  onConfirm: (to: `0x${string}`) => Promise<void>
}) {
  const [to, setTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const canSubmit = useMemo(() => /^0x[a-fA-F0-9]{40}$/.test(to.trim()), [to])

  useEffect(() => {
    if (!open) return
    setTo('')
    setErr(null)
    setBusy(false)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center px-3 pb-6">
      {/* backdrop */}
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* modal */}
      <div
        className="
          relative w-full max-w-md
          rounded-3xl border border-white/10
          bg-[#1b0736]
          text-white
          shadow-2xl
          overflow-hidden
        "
      >
        <div className="p-4 flex items-center justify-between gap-3 border-b border-white/10">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{title}</div>
            <div className="text-xs text-white/70">Enter a recipient address</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              rounded-full px-3 py-2 text-xs font-semibold
              border border-white/10 bg-white/5 text-white
              active:scale-[0.98] transition
            "
          >
            Close
          </button>
        </div>

        <div className="p-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="0x…"
              className="
                w-full bg-transparent
                px-3 py-2 text-sm
                text-white placeholder:text-white/50
                outline-none
              "
              style={{ color: '#ffffff', caretColor: '#ffffff' }}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          {err ? <div className="mt-2 text-xs text-white">{err}</div> : null}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="
                flex-1 rounded-full px-4 py-3 text-sm font-semibold
                border border-white/10 bg-white/5 text-white
                active:scale-[0.98] transition
              "
              disabled={busy}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={async () => {
                if (!canSubmit) {
                  setErr('Please enter a valid 0x address.')
                  return
                }
                setErr(null)
                setBusy(true)
                try {
                  await onConfirm(to.trim().toLowerCase() as `0x${string}`)
                  onClose()
                } catch (e: any) {
                  setErr(e?.message ?? 'Transaction failed')
                } finally {
                  setBusy(false)
                }
              }}
              className={[
                'flex-1 rounded-full px-4 py-3 text-sm font-semibold active:scale-[0.98] transition',
                canSubmit && !busy
                  ? 'bg-white text-[#1b0736]'
                  : 'bg-white/20 text-white/60 cursor-not-allowed',
              ].join(' ')}
              disabled={!canSubmit || busy}
            >
              {busy ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
