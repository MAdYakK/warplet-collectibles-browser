'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { isAddress } from 'viem'

type AnchorRect = { top: number; left: number; width: number; height: number }

export default function SendModal({
  open,
  onClose,
  title,
  maxAmount = 1,
  anchorRect, // kept for later; not needed to show modal
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  title: string
  maxAmount?: number
  anchorRect?: AnchorRect | null
  onConfirm: (to: `0x${string}`, amount: number) => Promise<void> | void
}) {
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState(1)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) return
    setTo('')
    setAmount(1)
    setBusy(false)
    setErr('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const showAmount = (maxAmount ?? 1) > 1
  const toNormalized = useMemo(() => to.trim(), [to])

  if (!open) return null
  if (typeof document === 'undefined') return null

  const mount = document.getElementById('modal-root') ?? document.body

  const node = (
    <div className="fixed inset-0" style={{ zIndex: 2147483647 }} role="dialog" aria-modal="true">
      {/* BEACON */}
      <div className="fixed top-2 left-2 px-2 py-1 rounded-full bg-black/70 text-white text-[10px] pointer-events-none">
        SendModal visible
      </div>

      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label="Close send modal"
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-end justify-center p-3 sm:items-center">
        <div
          className="
            w-full max-w-md
            rounded-3xl border border-white/15
            bg-[#1b0736]
            shadow-[0_25px_80px_rgba(0,0,0,0.65)]
            overflow-hidden
          "
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{title}</div>
              <div className="text-xs text-white/60 truncate">Send to 0x address</div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-3 py-2 text-xs font-semibold bg-white/10 text-white border border-white/15 active:scale-[0.98] transition"
            >
              Close
            </button>
          </div>

          <div className="px-4 py-4 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] uppercase tracking-wider text-white/60">Recipient</div>
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="0x…"
                className="mt-1 w-full bg-transparent text-sm text-white placeholder:text-white/35 outline-none"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            {showAmount ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-wider text-white/60">Amount</div>
                  <div className="text-xs text-white/60">Max {maxAmount}</div>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-full px-3 py-2 text-xs font-semibold bg-white/10 text-white border border-white/15 active:scale-[0.98] transition"
                    onClick={() => setAmount((a) => Math.max(1, a - 1))}
                    disabled={busy}
                  >
                    −
                  </button>

                  <input
                    value={String(amount)}
                    onChange={(e) => {
                      const n = Math.floor(Number(e.target.value || '1'))
                      if (!Number.isFinite(n)) return
                      setAmount(Math.max(1, Math.min(maxAmount, n)))
                    }}
                    inputMode="numeric"
                    className="flex-1 min-w-0 rounded-2xl border border-white/10 bg-transparent px-3 py-2 text-sm text-white outline-none"
                    disabled={busy}
                  />

                  <button
                    type="button"
                    className="rounded-full px-3 py-2 text-xs font-semibold bg-white/10 text-white border border-white/15 active:scale-[0.98] transition"
                    onClick={() => setAmount((a) => Math.min(maxAmount, a + 1))}
                    disabled={busy}
                  >
                    +
                  </button>
                </div>
              </div>
            ) : null}

            {err ? (
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {err}
              </div>
            ) : null}
          </div>

          <div className="px-4 py-4 border-t border-white/10">
            <button
              type="button"
              className="w-full rounded-full px-4 py-3 text-sm font-semibold bg-white text-[#1b0736] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={busy}
              onClick={async () => {
                setErr('')
                if (!isAddress(toNormalized)) {
                  setErr('Paste a valid 0x address.')
                  return
                }

                const amt = showAmount ? Math.max(1, Math.min(maxAmount, Math.floor(amount || 1))) : 1

                try {
                  setBusy(true)
                  await onConfirm(toNormalized as `0x${string}`, amt)
                  setBusy(false)
                  onClose()
                } catch (e: any) {
                  setBusy(false)
                  const msg =
                    typeof e?.shortMessage === 'string'
                      ? e.shortMessage
                      : typeof e?.message === 'string'
                        ? e.message
                        : 'Transaction failed.'

                  if (/user rejected|rejected|denied|canceled|cancelled/i.test(msg)) {
                    setErr('Transaction cancelled.')
                  } else {
                    setErr(msg.length > 180 ? msg.slice(0, 180) + '…' : msg)
                  }
                }
              }}
            >
              {busy ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(node, mount)
}
