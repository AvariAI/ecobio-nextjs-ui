/**
 * ÉcoBio Star Progression System - Visual Only (No Unlocks)
 * Creatures earn XP through battle and can level up to higher stars (0-5)
 * Stars are purely for progression display - NO unlocks at this time
 */

export interface CombatXPResult {
  creatureId: string;
  xpGained: number;
  newStars: number;
  starUpgraded: boolean;
}

/**
 * Calculate XP earned in battle
 * XP = (damage dealt / enemy HP * 50) + (kill bonus 20) + (win bonus 30)
 */
export function calculateCombatXP(
  damageDealt: number,
  enemyHP: number,
  gotKill: boolean,
  wonBattle: boolean
): number {
  let xp = 0;

  // Damage contribution
  const damagePercent = Math.min(1, damageDealt / enemyHP);
  xp += Math.floor(damagePercent * 50);

  // Kill bonus
  if (gotKill) xp += 20;

  // Win bonus
  if (wonBattle) xp += 30;

  return Math.max(0, xp); // Minimum 0
}

/**
 * Check if creature levels up to next star
 * Stars: 0 → 1 → 2 → 3 → 4 → 5
 * XP requirements: 0 → 100 → 300 → 600 → 1000 → 1500
 */
export function checkStarLevelUp(
  currentXP: number,
  currentStars: number
): {
  leveledUp: boolean;
  newStars: number;
  xpToNextStar: number
} {
  // Star requirements (cumulative XP needed)
  const starRequirements = [0, 100, 300, 600, 1000, 1500];
  const currentTotalXP = currentXP;

  let newStars = currentStars;

  // Check if we've earned enough for next star
  if (newStars < 5 && currentTotalXP >= starRequirements[newStars + 1]) {
    newStars++;

    // Check if we can level up multiple stars at once
    while (newStars < 5 && currentTotalXP >= starRequirements[newStars + 1]) {
      newStars++;
    }
  }

  const xpToNextStar = newStars < 5
    ? starRequirements[newStars + 1] - currentTotalXP
    : 0; // Max stars

  return {
    leveledUp: newStars > currentStars,
    newStars,
    xpToNextStar
  };
}

/**
 * Apply XP to creature and update star progression
 */
export function applyCombatXP(
  creature: any, // HuntedCreature or BreededCreature
  xpGained: number
): {
  updated: any;
  starLeveled: boolean;
  oldStars: number;
  newStars: number;
} {
  const oldStars = creature.stars || 0;
  const currentXP = creature.combatXP || 0;

  // Add XP
  const newXP = currentXP + xpGained;
  creature.combatXP = newXP;

  // Check star level up
  const starCheck = checkStarLevelUp(newXP, oldStars);

  if (starCheck.leveledUp) {
    creature.stars = starCheck.newStars;
    creature.combatXPToNextStar = starCheck.xpToNextStar;
  } else {
    creature.combatXPToNextStar = starCheck.xpToNextStar;
  }

  return {
    updated: creature,
    starLeveled: starCheck.leveledUp,
    oldStars,
    newStars: starCheck.newStars
  };
}
