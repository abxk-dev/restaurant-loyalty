import BrandLogo from './BrandLogo'

export default function WelcomeScreen({ onStart }) {
  return (
    <div className="screen welcome-screen">
      <div className="welcome-content">
        <div className="welcome-top-glow" />

        <div className="restaurant-logo">
          <BrandLogo size={120} className="welcome-logo" />
          <h1 className="restaurant-name">Brewbakes Courtyard</h1>
          <p className="tagline">Brew. Bite. Belong.</p>
        </div>

        <div className="welcome-divider">
          <span className="divider-line" />
          <span className="divider-text">SPIN & WIN</span>
          <span className="divider-line" />
        </div>

        <p className="welcome-subtitle">
          Spin the wheel & unlock rewards!
          <br />
          <span className="subtitle-small">Win up to 100% off your bill</span>
        </p>

        <button className="btn btn-unlock btn-unlock-ready btn-start-spin" onClick={onStart}>
          🎰 Spin the Wheel
        </button>

        <p className="welcome-footer">
          Brewbakes Courtyard • Loyalty Rewards
        </p>
      </div>
    </div>
  )
}
