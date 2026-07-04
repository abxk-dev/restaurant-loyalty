import { Router } from 'express'
import Spin from '../models/Spin.js'
import JackpotLog from '../models/JackpotLog.js'
import {
  resolveSpinOutcome,
  generatePromoCode,
  getMonthKey,
  getWeekKey,
} from '../utils/spinResolver.js'

const router = Router()
const MIN_BILL_AMOUNT = 100

function getStartOfDay() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

async function canSessionSpin(sessionId, phone = null) {
  const startOfDay = getStartOfDay()

  const sessionSpin = await Spin.findOne({
    sessionId,
    spunAt: { $gte: startOfDay },
  })
  if (sessionSpin) {
    return { canSpin: false, reason: 'session' }
  }

  if (phone) {
    const phoneSpin = await Spin.findOne({
      phone,
      spunAt: { $gte: startOfDay },
    })
    if (phoneSpin) {
      return { canSpin: false, reason: 'phone' }
    }
  }

  return { canSpin: true }
}

// Check if session/phone can spin today
router.get('/can-spin/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    const phone = req.query.phone || null
    const result = await canSessionSpin(sessionId, phone)
    res.json(result)
  } catch (err) {
    console.error('Error checking spin:', err)
    res.status(500).json({ error: 'Failed to check spin status' })
  }
})

// Server-resolved spin: tier discounts + weekly-paced jackpot
router.post('/play', async (req, res) => {
  try {
    const { sessionId, billAmount, phone } = req.body

    if (!sessionId || billAmount == null) {
      return res.status(400).json({ error: 'sessionId and billAmount required' })
    }

    const amount = Number(billAmount)
    if (Number.isNaN(amount) || amount < MIN_BILL_AMOUNT) {
      return res.status(400).json({ error: `billAmount must be at least ${MIN_BILL_AMOUNT}` })
    }

    const spinCheck = await canSessionSpin(sessionId, phone || null)
    if (!spinCheck.canSpin) {
      return res.status(409).json({ error: 'Already spun today', reason: spinCheck.reason })
    }

    const outcome = await resolveSpinOutcome(amount)
    const promoCode = generatePromoCode()

    const spin = await Spin.create({
      sessionId,
      discount: outcome.discount,
      billAmount: amount,
      promoCode,
      freebie: outcome.freebie,
      isJackpot: outcome.isJackpot,
    })

    if (outcome.isJackpot) {
      await JackpotLog.create({
        month: getMonthKey(),
        weekKey: getWeekKey(),
        date: new Date(),
        phone: phone || null,
      })
    }

    res.json({
      discount: outcome.discount,
      promoCode,
      freebie: outcome.freebie,
      isJackpot: outcome.isJackpot,
      spin,
    })
  } catch (err) {
    console.error('Error playing spin:', err)
    res.status(500).json({ error: 'Failed to play spin' })
  }
})

// Legacy record endpoint (kept for compatibility)
router.post('/', async (req, res) => {
  try {
    const { sessionId, discount, billAmount, promoCode } = req.body
    if (!sessionId || discount == null || !billAmount || !promoCode) {
      return res.status(400).json({ error: 'sessionId, discount, billAmount, promoCode required' })
    }

    const startOfDay = getStartOfDay()
    const existing = await Spin.findOne({
      sessionId,
      spunAt: { $gte: startOfDay },
    })
    if (existing) {
      return res.status(409).json({ error: 'Already spun today', spin: existing })
    }

    const spin = await Spin.create({ sessionId, discount, billAmount, promoCode })
    res.json({ success: true, spin })
  } catch (err) {
    console.error('Error recording spin:', err)
    res.status(500).json({ error: 'Failed to record spin' })
  }
})

router.post('/redeem', async (req, res) => {
  try {
    const { sessionId, phone } = req.body
    if (!sessionId || !phone) {
      return res.status(400).json({ error: 'sessionId and phone required' })
    }

    const startOfDay = getStartOfDay()

    const phoneAlreadyUsed = await Spin.findOne({
      phone,
      redeemed: true,
      spunAt: { $gte: startOfDay },
    })
    if (phoneAlreadyUsed) {
      return res.status(409).json({
        error: 'Phone already used today',
        spin: phoneAlreadyUsed,
      })
    }

    const spin = await Spin.findOne({
      sessionId,
      spunAt: { $gte: startOfDay },
    })
    if (!spin) {
      return res.status(404).json({ error: 'No spin found for this session' })
    }

    spin.phone = phone
    spin.redeemed = true
    await spin.save()

    res.json({ success: true, spin })
  } catch (err) {
    console.error('Error redeeming spin:', err)
    res.status(500).json({ error: 'Failed to redeem spin' })
  }
})

router.get('/today/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    const startOfDay = getStartOfDay()

    const spin = await Spin.findOne({
      sessionId,
      spunAt: { $gte: startOfDay },
    })

    res.json(spin)
  } catch (err) {
    console.error('Error fetching spin:', err)
    res.status(500).json({ error: 'Failed to fetch spin' })
  }
})

export default router
