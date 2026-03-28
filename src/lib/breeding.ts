/**
 * ÉcoBio Breeding System
 * Breeding logic for creature reproduction
 */

import { Creature, Rank, CREATURES } from "./database";
import { TRAITS, getAllTraitsForRank } from "./traits";

// Egg structure for incubation
export interface BreedingEgg {
  id: string;
  parent1Id: string;
  parent2Id: string;
  babyCreatureType: string;
  babyName: string;
  babyRank: Rank;
  babyStats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    crit: number;
  };
  babyTraits: string[];
  buffer1Id: string;
  buffer2Id: string;
  createdAt: number; // timestamp
  incubationDuration: number; // duration in milliseconds
  readyAt: number; // timestamp when egg will hatch
  isHatched: boolean;
}

/**
 * Reverse level scaling to get a stat at level 1 from a stat at a higher level
 * Uses the same formula as getLevelScale from battle.ts
 */
function getStatAtLevel1(currentStat: number, level: number, statType: "hp" | "other"): number {
  if (level <= 1) {
    return currentStat; // Already at level 1
  }

  // Reverse the level scaling formula from battle.ts
  const normalizedLevel = (level - 1) / 49;

  let levelScale: number;
  if (statType === "hp") {
    levelScale = 1.0 + normalizedLevel * 14.7;
  } else {
    levelScale = 1.0 + Math.sqrt(normalizedLevel) * 7.4;
  }

  return currentStat / levelScale;
}

// Stats interface for creatures
export interface Stats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  crit: number;
}

// Breeded creature structure (compatible with HuntedCreature)
export interface BreededCreature {
  id: string;
  name: string; // Required for HuntedCreature compatibility
  creatureId: string; // Creature database ID
  creatureType: string; // 'ant' | 'fly' | 'bee' | etc.
  creature: any; // Creature data from database (for baseStats compatibility)
  nickname?: string;
  level: number; // Always 1
  rank: Rank; // E-S+
  stats: Stats;
  currentXP: number;
  xpToNextLevel: number;
  feedCount: number;
  feedStat: "hp" | "atk" | "def" | "spd" | "crit" | null;
  createdAt: number;
  traits: string[]; // Trait IDs
  isFavorite: boolean;
  breeded?: true; // Optional flag to indicate breeded creature
  parentIds?: string[]; // IDs of parents (for records)
  breedDate?: number; // Timestamp
  finalStats: Stats & { rank: Rank }; // Compatible with hunting page
  skill?: any; // Skill from base creature
  desc?: string;
}

// Rank conversion helpers
function rankToNumber(rank: Rank): number {
  return { E: 1, D: 2, C: 3, B: 4, A: 5, S: 6, "S+": 7 }[rank];
}

function numberToRank(num: number): Rank {
  const ranks: Rank[] = ['E', 'D', 'C', 'B', 'A', 'S', 'S+'];
  return ranks[Math.max(0, Math.min(6, num - 1))] || 'E';
}

// Get base stat for creature type
function getCreatureBaseStat(creatureType: string, stat: keyof Stats): number {
  // Match creature type by ID or name
  let baseCreature = CREATURES[creatureType];
  if (!baseCreature) {
    // Try to find by case-insensitive name match
    const creatureKey = Object.keys(CREATURES).find(
      key => CREATURES[key].name.toLowerCase() === creatureType.toLowerCase()
    );
    if (creatureKey) {
      baseCreature = CREATURES[creatureKey];
    } else {
      // Default fallback
      baseCreature = CREATURES.ant;
    }
  }
  return baseCreature.baseStats[stat];
}

// Trait slot count helpers
function getTraitSlots(rank: Rank): number {
  const roll = Math.random();
  switch (rank) {
    case 'E': return roll < 0.5 ? 0 : 1;
    case 'D': return 1;
    case 'C': return roll < 0.5 ? 1 : 2;
    case 'B': return 2;
    case 'A': return roll < 0.5 ? 2 : 3;
    case 'S': return 3;
    case 'S+': return roll < 0.5 ? 3 : 4;
    default: return 1;
  }
}

function getMaxTraitSlots(rank: Rank): number {
  return { E: 1, D: 1, C: 2, B: 2, A: 3, S: 3, "S+": 4 }[rank];
}

