/**
 * ÉcoBio Breeding System
 * Breeding logic for creature reproduction
 */

import { Creature, Rank } from "./database";

// Stats interface for creatures
export interface Stats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  crit: number;
  rank?: Rank;
}

// Breeded creature structure (extended collection creature)
export interface BreededCreature {
  id: string;
  nickname: string;
  creatureType: string; // 'ant' | 'fly' | 'beefly' | 'bee' | 'wasp'
  level: number; // Always 1
  rank: Rank; // E-S+
  stats: Stats;
  traits: string[]; // Trait IDs
  isFavorite: boolean;
  breeded: true; // Flag to indicate breeded creature
  parentIds: string[]; // IDs of parents (for records)
  breedDate: number; // Timestamp
  creatureId: string; // Base creature type ID
  finalStats: Stats; // Compatible with hunting page
  skill: any; // Skill from base creature
  desc: string;
  createdAt: number;
}

// Breeding cost by rank (based on highest parent rank)
export const BREEDING_COST: Record<Rank, number> = {
  E: 50,
  D: 75,
  C: 100,
  B: 150,
  A: 200,
  S: 300,
  "S+": 500,
};

// Rank order array for calculations
const RANK_ORDER: Rank[] = ["E", "D", "C", "B", "A", "S", "S+"];

/**
 * Get rank index in order array
 */
function getRankIndex(rank: Rank): number {
  return RANK_ORDER.indexOf(rank);
}

/**
 * Calculate baby stats based on parents
 * Average of parents + small RNG variance (±5%)
 */
export function calculateBabyStats(parent1: any, parent2: any): Stats {
  const varianceRange = 0.05; // ±5%

  const hpVar = 1 + (Math.random() * 2 - 1) * varianceRange;
  const attackVar = 1 + (Math.random() * 2 - 1) * varianceRange;
  const defenseVar = 1 + (Math.random() * 2 - 1) * varianceRange;
  const speedVar = 1 + (Math.random() * 2 - 1) * varianceRange;
  const critVar = 1 + (Math.random() * 2 - 1) * varianceRange;

  const parent1Stats = parent1.finalStats || parent1.stats;
  const parent2Stats = parent2.finalStats || parent2.stats;

  return {
    hp: Math.max(1, Math.floor(((parent1Stats.hp + parent2Stats.hp) / 2) * hpVar)),
    attack: Math.max(1, Math.floor(((parent1Stats.attack + parent2Stats.attack) / 2) * attackVar)),
    defense: Math.max(1, Math.floor(((parent1Stats.defense + parent2Stats.defense) / 2) * defenseVar)),
    speed: Math.max(1, Math.floor(((parent1Stats.speed + parent2Stats.speed) / 2) * speedVar)),
    crit: Math.max(1, Math.floor(((parent1Stats.crit + parent2Stats.crit) / 2) * critVar)),
  };
}

/**
 * Predict baby rank based on parents
 * Weighted towards higher rank, but can drop
 * Never worse than worst parent by 2 ranks
 */
export function predictBabyRank(parent1: any, parent2: any): Rank {
  const p1Rank = parent1.finalStats?.rank || parent1.rank;
  const p2Rank = parent2.finalStats?.rank || parent2.rank;

  const p1Idx = getRankIndex(p1Rank as Rank);
  const p2Idx = getRankIndex(p2Rank as Rank);
  const avgIdx = (p1Idx + p2Idx) / 2;

  // Weight towards higher rank slightly
  // Random offset: -1, 0, or +1 (biased towards +1)
  const randomOffset = Math.floor(Math.random() * 3) - 1;
  let predictedIdx = Math.floor(avgIdx + randomOffset);

  // Random boost chance for higher ranks
  if (Math.random() < 0.2) {
    predictedIdx = Math.min(predictedIdx + 1, 6);
  }

  // Clamp within bounds
  predictedIdx = Math.max(0, Math.min(6, predictedIdx));

  // Minimum rank: never worse than worst parent by 2 ranks
  const minRankIdx = Math.max(Math.min(p1Idx, p2Idx) - 2, 0);
  predictedIdx = Math.max(minRankIdx, predictedIdx);

  return RANK_ORDER[predictedIdx];
}

/**
 * Get trait slot count for a rank (from traits.ts logic)
 */
function getTraitSlots(rank: Rank): number {
  const slots: Record<Rank, { min: number; max: number }> = {
    E: { min: 0, max: 1 },
    D: { min: 1, max: 1 },
    C: { min: 1, max: 2 },
    B: { min: 2, max: 2 },
    A: { min: 2, max: 3 },
    S: { min: 3, max: 3 },
    "S+": { min: 3, max: 4 },
  };

  const slotRange = slots[rank];
  if (slotRange.min === slotRange.max) {
    return slotRange.min;
  }

  // Random choice between min and max (50/50)
  return Math.random() < 0.5 ? slotRange.min : slotRange.max;
}

/**
 * Inherit traits from parents
 * Select 2-4 random traits from both parents
 * Traits both parents have = higher inheritance chance
 */
