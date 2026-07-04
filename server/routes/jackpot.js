import { Router } from 'express'
import JackpotLog from '../models/JackpotLog.js'
import { getMonthKey, getWeekKey } from '../utils/spinResolver.js'

const router = Router()
const MAX_JACKPOT_PER_MONTH = 4

router.get('/count', async (req, res) => {
  try {
    const monthKey = getMonthKey()
    const weekKey = getWeekKey()
    const count = await JackpotLog.countDocuments({ month: monthKey })
    const weekCount = await JackpotLog.countDocuments({ weekKey })
    res.json({
      count,
      month: monthKey,
      max: MAX_JACKPOT_PER_MONTH,
      weekCount,
      weekMax: 1,
      weekKey,
    })
  } catch (err) {
    console.error('Error counting jackpots:', err)
    res.status(500).json({ error: 'Failed to count jackpots' })
  }
})

router.post('/log', async (req, res) => {
  try {
    const { phone } = req.body
    const entry = await JackpotLog.create({
      month: getMonthKey(),
      weekKey: getWeekKey(),
      date: new Date(),
      phone: phone || null,
    })
    res.json({ success: true, entry })
  } catch (err) {
    console.error('Error logging jackpot:', err)
    res.status(500).json({ error: 'Failed to log jackpot' })
  }
})

export default router
