export default function BrandLogo({ size = 38, variant = 'compact', className = '' }) {
  const isHero = variant === 'hero'

  return (
    <img
      src="/logo.png"
      alt="Brewbakes Courtyard"
      className={`brand-logo brand-logo--${variant} ${className}`.trim()}
      style={isHero ? undefined : { height: size }}
      width={isHero ? 190 : Math.round(size * 2.4)}
      height={isHero ? undefined : size}
    />
  )
}
