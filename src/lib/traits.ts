/**
 * ÉcoBio Trait System - Simplified to 6 Stat Boost Traits
 * All traits provide level-dependent stat scaling
 */

import { Rank } from "./database";

export type StatBoostType = "hp" | "attack" | "defense" | "speed" | "crit" | "random";

export interface StatBoostTrait {
  id: string;
  name: string;
  description: string;
  emoji: string;
  statBoosts: {
    stat: StatBoostType;
    valuePerLevel: number; // % boost per level (e.g., 0.006 for +0.6% per level)
  }[];
  statPenalties?: {
    stat: StatBoostType;
    valuePerLevel: number; // % penalty per level (negative)
  }[];
  weight?: number; // Weighted probability (integer, sum to 100)
}

/**
 * 6 Stat Boost Traits - All ranks can use these
 * Weights: 18 each for normal traits (90% total), 10 for Destin (10%)
 */
export const TRAITS: Record<string, StatBoostTrait> = {
  vitalite: {
    id: "vitalite",
    name: "Vitalité",
    description: "+0.6% HP par niveau",
    emoji: "🧡",
    statBoosts: [{ stat: "hp", valuePerLevel: 0.006 }],
    weight: 18,
  },

  puissance: {
    id: "puissance",
    name: "Puissance",
    description: "+0.6% ATK par niveau",
    emoji: "⚔️",
    statBoosts: [{ stat: "attack", valuePerLevel: 0.006 }],
    weight: 18,
  },

  carapace: {
    id: "carapace",
    name: "Carapace",
    description: "+0.6% DEF par niveau",
    emoji: "🛡️",
    statBoosts: [{ stat: "defense", valuePerLevel: 0.006 }],
    weight: 18,
  },

  vitesse: {
    id: "vitesse",
    name: "Vitesse",
    description: "+0.6% VIT par niveau",
    emoji: "💨",
    statBoosts: [{ stat: "speed", valuePerLevel: 0.006 }],
    weight: 18,
  },

  precision: {
    id: "precision",
    name: "Précision",
    description: "+0.6% CRIT par niveau",
    emoji: "🎯",
    statBoosts: [{ stat: "crit", valuePerLevel: 0.006 }],
    weight: 18,
  },

  destin: {
    id: "destin",
    name: "Destin",
    description: "+0.6% sur une stat RANDOM à chaque niveau",
    emoji: "🌑",
    statBoosts: [{ stat: "random", valuePerLevel: 0.006 }],
    weight: 10, // Rarer: 10% vs 18%
  },
};

/**
 * Trait slots per rank (now simplified to fixed slots)
 */
export const RANK_TRAIT_SLOTS: Record<Rank, number> = {
  E: 1,
  D: 1,
  C: 1,
  B: 1,
  A: 1,
  S: 1,
  "S+": 1,
};

/**
 * Get trait slot count for a rank
 */
export function getTraitSlotCount(rank: Rank): number {
  return RANK_TRAIT_SLOTS[rank] || 1;
}

/**
 * Roll random traits for a creature using weighted probability
 * @param rank Creature's rank (all ranks get same trait pool)
 * @param excludeTraits Trait IDs to exclude (for deduplication)
 * @returns Array of trait IDs
 */
export function rollRandomTraits(rank: Rank, excludeTraits: string[] = []): string[] {
  const numSlots = getTraitSlotCount(rank);
  const availableTraits = Object.values(TRAITS).filter(t => !excludeTraits.includes(t.id));
  const selectedTraits: string[] = [];

  for (let i = 0; i < numSlots; i++) {
    if (availableTraits.length === 0) {
      break;
    }

    // Calculate total weight
    const totalWeight = availableTraits.reduce((sum, trait) => sum + (trait.weight || 1), 0);

    // Weighted random selection
    let randomWeight = Math.random() * totalWeight;
    let selectedTrait: StatBoostTrait | null = null;

    for (const trait of availableTraits) {
      randomWeight -= (trait.weight || 1);
      if (randomWeight <= 0) {
        selectedTrait = trait;
        break;
      }
    }

    if (selectedTrait) {
      selectedTraits.push(selectedTrait.id);
      // Remove selected trait from available pool (no duplicates)
      const index = availableTraits.indexOf(selectedTrait);
      if (index > -1) {
        availableTraits.splice(index, 1);
      }
    }
  }

  return selectedTraits;
}

