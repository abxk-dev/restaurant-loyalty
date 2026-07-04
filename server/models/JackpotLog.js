import mongoose from 'mongoose'

const jackpotLogSchema = new mongoose.Schema({
  month: { type: String, required: true, index: true },
  weekKey: { type: String, required: true, index: true },
  date: { type: Date, default: Date.now },
  phone: { type: String },
})

export default mongoose.model('JackpotLog', jackpotLogSchema)
