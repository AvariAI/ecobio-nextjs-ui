/**
 * ÉcoBio Star Unlocks - Placeholders Only (No Active Unlocks)
 * Stars are purely for progression display - NO unlocks at this time
 * Free stars available per creature for more creature-driven system additions later
 */

import { Rank } from "./database";

export interface StarUnlock {
  star: number;
  unlockType: "none" | "placeholder"; // No active unlocks
  unlocked: boolean;
}

/**
 * Get placeholder unlock info for visual display only
 * Returns empty array since there are no active unlocks
 */
export function getStarUnlocks(
  creatureId: string,
  stars: number,
  rank: Rank
): StarUnlock[] {
  // No active unlocks - just return empty array
  // Stars are purely for progression display at this time
  return [];
}

/**
 * Get star count + XP tracking for visual display (only)
 * No damage bonuses or skill unlocks at this time
 */
export function getStarProgressionDisplay(stars: number): {
  maxStars: number;
  currentStars: number;
  percentComplete: number;
} {
  const maxStars = 5;
  const percentComplete = stars >= maxStars ? 100 : (stars / maxStars) * 100;

  return {
    maxStars,
    currentStars: stars,
    percentComplete
  };
}
