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
    skill: {
      name: "Toxin Mutagène",
      description: "ATK +40% pendant 3 tours (forme mutante agressive)",
      effect: "attack",
      value: 0.40,
      duration: 3,
      cooldown: 3,
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

// Standard base stats for all creatures (sandbox system)
export const STANDARD_BASE_STATS = {
  hp: 100,
  attack: 50,
  defense: 50,
  speed: 50,
  crit: 10
};
