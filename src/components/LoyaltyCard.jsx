import { useState } from 'react'
import BrandLogo from './BrandLogo'

const LOYALTY_GOAL = 5

export default function LoyaltyCard({
  stamps,
  loyaltyPoints = 0,
  freeCoffeeRedemptions = 0,
  visitHistory,
  customerName,
  accountNumber,
  onBack,
  onNewVisit,
  onRedeem,
}) {
  const [redeeming, setRedeeming] = useState(false)
  const [redeemError, setRedeemError] = useState('')

  const totalDiscount = visitHistory.reduce((sum, v) => sum + (v.bill - parseFloat(v.finalAmount)), 0)
  const visitProgress = Math.min(loyaltyPoints, LOYALTY_GOAL)
  const canRedeem = loyaltyPoints >= LOYALTY_GOAL

  async function handleRedeem() {
    if (!onRedeem || redeeming) return
    setRedeemError('')
    setRedeeming(true)
    try {
      await onRedeem()
    } catch {
      setRedeemError('Could not redeem. Please try again.')
    } finally {
      setRedeeming(false)
    }
  }

  return (
    <div className="screen loyalty-screen">
      <div className="screen-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="topbar-back" onClick={onBack}>
              ← Back
            </button>
          </div>
          <div className="topbar-right">
            {customerName && (
              <span className="topbar-avatar">{customerName.charAt(0).toUpperCase()}</span>
            )}
          </div>
        </header>

        <div className="loyalty-card-visual">
          <div className="card-top">
            <span className="card-brand">
              <BrandLogo size={28} className="card-brand-logo" />
              Brewbakes Courtyard
            </span>
            <span className="card-type">LOYALTY MEMBER</span>
          </div>

          <div className="card-account">
            <span className="account-label">Account No:</span>
            <span className="account-number">{accountNumber}</span>
          </div>

          <div className="card-stamps">
            <div className="stamps-header">
              <span className="stamps-title">Visit Stamps</span>
              <span className="stamps-count">{visitProgress} / {LOYALTY_GOAL}</span>
            </div>
            <div className="stamps-grid">
              {[...Array(LOYALTY_GOAL)].map((_, i) => (
                <div key={i} className={`card-stamp ${i < visitProgress ? 'stamped' : ''}`}>
                  <span className="stamp-icon">{i < visitProgress ? '⭐' : '☆'}</span>
                  <span className="stamp-num">{i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(visitProgress / LOYALTY_GOAL) * 100}%` }} />
            </div>
            <span className="progress-text">
              {canRedeem
                ? '☕ Free coffee ready to redeem!'
                : `${LOYALTY_GOAL - visitProgress} more visit${LOYALTY_GOAL - visitProgress !== 1 ? 's' : ''} for free coffee`}
            </span>
          </div>
        </div>

        {canRedeem && (
          <div className="free-coffee-banner">
            <span className="coffee-icon">☕</span>
            <div>
              <strong>FREE COFFEE UNLOCKED!</strong>
              <p>Show this to the manager, then tap redeem</p>
            </div>
          </div>
        )}

        {canRedeem && (
          <button
            type="button"
            className="btn-primary btn-redeem-coffee"
            onClick={handleRedeem}
            disabled={redeeming}
          >
            {redeeming ? 'Redeeming…' : '☕ Redeem Free Coffee'}
          </button>
        )}

        {redeemError && <p className="field-hint error-hint">{redeemError}</p>}

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{visitProgress}</span>
            <span className="stat-label">Current Stamps</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stamps}</span>
            <span className="stat-label">Total Visits</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{freeCoffeeRedemptions}</span>
            <span className="stat-label">Free Coffees</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">₹{totalDiscount.toFixed(0)}</span>
            <span className="stat-label">Total Saved</span>
          </div>
        </div>

        {visitHistory.length > 0 && (
          <div className="visit-history">
            <h3>Visit History</h3>
            <div className="history-list">
              {[...visitHistory].reverse().map((visit, i) => (
                <div key={i} className="history-item">
                  <div className="history-date">
                    {new Date(visit.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="history-details">
                    <span>Bill: ₹{visit.bill.toFixed(2)}</span>
                    <span className="history-discount">{visit.discount}% off</span>
                    <span className="history-final">Paid: ₹{visit.finalAmount}</span>
                    {visit.loyaltyEarned > 0 && (
                      <span className="history-loyalty">+1 visit</span>
                    )}
                  </div>
                  {visit.promoCode && (
                    <div className="history-promo">Code: {visit.promoCode}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="result-buttons">
          <button className="btn-primary" onClick={onNewVisit}>
            🔄 New Visit
          </button>
          <button className="btn-secondary" onClick={onBack}>
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
