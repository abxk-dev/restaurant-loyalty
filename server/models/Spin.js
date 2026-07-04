import mongoose from 'mongoose'

const freebieSchema = new mongoose.Schema({
  name: { type: String, required: true },
  value: { type: Number, required: true },
}, { _id: false })

const spinSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  discount: { type: Number, required: true },
  billAmount: { type: Number, required: true },
  promoCode: { type: String, required: true },
  freebie: { type: freebieSchema, default: null },
  isJackpot: { type: Boolean, default: false },
  phone: { type: String, default: null },
  redeemed: { type: Boolean, default: false },
  spunAt: { type: Date, default: Date.now, index: true },
})

spinSchema.index({ sessionId: 1, spunAt: 1 })
spinSchema.index({ phone: 1, spunAt: 1 })

export default mongoose.model('Spin', spinSchema)