/**
 * Calculate baby stats based on parents' LEVEL 1 stats
 * For each stat: 60% parent level 1 average + 40% template base + ±5% random variance
 *
 * IMPORTANT: Uses parents' LEVEL 1 stats (reverse-calculated from current stats)
 * NOT their current leveled stats. This ensures high-level parents don't
 * produce overpowered babies.
 */
export function calculateBabyStats(
  parent1: any,
  parent2: any,
  babyCreatureType: string
): Stats {
  const parent1Stats = parent1.finalStats || parent1.stats;
  const parent2Stats = parent2.finalStats || parent2.stats;

  // Get parent levels to reverse-calculate level 1 stats
  const parent1Level = parent1.level || 1;
  const parent2Level = parent2.level || 1;

  // Reverse-calculate both parents' stats to level 1
  const parent1Lvl1Stats = {
    hp: getStatAtLevel1(parent1Stats.hp, parent1Level, "hp"),
    attack: getStatAtLevel1(parent1Stats.attack, parent1Level, "other"),
    defense: getStatAtLevel1(parent1Stats.defense, parent1Level, "other"),
    speed: getStatAtLevel1(parent1Stats.speed, parent1Level, "other"),
    crit: getStatAtLevel1(parent1Stats.crit, parent1Level, "other"),
  };

  const parent2Lvl1Stats = {
    hp: getStatAtLevel1(parent2Stats.hp, parent2Level, "hp"),
    attack: getStatAtLevel1(parent2Stats.attack, parent2Level, "other"),
    defense: getStatAtLevel1(parent2Stats.defense, parent2Level, "other"),
    speed: getStatAtLevel1(parent2Stats.speed, parent2Level, "other"),
    crit: getStatAtLevel1(parent2Stats.crit, parent2Level, "other"),
  };

  const stats: Stats = {
    hp: 0,
    attack: 0,
    defense: 0,
    speed: 0,
    crit: 0,
  };

  for (const stat of ['hp', 'attack', 'defense', 'speed', 'crit'] as const) {
    // Use level 1 stats for averaging
    const avgParents = (parent1Lvl1Stats[stat] + parent2Lvl1Stats[stat]) / 2;
    const templateStat = getCreatureBaseStat(babyCreatureType, stat);
    const baseBaby = 0.6 * avgParents + 0.4 * templateStat;

    // ±5% random variance
    const variance = 1 + (Math.random() * 2 - 1) * 0.05;
    stats[stat] = Math.max(1, Math.floor(baseBaby * variance));
  }

  return stats;
}

/**
 * Predict baby rank based on parents
 * Average of parent ranks + weighted RNG
 * -2: 5% chance
 * -1: 25% chance
 * 0: 60% chance
 * +1: 10% chance
 */
export function predictBabyRank(parent1: any, parent2: any): Rank {
  const p1Rank = parent1.finalStats?.rank || parent1.rank;
  const p2Rank = parent2.finalStats?.rank || parent2.rank;

  const rank1 = rankToNumber(p1Rank as Rank);
  const rank2 = rankToNumber(p2Rank as Rank);
  const avgRank = Math.round((rank1 + rank2) / 2);

  // Weighted RNG roll
  const roll = Math.random();
  let rngResult: number;
  if (roll < 0.05) {
    rngResult = -2;
  } else if (roll < 0.30) {
    rngResult = -1;
  } else if (roll < 0.90) {
    rngResult = 0;
  } else {
    rngResult = 1;
  }

  const babyRankNumber = avgRank + rngResult;
  const clampedRank = Math.max(1, Math.min(7, babyRankNumber));

  return numberToRank(clampedRank);
}

/**
 * Inherit traits from parents
 * Get trait slot count based on baby rank, then randomly select from parent trait pool
 */
