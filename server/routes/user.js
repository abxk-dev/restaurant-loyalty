import { Router } from 'express'
import User from '../models/User.js'
import Spin from '../models/Spin.js'
import {
  calculateVisitLoyaltyPoints,
  canRedeemFreeCoffee,
  LOYALTY_REDEEM_THRESHOLD,
} from '../utils/loyalty.js'

const router = Router()

function getStartOfDay() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// Get user by phone
router.get('/:phone', async (req, res) => {
  try {
    const user = await User.findOne({ phone: req.params.phone })
    if (!user) {
      return res.json(null)
    }
    res.json(user)
  } catch (err) {
    console.error('Error fetching user:', err)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// Save spin result — uses SERVER-SIDE spin data, not client data
router.post('/save-spin', async (req, res) => {
  try {
    const { phone, sessionId } = req.body

    if (!phone || !sessionId) {
      return res.status(400).json({ error: 'phone and sessionId are required' })
    }

    const startOfDay = getStartOfDay()

    const existingRedeemed = await Spin.findOne({
      phone,
      redeemed: true,
      spunAt: { $gte: startOfDay },
    })
    if (existingRedeemed) {
      const user = await User.findOne({ phone })
      return res.status(409).json({
        error: 'Phone already used today',
        spin: existingRedeemed,
        user,
      })
    }

    const spin = await Spin.findOne({
      sessionId,
      spunAt: { $gte: startOfDay },
    })
    if (!spin) {
      return res.status(404).json({ error: 'No spin found for this session' })
    }

    if (spin.redeemed) {
      const user = await User.findOne({ phone: spin.phone || phone })
      return res.json(user)
    }

    const existingUser = await User.findOne({ phone })
    const currentPoints = existingUser?.loyaltyPoints ?? 0
    const loyaltyEarned = calculateVisitLoyaltyPoints(currentPoints)

    const { discount, billAmount, promoCode, freebie } = spin
    const discountAmount = (billAmount * discount) / 100
    const finalAmount = (billAmount - discountAmount).toFixed(2)

    const visit = {
      date: new Date(),
      bill: billAmount,
      discount,
      finalAmount,
      promoCode,
      freebie: freebie || null,
      loyaltyEarned,
    }

    const update = {
      $setOnInsert: { phone },
      $set: {
        lastSpinDate: new Date(),
        'completedTasks.phone': true,
      },
      $inc: { totalVisits: 1 },
      $push: { visitHistory: visit },
    }
    if (loyaltyEarned > 0) {
      update.$inc.loyaltyPoints = loyaltyEarned
    }

    const user = await User.findOneAndUpdate({ phone }, update, { new: true, upsert: true })

    spin.phone = phone
    spin.redeemed = true
    await spin.save()

    res.json(user)
  } catch (err) {
    console.error('Error saving spin result:', err)
    res.status(500).json({ error: 'Failed to save spin result' })
  }
})

// Redeem free coffee — resets visit counter to 0
router.post('/:phone/redeem-reward', async (req, res) => {
  try {
    const { phone } = req.params
    const user = await User.findOne({ phone })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (!canRedeemFreeCoffee(user.loyaltyPoints)) {
      return res.status(400).json({
        error: `Need ${LOYALTY_REDEEM_THRESHOLD} visits to redeem`,
        user,
      })
    }

    const updated = await User.findOneAndUpdate(
      { phone },
      {
        $set: { loyaltyPoints: 0 },
        $inc: { freeCoffeeRedemptions: 1 },
      },
      { new: true }
    )

    res.json({ user: updated, redeemed: true })
  } catch (err) {
    console.error('Error redeeming reward:', err)
    res.status(500).json({ error: 'Failed to redeem reward' })
  }
})

// Mark a task as completed for a user (no loyalty points for tasks)
router.post('/:phone/complete-task', async (req, res) => {
  try {
    const { phone } = req.params
    const { task } = req.body

    if (!['phone', 'instagram', 'review'].includes(task)) {
      return res.status(400).json({ error: 'Invalid task. Must be phone, instagram, or review' })
    }

    const user = await User.findOne({ phone })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const alreadyCompleted = user.completedTasks?.[task]
    if (alreadyCompleted) {
      return res.json({ user, loyaltyIncreased: false, pointsAdded: 0 })
    }

    const updated = await User.findOneAndUpdate(
      { phone },
      { $set: { [`completedTasks.${task}`]: true } },
      { new: true }
    )

    res.json({
      user: updated,
      loyaltyIncreased: false,
      pointsAdded: 0,
    })
  } catch (err) {
    console.error('Error completing task:', err)
    res.status(500).json({ error: 'Failed to complete task' })
  }
})

export default router
