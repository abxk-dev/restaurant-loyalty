const API_URL = import.meta.env.VITE_API_URL || ''

const SESSION_KEY = 'brewbakes_session'
const PENDING_SPIN_KEY = 'brewbakes_pending_spin'
const PHONE_KEY = 'brewbakes_last_phone'
const MAX_JACKPOT_PER_MONTH = 4

// ─── API helper ────────────────────────────────────────────────────
async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body.error || `API error: ${res.status}`)
    err.status = res.status
    err.body = body
    throw err
  }
  return res.json()
}

// ─── Session (anonymous, per-device — stays in localStorage) ───────
export function getSessionId() {
  let sid = localStorage.getItem(SESSION_KEY)
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(SESSION_KEY, sid)
  }
  return sid
}

// ─── Anti-spam (checks session + phone on server) ──────────────────
export async function canSpinToday(phone) {
  try {
    const params = phone ? `?phone=${phone}` : ''
    const data = await api(`/api/spin/can-spin/${getSessionId()}${params}`)
    return data.canSpin
  } catch {
    return true
  }
}

// ─── Play spin (server resolves discount + jackpot) ────────────────
export async function playSpin(billAmount) {
  const phone = getLastPhone()
  return api('/api/spin/play', {
    method: 'POST',
    body: JSON.stringify({
      sessionId: getSessionId(),
      billAmount,
      phone: phone || undefined,
    }),
  })
}

// ─── Record spin result on server (legacy — prefer playSpin) ─────
export async function recordSpin(discount, billAmount, promoCode) {
  try {
    const result = await api('/api/spin', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: getSessionId(),
        discount,
        billAmount,
        promoCode,
      }),
    })
    return result
  } catch (err) {
    console.error('Failed to record spin:', err)
    throw err
  }
}

// ─── Get today's spin for this session (restore on refresh) ────────
export async function getTodaysSpin() {
  try {
    return await api(`/api/spin/today/${getSessionId()}`)
  } catch {
    return null
  }
}

// ─── User CRUD ─────────────────────────────────────────────────────
export async function getUser(phone) {
  try {
    return await api(`/api/user/${phone}`)
  } catch {
    return null
  }
}

// ─── Save completed spin (uses server-side data) ───────────────────
export async function saveSpinResult(phone) {
  const data = await api('/api/user/save-spin', {
    method: 'POST',
    body: JSON.stringify({ phone, sessionId: getSessionId() }),
  })
  saveLastPhone(phone)
  return data
}

// ─── Redeem free coffee (resets loyalty counter) ───────────────────
export async function redeemFreeCoffee(phone) {
  return api(`/api/user/${phone}/redeem-reward`, { method: 'POST' })
}

// ─── Task completion ─────────────────────────────────────────────
export async function completeTask(phone, task) {
  const result = await api(`/api/user/${phone}/complete-task`, {
    method: 'POST',
    body: JSON.stringify({ task }),
  })
  if (result.user?.completedTasks) {
    const cached = getCompletedTasks()
    cached[task] = true
    localStorage.setItem('brewbakes_completed_tasks', JSON.stringify(cached))
  }
  return result
}

// ─── Phone persistence (localStorage) ────────────────────────────
export function saveLastPhone(phone) {
  localStorage.setItem(PHONE_KEY, phone)
}

export function getLastPhone() {
  return localStorage.getItem(PHONE_KEY) || ''
}

// ─── Completed tasks cache (localStorage) ────────────────────────
export function getCompletedTasks() {
  try {
    return JSON.parse(localStorage.getItem('brewbakes_completed_tasks')) || {}
  } catch {
    return {}
  }
}

export function setCompletedTasks(tasks) {
  localStorage.setItem('brewbakes_completed_tasks', JSON.stringify(tasks))
}

// ─── Pending spin (localStorage — offline resilience) ──────────────
export function savePendingSpin(billAmount, discount, promoCode, freebie = null, isJackpot = false) {
  localStorage.setItem(PENDING_SPIN_KEY, JSON.stringify({
    billAmount, discount, promoCode, freebie, isJackpot,
    timestamp: new Date().toISOString(),
  }))
}

export function loadPendingSpin() {
  try {
    const raw = localStorage.getItem(PENDING_SPIN_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    const spinDate = new Date(data.timestamp)
    const now = new Date()
    const isToday = spinDate.toDateString() === now.toDateString()
    return isToday ? data : null
  } catch {
    return null
  }
}

export function clearPendingSpin() {
  localStorage.removeItem(PENDING_SPIN_KEY)
}

// ─── Jackpot (100%) monthly limit ──────────────────────────────────
export async function getJackpotCountThisMonth() {
  try {
    const data = await api('/api/jackpot/count')
    return data.count
  } catch {
    return 0
  }
}

export async function canWinJackpot() {
  const count = await getJackpotCountThisMonth()
  return count < MAX_JACKPOT_PER_MONTH
}

export async function logJackpotWin(phone) {
  try {
    await api('/api/jackpot/log', {
      method: 'POST',
      body: JSON.stringify({ phone: phone || null }),
    })
  } catch (err) {
    console.error('Failed to log jackpot:', err)
  }
}

// ─── Promo code ────────────────────────────────────────────────────
export function generatePromoCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// ─── Weighted spin ─────────────────────────────────────────────────
const SPIN_TABLE = [
  { discount: 5,    weight: 30 },
  { discount: 7.5,  weight: 25 },
  { discount: 10,   weight: 20 },
  { discount: 12.5, weight: 12 },
  { discount: 15,   weight: 7 },
  { discount: 17,   weight: 4 },
  { discount: 20,   weight: 1.5 },
  { discount: 100,  weight: 0.5 },
]

export async function getWeightedDiscount() {
  let available = SPIN_TABLE
  try {
    const canWin = await canWinJackpot()
    if (!canWin) {
      available = SPIN_TABLE.filter(e => e.discount !== 100)
    }
  } catch {}

  const total = available.reduce((sum, s) => sum + s.weight, 0)
  let rand = Math.random() * total
  for (const entry of available) {
    rand -= entry.weight
    if (rand <= 0) return entry.discount
  }
  return available[0].discount
}

export function getSpinTable() {
  return SPIN_TABLE
}
