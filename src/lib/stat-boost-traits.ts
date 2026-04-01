// Stat Boost Traits System - Rank-specific trait slots with level scaling
//
// DESIGN:
// - Traits are available to all ranks (unlike breeding-exclusive traits)
// - Each stat boost trait applies a level-dependent scaling multiplier
// - Higher ranks get more trait slots for more customization
// - Option C balance: 3.5% personality scaling, 0.6% trait scaling (0.5% for Équilibre)

export type StatBoostType = "hp" | "attack" | "defense" | "speed" | "crit" | "all";

export interface StatBoostTrait {
  id: string;
  name: string;
  description: string;
  statBoosts: {
    stat: StatBoostType;
    valuePerLevel: number; // % boost per level (e.g., 0.006 for +0.6% per level)
  }[];
  statPenalties?: {
    stat: StatBoostType;
    valuePerLevel: number; // % penalty per level (negative)
  }[];
  emoji: string;
}

// Stat boost traits definitions (all ranks can use)
export const STAT_BOOST_TRAITS: Record<string, StatBoostTrait> = {
  vitalite: {
    id: "vitalite",
    name: "Vitalité",
    description: "+0.6% HP par niveau",
    statBoosts: [{ stat: "hp", valuePerLevel: 0.006 }],
    emoji: "🧡",
  },

  puissance: {
    id: "puissance",
    name: "Puissance",
    description: "+0.6% ATK par niveau",
    statBoosts: [{ stat: "attack", valuePerLevel: 0.006 }],
    emoji: "⚔️",
  },

  carapace: {
    id: "carapace",
    name: "Carapace",
    description: "+0.6% DEF par niveau",
    statBoosts: [{ stat: "defense", valuePerLevel: 0.006 }],
    emoji: "🛡️",
  },

  vitesse: {
    id: "vitesse",
    name: "Vitesse",
    description: "+0.6% VIT par niveau",
    statBoosts: [{ stat: "speed", valuePerLevel: 0.006 }],
    emoji: "💨",
  },

  precision: {
    id: "precision",
    name: "Précision",
    description: "+0.6% CRIT par niveau",
    statBoosts: [{ stat: "crit", valuePerLevel: 0.006 }],
    emoji: "🎯",
  },

  mystere: {
    id: "mystere",
    name: "Mystère",
    description: "+0.6% sur une stat RANDOM à chaque niveau",
    statBoosts: [{ stat: "random", valuePerLevel: 0.006 }], // "random" stat means it changes each level
    emoji: "🌑",
  },
};

// Get stat boost trait by ID
export function getStatBoostTrait(id: string): StatBoostTrait | undefined {
  return STAT_BOOST_TRAITS[id];
}

// Get all stat boost traits (for UI selection)
export function getAllStatBoostTraits(): StatBoostTrait[] {
  return Object.values(STAT_BOOST_TRAITS);
}

// Calculate trait multiplier for a specific stat at given level
export function calculateTraitMultiplier(
  trait: StatBoostTrait,
  stat: StatBoostType,
  level: number
): number {
  const boost = trait.statBoosts.find(b => b.stat === stat);
  const penalty = trait.statPenalties?.find(p => p.stat === stat);

  let multiplier = 1.0;

  if (boost) {
    // Multiplier = 1 + (level - 1) * valuePerLevel
    // Example: level 50, 0.006 -> 1 + 49 * 0.006 = 1.294 (+29.4%)
    const totalBoost = (level - 1) * boost.valuePerLevel;
    multiplier += totalBoost;
  }

  if (penalty) {
    // Apply penalty (negative multiplier)
    const totalPenalty = (level - 1) * penalty.valuePerLevel;
    multiplier += totalPenalty;
  }

  return Math.max(0.1, multiplier); // Min 10% to prevent zero stats
}

// Get number of stat boost trait slots by rank
export function getTraitSlotsByRank(rank: string): number {
  // ALL ranks have 1 slot for now
  return 1;
}

// Get random stat for Mystère trait at a given level (deterministic based on level)
function getRandomStatForLevel(level: number): StatBoostType {
  const stats: StatBoostType[] = ["hp", "attack", "defense", "speed", "crit"];
  // Use level to determine random stat (deterministic for same level)
  const index = level % stats.length;
  return stats[index];
}

// Apply all stat boost traits to stats
export function applyStatBoostTraits(
  baseStats: { hp: number; attack: number; defense: number; speed: number; crit: number },
  traitIds: string[],
  level: number
): { hp: number; attack: number; defense: number; speed: number; crit: number } {
  const result = { ...baseStats };

  for (const traitId of traitIds) {
    const trait = getStatBoostTrait(traitId);
    if (!trait) continue;

    // Apply boosts
    for (const boost of trait.statBoosts) {
      let targetStat = boost.stat;

      // Handle Mystère trait (Random stat per level)
      if (targetStat === "random") {
        targetStat = getRandomStatForLevel(level);
      }

      const multiplier = 1.0 + (level - 1) * boost.valuePerLevel;
      switch (targetStat) {
        case "hp":
          result.hp = Math.floor(result.hp * multiplier);
          break;
        case "attack":
          result.attack = Math.floor(result.attack * multiplier);
          break;
        case "defense":
          result.defense = Math.floor(result.defense * multiplier);
          break;
        case "speed":
          result.speed = Math.floor(result.speed * multiplier);
          break;
        case "crit":
          result.crit = Math.floor(result.crit * multiplier);
          break;
        case "all":
          result.hp = Math.floor(result.hp * multiplier);
          result.attack = Math.floor(result.attack * multiplier);
          result.defense = Math.floor(result.defense * multiplier);
          result.speed = Math.floor(result.speed * multiplier);
          result.crit = Math.floor(result.crit * multiplier);
          break;
      }
    }

    // Apply penalties
    for (const penalty of trait.statPenalties || []) {
      const multiplier = 1.0 + (level - 1) * penalty.valuePerLevel;
      switch (penalty.stat) {
        case "hp":
          result.hp = Math.floor(result.hp * multiplier);
          break;
        case "attack":
          result.attack = Math.floor(result.attack * multiplier);
          break;
        case "defense":
          result.defense = Math.floor(result.defense * multiplier);
          break;
        case "speed":
          result.speed = Math.floor(result.speed * multiplier);
          break;
        case "crit":
          result.crit = Math.floor(result.crit * multiplier);
          break;
      }
    }
  }

  return result;
}
