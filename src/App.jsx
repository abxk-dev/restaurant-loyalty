import { useState, useEffect } from 'react'
import BillSelection from './components/BillSelection'
import ResultScreen from './components/ResultScreen'
import LoyaltyCard from './components/LoyaltyCard'
import {
  getUser,
  saveSpinResult,
  canSpinToday,
  getTodaysSpin,
  savePendingSpin,
  loadPendingSpin,
  clearPendingSpin,
  getLastPhone,
  redeemFreeCoffee,
} from './utils/data'
import './App.css'

function generateAccountNumber(phone) {
  const hash = phone.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0)
  }, 0)
  return 'BB' + Math.abs(hash).toString().slice(0, 6).padStart(6, '0')
}

function App() {
  const [screen, setScreen] = useState('bill')
  const [billAmount, setBillAmount] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [promoCode, setPromoCode] = useState('')
  const [freebie, setFreebie] = useState(null)
  const [isJackpot, setIsJackpot] = useState(false)
  const [error, setError] = useState('')

  const [userName, setUserName] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [loyaltyPoints, setLoyaltyPoints] = useState(0)
  const [freeCoffeeRedemptions, setFreeCoffeeRedemptions] = useState(0)
  const [stamps, setStamps] = useState(0)
  const [visitHistory, setVisitHistory] = useState([])
  const [accountNumber, setAccountNumber] = useState('')

  function applyUserData(user) {
    if (!user) return
    setUserPhone(user.phone || userPhone)
    setUserName(user.name || '')
    setLoyaltyPoints(user.loyaltyPoints || 0)
    setFreeCoffeeRedemptions(user.freeCoffeeRedemptions || 0)
    setStamps(user.totalVisits || 0)
    setVisitHistory(user.visitHistory || [])
    setAccountNumber(user.accountNumber || generateAccountNumber(user.phone || userPhone))
  }

  async function loadUserData(phone) {
    if (!phone) return null
    try {
      const user = await getUser(phone)
      if (user) {
        applyUserData({ ...user, phone })
        return user
      }
    } catch {}
    return null
  }

  useEffect(() => {
    const phone = getLastPhone()

    if (phone) {
      loadUserData(phone)
    }

    getTodaysSpin().then(spin => {
      if (spin) {
        setBillAmount(spin.billAmount)
        setDiscount(spin.discount)
        setPromoCode(spin.promoCode)
        setFreebie(spin.freebie || null)
        setIsJackpot(spin.isJackpot || spin.discount === 100)
        setScreen('result')
      }
    }).catch(() => {
      const pending = loadPendingSpin()
      if (pending) {
        setBillAmount(pending.billAmount)
        setDiscount(pending.discount)
        setPromoCode(pending.promoCode)
        setFreebie(pending.freebie || null)
        setIsJackpot(pending.isJackpot || pending.discount === 100)
        setScreen('result')
      }
    })
  }, [])

  function handleSpinResult(amount, disc, extras = {}) {
    setBillAmount(amount)
    setDiscount(disc)
    setPromoCode(extras.promoCode || '')
    setFreebie(extras.freebie || null)
    setIsJackpot(extras.isJackpot || disc === 100)
    savePendingSpin(amount, disc, extras.promoCode, extras.freebie, extras.isJackpot)
    setScreen('result')
  }

  async function handleSaveUser(phone) {
    const updated = await saveSpinResult(phone)
    clearPendingSpin()
    applyUserData({ ...updated, phone })
    return updated
  }

  async function handleViewLoyalty() {
    const phone = userPhone || getLastPhone()
    if (phone) {
      await loadUserData(phone)
    }
    setScreen('loyalty')
  }

  function handleBackToWelcome() {
    setError('')
    setScreen('bill')
  }

  async function handleRedeemFreeCoffee() {
    const phone = userPhone || getLastPhone()
    if (!phone) return
    const result = await redeemFreeCoffee(phone)
    applyUserData({ ...result.user, phone })
    return result.user
  }

  async function handleNewVisit() {
    const phone = userPhone || getLastPhone()
    const canSpin = await canSpinToday(phone || undefined)
    if (!canSpin) {
      setError('You already spun today! Come back tomorrow for another chance.')
      return
    }
    setError('')
    setBillAmount(0)
    setDiscount(0)
    setPromoCode('')
    setFreebie(null)
    setIsJackpot(false)
    setScreen('bill')
  }

  return (
    <div className="app">
      <div className="bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {error && (
        <div className="global-error-banner">
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      <div className="screen-container" key={screen}>
        {screen === 'bill' && (
          <BillSelection userName={userName} onResult={handleSpinResult} onError={setError} />
        )}
        {screen === 'result' && (
          <ResultScreen
            discount={discount}
            billAmount={billAmount}
            promoCode={promoCode}
            freebie={freebie}
            isJackpot={isJackpot}
            onSaved={handleSaveUser}
            onUserUpdated={applyUserData}
            onViewLoyalty={handleViewLoyalty}
            onRedeem={handleRedeemFreeCoffee}
          />
        )}
        {screen === 'loyalty' && (
          <LoyaltyCard
            stamps={stamps}
            loyaltyPoints={loyaltyPoints}
            freeCoffeeRedemptions={freeCoffeeRedemptions}
            visitHistory={visitHistory}
            customerName={userName}
            accountNumber={accountNumber}
            onBack={handleBackToWelcome}
            onNewVisit={handleNewVisit}
            onRedeem={handleRedeemFreeCoffee}
          />
        )}
      </div>
    </div>
  )
}

export default App
