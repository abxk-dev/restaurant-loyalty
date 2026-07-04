/** Visits needed before free coffee can be redeemed */
export const LOYALTY_REDEEM_THRESHOLD = 5

/** 1 loyalty point per visit (not bill-based) */
export const POINTS_PER_VISIT = 1

export function calculateVisitLoyaltyPoints(currentPoints = 0) {
  if (currentPoints >= LOYALTY_REDEEM_THRESHOLD) return 0
  return POINTS_PER_VISIT
}

export function canRedeemFreeCoffee(loyaltyPoints) {
  return loyaltyPoints >= LOYALTY_REDEEM_THRESHOLD
}