export function inheritParentTraits(
  parent1: any,
  parent2: any,
  babyRank: Rank
): string[] {
  const p1Traits = parent1.traits || [];
  const p2Traits = parent2.traits || [];

  // Create trait pool = parent1.traits ∪ parent2.traits (deduplicate)
  const traitsArray = [...p1Traits, ...p2Traits];
  const traitPool = Array.from(new Set(traitsArray));

  // Get trait slot count
  const numSlots = getTraitSlots(babyRank);

  // If no traits in pool, return empty
  if (traitPool.length === 0) {
    return [];
  }

  // Randomly select nTraits from pool (without replacement, equal probability)
  const selectedTraits: string[] = [];
  const availableTraits = [...traitPool];

  for (let i = 0; i < Math.min(numSlots, availableTraits.length); i++) {
    const randomIndex = Math.floor(Math.random() * availableTraits.length);
    selectedTraits.push(availableTraits[randomIndex]);
    availableTraits.splice(randomIndex, 1);
  }

  return selectedTraits;
}

/**
 * Apply mutation surprise
 * 20% chance of mutation if baby has free slot
 */
export function applyMutationSurprise(babyTraits: string[], babyRank: Rank): string[] {
  // 20% chance of mutation
  if (Math.random() >= 0.2) {
    return babyTraits;
  }

  // Check if baby has free slot
  const maxSlots = getMaxTraitSlots(babyRank);
  if (babyTraits.length >= maxSlots) {
    return babyTraits;
  }

  // Get all possible traits for this rank
  const possibleTraits = getAllTraitsForRank(babyRank);
  if (possibleTraits.length === 0) {
    return babyTraits;
  }

  // Filter out existing traits
  const availableTraits = possibleTraits.filter(t => !babyTraits.includes(t.id));
  if (availableTraits.length === 0) {
    return babyTraits;
  }

  // Add one random trait as "mutation surprise"
  const randomTrait = availableTraits[Math.floor(Math.random() * availableTraits.length)];
  return [...babyTraits, randomTrait.id];
}

/**
 * Generate baby creature
 * Creates a complete breeded creature with all properties
 */
