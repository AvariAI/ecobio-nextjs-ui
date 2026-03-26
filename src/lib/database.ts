/**
 * ÉcoBio Creature Database - Battle Overhaul
 * Simplifié: Ant et Fly seulement
 */

export type CreatureType = "Insect";
export type Rank = "E" | "D" | "C" | "B" | "A" | "S" | "S+";

export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  crit: number;
}

export interface ActiveSkill {
  name: string;
  description: string;
  effect: "defense" | "dodge";
  value: number;
  duration: number;
  cooldown: number;
}

export interface Creature {
  id: string;
  name: string;
  type: CreatureType;
  image: string;
  baseStats: BaseStats;
  desc: string;
  skill?: ActiveSkill;
}

export const RANK_MULTIPLIERS: Record<Rank, number> = {
  E: 1.0,
  D: 1.2,
  C: 1.4,
  B: 1.6,
  A: 1.8,
  S: 2.0,
  "S+": 2.2,
};

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
};

export const CREATURE_TYPES: CreatureType[] = ["Insect"];
export const RANKS: Rank[] = ["E", "D", "C", "B", "A", "S", "S+"];
