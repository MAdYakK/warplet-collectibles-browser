'use client'

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type AnchorRect = { top: number; left: number; width: number; height: number }

function isHexAddress(s: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(s)
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function isUserRejected(err: unknown): boolean {
  const anyErr = err as any
  const code = anyErr?.code
  const msg = String(anyErr?.shortMessage || anyErr?.message || anyErr?.cause?.message || '').toLowerCase()
  if (code === 4001) return true
  if (code === 'ACTION_REJECTED') return true
  if (msg.includes('user rejected')) return true
  if (msg.includes('rejected the request')) return true
  if (msg.includes('request rejected')) return true
  if (msg.includes('denied')) return true
  if (msg.includes('cancel')) return true
  return false
}

function normalizeError(err: unknown): string {
  const anyErr = err as any
  const msg =
    anyErr?.shortMessage ||
    anyErr?.message ||
    anyErr?.cause?.message ||
    (typeof err === 'string' ? err : '') ||
    'Transaction failed'
  return String(msg)
}

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
  const [toInput, setToInput] = useState('')
  const [amountStr, setAmountStr] = useState('1')
  const [busy, setBusy] = useState(false)

  // non-resizing overlay message
  const [message, setMessage] = useState<string | null>(null)

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const boxRef = useRef<HTMLDivElement | null>(null)
  const [boxSize, setBoxSize] = useState({ w: 340, h: 390 })

  const max = Math.max(1, Math.floor(Number(maxAmount || 1)))

  useEffect(() => {
    if (!open) return
    setToInput('')
    setAmountStr('1')
    setBusy(false)
    setMessage(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    if (typeof document === 'undefined') return

    const existing = document.getElementById('wcb-modal-root') as HTMLElement | null
    if (existing) {
      setPortalTarget(existing)
      return
    }

    const el = document.createElement('div')
    el.id = 'wcb-modal-root'
    el.style.position = 'fixed'
    el.style.inset = '0'
    el.style.zIndex = '2147483647'
    el.style.pointerEvents = 'none'
    document.body.appendChild(el)
    setPortalTarget(el)
  }, [open])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [open])

  const amount = useMemo(() => {
    const n = Number(amountStr)
    if (!Number.isFinite(n)) return 1
    return Math.max(1, Math.min(max, Math.floor(n)))
  }, [amountStr, max])

  useLayoutEffect(() => {
    if (!open) return
    if (!boxRef.current) return

    const measure = () => {
      const r = boxRef.current!.getBoundingClientRect()
      setBoxSize({ w: Math.max(260, Math.ceil(r.width)), h: Math.max(200, Math.ceil(r.height)) })
    }

    measure()
    const ro = new ResizeObserver(() => measure())
    ro.observe(boxRef.current)

    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [open, max])

  const safePos = useMemo(() => {
    if (typeof window === 'undefined') return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }

    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 12

    const cx = anchorRect ? anchorRect.left + anchorRect.width / 2 : vw / 2
    const cy = anchorRect ? anchorRect.top + anchorRect.height / 2 : vh / 2

    const left = clamp(cx - boxSize.w / 2, pad, vw - pad - boxSize.w)
    const top = clamp(cy - boxSize.h / 2, pad, vh - pad - boxSize.h)

    return { left, top }
  }, [anchorRect, boxSize.w, boxSize.h])

  const resolveToAddress = async (q: string): Promise<`0x${string}` | null> => {
    const raw = q.trim()
    if (!raw) return null
    if (isHexAddress(raw)) return raw.toLowerCase() as `0x${string}`

    try {
      const res = await fetch(`/api/resolve?q=${encodeURIComponent(raw)}`, { cache: 'no-store' })
      const json = await res.json()
      const addr = String(json?.address || '').trim()
      if (res.ok && isHexAddress(addr)) return addr.toLowerCase() as `0x${string}`
    } catch {}
    return null
  }

  const canAttemptSend = useMemo(() => {
    return !busy && amount >= 1 && amount <= max && toInput.trim().length > 0
  }, [busy, amount, max, toInput])

  if (!open) return null
  if (!portalTarget) return null

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 2147483647, pointerEvents: 'auto' }}>
      <div
        className="absolute inset-0 bg-black/70"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
        aria-hidden="true"
      />

      <div className="absolute" style={{ left: safePos.left, top: safePos.top }}>
        <div
          ref={boxRef}
          className="
            relative w-[88vw] max-w-sm
            max-h-[80vh] overflow-y-auto overflow-x-hidden
            rounded-3xl border border-white/20
            bg-[#a78bfa] text-white
            shadow-[0_25px_80px_rgba(0,0,0,0.65)]
          "
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="p-4 border-b border-white/20 bg-white/10 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate text-white">{title}</div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold text-white active:scale-[0.98] transition"
              aria-label="Close"
              disabled={busy}
            >
              ✕
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div className="rounded-2xl border border-white/20 bg-white/15 p-2">
              <input
                ref={inputRef}
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                placeholder="0x…  |  madyak.eth  |  madyak"
                className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/70 outline-none"
                style={{ color: '#ffffff', caretColor: '#ffffff' }}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            {max > 1 ? (
              <div className="rounded-2xl border border-white/20 bg-white/15 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-white">Quantity</div>
                  <div className="text-[11px] text-white/90">Max: {max}</div>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <select
                    className="rounded-full border border-white/25 bg-white/15 px-3 py-2 text-xs text-white outline-none"
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
                    className="flex-1 min-w-0 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm text-white outline-none"
                    style={{ color: '#ffffff', caretColor: '#ffffff' }}
                  />
                </div>
              </div>
            ) : null}

            <div className="pt-1 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="
                  flex-1 rounded-full px-4 py-2.5 text-sm font-semibold
                  border border-white/25 bg-white/15 text-white
                  active:scale-[0.98] transition
                "
                disabled={busy}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (busy) return
                  setMessage(null)
                  setBusy(true)
                  try {
                    const resolved = await resolveToAddress(toInput)
                    if (!resolved) {
                      setMessage('Not found')
                      return
                    }
                    await onConfirm(resolved, amount)
                    onClose()
                  } catch (e) {
                    setMessage(isUserRejected(e) ? 'Transaction cancelled' : normalizeError(e))
                  } finally {
                    setBusy(false)
                  }
                }}
                className={[
                  'flex-1 rounded-full px-4 py-2.5 text-sm font-semibold active:scale-[0.98] transition',
                  canAttemptSend ? 'bg-white text-[#1b0736]' : 'bg-white/25 text-white/70 cursor-not-allowed',
                ].join(' ')}
                disabled={!canAttemptSend}
              >
                {busy ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>

          {/* Non-resizing message overlay */}
          {message ? (
            <div className="absolute left-3 right-3 bottom-3">
              <div className="rounded-2xl border border-white/25 bg-black/55 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/15">
                  <div className="text-xs font-semibold text-white">Message</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(message)
                        } catch {}
                      }}
                      className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white active:scale-[0.98] transition"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessage(null)}
                      className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white active:scale-[0.98] transition"
                      aria-label="Close message"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="px-3 py-2 text-[12px] text-white whitespace-pre-wrap break-words max-h-28 overflow-auto">
                  {message}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    portalTarget
  )
}