export function generateBabyCreature(
  parent1: any,
  parent2: any,
  babyCreatureType: string
): BreededCreature {
  // 1. Calculate baby stats
  const stats = calculateBabyStats(parent1, parent2, babyCreatureType);

  // 2. Predict baby rank
  const rank = predictBabyRank(parent1, parent2);

  // 3. Inherit traits
  let traits = inheritParentTraits(parent1, parent2, rank);

  // 4. Apply mutation surprise (20% chance)
  traits = applyMutationSurprise(traits, rank);

  // 5. Get base creature data
  let baseCreature = CREATURES[babyCreatureType];
  if (!baseCreature) {
    // Try to find by case-insensitive name match or fallback
    const creatureKey = Object.keys(CREATURES).find(
      key => key.toLowerCase().includes(babyCreatureType.toLowerCase()) ||
             CREATURES[key].name.toLowerCase().includes(babyCreatureType.toLowerCase())
    );
    baseCreature = creatureKey ? CREATURES[creatureKey] : CREATURES.ant;
  }

// 6. Create baby creature object (compatible with HuntedCreature)
  const baby: BreededCreature = {
    id: `baby-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: baseCreature.name,
    creatureId: baseCreature.id,
    creature: baseCreature, // Include base creature for baseStats compatibility
    creatureType: babyCreatureType.toLowerCase(),
    level: 1,
    rank,
    stats,
    currentXP: 0,
    xpToNextLevel: 100,
    feedCount: 0,
    feedStat: null,
    createdAt: Date.now(),
    traits,
    isFavorite: false,
    breeded: true,
    parentIds: [parent1.id, parent2.id],
    breedDate: Date.now(),
    finalStats: {
      ...stats,
      rank,
    },
  };

  return baby;
}

/**
 * Validate breeding parameters
 */
export function validateBreeding(
  parent1: any | null,
  parent2: any | null,
  babyCreatureType: string
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

  // Check same creature type
  const p1Type = parent1.creatureId || parent1.creatureType;
  const p2Type = parent2.creatureId || parent2.creatureType;

  if (p1Type !== p2Type) {
    return {
      valid: false,
      error: `Parents must be same type (${parent1.name} ≠ ${parent2.name})`
    };
  }

  // Baby type must match parent type
  if (babyCreatureType !== p1Type) {
    return {
      valid: false,
      error: `Baby type must match parent type (${babyCreatureType} ≠ ${p1Type})`
    };
  }

  return { valid: true };
}

/**
 * Preview baby stats (without RNG for consistent display)
 * Uses parents' LEVEL 1 stats and average values without variance for preview
 */
export function previewBabyStats(
  parent1: any,
  parent2: any,
  babyCreatureType: string
): Stats {
  const parent1Stats = parent1.finalStats || parent1.stats;
  const parent2Stats = parent2.finalStats || parent2.stats;

  // Get parent levels to reverse-calculate level 1 stats
  const parent1Level = parent1.level || 1;
  const parent2Level = parent2.level || 1;

  // Reverse-calculate both parents' stats to level 1
  const parent1Lvl1Stats = {
    hp: getStatAtLevel1(parent1Stats.hp, parent1Level, "hp"),
    attack: getStatAtLevel1(parent1Stats.attack, parent1Level, "other"),
    defense: getStatAtLevel1(parent1Stats.defense, parent1Level, "other"),
    speed: getStatAtLevel1(parent1Stats.speed, parent1Level, "other"),
    crit: getStatAtLevel1(parent1Stats.crit, parent1Level, "other"),
  };

  const parent2Lvl1Stats = {
    hp: getStatAtLevel1(parent2Stats.hp, parent2Level, "hp"),
    attack: getStatAtLevel1(parent2Stats.attack, parent2Level, "other"),
    defense: getStatAtLevel1(parent2Stats.defense, parent2Level, "other"),
    speed: getStatAtLevel1(parent2Stats.speed, parent2Level, "other"),
    crit: getStatAtLevel1(parent2Stats.crit, parent2Level, "other"),
  };

  const stats: Stats = {
    hp: 0,
    attack: 0,
    defense: 0,
    speed: 0,
    crit: 0,
  };

  // Use level 1 stats average without variance for preview
  for (const stat of ['hp', 'attack', 'defense', 'speed', 'crit'] as const) {
    const avgParents = (parent1Lvl1Stats[stat] + parent2Lvl1Stats[stat]) / 2;
    const templateStat = getCreatureBaseStat(babyCreatureType, stat);
    stats[stat] = Math.max(1, Math.floor(0.6 * avgParents + 0.4 * templateStat));
  }

  return stats;
}

/**
 * Preview baby rank (uses average without RNG for consistent display)
 */
export function previewBabyRank(parent1: any, parent2: any): Rank {
  const p1Rank = parent1.finalStats?.rank || parent1.rank;
  const p2Rank = parent2.finalStats?.rank || parent2.rank;

  const rank1 = rankToNumber(p1Rank as Rank);
  const rank2 = rankToNumber(p2Rank as Rank);
  const avgRank = Math.round((rank1 + rank2) / 2);

  const clampedRank = Math.max(1, Math.min(7, avgRank));
  return numberToRank(clampedRank);
}

/**
 * Preview baby traits (uses minimum slots for conservative preview)
 */
export function previewBabyTraits(
  parent1: any,
  parent2: any,
  babyRank: Rank
): string[] {
  const p1Traits = parent1.traits || [];
  const p2Traits = parent2.traits || [];
  const traitsArray = [...p1Traits, ...p2Traits];
  const traitPool = Array.from(new Set(traitsArray));

  // Use minimum trait slots for preview
  const minSlots: Record<Rank, number> = {
    E: 0,
    D: 1,
    C: 1,
    B: 2,
    A: 2,
    S: 3,
    "S+": 3,
  };

  const numSlots = minSlots[babyRank];

  if (traitPool.length === 0 || numSlots === 0) {
    return [];
  }

  // Select first numSlots traits for consistency
  return traitPool.slice(0, Math.min(numSlots, traitPool.length));
}

/**
 * Get creature display name from creature ID
 */
export function getCreatureName(creatureId: string): string {
  const creature = CREATURES[creatureId];
  if (creature) {
    return creature.name;
  }

  // Try to find by partial match
  const key = Object.keys(CREATURES).find(k =>
    k.toLowerCase().includes(creatureId.toLowerCase())
  );
  return key ? CREATURES[key].name : creatureId;
}

/**
 * Get unique creature types from parents
 * Returns the creature type if both parents are same type, undefined otherwise
 */
export function getValidCreatureType(parent1: any | null, parent2: any | null): string | null {
  if (!parent1 || !parent2) {
    return null;
  }

  const p1Type = parent1.creatureId || parent1.creatureType;
  const p2Type = parent2.creatureId || parent2.creatureType;

  if (p1Type !== p2Type) {
    return null;
  }

  return p1Type;
}

/**
 * Create breeding egg with incubation timer
 * Default incubation: 10 minutes (600000 ms)
 */
export function createBreedingEgg(
  parent1: any,
  parent2: any,
  babyCreatureType: string,
  buffer1Id: string,
  buffer2Id: string,
  customDuration?: number
): BreedingEgg {
  const babyName = getCreatureName(babyCreatureType);
  const babyRank = previewBabyRank(parent1, parent2);
  const babyStats = previewBabyStats(parent1, parent2, babyCreatureType);
  const babyTraits = previewBabyTraits(parent1, parent2, babyRank);

  const incubationDuration = customDuration || 10 * 60 * 1000; // 10 minutes default
  const createdAt = Date.now();

  const egg: BreedingEgg = {
    id: `egg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    parent1Id: parent1.id,
    parent2Id: parent2.id,
    babyCreatureType,
    babyName,
    babyRank,
    babyStats,
    babyTraits,
    buffer1Id,
    buffer2Id,
    createdAt,
    incubationDuration,
    readyAt: createdAt + incubationDuration,
    isHatched: false
  };

  return egg;
}

