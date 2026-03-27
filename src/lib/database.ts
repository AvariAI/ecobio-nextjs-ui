export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  crit: number;
}

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
    image: "https://nips.im/_matrix/media/v3/download/nips.im/GYqTOrORDaNdoyJJQBXvUavR/bee.png",
    skill: {
      name: "Essaim Stimulant",
      description: "Buff random ATK ou DEF (+40%) sur un allié pendant 2 tours",
      effect: "defense",
      value: 0.40,
      duration: 2,
      cooldown: 3,
    },
  },
};

export const CREATURE_TYPES: string[] = ["Insect"];
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
