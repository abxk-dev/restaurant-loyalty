import JackpotLog from '../models/JackpotLog.js'

const MAX_JACKPOT_PER_MONTH = 4
const JACKPOT_BILL_MIN = 200
const JACKPOT_BILL_MAX = 400
const BASE_JACKPOT_PROB = 0.002

export function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function getWeekKey(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function getStartOfWeek(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return d
}

function getDaysIntoWeek(date = new Date()) {
  const start = getStartOfWeek(date)
  const now = new Date(date)
  now.setHours(0, 0, 0, 0)
  return Math.floor((now - start) / 86400000)
}

function getDaysLeftInMonth(date = new Date()) {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  last.setHours(0, 0, 0, 0)
  const now = new Date(date)
  now.setHours(0, 0, 0, 0)
  return Math.floor((last - now) / 86400000)
}

function weightedPick(options) {
  const total = options.reduce((sum, o) => sum + o.weight, 0)
  let rand = Math.random() * total
  for (const entry of options) {
    rand -= entry.weight
    if (rand <= 0) return entry.value
  }
  return options[0].value
}

export function pickTierDiscount(billAmount) {
  if (billAmount < 300) {
    return 10
  }
  if (billAmount < 600) {
    return weightedPick([
      { value: 10, weight: 60 },
      { value: 20, weight: 40 },
    ])
  }
  if (billAmount <= 1000) {
    return weightedPick([
      { value: 5, weight: 50 },
      { value: 15, weight: 50 },
    ])
  }
  return 10
}

export function getFreebieForBill(billAmount) {
  if (billAmount > 1000) {
    return { name: 'Mini Sundae', value: 130 }
  }
  return null
}

export async function computeJackpotProbability(now = new Date()) {
  const monthKey = getMonthKey(now)
  const weekKey = getWeekKey(now)

  const monthlyCount = await JackpotLog.countDocuments({ month: monthKey })
  if (monthlyCount >= MAX_JACKPOT_PER_MONTH) return 0

  const weeklyCount = await JackpotLog.countDocuments({ weekKey })
  if (weeklyCount >= 1) return 0

  const daysIntoWeek = getDaysIntoWeek(now)
  let prob = BASE_JACKPOT_PROB * Math.pow(1.6, daysIntoWeek)

  if (daysIntoWeek >= 5) {
    prob = Math.max(prob, 0.15 + (daysIntoWeek - 5) * 0.25)
  }
  if (daysIntoWeek >= 6) {
    prob = Math.max(prob, 0.85)
  }

  const unusedMonthly = MAX_JACKPOT_PER_MONTH - monthlyCount
  const daysLeftInMonth = getDaysLeftInMonth(now)
  if (unusedMonthly > 0 && daysLeftInMonth <= 7) {
    prob *= 1 + unusedMonthly * 0.1
  }

  return Math.min(prob, 0.95)
}

export async function tryJackpot(billAmount, now = new Date()) {
  if (billAmount < JACKPOT_BILL_MIN || billAmount > JACKPOT_BILL_MAX) {
    return false
  }

  const prob = await computeJackpotProbability(now)
  if (prob <= 0) return false

  return Math.random() < prob
}

export async function resolveSpinOutcome(billAmount, now = new Date()) {
  const isJackpot = await tryJackpot(billAmount, now)

  if (isJackpot) {
    return {
      discount: 100,
      freebie: null,
      isJackpot: true,
    }
  }

  return {
    discount: pickTierDiscount(billAmount),
    freebie: getFreebieForBill(billAmount),
    isJackpot: false,
  }
}

export function generatePromoCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