/**
 * Load breeding eggs from localStorage
 */
export function loadBreedingEggs(): BreedingEgg[] {
  if (typeof window === "undefined") {
    return [];
  }

  const saved = localStorage.getItem("ecobio-breeding-eggs");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load breeding eggs", e);
    }
  }
  return [];
}

/**
 * Save breeding eggs to localStorage
 */
export function saveBreedingEggs(eggs: BreedingEgg[]): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem("ecobio-breeding-eggs", JSON.stringify(eggs));
  window.dispatchEvent(new CustomEvent("breeding-eggs-updated"));
}

/**
 * Add egg to storage
 */
export function addBreedingEgg(egg: BreedingEgg): void {
  const eggs = loadBreedingEggs();
  eggs.push(egg);
  saveBreedingEggs(eggs);
}

/**
 * Remove egg from storage
 */
export function removeBreedingEgg(eggId: string): void {
  const eggs = loadBreedingEggs().filter(e => e.id !== eggId);
  saveBreedingEggs(eggs);
}

/**
 * Check if egg is ready to hatch
 */
export function isEggReady(egg: BreedingEgg): boolean {
  return Date.now() >= egg.readyAt && !egg.isHatched;
}

/**
 * Get remaining time for egg (in milliseconds)
 */
export function getEggRemainingTime(egg: BreedingEgg): number {
  if (egg.isHatched) {
    return 0;
  }
  return Math.max(0, egg.readyAt - Date.now());
}

/**
 * Format remaining time for display
 */
export function formatRemainingTime(ms: number): string {
  if (ms <= 0) {
    return "Prêt";
  }

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Hatch egg and return baby creature
 */
export function hatchEgg(egg: BreedingEgg): BreededCreature {
  const baby: BreededCreature = {
    id: `baby-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: egg.babyName,
    creatureId: egg.babyCreatureType,
    creatureType: egg.babyCreatureType,
    creature: CREATURES[egg.babyCreatureType] || {},
    level: 1,
    rank: egg.babyRank,
    stats: egg.babyStats,
    currentXP: 0,
    xpToNextLevel: 100,
    feedCount: 0,
    feedStat: null,
    createdAt: Date.now(),
    traits: egg.babyTraits,
    isFavorite: false,
    breeded: true,
    parentIds: [egg.parent1Id, egg.parent2Id],
    breedDate: Date.now(),
    finalStats: {
      ...egg.babyStats,
      rank: egg.babyRank
    },
    skill: CREATURES[egg.babyCreatureType]?.skill || null,
    desc: CREATURES[egg.babyCreatureType]?.desc || ""
  };

  return baby;
}
