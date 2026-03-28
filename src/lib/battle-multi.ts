/**
 * ÉcoBio Multi-Creature Battle System - Extensions for 3v3 and 5v5
 * Builds on battle.ts to support team battles
 */

import {
  BattleCreature,
  BattleElement,
  BattleLogEntry,
  executeAttack,
  useSkill,
  tickCooldownsAndBuffs,
  tickStatusEffects,
  applyTraitRegeneration,
  applyStatusEffects,
  getEffectiveSpeed,
  createBattleCreature,
} from "./battle";

export type TeamSize = 1 | 3 | 5;

export interface BattleTeam {
  creatures: BattleCreature[];
  teamId: "player" | "enemy";
}

/**
 * Check if a battle is over
 * @param playerTeam Player's team
 * @param enemyTeam Enemy's team
 * @returns true if all creatures on one team are dead
 */
export function isTeamBattleOver(playerTeam: BattleTeam, enemyTeam: BattleTeam): boolean {
  const playerAlive = playerTeam.creatures.some(c => c.currentHP > 0);
  const enemyAlive = enemyTeam.creatures.some(c => c.currentHP > 0);
  return !playerAlive || !enemyAlive;
}

/**
 * Get the winner of a team battle
 */
export function getTeamBattleWinner(playerTeam: BattleTeam, enemyTeam: BattleTeam): "player" | "enemy" | "draw" {
  const playerAlive = playerTeam.creatures.some(c => c.currentHP > 0);
  const enemyAlive = enemyTeam.creatures.some(c => c.currentHP > 0);

  if (!playerAlive && !enemyAlive) return "draw";
  if (!playerAlive) return "enemy";
  return "player";
}

/**
 * Get all active creatures from both teams in round order
 */
export function getAllBattleElements(playerTeam: BattleTeam, enemyTeam: BattleTeam): BattleElement[] {
  const playerElements: BattleElement[] = playerTeam.creatures.map(c => ({
    creature: c,
    team: "player",
    name: c.name,
  }));

  const enemyElements: BattleElement[] = enemyTeam.creatures.map(c => ({
    creature: c,
    team: "enemy",
    name: c.name,
  }));

  return [...playerElements, ...enemyElements];
}

/**
 * Execute a single turn for a creature
 * @param activeCreature The creature whose turn it is
 * @param playerTeam Player's team
 * @param enemyTeam Enemy's team
 * @param isAuto Whether to auto-play enemy moves
 * @returns Updated battle log entries
 */
export function executeCreatureTurn(
  activeCreature: BattleCreature,
  playerTeam: BattleTeam,
  enemyTeam: BattleTeam,
  isAuto: boolean = false
): BattleLogEntry[] {
  const log: BattleLogEntry[] = [];
  const isPlayerCreature = playerTeam.creatures.includes(activeCreature);
  const turnLabel = isPlayerCreature ? "Joueur" : "Ennemi";

  log.push({ text: `--- Tour de ${activeCreature.name} (${turnLabel}) ---`, type: "info" });

  // Apply status effects at start of turn (check for stun)
  const turnSkipped = applyStatusEffects(activeCreature, log);

  if (turnSkipped) {
    log.push({ text: `💫 ${activeCreature.name} est étourdi, tour sauté!`, type: "info" });
    return log;
  }

  // Apply trait regeneration to all creatures at start of each turn
  const allCreatures = [...playerTeam.creatures, ...enemyTeam.creatures];
  for (const creature of allCreatures) {
    if (creature.currentHP > 0) {
      applyTraitRegeneration(creature, log);
    }
  }

  // Tick cooldowns and status effects for the active creature
  tickCooldownsAndBuffs(activeCreature);
  tickStatusEffects(activeCreature, log);

  // For auto-play (AI), choose an action
  if (isAuto) {
    // Simple AI: Use skill if available and beneficial, otherwise attack
    let usedSkill = false;
    if (activeCreature.creature.skill && canUseSkill(activeCreature)) {
      // Use skill 30% of the time when available
      if (Math.random() < 0.3) {
        useSkill(activeCreature, log);
        usedSkill = true;
      }
    }

    if (!usedSkill) {
      // Attack the first alive enemy
      const enemies = isPlayerCreature ? enemyTeam.creatures : playerTeam.creatures;
      const aliveEnemies = enemies.filter(e => e.currentHP > 0);
      
      if (aliveEnemies.length > 0) {
        const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
        executeAttack(activeCreature, target, log);
      }
    }
  }

  return log;
}

/**
 * Check if a skill can be used
 */
export function canUseSkill(creature: BattleCreature): boolean {
  if (!creature.creature.skill) return false;
  
  const skill = creature.creature.skill;
  const cooldownKey = `${skill.name}_${creature.name}`;
  const currentCooldown = creature.skillCooldowns[cooldownKey];
  
  return currentCooldown === undefined || currentCooldown <= 0;
}

/**
 * Create a battle team from creature templates with given size
 */
export function createBattleTeam(
  creatureConfigs: Array<{
    creatureTemplate: any;
    stats: any;
    name: string;
    traits?: string[];
  }>,
  teamId: "player" | "enemy"
): BattleTeam {
  const creatures = creatureConfigs.map(config =>
    createBattleCreature(
      config.creatureTemplate,
      config.stats,
      config.name,
      config.traits
    )
  );

  return {
    creatures,
    teamId,
  };
}

/**
 * Validate that a team has the correct number of creatures
 */
export function validateTeamSize(
  team: Array<string | null>,
  expectedSize: TeamSize
): boolean {
  const selectedCreatures = team.filter(c => c !== null);
  return selectedCreatures.length === expectedSize;
}

/**
 * Get total HP percentage for a team
 */
export function getTeamHPPercentage(team: BattleTeam): number {
  const totalMaxHP = team.creatures.reduce((sum, c) => sum + c.stats.hp, 0);
  const totalCurrentHP = team.creatures.reduce((sum, c) => sum + c.currentHP, 0);
  
  if (totalMaxHP === 0) return 0;
  return (totalCurrentHP / totalMaxHP) * 100;
}

/**
 * Count alive creatures in a team
 */
export function countAliveCreatures(team: BattleTeam): number {
  return team.creatures.filter(c => c.currentHP > 0).length;
}
