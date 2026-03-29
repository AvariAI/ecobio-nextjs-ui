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
  // Star unlock tiers (optional reference)
  starUnlocks?: {
    1: { skillTier?: 1 };
    2: { skillTier?: 2 };
    3: { skillTier?: 3 };
    4: { passive?: string }; // Passive trait ID
    5: { ultimate?: string }; // Ultimate skill ID
  };
  // Skills assigned via personality/build system (not species-based)
  skill?: {
    name: string;
    description: string;
    effect: "defense" | "dodge" | "attack";
    value: number;
    duration: number;
    cooldown: number;
    target?: "front" | "back" | "all" | "random" | "self" | "ally";
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
      attack: 100,
      defense: 100,
      speed: 100,
      crit: 100,
    },
    desc: "Fourmi robuste avec defenses élevées",
    image: "/images/caterpillar.png",
  },
  housefly: {
    id: "housefly",
    name: "Mouche",
    rank: "E",
    baseStats: {
      hp: 500,
      attack: 100,
      defense: 100,
      speed: 100,
      crit: 100,
    },
    desc: "Insecte volant agile avec yeux composés et vol rapide",
    image: "/images/giant_fly.png", // Placeholder
  },
  honeybee: {
    id: "honeybee",
    name: "Abeille",
    rank: "E",
    baseStats: {
      hp: 500,
      attack: 100,
      defense: 100,
      speed: 100,
      crit: 100,
    },
    desc: "Abeille ouvrière avec rôle de support, boostée l'attaque ou la défense des alliés",
    image: "/images/bee.png"
  },
  spider_mutant: {
    id: "spider_mutant",
    name: "Araignée Mutante",
    rank: "E",
    baseStats: {
      hp: 500,
      attack: 100,
      defense: 100,
      speed: 100,
      crit: 100,
    },
    desc: "Créature mutante bizarre avec multiples yeux et des filaments lumineux",
    image: "/images/creatures/spider_mutant_e.png",
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
  gambleTriggerLevels?: number[];  // Levels where gamble RNG triggers (for mysterieuse)
  gambleBonusRange?: [number, number];  // Min/max bonus percentage for gamble
}