/**
 * Get all traits (for UI selection)
 */
export function getAllTraitsForRank(rank: Rank): StatBoostTrait[] {
  // All ranks have access to all 6 traits
  return Object.values(TRAITS);
}

/**
 * Get trait by ID
 */
export function getTraitById(traitId: string): StatBoostTrait | undefined {
  return TRAITS[traitId];
}

/**
 * Get multiple traits by IDs
 */
export function getTraitsByIds(traitIds: string[]): StatBoostTrait[] {
  return traitIds
    .map(id => getTraitById(id))
    .filter((trait): trait is StatBoostTrait => trait !== undefined);
}

/**
 * Get random stat for Destin trait at a given level (deterministic based on level)
 */
function getRandomStatForLevel(level: number): StatBoostType {
  const stats: StatBoostType[] = ["hp", "attack", "defense", "speed", "crit"];
  const index = level % stats.length;
  return stats[index];
}

/**
 * Apply all stat boost traits to stats (for battle setup / display)
 * Returns modified stats and breakdown of bonuses/maluses
 */
export function applyTraitStatModifiers(
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    crit: number;
  },
  traitIds: string[],
  level: number
): {
  modifiedStats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    crit: number;
  };
  breakdown: {
    hpBonus: number;
    attackBonus: number;
    defenseBonus: number;
    speedBonus: number;
    critBonus: number;
  };
} {
  const traits = getTraitsByIds(traitIds);

  let hpMult = 1.0;
  let attackMult = 1.0;
  let defenseMult = 1.0;
  let speedMult = 1.0;
  let critMult = 1.0;

  for (const trait of traits) {
    // statBoosts
    for (const boost of trait.statBoosts) {
      let targetStat = boost.stat;

      // Handle Destin trait (Random stat per level)
      if (targetStat === "random") {
        targetStat = getRandomStatForLevel(level);
      }

      const multiplier = 1.0 + (level - 1) * boost.valuePerLevel;

      switch (targetStat) {
        case "hp":
          hpMult *= multiplier;
          break;
        case "attack":
          attackMult *= multiplier;
          break;
        case "defense":
          defenseMult *= multiplier;
          break;
        case "speed":
          speedMult *= multiplier;
          break;
        case "crit":
          critMult *= multiplier;
          break;
      }
    }

    // statPenalties
    for (const penalty of trait.statPenalties || []) {
      const multiplier = 1.0 + (level - 1) * penalty.valuePerLevel;

      switch (penalty.stat) {
        case "hp":
          hpMult *= multiplier;
          break;
        case "attack":
          attackMult *= multiplier;
          break;
        case "defense":
          defenseMult *= multiplier;
          break;
        case "speed":
          speedMult *= multiplier;
          break;
        case "crit":
          critMult *= multiplier;
          break;
      }
    }
  }

  return {
    modifiedStats: {
      hp: Math.max(1, Math.floor(baseStats.hp * hpMult)),
      attack: Math.max(1, Math.floor(baseStats.attack * attackMult)),
      defense: Math.max(1, Math.floor(baseStats.defense * defenseMult)),
      speed: Math.max(1, Math.floor(baseStats.speed * speedMult)),
      crit: Math.max(1, Math.floor(baseStats.crit * critMult)),
    },
    breakdown: {
      hpBonus: (hpMult - 1) * 100,
      attackBonus: (attackMult - 1) * 100,
      defenseBonus: (defenseMult - 1) * 100,
      speedBonus: (speedMult - 1) * 100,
      critBonus: (critMult - 1) * 100,
    },
  };
}

/**
 * Apply trait effects during battle
 * Simplified battle version - stat boosts are already applied via applyTraitStatModifiers
 * This function returns neutral values since all effects are passive level scaling
 */
export function applyTraits(
  traitIds: string[],
  hpPercent: number,
  stats: any
): {
  damageDealtMult: number;
  damageReceivedMult: number;
  critRateAdjustment: number;
  critMultAdjustment: number;
  dodgeAdjustment: number;
  regenPerTurn: number;
} {
  // All 6 traits are passive stat boosts applied at battle start
  // No conditional effects, AoE, or status effects
  return {
    damageDealtMult: 1.0,
    damageReceivedMult: 1.0,
    critRateAdjustment: 0,
    critMultAdjustment: 0,
    dodgeAdjustment: 0,
    regenPerTurn: 0,
  };
}
