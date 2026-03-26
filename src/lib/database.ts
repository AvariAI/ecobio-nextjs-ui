/**
 * ÉcoBio Creature Database - Battle Overhaul
 */

export type CreatureType = "Insect" | "Arachnid" | "Hybrid";
export type DamageType = "normal" | "grass" | "water" | "ground" | "air" | "all";
export type Rank = "E" | "D" | "C" | "B" | "A" | "S" | "S+";

export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  crit: number; // Critical chance score
}

export interface TypeBonus {
  [key: string]: number;
}

export interface ActiveSkill {
  name: string;
  description: string;
  effect: "defense" | "dodge"; // What stat it buffs
  value: number; // +25%
  duration: number; // Turns
  cooldown: number; // Turns
}

export interface Creature {
  id: string;
  name: string;
  type: CreatureType;
  image: string;
  baseStats: BaseStats;
  typeBonus: TypeBonus;
  desc: string;
  skill?: ActiveSkill;
}

// Rank multipliers for stat scaling
export const RANK_MULTIPLIERS: Record<Rank, number> = {
  E: 1.0,
  D: 1.2,
  C: 1.4,
  B: 1.6,
  A: 1.8,
  S: 2.0,
  "S+": 2.2,
};

// Battle Overhaul Creatures - E Rank Lvl 1 Stats
export const CREATURES: Record<string, Creature> = {
  ant: {
    id: "ant",
    name: "Fourmi",
    type: "Insect",
    image: "/ecobio-nextjs-ui/images/ant.png",
    baseStats: {
      hp: 60,
      attack: 10,
      defense: 15,
      speed: 10,
      crit: 10,
    },
    typeBonus: { ground: 1.3, air: 0.7 },
    desc: "Fourmi ouvrière avec force collective et carapace résistante",
    skill: {
      name: "Carapace Renforcée",
      description: "DEF +25% pendant 2 tours",
      effect: "defense",
      value: 0.25,
      duration: 2,
      cooldown: 3,
    },
  },
  housefly: {
    id: "housefly",
    name: "Mouche",
    type: "Insect",
    image: "/ecobio-nextjs-ui/images/fly.png",
    baseStats: {
      hp: 50,
      attack: 15,
      defense: 10,
      speed: 15,
      crit: 15,
    },
    typeBonus: { air: 1.4, ground: 0.6 },
    desc: "Insecte volant agile avec yeux composés et vol rapide",
    skill: {
      name: "Esquive Aérienne",
      description: "Esquive +25% pendant 2 tours",
      effect: "dodge",
      value: 0.25,
      duration: 2,
      cooldown: 3,
    },
  },
  // Legacy creatures kept for compatibility
  mantis: {
    id: "mantis",
    name: "Praying Mantis",
    type: "Insect",
    image: "/ecobio-nextjs-ui/images/mantis.png",
    baseStats: {
      hp: 60,
      attack: 75,
      defense: 25,
      speed: 70,
      crit: 20,
    },
    typeBonus: { grass: 1.5, water: 1.2 },
    desc: "Ambush predator with serrated claws",
  },
  wolf_spider: {
    id: "wolf_spider",
    name: "Wolf Spider",
    type: "Arachnid",
    image: "/ecobio-nextjs-ui/images/wolf_spider.png",
    baseStats: {
      hp: 50,
      attack: 50,
      defense: 20,
      speed: 75,
      crit: 25,
    },
    typeBonus: { ground: 1.5 },
    desc: "Fast ground hunter with keen senses",
  },
  caterpillar: {
    id: "caterpillar",
    name: "Venomous Caterpillar",
    type: "Insect",
    image: "/ecobio-nextjs-ui/images/caterpillar.png",
    baseStats: {
      hp: 80,
      attack: 60,
      defense: 30,
      speed: 25,
      crit: 15,
    },
    typeBonus: { grass: 1.5, ground: 1.3 },
    desc: "Poison-spined larva with potent venom",
  },
  giant_fly: {
    id: "giant_fly",
    name: "Giant Fly",
    type: "Insect",
    image: "/ecobio-nextjs-ui/images/giant_fly.png",
    baseStats: {
      hp: 45,
      attack: 55,
      defense: 15,
      speed: 90,
      crit: 30,
    },
    typeBonus: { air: 1.5 },
    desc: "Aerial scout with translucent wings",
  },
  hybrid_mantis: {
    id: "hybrid_mantis",
    name: "Morpho-Mantis Hybrid",
    type: "Hybrid",
    image: "/ecobio-nextjs-ui/images/mantis.png",
    baseStats: {
      hp: 120,
      attack: 130,
      defense: 50,
      speed: 95,
      crit: 40,
    },
    typeBonus: { all: 1.5 },
    desc: "Fusion creature with supreme abilities",
  },
};

export const DAMAGE_TYPES: DamageType[] = ["normal", "grass", "water", "ground", "air"];
export const CREATURE_TYPES: CreatureType[] = ["Insect", "Arachnid", "Hybrid"];
export const RANKS: Rank[] = ["E", "D", "C", "B", "A", "S", "S+"];