export const PERSONALITIES: Record<PersonalityType, Personality> = {
  agressive: {
    id: "agressive",
    name: "Agressive",
    emoji: "🦁",
    description: "Attacking first, brutal. No spawn bonuses. +15% ATK/level scaling",
    statModifiers: {
      hp: 1.00,
      attack: 1.00,
      defense: 1.00,
      speed: 1.00,
      crit: 1.00
    },
    scalingMultipliers: {
      hp: 0.10,
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
    description: "Protects allies first. No spawn bonuses. +15% DEF/level scaling",
    statModifiers: {
      hp: 1.00,
      attack: 1.00,
      defense: 1.00,
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
    description: "Attacks first and runs. No spawn bonuses. +15% SPD/level scaling",
    statModifiers: {
      hp: 1.00,
      attack: 1.00,
      defense: 1.00,
      speed: 1.00,
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
    description: "Gentle, caring. No spawn bonuses. +15% HP/level scaling",
    statModifiers: {
      hp: 1.00,
      attack: 1.00,
      defense: 1.00,
      speed: 1.00,
      crit: 1.00
    },
    scalingMultipliers: {
      hp: 0.15,      // +15% per level (fast scaling for HP!)
      attack: 0.05,    // +5% per level (slow)
      defense: 0.10,
      speed: 0.05,    // +5% per level (slow)
      crit: 0.05
    },
    rarity: 12     // 12% spawn chance
  },
  precise: {
    id: "precise",
    name: "Précise",
    emoji: "🎯",
    description: "Precision hunter. No spawn bonuses. +15% CRIT/level scaling",
    statModifiers: {
      hp: 1.00,
      attack: 1.00,
      defense: 1.00,
      speed: 1.00,
      crit: 1.00,
    },
    scalingMultipliers: {
      hp: 0.10,
      attack: 0.10,
      defense: 0.10,
      speed: 0.10,
      crit: 0.15     // +15% per level (fast scaling for CRIT!)
    },
    rarity: 12     // 12% spawn chance
  },
  balancee: {
    id: "balancee",
    name: "Balancee",
    emoji: "✨",
    description: "Balanced, adaptable. No spawn bonuses. +10% ALL stats/level scaling",
    statModifiers: {
      hp: 1.00,
      attack: 1.00,
      defense: 1.00,
      speed: 1.00,
      crit: 1.00,
    },
    scalingMultipliers: {
      hp: 0.10,
      attack: 0.10,
      defense: 0.10,
      speed: 0.10,
      crit: 0.10
    },
    rarity: 10     // 10% spawn chance
  },
   mysterieuse: {
    id: "mysterieuse",
    name: "Mysterieuse",
    emoji: "🌙",
    description: "Mysterious, unpredictable. No spawn bonuses. +15% to random stat EACH level",
    statModifiers: {
      hp: 1.00,
      attack: 1.00,
      defense: 1.00,
      speed: 1.00,
      crit: 1.00,
    },
    scalingMultipliers: {
      hp: 0.10,
      attack: 0.10,
      defense: 0.10,
      speed: 0.10,
      crit: 0.10
    },
    rarity: 6,      // 6% spawn chance (rare!)
    gambleTriggerLevels: [],  // Gambling happens EVERY level
    gambleBonusRange: [15, 15]  // Fixed +15% always
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

// Apply personality stat modifiers to base stats (NOT USED in sandbox mode)
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

// Apply level scaling based on personality
// Formula: scaledStat = baseStat * (1 + (level - 1) * scalingMultiplier)
export function applyLevelScaling(
  baseStats: BaseStats,
  level: number,
  personality: PersonalityType
): BaseStats {
  const personalityDef = PERSONALITIES[personality];
  const levelFactor = level - 1; // Level 1 = 0 bonus, Level 50 = 49 bonus levels

  return {
    hp: Math.floor(baseStats.hp * (1 + levelFactor * personalityDef.scalingMultipliers.hp)),
    attack: Math.floor(baseStats.attack * (1 + levelFactor * personalityDef.scalingMultipliers.attack)),
    defense: Math.floor(baseStats.defense * (1 + levelFactor * personalityDef.scalingMultipliers.defense)),
    speed: Math.floor(baseStats.speed * (1 + levelFactor * personalityDef.scalingMultipliers.speed)),
    crit: Math.floor(baseStats.crit * (1 + levelFactor * personalityDef.scalingMultipliers.crit))
  };
}

// Gamble bonus for mysterieuse personality
export interface GambleBonus {
  level: number;  // Level when triggered
  stat: keyof BaseStats;  // Which stat got the bonus
  bonusPercent: number;  // Bonus percentage (e.g., 15 for +15%)
}

// Check if gamble trigger at this level for mysterieuse
export function shouldTriggerGamble(level: number, personality: PersonalityType): boolean {
  const personalityDef = PERSONALITIES[personality];
  // Mysterieuse gambles on EVERY level
  if (personality === "mysterieuse" && level > 1) {
    return true;
  }
  // Other personalities can gamble at specific trigger levels
  return personalityDef.gambleTriggerLevels?.includes(level) || false;
}

// Generate random gamble bonus
export function generateGambleBonus(personality: PersonalityType): GambleBonus {
  const personalityDef = PERSONALITIES[personality];
  const stats: (keyof BaseStats)[] = ["hp", "attack", "defense", "speed", "crit"];
  const stat = stats[Math.floor(Math.random() * stats.length)];
  let bonusPercent: number;

  if (personality === "mysterieuse" || personalityDef.gambleBonusRange) {
    // For mysterieuse: fixed +15%
    // For others with range: random within range
    const range = personalityDef.gambleBonusRange || [15, 15];
    bonusPercent = range[0] + Math.random() * (range[1] - range[0]);
  } else {
    // Default: 10-25%
    bonusPercent = 10 + Math.random() * 15;
  }

  return {
    level: 0,  // Will be set by caller
    stat,
    bonusPercent
  };
}

// Apply gamble bonuses to scaled stats
export function applyGambleBonuses(scaledStats: BaseStats, gambleBonuses: GambleBonus[]): BaseStats {
  let result = { ...scaledStats };

  for (const bonus of gambleBonuses) {
    const multiplier = 1 + (bonus.bonusPercent / 100);
    result[bonus.stat] = Math.floor(result[bonus.stat] * multiplier);
  }

  return result;
}
