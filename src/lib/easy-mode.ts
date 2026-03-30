/**
 * ÉcoBio Easy Mode - Random Enemy Generation
 * Generates 5 random level 1 creatures for easy mode battles
 */

import { Creature } from "./database";
import { getBaseSkill } from "./skills";
import { getSpecimenSkill } from "./skills";

// Available creatures for random spawns
const AVAILABLE_CREATURES = [
  "ant", "housefly", "honeybee", "spider_mutant"
];

// Available personalities for random assignment
const AVAILABLE_PERSONALITIES = [
  "agressive",
  "protective",
  "rapide",
  "soin_leurre",
  "precise",
  "balancee",
  "mysterieuse"
] as const;

// Available traits for random assignment
const AVAILABLE_TRAITS = [
  "tank", "speedster", "crit_mastery", "dodge_mastery",
  "regenerator", "berserk", "last_stand", "swarm_mind"
];

/**
 * Generate a random personality
 */
function getRandomPersonality(): typeof AVAILABLE_PERSONALITIES[number] {
  return AVAILABLE_PERSONALITIES[Math.floor(Math.random() * AVAILABLE_PERSONALITIES.length)];
}

/**
 * Generate random traits (1-3 traits per creature)
 */
function getRandomTraits(): string[] {
  const numTraits = Math.floor(Math.random() * 3) + 1;
  const shuffled = [...AVAILABLE_TRAITS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, numTraits);
}

/**
 * Generate a random level 1 creature
 */
export function generateRandomEnemyCreature() {
  const creatureId = AVAILABLE_CREATURES[Math.floor(Math.random() * AVAILABLE_CREATURES.length)];
  const traits = getRandomTraits();

  // Get skills for this creature
  const specimenSkill = getSpecimenSkill(creatureId);
  const personality = getRandomPersonality();
  const personalitySkill = getBaseSkill(personality);

  // Base stats (E rank) from database
  const baseStats = {
    hp: 100,
    attack: 20,
    defense: 20,
    speed: 15,
    crit: 10,
  };

  // Calculate RNG variance (E rank data)
  const varianceStat = (base: number, min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const varianceStats = {
    hp: varianceStat(baseStats.hp, 90, 110),
    attack: varianceStat(baseStats.attack, 18, 22),
    defense: varianceStat(baseStats.defense, 18, 22),
    speed: varianceStat(baseStats.speed, 13, 17),
    crit: varianceStat(baseStats.crit, 8, 12),
  };

  // Generate unique ID
  const uniqueId = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    id: uniqueId,
    name: `${creatureId.substring(0, 1).toUpperCase()}${creatureId.substring(1)} ${Math.floor(Math.random() * 999) + 1}`,
    baseStats: {
      hp: varianceStats.hp,
      attack: varianceStats.attack,
      defense: varianceStats.defense,
      speed: varianceStats.speed,
      crit: varianceStats.crit,
    },
    rank: "E",
    desc: "Random enemy from easy mode",
    specimenSkill,
    personalitySkill,
    level: 1,
    currentXP: 0,
    xpToNextLevel: 10,
    stars: 0,
    levelHistory: [],
    traits,
  } as unknown as Creature;
}

/**
 * Generate a random enemy team of 5 level 1 creatures
 */
export function generateRandomEnemyTeam(): Array<{
  creatureTemplate: string;
  stats: any;
  name: string;
  traits?: string[];
}> {
  const enemies = [];

  for (let i = 0; i < 5; i++) {
    const creature = generateRandomEnemyCreature() as any;
    enemies.push({
      creatureTemplate: creature.creatureId || creature.name.split(" ")[0],
      stats: {
        ...creature.baseStats,
        rank: creature.rank,
      },
      name: creature.name,
      traits: creature.traits,
    });
  }

  return enemies;
}
