import mongoose from 'mongoose'

const freebieSchema = new mongoose.Schema({
  name: { type: String, required: true },
  value: { type: Number, required: true },
}, { _id: false })

const visitSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  bill: { type: Number, required: true },
  discount: { type: Number, required: true },
  finalAmount: { type: String, required: true },
  promoCode: { type: String },
  freebie: { type: freebieSchema, default: null },
  loyaltyEarned: { type: Number, default: 1 },
}, { _id: false })

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true, index: true },
  name: { type: String, default: '' },
  loyaltyPoints: { type: Number, default: 0 },
  totalVisits: { type: Number, default: 0 },
  freeCoffeeRedemptions: { type: Number, default: 0 },
  visitHistory: { type: [visitSchema], default: [] },
  lastSpinDate: { type: Date },
  completedTasks: {
    phone: { type: Boolean, default: false },
    instagram: { type: Boolean, default: false },
    review: { type: Boolean, default: false },
  },
}, { timestamps: true })

export default mongoose.model('User', userSchema)
