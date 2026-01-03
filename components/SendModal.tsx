'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

type AnchorRect = { top: number; left: number; width: number; height: number }

export default function SendModal({
  open,
  onClose,
  title,
  onConfirm,
  maxAmount = 1,
  anchorRect,
}: {
  open: boolean
  onClose: () => void
  title: string
  onConfirm: (to: `0x${string}`, amount: number) => Promise<void>
  maxAmount?: number
  anchorRect?: AnchorRect | null
}) {
  const [to, setTo] = useState('')
  const [amountStr, setAmountStr] = useState('1')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const max = Math.max(1, Math.floor(Number(maxAmount || 1)))

  useEffect(() => {
    if (!open) return
    setTo('')
    setErr(null)
    setBusy(false)
    setAmountStr('1')
  }, [open])

  const canSubmitAddr = useMemo(() => /^0x[a-fA-F0-9]{40}$/.test(to.trim()), [to])

  const amount = useMemo(() => {
    const n = Number(amountStr)
    if (!Number.isFinite(n)) return 1
    return Math.max(1, Math.min(max, Math.floor(n)))
  }, [amountStr, max])

  const canSubmit = canSubmitAddr && !busy && amount >= 1 && amount <= max

  const modalPos = useMemo(() => {
    if (!anchorRect || typeof window === 'undefined') return null
    const cx = anchorRect.left + anchorRect.width / 2
    const cy = anchorRect.top + anchorRect.height / 2

    const vw = window.innerWidth
    const vh = window.innerHeight
    const x = Math.max(24, Math.min(vw - 24, cx))
    const y = Math.max(24, Math.min(vh - 24, cy))
    return { left: x, top: y }
  }, [anchorRect])

  if (!open) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[2147483647]">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onMouseDown={(e) => {
          e.preventDefault()
          onClose()
        }}
        aria-hidden="true"
      />

      {/* centered over card (or screen center fallback) */}
      <div
        className="absolute"
        style={
          modalPos
            ? { left: modalPos.left, top: modalPos.top, transform: 'translate(-50%, -50%)' }
            : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
        }
      >
        <div
          className="
            relative w-[92vw] max-w-md
            rounded-3xl border border-white/20
            bg-[#1b0736] text-white
            shadow-[0_25px_80px_rgba(0,0,0,0.65)]
            overflow-hidden
          "
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="p-4 border-b border-white/10">
            <div className="text-sm font-semibold truncate">{title}</div>
            <div className="mt-1 text-xs text-white/70">Enter a recipient address</div>
          </div>

          <div className="p-4 space-y-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-2">
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="0x…"
                className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/50 outline-none"
                style={{ color: '#ffffff', caretColor: '#ffffff' }}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            {max > 1 ? (
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-white/90">Quantity</div>
                  <div className="text-[11px] text-white/70">Max: {max}</div>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <select
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs text-white outline-none"
                    value={String(amount)}
                    onChange={(e) => setAmountStr(e.target.value)}
                  >
                    {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n} className="text-black">
                        {n}
                      </option>
                    ))}
                  </select>

                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={amountStr}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d]/g, '')
                      setAmountStr(v || '1')
                    }}
                    className="flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white outline-none"
                    style={{ color: '#ffffff', caretColor: '#ffffff' }}
                  />
                </div>

                <div className="mt-2 text-[11px] text-white/70">Choose 1 to {max}.</div>
              </div>
            ) : null}

            {err ? <div className="text-xs text-white">{err}</div> : null}

            <div className="pt-1 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full px-4 py-3 text-sm font-semibold border border-white/20 bg-white/10 text-white active:scale-[0.98] transition"
                disabled={busy}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!canSubmitAddr) {
                    setErr('Please enter a valid 0x address.')
                    return
                  }
                  if (amount < 1 || amount > max) {
                    setErr(`Quantity must be between 1 and ${max}.`)
                    return
                  }

                  setErr(null)
                  setBusy(true)
                  try {
                    await onConfirm(to.trim().toLowerCase() as `0x${string}`, amount)
                    onClose()
                  } catch (e: any) {
                    setErr(e?.message ?? 'Transaction failed')
                  } finally {
                    setBusy(false)
                  }
                }}
                className={[
                  'flex-1 rounded-full px-4 py-3 text-sm font-semibold active:scale-[0.98] transition',
                  canSubmit ? 'bg-white text-[#1b0736]' : 'bg-white/25 text-white/60 cursor-not-allowed',
                ].join(' ')}
                disabled={!canSubmit}
              >
                {busy ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
