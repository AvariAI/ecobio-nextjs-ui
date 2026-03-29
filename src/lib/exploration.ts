import { PlantResource, PLANTS, PLANT_RARITY_CHANCES, MISSION_XP_VALUES } from "./resources";
import { Rank } from "./database";

export interface ExplorationMission {
  id: string;
  team: string[]; // Creature IDs (1-5 creatures)
  duration: "15min" | "30min" | "1h" | "2h" | "4h" | "8h";
  startTime: number; // timestamp
  endTime: number; // timestamp for completion
  status: "active" | "completed" | "failed";
  explorationLevel: number; // Specimen exploration level (for unlocking durations)

  // Results (populated on completion)
  results?: {
    loot: PlantResource[];
    totalLoot: number;
    casualties: number; // Number of creatures that died
    casualtyIds: string[]; // IDs of creatures that died
    casualtiesData: any[]; // Full creature data for display purposes
    survivors: string[]; // IDs of surviving creatures
    missionSuccess: boolean; // Did mission succeed (any survivors)
    lootReduction: number; // 0-1 based on casualties
    explorationXP: number; // XP gained from exploration
  };
}

// Duration thresholds for unlocks (in XP - DEPRECATED, now using level requirements)
export const DURATION_UNLOCK_THRESHOLDS: Record<string, number> = {
  "15min": 0,
  "30min": 50,
  "1h": 150,
  "2h": 400,
  "4h": 800,
  "8h": 1500
};

// New: Exploration level requirements for duration unlocks
export const DURATION_LEVEL_REQUIREMENTS: Record<string, number> = {
  "15min": 0,
  "30min": 5,
  "1h": 10,
  "2h": 20,
  "4h": 25,
  "8h": 30
};

export const MISSION_LOCKED_COUNTS: Record<number, number> = {
  1: 1, // 1 max concurrent mission at level 1
  100: 2, // Unlock 2 missions at 100 XP
  500: 3, // Unlock 3 missions at 500 XP
  1000: 4, // Unlock 4 missions at 1000 XP
  2000: 5  // Unlock 5 missions at 2000 XP
};

// Exploration level benefits (linear progression, all 4 bonuses progress together at each level)
// Time reduction is per-creature, max -7.5% per creature, -37.5% cumulative for 5 creatures
export const EXPLORATION_BONUS_MAX = {
  deathReduction: -30, // Maximum -30% death chance at level 30
  doubleLoot: 30,     // Maximum 30% chance at level 30
  timeReduction: -7.5, // Maximum -7.5% duration per creature at level 30, -37.5% cumulative for 5 creatures
  rarityBonus: 15      // Maximum +15% chance at level 30
};

/**
 * Calculate exploration level benefits (cumulative bonuses)
 * Returns percentage values for each bonus type
 */
export function getExplorationBonus(explorationLevel: number): {
  deathReduction: number;      // Negative % reduction to death chance
  doubleLoot: number;          // % chance of double loot
  timeReduction: number;       // Negative % reduction to mission duration
  rarityBonus: number;         // % bonus chance for higher rank loot
} {
  // Death reduction: -1% per level (max -30% at level 30)
  const deathReduction = Math.min(
    EXPLORATION_BONUS_MAX.deathReduction,
    -explorationLevel
  );

  // Double loot: +1% per level (max 30% at level 30)
  const doubleLoot = Math.min(
    EXPLORATION_BONUS_MAX.doubleLoot,
    explorationLevel
  );

  // Time reduction: -0.25% per level (max -7.5% per creature at level 30)
  // Cumulative with team: 5 max-level creatures = -37.5% total
  const timeReduction = Math.min(
    EXPLORATION_BONUS_MAX.timeReduction,
    -explorationLevel * 0.25
  );

  // Rarity bonus: +0.5% per level (max +15% at level 30)
  const rarityBonus = Math.min(
    EXPLORATION_BONUS_MAX.rarityBonus,
    explorationLevel * 0.5
  );

  return { deathReduction, doubleLoot, timeReduction, rarityBonus };
}

/**
 * Calculate death chance based on creature level and mission duration
 * Higher duration = higher death chance
 * Higher level creature = lower death chance
 * Exploration level reduces death chance (cumulative bonus)
 */
