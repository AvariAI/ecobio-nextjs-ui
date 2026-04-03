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
  // Skills: specimen (species-based) + personality (archetype-based)
  specimenSkill?: {
    name: string;
    description: string;
    effect: "defense" | "dodge" | "speed" | "attack" | "heal" | "special" | "debuff" | "aoe_damage";
    value: number;
    duration: number;
    cooldown: number;
    target?: "front" | "back" | "all" | "random" | "self" | "ally";
  };
  personalitySkill?: {
    name: string;
    description: string;
    effect: "defense" | "dodge" | "speed" | "attack" | "heal" | "special" | "debuff" | "aoe_damage";
    value: number;
    duration: number;
    cooldown: number;
    target?: "front" | "back" | "all" | "random" | "self" | "ally";
  };
  // Legacy field (deprecated - use specimenSkill/personalitySkill)
  skill?: {
    name: string;
    description: string;
    effect: "defense" | "dodge" | "speed" | "attack" | "heal" | "special" | "debuff" | "aoe_damage";
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
  ravaryn: {
    id: "ravaryn",
    name: "Ravaryn",
    rank: "E",
    baseStats: {
      hp: 500,
      attack: 100,
      defense: 100,
      speed: 100,
      crit: 100,
    },
    desc: "Ravaryn - Créature mystérieuse du monde post-apocalyptique",
    image: "/images/giant_fly.png", // Placeholder
  },
  polyops: {
    id: "polyops",
    name: "Polyops",
    rank: "E",
    baseStats: {
      hp: 500,
      attack: 100,
      defense: 100,
      speed: 100,
      crit: 100,
    },
    desc: "",
    image: "/images/creatures/polyops.png",
  },
  gravaille: {
    id: "gravaille",
    name: "Gravécaille",
    rank: "E",
    baseStats: {
      hp: 500,
      attack: 100,
      defense: 100,
      speed: 100,
      crit: 100,
    },
    desc: "",
    image: "/images/creatures/gravaille.png",
  },
  maworm: {
    id: "maworm",
    name: "Maworm",
    rank: "E",
    baseStats: {
      hp: 500,
      attack: 100,
      defense: 100,
      speed: 100,
      crit: 100,
    },
    desc: "",
    image: "/images/creatures/maworm.png",
  },
  cornegrive: {
    id: "cornegrive",
    name: "Cornegrive",
    rank: "E",
    baseStats: {
      hp: 500,
      attack: 100,
      defense: 100,
      speed: 100,
      crit: 100,
    },
    desc: "",
    image: "/images/creatures/cornegrive.png",
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

export type PersonalityType = "agressif" | "protecteur" | "rapide" | "stratège" | "précis" | "mystérieux";

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
  agressif: {
    id: "agressif",
    name: "Agressif",
    emoji: "🦁",
    description: "Attacking first, brutal. +3.5% ATK, +8% others (Option C balance)",
    statModifiers: {
      hp: 1.00,
      attack: 1.00,
      defense: 1.00,
      speed: 1.00,
      crit: 1.00
    },
    scalingMultipliers: {
      hp: 0.08,
      attack: 0.035,  // +3.5% (focus!) - Option C balance
      defense: 0.08,
      speed: 0.08,
      crit: 0.10
    },
    rarity: 25
  },
  protecteur: {
    id: "protecteur",
    name: "Protecteur",
    emoji: "🛡️",
    description: "Protects allies first. +3.5% DEF, +8% others (Option C balance)",
    statModifiers: {
      hp: 1.00,
      attack: 1.00,
      defense: 1.00,
      speed: 1.00,
      crit: 1.00
    },
    scalingMultipliers: {
      hp: 0.08,
      attack: 0.08,
      defense: 0.035,  // +3.5% (focus!) - Option C balance
      speed: 0.08,
      crit: 0.10
    },
    rarity: 20
  },
  rapide: {
    id: "rapide",
    name: "Rapide",
    emoji: "💨",
    description: "Attacks first and runs. +3.5% SPD, +8% others (Option C balance)",
    statModifiers: {
      hp: 1.00,
      attack: 1.00,
      defense: 1.00,
      speed: 1.00,
      crit: 1.00
    },
    scalingMultipliers: {
      hp: 0.08,
      attack: 0.08,
      defense: 0.08,
      speed: 0.035,  // +3.5% (focus!) - Option C balance
      crit: 0.10
    },
    rarity: 15
  },
  stratège: {
    id: "stratège",
    name: "Stratège",
    emoji: "❤️",
    description: "Support tactics, speaks to control. +3.5% HP, +8% others (Option C balance)",
    statModifiers: {
      hp: 1.00,
      attack: 1.00,
      defense: 1.00,
      speed: 1.00,
      crit: 1.00
    },
    scalingMultipliers: {
      hp: 0.035,    // +3.5% (focus!) - Option C balance
      attack: 0.08,
      defense: 0.08,
      speed: 0.08,
      crit: 0.10
    },
    rarity: 12
  },
  précis: {
    id: "précis",
    name: "Précis",
    emoji: "🎯",
    description: "Precision hunter. +3.5% CRIT, +8% others (Option C balance)",
    statModifiers: {
      hp: 1.00,
      attack: 1.00,
      defense: 1.00,
      speed: 1.00,
      crit: 1.00,
    },
    scalingMultipliers: {
      hp: 0.08,
      attack: 0.08,
      defense: 0.08,
      speed: 0.08,
      crit: 0.035    // +3.5% (focus!) - Option C balance
    },
    rarity: 12
  },

  mystérieux: {
    id: "mystérieux",
    name: "Mystérieux",
    emoji: "🌙",
    description: "Mysterious, unpredictable. +3.5% to random stat each level (Option C balance)",
    statModifiers: {
      hp: 1.00,
      attack: 1.00,
      defense: 1.00,
      speed: 1.00,
      crit: 1.00,
    },
    scalingMultipliers: {
      hp: 0.035,    // +3.5% (RANDOM stat each level)
      attack: 0.035, // +3.5% (RANDOM stat each level)
      defense: 0.035,
      speed: 0.035,
      crit: 0.035
    },
    rarity: 6,
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
  return "agressif";
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
// For mystérieux: RANDOM stat gets 3.5% scaling each level (deterministic based on level)
export function applyLevelScaling(
  baseStats: BaseStats,
  level: number,
  personality: PersonalityType
): BaseStats {
  const personalityDef = PERSONALITIES[personality];
  const levelFactor = level - 1; // Level 1 = 0 bonus, Level 50 = 49 bonus levels

  // Mystérieux: RANDOM stat gets 3.5% scaling each level
  if (personality === "mystérieux") {
    const stats: (keyof BaseStats)[] = ["hp", "attack", "defense", "speed", "crit"];
    // Deterministic random based on level (same level = same stat)
    const randomStat = stats[level % stats.length];
    
    const result = {
      hp: baseStats.hp,
      attack: baseStats.attack,
      defense: baseStats.defense,
      speed: baseStats.speed,
      crit: baseStats.crit,
    };
    
    // Apply 3.5% scaling to RANDOM stat only
    const multiplier = 1 + levelFactor * personalityDef.scalingMultipliers.hp; // All mysterieuse muls are 0.035
    result[randomStat] = Math.floor(baseStats[randomStat] * multiplier);
    
    return result;
  }

  // Normal personalities: apply scaling to each stat
  return {
    hp: Math.floor(baseStats.hp * (1 + levelFactor * personalityDef.scalingMultipliers.hp)),
    attack: Math.floor(baseStats.attack * (1 + levelFactor * personalityDef.scalingMultipliers.attack)),
    defense: Math.floor(baseStats.defense * (1 + levelFactor * personalityDef.scalingMultipliers.defense)),
    speed: Math.floor(baseStats.speed * (1 + levelFactor * personalityDef.scalingMultipliers.speed)),
    crit: Math.floor(baseStats.crit * (1 + levelFactor * personalityDef.scalingMultipliers.crit))
  };
}


