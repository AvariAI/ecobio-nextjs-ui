export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  crit: number;
}

export type SkillTargetType = "front" | "back" | "all" | "random" | "self" | "ally";

export interface Creature {
  id: string;
  name: string;
  rank: Rank;
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    crit: number;
  };
  desc: string;
  image?: string;
  skill: {
    name: string;
    description: string;
    effect: "defense" | "dodge" | "attack";
    value: number;
    duration: number;
    cooldown: number;
    target?: SkillTargetType;
  };
  // Star unlock tiers (optional reference)
  starUnlocks?: {
    1: { skillTier?: 1 };
    2: { skillTier?: 2 };
    3: { skillTier?: 3 };
    4: { passive?: string }; // Passive trait ID
    5: { ultimate?: string }; // Ultimate skill ID
  };
}

export interface CreatureType {
  id: string;
  name: string;
  description: string;
}

export type Rank = "E" | "D" | "C" | "B" | "A" | "S" | "S+";

export const CREATURES: Record<string, Creature> = {
  ant: {
    id: "ant",
    name: "Fourmi",
    rank: "E",
    baseStats: {
      hp: 500,
      attack: 50,
      defense: 150,
      speed: 50,
      crit: 50,
    },
    desc: "Fourmi robuste avec defenses élevées",
    image: "/images/caterpillar.png", // Placeholder
    skill: {
      name: "Carapace Renforcée",
      description: "DEF +50% pendant 2 tours",
      effect: "defense",
      value: 0.50,
      duration: 2,
      cooldown: 3,
      target: "self",
    },
  },
  housefly: {
    id: "housefly",
    name: "Mouche",
    rank: "E",
    baseStats: {
      hp: 250,
      attack: 100,
      defense: 50,
      speed: 100,
      crit: 100,
    },
    desc: "Insecte volant agile avec yeux composés et vol rapide",
    image: "/images/giant_fly.png", // Placeholder
    skill: {
      name: "Esquive Aérienne",
      description: "Esquive +40% pendant 2 tours",
      effect: "dodge",
      value: 0.40,
      duration: 2,
      cooldown: 3,
      target: "self",
    },
  },
  honeybee: {
    id: "honeybee",
    name: "Abeille",
    rank: "E",
    baseStats: {
      hp: 350,
      attack: 75,
      defense: 100,
      speed: 90,
      crit: 60,
    },
    desc: "Abeille ouvrière avec rôle de support, boostée l'attaque ou la défense des alliés",
    image: "/images/bee.png",
    skill: {
      name: "Nectar Energisant",
      description: "Buff ATK ou DEF (+20%) sur un allié pendant 2 tours",
      effect: "defense", // Placeholder - actual implementation would toggle based on position
      value: 0.20,
      duration: 2,
      cooldown: 3,
      target: "ally",
    },
  },
  spider_mutant: {
    id: "spider_mutant",
    name: "Araignée Mutante",
    rank: "E",
    baseStats: {
      hp: 100,      // Standard base HP
      attack: 50,   // Standard base ATK
      defense: 50,  // Standard base DEF
      speed: 50,    // Standard base SPD
      crit: 10,     // Standard base CRIT
    },
    desc: "Créature mutante bizarre avec multiples yeux et des filaments lumineux",
    image: "/images/creatures/spider_mutant_e.png",
    // Placeholder skill - will be assigned via RNG at spawn
    skill: {
      name: "To be assigned (RNG at spawn)",
      description: "Assigne via RNG first skill - build archétype",
      effect: "attack", // Placeholder
      value: 0,
      duration: 0,
      cooldown: 0,
      target: "self",
    },
  },
};

export const CREATURE_TYPES: string[] = ["Insect", "Mutant"];
export const RANKS: Rank[] = ["E", "D", "C", "B", "A", "S", "S+"];

export const RANK_MULTIPLIERS: Record<Rank, number> = {
  E: 1.0,
  D: 1.2,
  C: 1.4,
  B: 1.6,
  A: 1.8,
  S: 2.0,
  "S+": 2.2,
};

export type PersonalityType = "agressive" | "protective" | "rapide" | "soin_leurre" | "precise" | "balancee" | "mysterieuse";

export interface Personality {
  id: PersonalityType;
  name: string;
  emoji: string;
  description: string;
  statModifiers: {
    hp: number;      // Percentage modifier (e.g., 0.90 = -10%)
    attack: number;
    defense: number;
    speed: number;
    crit: number;
  };
  scalingMultipliers: {
    hp: number;      // Level scaling multiplier (e.g., 0.10 = 10% per level)
    attack: number;
    defense: number;
    speed: number;
    crit: number;
  };
  rarity: number;   // Weight for RNG pool (higher = more common)
}

