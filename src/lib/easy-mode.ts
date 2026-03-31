/**
 * ÉcoBio Easy Mode - Random Enemy Generation
 * Uses hunting's spawnCreature() to generate 5 random level 1 creatures
 */

import { CREATURES, Rank } from "./database";
import { getBaseSkill } from "./skills";
import { getSpecimenSkill } from "./skills";

// Dummy function placeholders - actual implementation in hunting/page.tsx
// These will be replaced with real implementations
function rollRarity(): Rank {
  const ranks: Rank[] = ["E", "D", "C", "B", "A", "S", "S+"];
  // Weight towards E rank for easy mode
  const weights = [0.45, 0.30, 0.15, 0.05, 0.03, 0.01, 0.01];
  const roll = Math.random();
  let cumulative = 0;
  for (let i = 0; i < ranks.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) return ranks[i];
  }
  return "E";
}

function getVarianceRange(rank: Rank): [number, number] {
  const ranges: Record<Rank, [number, number]> = {
    "E": [0.85, 1.00],
    "D": [0.90, 1.15],
    "C": [0.90, 1.30],
    "B": [0.95, 1.50],
    "A": [1.00, 1.80],
    "S": [1.10, 2.20],
    "S+": [1.25, 2.50],
  };
  return ranges[rank];
}

function rollRandomTraits(rank: Rank): string[] {
  const allTraits = ["tank", "speedster", "crit_mastery", "dodge_mastery", "regenerator", "berserk", "last_stand", "swarm_mind"];
  const numTraits = Math.floor(Math.random() * 2) + 1; // 1-2 traits for easy mode
  return allTraits.sort(() => Math.random() - 0.5).slice(0, numTraits);
}

function generateRandomPersonality(): "agressive" | "protective" | "rapide" | "soin_leurre" | "precise" | "balancee" | "mysterieuse" {
  const personalities: Array<"agressive" | "protective" | "rapide" | "soin_leurre" | "precise" | "balancee" | "mysterieuse"> =
    ["agressive", "protective", "rapide", "soin_leurre", "precise", "balancee", "mysterieuse"];
  return personalities[Math.floor(Math.random() * personalities.length)];
}

/**
 * Generate a random creature using hunting's spawnCreature logic
 * Returns creatureTemplate compatible with battle system
 */
export function spawnEasyModeEnemy(): {
  creatureTemplate: any;
  stats: any;
  name: string;
  traits?: string[];
} {
  const creaturePool = ["ant", "housefly", "honeybee", "spider_mutant"];
  const creatureId = creaturePool[Math.floor(Math.random() * creaturePool.length)];
  const creature: any = CREATURES[creatureId];

  const rank: Rank = rollRarity();
  const [minVar, maxVar] = getVarianceRange(rank);
  const traits = rollRandomTraits(rank);

  // Variance RNG
  const hpVariance = minVar + Math.random() * (maxVar - minVar);
  const atkVariance = minVar + Math.random() * (maxVar - minVar);
  const defVariance = minVar + Math.random() * (maxVar - minVar);
  const spdVariance = minVar + Math.random() * (maxVar - minVar);
  const critVariance = minVar + Math.random() * (maxVar - minVar);

  // Stats POST-variance
  const varianceStats = {
    hp: Math.max(1, Math.floor(creature.baseStats.hp * hpVariance)),
    attack: Math.max(1, Math.floor(creature.baseStats.attack * atkVariance)),
    defense: Math.max(1, Math.floor(creature.baseStats.defense * defVariance)),
    speed: Math.max(1, Math.floor(creature.baseStats.speed * spdVariance)),
    crit: Math.max(1, Math.floor(creature.baseStats.crit * critVariance)),
    rank,
  };

  // Assign skills: specimen (species-based) + personality (archetype-based)
  const personality = generateRandomPersonality();
  const specimenSkill = getSpecimenSkill(creatureId);
  const personalitySkill = getBaseSkill(personality);

  // Convert skills to Creature format
  const convertSkill = (skill: any) => {
    if (!skill) return undefined;
    return {
      name: skill.name,
      description: skill.description,
      effect: skill.effect,
      value: skill.value,
      duration: skill.duration,
      cooldown: skill.cooldown,
      target: skill.target,
    };
  };

  const creatureTemplate = {
    ...creature,
    specimenSkill: convertSkill(specimenSkill),
    personalitySkill: convertSkill(personalitySkill),
  };

  const stats = {
    ...varianceStats,
    rank,
  };

  const name = `${creature.name} (R${rank} L1)`;

  return {
    creatureTemplate,
    stats,
    name,
    traits,
  };
}

/**
 * Generate a random enemy team of 5 level 1 creatures
 * Uses hunting's spawn logic for consistency
 */
export function generateRandomEnemyTeam(): Array<{
  creatureTemplate: any;
  stats: any;
  name: string;
  traits?: string[];
}> {
  const enemies = [];

  for (let i = 0; i < 5; i++) {
    enemies.push(spawnEasyModeEnemy());
  }

  return enemies;
}
