import express from 'express'
import cors from 'cors'
import { connectDB } from './db.js'
import spinRoutes from './routes/spin.js'
import userRoutes from './routes/user.js'
import jackpotRoutes from './routes/jackpot.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use(async (req, res, next) => {
  try {
    await connectDB()
    next()
  } catch (err) {
    console.error('Database connection failed:', err.message)
    res.status(500).json({ error: 'Database connection failed' })
  }
})

app.use('/api/spin', spinRoutes)
app.use('/api/user', userRoutes)
app.use('/api/jackpot', jackpotRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default app
