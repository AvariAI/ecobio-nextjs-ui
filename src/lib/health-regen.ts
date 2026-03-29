/**
 * Health Regeneration System
 * Creatures regenerate HP over time automatically
 */

export interface CreatureWithHealth {
  currentHP: number | undefined;
  maxHP: number | undefined;
  lastHealTime: number | undefined;
  finalStats?: {
    hp: number;
  };
  customStats?: {
    hp: number;
  };
  level: number | undefined;
}

/**
 * Calculate auto-regenerated HP for a creature
 * - Regen rate: 10% of maxHP per hour
 * - Returns { currentHP, lastHealTime } updated
 */
export function calculateHealthRegeneration(creature: CreatureWithHealth): {
  currentHP: number;
  lastHealTime: number;
} {
  const maxHP = creature.maxHP || creature.finalStats?.hp || 100;
  let currentHP = creature.currentHP || maxHP;
  let lastHealTime = creature.lastHealTime || Date.now();

  // Nothing to regenerate if already at full health
  if (currentHP >= maxHP) {
    return { currentHP: Math.floor(currentHP), lastHealTime: Date.now() };
  }

  const now = Date.now();
  const hoursElapsed = (now - lastHealTime) / (1000 * 60 * 60); // Convert ms to hours

  // Calculate HP regained: 10% of maxHP per hour
  const hpRegenPerHour = maxHP * 0.10;
  const hpRegained = Math.min(maxHP - currentHP, hpRegenPerHour * hoursElapsed);

  // Apply regeneration and floor to integers
  currentHP = currentHP + hpRegained;
  currentHP = Math.floor(Math.min(maxHP, Math.max(1, currentHP))); // Cap at maxHP, minimum 1, and floor to integer
  lastHealTime = now;

  return { currentHP, lastHealTime };
}

/**
 * Apply health regeneration to a collection of creatures
 * Returns updated collection with regenerated HP
 */
export function applyHealthRegenerationToCollection<T extends CreatureWithHealth>(
  collection: T[]
): T[] {
  return collection.map(creature => {
    const { currentHP, lastHealTime } = calculateHealthRegeneration(creature);
    return {
      ...creature,
      currentHP,
      lastHealTime
    };
  });
}
