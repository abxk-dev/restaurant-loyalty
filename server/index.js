import { config } from 'dotenv'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import app from './app.js'
import { connectDB } from './db.js'

config({ path: join(dirname(fileURLToPath(import.meta.url)), '.env') })

const PORT = process.env.PORT || 3001

console.log('Connecting to MongoDB...')
connectDB()
  .then(() => {
    console.log('✅ Connected to MongoDB')
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message)
    console.error('   Add your IP in Atlas → Network Access: https://cloud.mongodb.com')
    process.exit(1)
  })