function calculateDeathChance(
  creatureLevel: number,
  missionDuration: string,
  explorationLevel: number = 0
): number {
  const baseChances: Record<string, number> = {
    "15min": 0.05,
    "30min": 0.10,
    "1h": 0.20,
    "2h": 0.35,
    "4h": 0.50,
    "8h": 0.70
  };
  const baseChance = baseChances[missionDuration] ?? 0.05; // Default to 0.05 if not found

  // Level 50 creatures have half the death chance
  const levelReduction = Math.min(0.5, creatureLevel / 100);

  // Exploration level bonus: reduces death chance further
  const explorationBonus = getExplorationBonus(explorationLevel);
  const explorationReduction = Math.abs(explorationBonus.deathReduction) / 100;

  return baseChance * (1 - levelReduction - explorationReduction);
}

/**
 * Generate loot for exploration mission
 * Loot quantity depends on team size and duration
 * Rarity chances depend on duration
 * Exploration level provides bonus double loot and rarity chances
 * Uses native rank system (E-S+)
 * Generates plants including medical plants
 */
export function generateLoot(
  teamSize: number,
  missionDuration: string,
  lootReduction: number, // 0-1 based on casualties
  explorationLevel: number = 0 // Exploration level for bonuses
): PlantResource[] {
  const rarityChances = PLANT_RARITY_CHANCES[missionDuration] ?? PLANT_RARITY_CHANCES["15min"];
  const loot: PlantResource[] = [];

  // Get exploration level bonuses
  const explorationBonus = getExplorationBonus(explorationLevel);

  // Determine eligible plants by rank (includes medical plants)
  const eligiblePlants = new Map<Rank, PlantResource[]>();

  PLANTS.forEach(plant => {
    const rank = plant.rarity;
    if (!eligiblePlants.has(rank)) {
      eligiblePlants.set(rank, []);
    }
    eligiblePlants.get(rank)!.push(plant);
  });

  // Base loot count based on team size and duration
  // 15min: 1-2 loot, 8h: 3-6 loot
  const baseLootCount = Math.floor(teamSize * (1 + DURATION_UNLOCK_THRESHOLDS[missionDuration] / 50));

  // Apply loot reduction based on casualties
  const effectiveLootCount = Math.max(1, Math.floor(baseLootCount * (1 - lootReduction)));

  // Generate loot items with rarity roll
  for (let i = 0; i < effectiveLootCount; i++) {
    // Short missions may have empty loot (fail chance)
    if (Math.random() < 0.2 && ["15min", "30min"].includes(missionDuration)) {
      continue;
    }

    // Roll for rarity based on mission duration chances + exploration bonus
    const roll = Math.random();
    let selectedRank: Rank = "E";
    let cumulativeChance = 0;

    // Apply rarity bonus: shift roll downward to favor higher ranks
    const adjustedRoll = Math.max(0, roll - (explorationBonus.rarityBonus / 100));

    for (const [rank, chance] of Object.entries(rarityChances)) {
      cumulativeChance += chance;
      if (adjustedRoll <= cumulativeChance) {
        selectedRank = rank as Rank;
        break;
      }
    }

    // Randomly select a plant of that rarity
    const rankPlants = eligiblePlants.get(selectedRank) || [];
    if (rankPlants.length > 0) {
      const selectedPlant = rankPlants[Math.floor(Math.random() * rankPlants.length)];
      loot.push(selectedPlant);

      // Double loot bonus: add another plant of same rank
      if (Math.random() < (explorationBonus.doubleLoot / 100)) {
        const doublePlant = rankPlants[Math.floor(Math.random() * rankPlants.length)];
        loot.push(doublePlant);
      }
    }
  }

  return loot;
}

/**
 * Calculate adjusted mission duration with exploration level time reduction
 * Now uses cumulative time reduction from all creatures, capped at -37.5%
 */
export function calculateAdjustedDuration(
  missionDuration: string,
  creatures: any[] // Array of creatures with explorationLevel
): number {
  const durationMsMap: Record<string, number> = {
    "15min": 15 * 60 * 1000,
    "30min": 30 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "2h": 2 * 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "8h": 8 * 60 * 60 * 1000
  };
  const baseDurationMs = durationMsMap[missionDuration] ?? 15 * 60 * 1000;

  // Calculate cumulative time reduction from all creatures
  // Each creature contributes up to -7.5%, total capped at -37.5%
  let totalTimeReduction = 0;
  creatures.forEach(creature => {
    const level = creature.explorationLevel || 0;
    const bonus = getExplorationBonus(level);
    const reduction = Math.abs(bonus.timeReduction) / 100;
    totalTimeReduction += reduction;
  });

  // Cap total reduction at -37.5% (5 creatures × -7.5%)
  const cappedTimeReduction = Math.min(0.375, totalTimeReduction);

  return baseDurationMs * (1 - cappedTimeReduction);
}

