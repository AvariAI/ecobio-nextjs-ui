/**
 * ÉcoBio Creature Database
 */

export type CreatureType = "Insect" | "Arachnid" | "Hybrid";

export type DamageType = "normal" | "grass" | "water" | "ground" | "air" | "all";

export interface BaseStats {
  hp: number;
  attack: number;
  speed: number;
}

export interface TypeBonus {
  [key: string]: number;
}

export interface Creature {
  id: string;
  name: string;
  type: CreatureType;
  image: string;
  baseStats: BaseStats;
  typeBonus: TypeBonus;
  desc: string;
}

export const CREATURES: Record<string, Creature> = {
  mantis: {
    id: "mantis",
    name: "Praying Mantis",
    type: "Insect",
    image: "/ecobio-nextjs-ui/images/mantis.png",
    baseStats: { hp: 60, attack: 75, speed: 70 },
    typeBonus: { grass: 1.5, water: 1.2 },
    desc: "Ambush predator with serrated claws",
  },
  wolf_spider: {
    id: "wolf_spider",
    name: "Wolf Spider",
    type: "Arachnid",
    image: "/ecobio-nextjs-ui/images/wolf_spider.png",
    baseStats: { hp: 50, attack: 50, speed: 75 },
    typeBonus: { ground: 1.5 },
    desc: "Fast ground hunter with keen senses",
  },
  caterpillar: {
    id: "caterpillar",
    name: "Venomous Caterpillar",
    type: "Insect",
    image: "/ecobio-nextjs-ui/images/caterpillar.png",
    baseStats: { hp: 80, attack: 60, speed: 25 },
    typeBonus: { grass: 1.5, ground: 1.3 },
    desc: "Poison-spined larva with potent venom",
  },
  giant_fly: {
    id: "giant_fly",
    name: "Giant Fly",
    type: "Insect",
    image: "/ecobio-nextjs-ui/images/giant_fly.png",
    baseStats: { hp: 45, attack: 55, speed: 90 },
    typeBonus: { air: 1.5 },
    desc: "Aerial scout with translucent wings",
  },
  hybrid_mantis: {
    id: "hybrid_mantis",
    name: "Morpho-Mantis Hybrid",
    type: "Hybrid",
    image: "/ecobio-nextjs-ui/images/mantis.png", // Fallback for now
    baseStats: { hp: 120, attack: 130, speed: 95 },
    typeBonus: { all: 1.5 },
    desc: "Fusion creature with supreme abilities",
  },
};

export const DAMAGE_TYPES: DamageType[] = ["normal", "grass", "water", "ground", "air"];
export const CREATURE_TYPES: CreatureType[] = ["Insect", "Arachnid", "Hybrid"];
