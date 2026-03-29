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
    missionSuccess: boolean; // true if at least 1 creature survived
    lootReduction: number; // 0-1 based on deaths
  };
}

export interface ExplorationLevel {
  level: number;
  xp: number;
  xpToNext: number;
  unlockedDurations: string[];
}

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
  "15min": 1,
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

// Exploration level benefits (cumulative bonuses)
export const EXPLORATION_BONUS_MAX = {
  deathReduction: -50, // Maximum -50% death chance at level 20
  doubleLoot: 25,      // Maximum 25% chance at level 25
  timeReduction: -25,  // Maximum -25% duration at level 25
  rarityBonus: 20      // Maximum +20% chance at level 30
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
  // Death reduction: -10% per 2 levels (mailed at -50% at level 20)
  const deathReduction = Math.min(
    EXPLORATION_BONUS_MAX.deathReduction,
    -Math.floor(explorationLevel / 2) * 10
  );

  // Double loot: +5% per level until 25 (max 25%)
  const doubleLoot = Math.min(
    EXPLORATION_BONUS_MAX.doubleLoot,
    explorationLevel * 1
  );

  // Time reduction: -5% per level until 25 (max -25%)
  const timeReduction = Math.min(
    EXPLORATION_BONUS_MAX.timeReduction,
    -explorationLevel * 1
  );

  // Rarity bonus: +2% per level until 30 (max +20%)
  const rarityBonus = Math.min(
    EXPLORATION_BONUS_MAX.rarityBonus,
    explorationLevel * 0.8
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
 * Calculate injury chance (lose HP but not die)
 */
function calculateInjuryChance(
  creatureLevel: number,
  missionDuration: string
): number {
  const baseChances: Record<string, number> = {
    "15min": 0.10,
    "30min": 0.20,
    "1h": 0.35,
    "2h": 0.50,
    "4h": 0.65,
    "8h": 0.80
  };
  const baseChance = baseChances[missionDuration] ?? 0.10; // Default to 0.10 if not found

  const levelReduction = Math.min(0.5, creatureLevel / 100);
  return baseChance * (1 - levelReduction);
}

/**
 * Generate loot for exploration mission
 * Loot quantity depends on team size and duration
 * Rarity chances depend on duration
 * Exploration level provides bonus double loot and rarity chances
 * Uses native rank system (E-S+)
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

  // Determine eligible plants by rank
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
 */
export function calculateAdjustedDuration(
  missionDuration: string,
  explorationLevel: number
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

  const explorationBonus = getExplorationBonus(explorationLevel);
  const timeReduction = Math.abs(explorationBonus.timeReduction) / 100;

  return baseDurationMs * (1 - timeReduction);
}

/**
 * Simulate exploration mission outcome
 * Returns casualties, survivors, and loot
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
  creatureLevels: number[],
  avgExplorationLevel: number = 0 // Average exploration level for time reduction bonus
): ExplorationMission {
  const startTime = Date.now();
  const adjustedDurationMs = calculateAdjustedDuration(duration, avgExplorationLevel);

  return {
    id: `mission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    team,
    duration,
    startTime,
    endTime: startTime + adjustedDurationMs,
    status: "active",
    explorationLevel: avgExplorationLevel // Store for debugging/reference
  };
}

/**
 * Check if mission is complete
 */
export function isMissionComplete(mission: ExplorationMission): boolean {
  return Date.now() >= mission.endTime;
}

/**
 * Calculate XP gained from exploration mission
 */
export function calculateExplorationXP(
  missionDuration: string
): number {
  return MISSION_XP_VALUES[missionDuration] || 20; // Default 20 XP
}

/**
 * Apply exploration XP to creatures
 */
export function applyExplorationXP(
  creatures: any[],
  xpGained: number
): any[] {
  return creatures.map(creature => {
    const currentXP = creature.explorationXP || 0;
    const explorationLevel = creature.explorationLevel || 0;

    // Simple XP to level (100 XP per level)
    const newXPTotal = currentXP + xpGained;
    const newExplorationLevel = Math.floor(newXPTotal / 100);

    return {
      ...creature,
      explorationXP: newXPTotal,
      explorationLevel: newExplorationLevel,
      explorationXPToNext: ((newExplorationLevel + 1) * 100) - newXPTotal
    };
  });
}

/**
 * Check which durations are unlocked based on exploration level
 */
export function getUnlockedDurations(explorationLevel: number): string[] {
  const unlocked = [];
  for (const [duration, threshold] of Object.entries(DURATION_UNLOCK_THRESHOLDS)) {
    if (explorationLevel >= threshold) {
      unlocked.push(duration);
    }
  }
  return unlocked;
}

/**
 * Check how many concurrent missions are unlocked
 */
export function getMaxConcurrentMissions(explorationLevel: number): number {
  let max = 1;
  for (const [xpThreshold, count] of Object.entries(MISSION_LOCKED_COUNTS)) {
    if (explorationLevel >= parseInt(xpThreshold)) {
      max = count;
    }
  }
  return max;
}
