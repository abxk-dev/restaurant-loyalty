import { useState, useEffect } from 'react'
import { getLastPhone, getUser, completeTask } from '../utils/data'
import BrandLogo from './BrandLogo'

const INSTAGRAM_URL = 'https://www.instagram.com/brewbakeskharar'
const GOOGLE_REVIEW_URL = 'https://search.google.com/local/writereview?placeid=ChIJTXf9O3vvDzkRWZJAI3B4t_M'

function isToday(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate()
}

export default function ResultScreen({
  discount,
  billAmount,
  promoCode,
  freebie,
  isJackpot,
  onSaved,
  onUserUpdated,
  onViewLoyalty,
  onRedeem,
}) {
  const [animate, setAnimate] = useState(false)
  const [alreadyUsedToday, setAlreadyUsedToday] = useState(false)
  const [showFreebiePopup, setShowFreebiePopup] = useState(false)

  // Task states
  const [phoneInput, setPhoneInput] = useState(getLastPhone())
  const [phoneDone, setPhoneDone] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [igDone, setIgDone] = useState(false)
  const [reviewDone, setReviewDone] = useState(false)

  // Promo reveal
  const [codeRevealed, setCodeRevealed] = useState(false)
  const [savedData, setSavedData] = useState(null)
  const [existingPromoCode, setExistingPromoCode] = useState(null)
  const [redeeming, setRedeeming] = useState(false)

  const LOYALTY_GOAL = 5

  const tasksCompleted = [phoneDone, igDone, reviewDone].filter(Boolean).length
  const allDone = phoneDone && igDone && reviewDone

  // The promo code to display — server truth when already used, else client
  const displayPromoCode = existingPromoCode || promoCode

  function syncUserFromServer(user) {
    if (!user) return
    setSavedData(user)
    onUserUpdated?.(user)
  }

  async function runTask(phone, task, markDone) {
    const result = await completeTask(phone, task)
    if (result.user) {
      syncUserFromServer(result.user)
    }
    markDone?.()
    return result
  }

  // Entrance animation
  useEffect(() => {
    setTimeout(() => setAnimate(true), 100)
  }, [])

  // Show freebie popup when won
  useEffect(() => {
    if (freebie) {
      setTimeout(() => setShowFreebiePopup(true), 600)
    }
  }, [freebie])

  // On mount: check if already used today + restore task state
  useEffect(() => {
    const phone = getLastPhone()
    if (!phone) return

    getUser(phone).then(async user => {
      if (!user) return

      // Check if user already used coupon today
      if (isToday(user.lastSpinDate)) {
        setAlreadyUsedToday(true)
        setCodeRevealed(true)
        setPhoneDone(true)
        syncUserFromServer(user)
        setPhoneInput(phone)
        // Find today's promo code from visit history
        const todayVisit = (user.visitHistory || []).find(v => isToday(v.date))
        if (todayVisit?.promoCode) {
          setExistingPromoCode(todayVisit.promoCode)
        }
        // Restore completed tasks
        const tasks = user.completedTasks || {}
        if (tasks.instagram) setIgDone(true)
        if (tasks.review) setReviewDone(true)
        return
      }

      // Returning user with saved phone — auto-save (links spin to phone)
      try {
        const updated = await onSaved(phone)
        syncUserFromServer(updated)
        setPhoneDone(true)
        setPhoneInput(phone)

        const tasks = updated.completedTasks || {}
        if (tasks.instagram) setIgDone(true)
        if (tasks.review) setReviewDone(true)

        if (tasks.instagram && tasks.review) {
          setCodeRevealed(true)
        }
      } catch {
        // 409 = phone already used from another session
        setAlreadyUsedToday(true)
        setCodeRevealed(true)
        setPhoneDone(true)
        syncUserFromServer(user)
        const todayVisit = (user.visitHistory || []).find(v => isToday(v.date))
        if (todayVisit?.promoCode) {
          setExistingPromoCode(todayVisit.promoCode)
        }
      }
    }).catch(() => {})
  }, [])

  // Reveal promo code when all tasks done
  useEffect(() => {
    if (allDone && !codeRevealed && !alreadyUsedToday) {
      setTimeout(() => setCodeRevealed(true), 600)
    }
  }, [allDone, codeRevealed, alreadyUsedToday])

  // Task 1: Submit phone
  async function handlePhoneSubmit(e) {
    e.preventDefault()
    if (phoneInput.length !== 10) {
      setPhoneError('Enter a valid 10-digit number')
      return
    }
    setPhoneError('')

    try {
      const data = await onSaved(phoneInput)
      syncUserFromServer(data)
      setPhoneDone(true)

      const phoneTask = await completeTask(phoneInput, 'phone')
      if (phoneTask.user) syncUserFromServer(phoneTask.user)

      if (data?.completedTasks?.instagram) setIgDone(true)
      if (data?.completedTasks?.review) setReviewDone(true)
    } catch (err) {
      // 409 = phone already used today
      if (err.status === 409) {
        if (err.body?.spin?.promoCode) {
          setExistingPromoCode(err.body.spin.promoCode)
        }
        if (err.body?.user) {
          syncUserFromServer(err.body.user)
        } else {
          const user = await getUser(phoneInput).catch(() => null)
          if (user) syncUserFromServer(user)
        }
        setAlreadyUsedToday(true)
        setCodeRevealed(true)
        setPhoneDone(true)
      } else {
        setPhoneError('Something went wrong. Please try again.')
      }
    }
  }

  // Task 2: Instagram
  async function handleInstagram() {
    window.open(INSTAGRAM_URL, '_blank')
    setTimeout(async () => {
      try {
        await runTask(phoneInput, 'instagram', () => setIgDone(true))
      } catch {
        setIgDone(true)
      }
    }, 2500)
  }

  // Task 3: Google Review
  async function handleGoogleReview() {
    window.open(GOOGLE_REVIEW_URL, '_blank')
    setTimeout(async () => {
      try {
        await runTask(phoneInput, 'review', () => setReviewDone(true))
      } catch {
        setReviewDone(true)
      }
    }, 2500)
  }

  const visitPointsEarned = (() => {
    const todayVisit = (savedData?.visitHistory || []).find(v => isToday(v.date))
    if (todayVisit?.loyaltyEarned != null) return todayVisit.loyaltyEarned
    return phoneDone ? 1 : 0
  })()
  const discountAmount = (billAmount * discount) / 100
  const finalAmount = billAmount - discountAmount
  const loyaltyPoints = savedData?.loyaltyPoints || 0
  const visitProgress = Math.min(loyaltyPoints, LOYALTY_GOAL)
  const canRedeem = loyaltyPoints >= LOYALTY_GOAL
  const jackpotWin = isJackpot || discount === 100

  async function handleRedeem() {
    if (!onRedeem || redeeming || !canRedeem) return
    setRedeeming(true)
    try {
      const user = await onRedeem()
      if (user) syncUserFromServer(user)
    } catch {
      // ignore
    } finally {
      setRedeeming(false)
    }
  }

  function renderLoyaltyProgress() {
    return (
      <div className="stamp-display">
        <span className="stamp-label">Loyalty Progress</span>
        <div className="stamp-dots">
          {[...Array(LOYALTY_GOAL)].map((_, i) => (
            <span
              key={i}
              className={`stamp-dot ${i < visitProgress ? 'filled' : ''}`}
            >
              {i < visitProgress ? '⭐' : '○'}
            </span>
          ))}
        </div>
        <span className="stamp-count">
          {visitProgress} / {LOYALTY_GOAL} visits for free coffee
          {canRedeem && ' — ready to redeem!'}
        </span>
      </div>
    )
  }

  function renderBonusBanners() {
    return (
      <>
        {jackpotWin && (
          <div className="jackpot-win-banner">
            <span className="jackpot-win-icon">🏆</span>
            <div>
              <strong>JACKPOT! 100% OFF</strong>
              <p>You hit the monthly jackpot — your bill is fully covered!</p>
            </div>
          </div>
        )}
        {freebie && (
          <div className="freebie-banner">
            <span className="freebie-icon">🍨</span>
            <div>
              <strong>Free {freebie.name}</strong>
              <p>Worth ₹{freebie.value} — included with your spin!</p>
            </div>
          </div>
        )}
      </>
    )
  }

  // Already used today — show limited view
  if (alreadyUsedToday) {
    return (
      <>
      <div className="screen result-screen">
        <div className="screen-content">
          <header className="topbar">
            <div className="topbar-left">
              <BrandLogo size={34} />
              <span className="topbar-brand">Brewbakes</span>
            </div>
          </header>

          <div className={`result-content ${animate ? 'result-animate' : ''}`}>
            <div className="result-badge result-badge--status">
              <div className="badge-inner">
                <span className="badge-emoji">⏰</span>
                <div className="badge-text-stack">
                  <span className="badge-text">ALREADY</span>
                  <span className="badge-text">USED</span>
                </div>
              </div>
            </div>

            <div className="result-discount">
              <span className="discount-value">{discount}%</span>
              <span className="discount-label">DISCOUNT</span>
            </div>

            {renderBonusBanners()}

            <div className="result-breakdown">
              <div className="breakdown-row">
                <span>Original Bill</span>
                <span className="line-through">₹{billAmount.toFixed(2)}</span>
              </div>
              <div className="breakdown-row discount-row">
                <span>Discount ({discount}%)</span>
                <span className="discount-amount">-₹{discountAmount.toFixed(2)}</span>
              </div>
              <div className="breakdown-divider" />
              <div className="breakdown-row final-row">
                <span>You Pay</span>
                <span className="final-amount">₹{finalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="promo-section">
              <h3 className="promo-title">🎁 Your Promo Code</h3>
              <div className="promo-code-box revealed">
                <span className="promo-code-text">{displayPromoCode || '· · · · · ·'}</span>
              </div>
              <p className="promo-revealed-text">
                ✅ Show this code at the counter to avail your discount!
              </p>
            </div>

            <div className="already-used-banner">
              <span className="already-used-icon">⏳</span>
              <div>
                <strong>Coupon already used today</strong>
                <p>Come back tomorrow for a new spin!</p>
              </div>
            </div>

            {renderLoyaltyProgress()}

            {canRedeem && onRedeem && (
              <button
                type="button"
                className="btn-primary btn-redeem-coffee"
                onClick={handleRedeem}
                disabled={redeeming}
              >
                {redeeming ? 'Redeeming…' : '☕ Redeem Free Coffee'}
              </button>
            )}

            <div className="result-buttons">
              <button className="btn-secondary" onClick={onViewLoyalty}>
                🎫 My Loyalty Card
              </button>
            </div>
          </div>
        </div>
      </div>

      {showFreebiePopup && freebie && (
        <div className="freebie-popup-overlay" onClick={() => setShowFreebiePopup(false)}>
          <div className="freebie-popup" onClick={(e) => e.stopPropagation()}>
            <div className="freebie-popup-icon">🍨</div>
            <h2 className="freebie-popup-title">You Won a Free Mini Sundae!</h2>
            <p className="freebie-popup-desc">Worth ₹{freebie.value} — included with your spin!</p>
            <p className="freebie-popup-hint">Show this at the counter to claim</p>
            <button className="freebie-popup-btn" onClick={() => setShowFreebiePopup(false)}>
              Awesome!
            </button>
          </div>
        </div>
      )}
      </>
    )
  }

  // Normal flow
  return (
    <>
    <div className="screen result-screen">
      <div className="confetti-container">
        {[...Array(20)].map((_, i) => (
          <div key={i} className={`confetti confetti-${i % 5}`} />
        ))}
      </div>

      <div className="screen-content">
        <header className="topbar">
          <div className="topbar-left">
            <BrandLogo size={34} />
            <span className="topbar-brand">Brewbakes</span>
          </div>
        </header>

        <div className={`result-content ${animate ? 'result-animate' : ''}`}>
          <div className="result-badge">
            <div className="badge-inner">
              <span className="badge-emoji">{jackpotWin ? '🏆' : '🎉'}</span>
              <span className="badge-text">{jackpotWin ? 'JACKPOT' : 'YOU WON'}</span>
            </div>
          </div>

          <div className="result-discount">
            <span className="discount-value">{discount}%</span>
            <span className="discount-label">DISCOUNT</span>
          </div>

          {renderBonusBanners()}

          <div className="result-breakdown">
            <div className="breakdown-row">
              <span>Original Bill</span>
              <span className="line-through">₹{billAmount.toFixed(2)}</span>
            </div>
            <div className="breakdown-row discount-row">
              <span>Discount ({discount}%)</span>
              <span className="discount-amount">-₹{discountAmount.toFixed(2)}</span>
            </div>
            <div className="breakdown-divider" />
            <div className="breakdown-row final-row">
              <span>You Pay</span>
              <span className="final-amount">₹{finalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="promo-section">
            <h3 className="promo-title">🎁 Your Promo Code</h3>

            <div className={`promo-code-box ${codeRevealed ? 'revealed' : 'hidden'}`}>
              <span className="promo-code-text">
                {codeRevealed ? displayPromoCode : '· · · · · ·'}
              </span>
              {!codeRevealed && (
                <span className="promo-lock-overlay">
                  🔒 Complete tasks below to reveal
                </span>
              )}
            </div>

            {codeRevealed && (
              <p className="promo-revealed-text">
                ✅ Show this code at the counter to avail your discount!
              </p>
            )}
          </div>

          <div className="tasks-section">
            <div className="tasks-progress">
              <div className="tasks-progress-bar">
                <div
                  className="tasks-progress-fill"
                  style={{ width: `${(tasksCompleted / 3) * 100}%` }}
                />
              </div>
              <span className="tasks-progress-label">
                {tasksCompleted}/3 completed
              </span>
            </div>

            {/* Task 1: Phone */}
            {!phoneDone ? (
              <form className="task-phone-form" onSubmit={handlePhoneSubmit}>
                <div className="task-phone-header">
                  <span className="task-icon">📱</span>
                  <div className="task-content">
                    <span className="task-label">Enter your phone number</span>
                    <span className="task-sub">We'll save your loyalty points</span>
                  </div>
                </div>
                <div className="task-phone-inputs">
                  <div className="input-wrapper compact">
                    <input
                      type="tel"
                      className="input-field"
                      placeholder="10-digit number"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      maxLength={10}
                    />
                  </div>
                  {phoneError && <p className="field-hint error-hint">{phoneError}</p>}
                  <button type="submit" className="btn-task-submit">
                    Save & Continue →
                  </button>
                </div>
              </form>
            ) : (
              <div className="task-item done">
                <span className="task-icon">📱</span>
                <div className="task-content">
                  <span className="task-label">Phone Number Saved</span>
                  <span className="task-sub">Completed ✓</span>
                </div>
                <span className="task-check">✅</span>
              </div>
            )}

            {/* Task 2: Instagram */}
            <button
              className={`task-item ${igDone ? 'done' : 'pending'}`}
              onClick={!igDone ? handleInstagram : undefined}
              disabled={igDone || !phoneDone}
              style={!phoneDone ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
            >
              <span className="task-icon">📸</span>
              <div className="task-content">
                <span className="task-label">Follow on Instagram</span>
                <span className="task-sub">
                  {igDone ? 'Completed ✓' : !phoneDone ? 'Complete task 1 first' : 'Tap to follow @brewbakeskharar'}
                </span>
              </div>
              {igDone ? <span className="task-check">✅</span> : <span className="task-arrow">→</span>}
            </button>

            {/* Task 3: Google Review */}
            <button
              className={`task-item ${reviewDone ? 'done' : 'pending'}`}
              onClick={!reviewDone ? handleGoogleReview : undefined}
              disabled={reviewDone || !igDone}
              style={!igDone ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
            >
              <span className="task-icon">⭐</span>
              <div className="task-content">
                <span className="task-label">Review Brewbakes Courtyard</span>
                <span className="task-sub">
                  {reviewDone ? 'Completed ✓' : !igDone ? 'Complete task 2 first' : 'Tap to leave a Google review'}
                </span>
              </div>
              {reviewDone ? <span className="task-check">✅</span> : <span className="task-arrow">→</span>}
            </button>
          </div>

          {phoneDone && (
            <div className="loyalty-earn-section">
              {visitPointsEarned > 0 ? (
                <div className="loyalty-earn-badge">
                  <span className="loyalty-earn-icon">⭐</span>
                  <span className="loyalty-earn-text">+1 visit stamp this spin</span>
                </div>
              ) : canRedeem ? (
                <div className="loyalty-earn-badge">
                  <span className="loyalty-earn-icon">☕</span>
                  <span className="loyalty-earn-text">Redeem your free coffee first</span>
                </div>
              ) : null}
              <p className="loyalty-earn-sub">
                1 visit = 1 stamp · {visitProgress} / {LOYALTY_GOAL} toward free coffee
              </p>

              {renderLoyaltyProgress()}
            </div>
          )}

          {canRedeem && onRedeem && (
            <button
              type="button"
              className="btn-primary btn-redeem-coffee"
              onClick={handleRedeem}
              disabled={redeeming}
            >
              {redeeming ? 'Redeeming…' : '☕ Redeem Free Coffee'}
            </button>
          )}

          {canRedeem && (
            <div className="free-coffee-banner">
              <span className="coffee-icon">☕</span>
              <div>
                <strong>FREE COFFEE READY!</strong>
                <p>Show this to the manager, then tap redeem</p>
              </div>
            </div>
          )}

          <div className="result-buttons">
            {phoneDone && (
              <button className="btn-secondary" onClick={onViewLoyalty}>
                🎫 My Loyalty Card
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    {showFreebiePopup && freebie && (
      <div className="freebie-popup-overlay" onClick={() => setShowFreebiePopup(false)}>
        <div className="freebie-popup" onClick={(e) => e.stopPropagation()}>
          <div className="freebie-popup-icon">🍨</div>
          <h2 className="freebie-popup-title">You Won a Free Mini Sundae!</h2>
          <p className="freebie-popup-desc">Worth ₹{freebie.value} — included with your spin!</p>
          <p className="freebie-popup-hint">Show this at the counter to claim</p>
          <button className="freebie-popup-btn" onClick={() => setShowFreebiePopup(false)}>
            Awesome!
          </button>
        </div>
      </div>
    )}
    </>
  )
}
