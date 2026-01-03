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
  const [err, setErr] = useState<string | null>(null)
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  // We measure modal box to clamp fully inside viewport
  const boxRef = useRef<HTMLDivElement | null>(null)
  const [boxSize, setBoxSize] = useState({ w: 360, h: 420 }) // sensible defaults

  const max = Math.max(1, Math.floor(Number(maxAmount || 1)))

  useEffect(() => {
    if (!open) return
    setToInput('')
    setAmountStr('1')
    setBusy(false)
    setErr(null)
  }, [open])

  // Stable portal root (works better in embedded environments)
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

  const amount = useMemo(() => {
    const n = Number(amountStr)
    if (!Number.isFinite(n)) return 1
    return Math.max(1, Math.min(max, Math.floor(n)))
  }, [amountStr, max])

  // Measure the modal after it opens (and when max changes / content changes)
  useLayoutEffect(() => {
    if (!open) return
    if (!boxRef.current) return

    const measure = () => {
      const r = boxRef.current!.getBoundingClientRect()
      setBoxSize({ w: Math.max(280, Math.ceil(r.width)), h: Math.max(200, Math.ceil(r.height)) })
    }

    measure()

    // ResizeObserver to handle dynamic height (errors, 1155 quantity box, etc.)
    const ro = new ResizeObserver(() => measure())
    ro.observe(boxRef.current)

    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [open, max])

  // Compute a viewport-safe top/left for the modal box
  const safePos = useMemo(() => {
    if (typeof window === 'undefined') return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }

    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 12

    // Desired center = anchor center, else viewport center
    const cx = anchorRect ? anchorRect.left + anchorRect.width / 2 : vw / 2
    const cy = anchorRect ? anchorRect.top + anchorRect.height / 2 : vh / 2

    // Convert to top-left and clamp so full box stays visible
    const left = clamp(cx - boxSize.w / 2, pad, vw - pad - boxSize.w)
    const top = clamp(cy - boxSize.h / 2, pad, vh - pad - boxSize.h)

    return { left, top }
  }, [anchorRect, boxSize.w, boxSize.h])

  // Resolve 0x / ENS / farcaster username -> 0x address
  const resolveToAddress = async (q: string): Promise<`0x${string}` | null> => {
    const raw = q.trim()
    if (!raw) return null

    if (isHexAddress(raw)) return raw.toLowerCase() as `0x${string}`

    try {
      const res = await fetch(`/api/resolve?q=${encodeURIComponent(raw)}`, { cache: 'no-store' })
      const json = await res.json()
      const addr = String(json?.address || '').trim()
      if (res.ok && isHexAddress(addr)) return addr.toLowerCase() as `0x${string}`
    } catch {
      // ignore
    }
    return null
  }

  const canAttemptSend = useMemo(() => {
    return !busy && amount >= 1 && amount <= max && toInput.trim().length > 0
  }, [busy, amount, max, toInput])

  if (!open) return null
  if (!portalTarget) return null

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 2147483647, pointerEvents: 'auto' }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
        aria-hidden="true"
      />

      {/* Modal box positioned fully inside viewport */}
      <div className="absolute" style={{ left: safePos.left, top: safePos.top }}>
        <div
          ref={boxRef}
          className="
            relative w-[92vw] max-w-md
            max-h-[80vh] overflow-auto
            rounded-3xl border border-white/20
            bg-[#a78bfa] text-white
            shadow-[0_25px_80px_rgba(0,0,0,0.65)]
          "
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="p-4 border-b border-white/20 bg-white/10">
            <div className="text-sm font-semibold truncate text-white">{title}</div>
            {/* Removed helper line per request */}
          </div>

          <div className="p-4 space-y-3">
            <div className="rounded-2xl border border-white/20 bg-white/15 p-2">
              <input
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    setErr(null)
                    const resolved = await resolveToAddress(toInput)
                    if (!resolved) setErr('Not found')
                  }
                }}
                placeholder="0x…  |  madyak.eth  |  madyak"
                className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/70 outline-none"
                style={{ color: '#ffffff', caretColor: '#ffffff' }}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            {/* Quantity only if ERC-1155 (max > 1) */}
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
                    className="flex-1 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm text-white outline-none"
                    style={{ color: '#ffffff', caretColor: '#ffffff' }}
                  />
                </div>

                <div className="mt-2 text-[11px] text-white/90">Choose 1 to {max}.</div>
              </div>
            ) : null}

            {err ? <div className="text-xs text-white font-semibold">{err}</div> : null}

            <div className="pt-1 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="
                  flex-1 rounded-full px-4 py-3 text-sm font-semibold
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
                  if (amount < 1 || amount > max) {
                    setErr('Not found')
                    return
                  }

                  setErr(null)
                  setBusy(true)
                  try {
                    const resolved = await resolveToAddress(toInput)
                    if (!resolved) {
                      setErr('Not found')
                      return
                    }

                    await onConfirm(resolved, amount)
                    onClose()
                  } catch (e: any) {
                    setErr(e?.message ?? 'Transaction failed')
                  } finally {
                    setBusy(false)
                  }
                }}
                className={[
                  'flex-1 rounded-full px-4 py-3 text-sm font-semibold active:scale-[0.98] transition',
                  canAttemptSend ? 'bg-white text-[#1b0736]' : 'bg-white/25 text-white/70 cursor-not-allowed',
                ].join(' ')}
                disabled={!canAttemptSend}
              >
                {busy ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    portalTarget
  )
}