/**
 * Simulate exploration mission outcome
 * Returns casualties, survivors, and loot (plants including medicals)
 */
export function simulateExplorationMission(
  mission: ExplorationMission,
  creatures: any[] // HuntedCreature objects
): {
  casualties: number;
  casualtyIds: string[];
  casualtiesData: any[]; // Full creature data for display purposes
  survivors: string[];
  loot: PlantResource[];
  lootReduction: number;
} {
  const casualties: string[] = [];
  const casualtiesData: any[] = [];
  const survivors: string[] = [];

  // Process each creature
  for (const creature of creatures) {
    const deathChance = calculateDeathChance(
      creature.level || 1,
      mission.duration,
      creature.explorationLevel || 0
    );
    const roll = Math.random();

    if (roll < deathChance) {
      casualties.push(creature.id);
      casualtiesData.push(creature); // Store full creature data
    } else {
      survivors.push(creature.id);
    }
  }

  // Calculate loot reduction based on casualties
  // Maximum 70% reduction if all 5 creatures die
  const casualtyCount = casualties.length;
  const survivorCount = survivors.length;
  const lootReduction = casualtyCount > 0 ? Math.min(0.7, casualtyCount / 5) : 0;

  // Calculate average exploration level for loot bonuses
  const avgExplorationLevel = creatures.length > 0
    ? creatures.reduce((sum, c) => sum + (c.explorationLevel || 0), 0) / creatures.length
    : 0;

  // Generate loot (no loot if everyone died)
  const loot = survivorCount > 0
    ? generateLoot(survivorCount, mission.duration, lootReduction, avgExplorationLevel)
    : [];

  return {
    casualties: casualtyCount,
    casualtyIds: casualties,
    casualtiesData,
    survivors,
    loot,
    lootReduction
  };
}

/**
 * Create new exploration mission
 */
export function createExplorationMission(
  team: string[],
  duration: "15min" | "30min" | "1h" | "2h" | "4h" | "8h",
  creatures: any[], // Creatures with explorationLevel for cumulative time reduction
  avgExplorationLevel: number = 0 // Still passed for display/reference (loot/rarity still use avg)
): ExplorationMission {
  const startTime = Date.now();
  const adjustedDurationMs = calculateAdjustedDuration(duration, creatures);

  return {
    id: `mission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    team,
    duration,
    startTime,
    endTime: startTime + adjustedDurationMs,
    status: "active",
    explorationLevel: avgExplorationLevel // Store for debugging/reference (loot/rarity still use avg)
  };
}

/**
 * Check if a mission is complete based on current time
 */
export function isMissionComplete(mission: ExplorationMission): boolean {
  return Date.now() >= mission.endTime && mission.status === "active";
}

/**
 * Calculate exploration XP rewards based on mission duration
 */
export function calculateExplorationXP(duration: string): number {
  return MISSION_XP_VALUES[duration] || 20;
}

/**
 * Check what durations are unlocked based on exploration level
 */
export function getUnlockedDurations(explorationLevel: number): string[] {
  return Object.entries(DURATION_LEVEL_REQUIREMENTS)
    .filter(([_, reqLevel]) => explorationLevel >= reqLevel)
    .map(([duration, _]) => duration);
}

/**
 * Check max concurrent missions based on total exploration XP
 */
export function getMaxConcurrentMissions(totalXP: number): number {
  let max = 1;
  for (const [xpThreshold, count] of Object.entries(MISSION_LOCKED_COUNTS)) {
    if (parseFloat(xpThreshold) <= totalXP) {
      max = count;
    }
  }
  return max;
}

/**
 * Get XP threshold for next exploration level
 */
export function getExplorationXPToNext(currentLevel: number): number {
  return 100; // XP per level is constant: 100 XP = 1 level
}

/**
 * Get total XP required for target exploration level
 */
export function getTotalXPForLevel(targetLevel: number): number {
  return targetLevel * 100;
}