export const PERSONALITIES: Record<PersonalityType, Personality> = {
  agressive: {
    id: "agressive",
    name: "Agressive",
    emoji: "🦁",
    description: "Attacking first, brutal. +20% ATK, -10% HP",
    statModifiers: {
      hp: 0.90,      // -10%
      attack: 1.20,    // +20%
      defense: 1.00,
      speed: 1.00,
      crit: 1.00
    },
    scalingMultipliers: {
      hp: 0.10,      // Standard +10% per level (but -10% from stat modifier = net 0%)
      attack: 0.15,    // +15% per level (fast scaling!)
      defense: 0.10,
      speed: 0.10,
      crit: 0.05
    },
    rarity: 25     // 25% spawn chance
  },
  protective: {
    id: "protective",
    name: "Protective",
    emoji: "🛡️",
    description: "Protects allies first. +20% DEF, -10% ATK",
    statModifiers: {
      hp: 1.00,
      attack: 0.90,    // -10%
      defense: 1.20,    // +20%
      speed: 1.00,
      crit: 1.00
    },
    scalingMultipliers: {
      hp: 0.10,
      attack: 0.05,    // +5% per level (slow)
      defense: 0.15,    // +15% per level (fast scaling!)
      speed: 0.10,
      crit: 0.05
    },
    rarity: 20     // 20% spawn chance
  },
  rapide: {
    id: "rapide",
    name: "Rapide",
    emoji: "💨",
    description: "Attacks first and runs. +20% SPD, -10% DEF",
    statModifiers: {
      hp: 0.90,      // -10%
      attack: 1.00,
      defense: 0.90,    // -10%
      speed: 1.20,    // +20%
      crit: 1.00
    },
    scalingMultipliers: {
      hp: 0.10,
      attack: 0.10,
      defense: 0.05,    // +5% per level (slow)
      speed: 0.15,    // +15% per level (fast scaling!)
      crit: 0.05
    },
    rarity: 15     // 15% spawn chance
  },
  soin_leurre: {
    id: "soin_leurre",
    name: "Soin-Leurre",
    emoji: "❤️",
    description: "Gentle, caring. +15% HP, -5% ATK, -5% SPD",
    statModifiers: {
      hp: 1.15,      // +15%
      attack: 0.95,    // -5%
      defense: 1.00,
      speed: 0.95,    // -5%
      crit: 1.00
    },
    scalingMultipliers: {
      hp: 0.15,      // +15% per level (fast scaling for HP!)
      attack: 0.05,    // -5% per level (slow)
      defense: 0.10,
      speed: 0.05,    // -5% per level (slow)
      crit: 0.05
    },
    rarity: 12     // 12% spawn chance
  },
  precise: {
    id: "precise",
    name: "Précise",
    emoji: "🎯",
    description: "Precision hunter. +15% CRIT, -10% HP",
    statModifiers: {
      hp: 0.90,      // -10%
      attack: 1.00,
      defense: 1.00,
      speed: 1.00,
      crit: 1.15,     // +15%
    },
    scalingMultipliers: {
      hp: 0.10,
      attack: 0.10,
      defense: 0.10,
      speed: 0.10,
      crit: 0.10     // +10% per level (fast scaling for crit!)
    },
    rarity: 12     // 12% spawn chance
  },
  balancee: {
    id: "balancee",
    name: "Balancee",
    emoji: "✨",
    description: "Balanced, adaptable. +5% ALL stats",
    statModifiers: {
      hp: 1.05,      // +5%
      attack: 1.05,    // +5%
      defense: 1.05,    // +5%
      speed: 1.05,    // +5%
      crit: 1.05      // +5%
    },
    scalingMultipliers: {
      hp: 0.10,
      attack: 0.10,
      defense: 0.10,
      speed: 0.10,
      crit: 0.05
    },
    rarity: 10     // 10% spawn chance
  },
  mysterieuse: {
    id: "mysterieuse",
    name: "Mysterieuse",
    emoji: "🌙",
    description: "Mysterious, unpredictable. -5% ALL stats",
    statModifiers: {
      hp: 0.95,      // -5%
      attack: 0.95,    // -5%
      defense: 0.95,    // -5%
      speed: 0.95,    // -5%
      crit: 0.95      // -5%
    },
    scalingMultipliers: {
      hp: 0.10,
      attack: 0.10,
      defense: 0.10,
      speed: 0.10,
      crit: 0.10
    },
    rarity: 6      // 6% spawn chance (rare!)
  }
};

// Generate random personality based on rarity weights
export function generateRandomPersonality(): PersonalityType {
  const personalities = Object.values(PERSONALITIES);
  const totalRarity = personalities.reduce((sum, p) => sum + p.rarity, 0);
  let random = Math.random() * totalRarity;
  
  for (const personality of personalities) {
    random -= personality.rarity;
    if (random <= 0) {
      return personality.id;
    }
  }
  
  // Fallback
  return "balancee";
}

// Apply personality stat modifiers to base stats
export function applyPersonalityStats(
  baseStats: BaseStats,
  personality: PersonalityType
): BaseStats {
  const personalityDef = PERSONALITIES[personality];
  
  return {
    hp: Math.floor(baseStats.hp * personalityDef.statModifiers.hp),
    attack: Math.floor(baseStats.attack * personalityDef.statModifiers.attack),
    defense: Math.floor(baseStats.defense * personalityDef.statModifiers.defense),
    speed: Math.floor(baseStats.speed * personalityDef.statModifiers.speed),
    crit: Math.floor(baseStats.crit * personalityDef.statModifiers.crit)
  };
}
