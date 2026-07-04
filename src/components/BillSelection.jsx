import { useState, useRef, useCallback, useEffect } from 'react'
import { playSpin, canSpinToday, getJackpotCountThisMonth, getLastPhone } from '../utils/data'
import BrandLogo from './BrandLogo'

const MIN_BILL_AMOUNT = 100

const DISCOUNTS = [5, 10, 15, 20, 100]
const SEGMENTS = DISCOUNTS.length
const SEGMENT_ANGLE = 360 / SEGMENTS

const COLORS = [
  '#E91E63', '#F48FB1', '#C2185B', '#F06292', '#AD1457',
]

export default function BillSelection({ userName, onResult, onError }) {
  const [billInput, setBillInput] = useState('')
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [jackpotLeft, setJackpotLeft] = useState(4)
  const wheelRef = useRef(null)
  const spinLockRef = useRef(false)

  const parsedAmount = Number(billInput)
  const isUnlocked = billInput !== '' && !Number.isNaN(parsedAmount) && parsedAmount >= MIN_BILL_AMOUNT

  useEffect(() => {
    getJackpotCountThisMonth().then(count => setJackpotLeft(4 - count))
  }, [])

  const handleBillInputChange = (e) => {
    const value = e.target.value.replace(/[^\d]/g, '')
    setBillInput(value)
  }

  const handleSpinClick = useCallback(async () => {
    if (spinLockRef.current || spinning || !isUnlocked) return

    spinLockRef.current = true
    setSpinning(true)

    const phone = getLastPhone()
    const canSpin = await canSpinToday(phone || undefined)
    if (!canSpin) {
      spinLockRef.current = false
      setSpinning(false)
      onError?.('You already spun today! Come back tomorrow for another chance.')
      return
    }

    const amount = parsedAmount

    try {
      const result = await playSpin(amount)
      const resultDiscount = result.discount
      const targetIndex = DISCOUNTS.indexOf(resultDiscount)
      const safeIndex = targetIndex >= 0 ? targetIndex : DISCOUNTS.indexOf(10)
      const targetAngle = safeIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2
      const extraSpins = 5 + Math.floor(Math.random() * 3)
      const totalRotation = rotation + extraSpins * 360 + (270 - targetAngle)

      setRotation(totalRotation)

      setTimeout(() => {
        onResult(amount, resultDiscount, {
          promoCode: result.promoCode,
          freebie: result.freebie,
          isJackpot: result.isJackpot,
        })
      }, 4200)
    } catch (err) {
      spinLockRef.current = false
      setSpinning(false)
      if (err.status === 409) {
        onError?.('You already spun today! Come back tomorrow for another chance.')
      } else {
        onError?.('Something went wrong. Please try again.')
      }
    }
  }, [spinning, isUnlocked, parsedAmount, rotation, onResult, onError])

  const size = 260
  const center = size / 2
  const radius = center - 8

  return (
    <div className="screen bill-selection-screen">
      <div className="home-bg-mesh" />
      <div className="welcome-top-glow" />

      <div className="screen-content bill-screen-content">
        <div className="bill-top-panel">
          <div className="bill-logo-wrap">
            <BrandLogo variant="hero" className="bill-hero-logo" />
          </div>
          <p className="bill-panel-tagline">
            {userName ? `Welcome back, ${userName}` : 'Spin daily · Save more · Earn rewards'}
          </p>

          <div className="bill-amount-section">
            <div className="bill-amount-field">
              <span className="bill-amount-prefix">₹</span>
              <input
                type="text"
                inputMode="numeric"
                className="bill-amount-input"
                placeholder="Enter bill amount"
                value={billInput}
                onChange={handleBillInputChange}
                disabled={spinning}
              />
            </div>
            <p className="bill-amount-hint">Minimum bill amount: ₹{MIN_BILL_AMOUNT}</p>
          </div>
        </div>

        <button
          type="button"
          className={`btn-spin-wheel${spinning ? ' btn-spin-wheel--loading' : ''}`}
          onClick={handleSpinClick}
          disabled={!isUnlocked || spinning}
          aria-busy={spinning}
        >
          {spinning ? (
            <>
              <span className="btn-spin-wheel-spinner" aria-hidden="true" />
              Spinning...
            </>
          ) : (
            <>🎰 Spin the Wheel</>
          )}
        </button>

        <div className="home-hero-card">
          <div className="hero-card-bg-shimmer" />
          <div className="hero-card-content">
            <div className="hero-card-title-row">
              <span className="hero-sparkle">✦</span>
              <h2 className="hero-card-title">Spin & Win</h2>
              <span className="hero-sparkle">✦</span>
            </div>
            <p className="hero-card-sub">
              Try your luck — win up to <strong>100% off</strong>
              {jackpotLeft > 0 && <span className="jackpot-left"> ({jackpotLeft} left this month)</span>}
            </p>

            <div className={`wheel-hero ${!isUnlocked ? 'wheel-locked' : ''}`}>
              <div className="wheel-glow-ring" />
              <div className="wheel-container">
                <div className="wheel-pointer">▼</div>
                <div
                  className="wheel-wrapper"
                  ref={wheelRef}
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: spinning
                      ? 'transform 4.2s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
                      : 'none',
                  }}
                >
                  <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%">
                    {DISCOUNTS.map((disc, i) => {
                      const startAngle = (i * SEGMENT_ANGLE * Math.PI) / 180
                      const endAngle = ((i + 1) * SEGMENT_ANGLE * Math.PI) / 180
                      const x1 = center + radius * Math.cos(startAngle)
                      const y1 = center + radius * Math.sin(startAngle)
                      const x2 = center + radius * Math.cos(endAngle)
                      const y2 = center + radius * Math.sin(endAngle)
                      const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0
                      const midAngle = ((i + 0.5) * SEGMENT_ANGLE * Math.PI) / 180
                      const textRadius = radius * 0.62
                      const tx = center + textRadius * Math.cos(midAngle)
                      const ty = center + textRadius * Math.sin(midAngle)
                      const textRotation = (i + 0.5) * SEGMENT_ANGLE

                      return (
                        <g key={i}>
                          <path
                            d={`M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                            fill={COLORS[i]}
                            stroke="#0a0a0a"
                            strokeWidth="2"
                          />
                          <text
                            x={tx}
                            y={ty}
                            fill="white"
                            fontSize={disc === 100 ? '12' : '14'}
                            fontWeight="700"
                            textAnchor="middle"
                            dominantBaseline="central"
                            transform={`rotate(${textRotation}, ${tx}, ${ty})`}
                            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                          >
                            {disc}%
                          </text>
                        </g>
                      )
                    })}
                    <circle cx={center} cy={center} r="26" fill="#0a0a0a" stroke="#E91E63" strokeWidth="3" />
                    <text x={center} y={center} fill="#F48FB1" fontSize="10" fontWeight="700" textAnchor="middle" dominantBaseline="central">
                      SPIN
                    </text>
                  </svg>
                </div>
                {!isUnlocked && (
                  <div className="wheel-lock-overlay">
                    <span className="wheel-lock-icon">🔒</span>
                    <span className="wheel-lock-text">Enter ₹{MIN_BILL_AMOUNT}+ to unlock</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <section className="home-perks" aria-label="Rewards info">
          <h3 className="home-perks-title">Why spin today?</h3>
          <div className="home-perks-grid">
            <div className="perk-card">
              <span className="perk-icon">🎰</span>
              <span className="perk-label">Daily Spin</span>
              <span className="perk-desc">1 stamp per visit — up to 100% off</span>
            </div>
            <div className="perk-card">
              <span className="perk-icon">⭐</span>
              <span className="perk-label">Earn Stamps</span>
              <span className="perk-desc">1 visit = 1 stamp on your card</span>
            </div>
            <div className="perk-card">
              <span className="perk-icon">☕</span>
              <span className="perk-label">Free Coffee</span>
              <span className="perk-desc">5 visits, then redeem — counter resets</span>
            </div>
          </div>
        </section>

        <p className="screen-footer">
          Brewbakes Courtyard • Loyalty Rewards
        </p>
      </div>
    </div>
  )
}