export function inheritParentTraits(parent1: any, parent2: any, babyRank: Rank): string[] {
  const p1Traits = parent1.traits || [];
  const p2Traits = parent2.traits || [];

  // Pool all parent traits (deduplicate)
  const allTraits = [...new Set([...p1Traits, ...p2Traits])];

  // If no traits from parents, return empty
  if (allTraits.length === 0) {
    return [];
  }

  // Number of trait slots based on baby rank
  const slots = getTraitSlots(babyRank);

  // Calculate inheritance weights
  const traitWeights: Record<string, number> = {};
  for (const trait of allTraits) {
    const inP1 = p1Traits.includes(trait);
    const inP2 = p2Traits.includes(trait);

    if (inP1 && inP2) {
      // Both parents have it = 3x weight
      traitWeights[trait] = 3;
    } else if (inP1 || inP2) {
      // Only one parent has it = 1x weight
      traitWeights[trait] = 1;
    }
  }

  // Weighted random selection
  const selected: string[] = [];
  const usedTraits = new Set<string>();

  for (let i = 0; i < Math.min(slots, allTraits.length); i++) {
    // Calculate total weight
    const totalWeight = Object.entries(traitWeights)
      .filter(([traitId]) => !usedTraits.has(traitId))
      .reduce((sum, [, weight]) => sum + weight, 0);

    if (totalWeight === 0) {
      break;
    }

    // Weighted random pick
    let roll = Math.random() * totalWeight;
    for (const [traitId, weight] of Object.entries(traitWeights)) {
      if (usedTraits.has(traitId)) continue;

      roll -= weight;
      if (roll <= 0) {
        selected.push(traitId);
        usedTraits.add(traitId);
        break;
      }
    }
  }

  return selected;
}

/**
 * Calculate breeding cost
 * Based on highest rank parent
 */
export function calculateBreedingCost(parent1: any, parent2: any): number {
  const p1Rank = parent1.finalStats?.rank || parent1.rank;
  const p2Rank = parent2.finalStats?.rank || parent2.rank;

  const p1Value = BREEDING_COST[p1Rank as Rank];
  const p2Value = BREEDING_COST[p2Rank as Rank];

  // Cost based on highest rank parent
  return Math.max(p1Value, p2Value);
}

/**
 * Generate baby creature
 * Creates a complete breeded creature with all properties
 */
export function generateBabyCreature(
  parent1: any,
  parent2: any,
  creatureType: string,
  playerBalance: number
): {
  baby: BreededCreature | null;
  newBalance: number;
  error?: string;
} {
  // Validation: Cannot use same creature as both parents
  if (parent1.id === parent2.id) {
    return {
      baby: null,
      newBalance: playerBalance,
      error: "Cannot use same creature as both parents",
    };
  }

  // Calculate breeding cost
  const cost = calculateBreedingCost(parent1, parent2);

  // Check if player has enough balance
  if (playerBalance < cost) {
    return {
      baby: null,
      newBalance: playerBalance,
      error: `Insufficient balance. Need ${cost} coins`,
    };
  }

  // Import creature definitions
  // We'll need the CREATURES data from database.ts
  // For now, we'll create a basic creature
  const baseStats = calculateBabyStats(parent1, parent2);
  const predictedRank = predictBabyRank(parent1, parent2);
  baseStats.rank = predictedRank;

  // Calculate inherited traits
  const inheritedTraits = inheritParentTraits(parent1, parent2, predictedRank);

  // Generate unique ID
  const babyId = `breed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Map creature type to base creature ID
  const typeMap: Record<string, string> = {
    Ant: "ant",
    Fly: "housefly",
    Beefly: "housefly", // Fallback
    Bee: "honeybee",
    Wasp: "housefly", // Fallback
  };

  const baseCreatureId = typeMap[creatureType] || creatureType.toLowerCase();

  // Create baby creature
  const baby: BreededCreature = {
    id: babyId,
    nickname: `${creatureType} ${predictedRank}`,
    creatureType: creatureType.toLowerCase(),
    level: 1,
    rank: predictedRank,
    stats: baseStats,
    finalStats: baseStats, // For compatibility with hunting page
    traits: inheritedTraits,
    isFavorite: false,
    breeded: true,
    parentIds: [parent1.id, parent2.id],
    breedDate: Date.now(),
    creatureId: baseCreatureId,
    skill: parent1.skill, // Inherit skill from parent1
    desc: "Bébé créature issue de reproduction",
    createdAt: Date.now(),
  };

  // Deduct cost from balance
  const newBalance = playerBalance - cost;

  return {
    baby,
    newBalance,
  };
}

/**
 * Validate breeding parameters
 */
export function validateBreeding(
  parent1: any | null,
  parent2: any | null,
  creatureType: string,
  minLevel: number
): {
  valid: boolean;
  error?: string;
} {
  if (!parent1 || !parent2) {
    return { valid: false, error: "Both parents must be selected" };
  }

  if (parent1.id === parent2.id) {
    return { valid: false, error: "Cannot use same creature as both parents" };
  }

  const p1Level = parent1.level || 1;
  const p2Level = parent2.level || 1;

  if (p1Level < minLevel || p2Level < minLevel) {
    return { valid: false, error: `Parents must be at least level ${minLevel}` };
  }

  if (!creatureType) {
    return { valid: false, error: "Creature type must be selected" };
  }

  return { valid: true };
}
