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
  getBuffExpirationMessages,
  BattleTeam,  // Import BattleTeam from battle.ts
  hasTaunt,
} from "./battle";

export type TeamSize = 1 | 3 | 5;

// Re-export BattleTeam for backward compatibility
export type { BattleTeam };

/**
 * Position Structure:
 * 3v3:
 * - Front Row: Position 0
 * - Back Row: Position 1 (priority) → Position 2
 *
 * 5v5:
 * - Front Row: Position 0 → Position 1
 * - Back Row: Position 2 → Position 3 → Position 4
 */

/**
 * Determine if a position is in the front row based on team size
 */
export function isFrontRow(position: number, teamSize: TeamSize): boolean {
  if (teamSize === 3) {
    return position === 0;
  } else if (teamSize === 5) {
    return position === 0 || position === 1;
  }
  return true; // 1v1: single position treated as front row
}

/**
 * Determine if a position is in the back row based on team size
 */
export function isBackRow(position: number, teamSize: TeamSize): boolean {
  return !isFrontRow(position, teamSize);
}

/**
 * Get front row positions for a given team size
 */
export function getFrontRowPositions(teamSize: TeamSize): number[] {
  if (teamSize === 3) return [0];
  if (teamSize === 5) return [0, 1];
  return [0]; // 1v1
}

/**
 * Get back row positions for a given team size
 */
export function getBackRowPositions(teamSize: TeamSize): number[] {
  if (teamSize === 3) return [1, 2];
  if (teamSize === 5) return [2, 3, 4];
  return [];
}

/**
 * Get alive creatures in front row (sorted by position priority)
 */
export function getFrontRowAlive(team: BattleTeam, teamSize: TeamSize): BattleCreature[] {
  const frontPositions = getFrontRowPositions(teamSize);
  return team.creatures
    .filter(c => c.currentHP > 0 && c.position !== undefined && frontPositions.includes(c.position))
    .sort((a, b) => (a.position || 0) - (b.position || 0)); // Lower position = higher priority
}

/**
 * Get alive creatures in back row (sorted by position priority)
 */
export function getBackRowAlive(team: BattleTeam, teamSize: TeamSize): BattleCreature[] {
  const backPositions = getBackRowPositions(teamSize);
  return team.creatures
    .filter(c => c.currentHP > 0 && c.position !== undefined && backPositions.includes(c.position))
    .sort((a, b) => (a.position || 0) - (b.position || 0)); // Lower position = higher priority
}

/**
 * Select target based on position-aware targeting rules
 * Priority: Front row > Back row, with position index priority within row
 */
export function selectTargetByPosition(
  attacker: BattleCreature,
  targetTeam: BattleTeam,
  teamSize: TeamSize,
  targetType: "front" | "back" | "all" | "random" | "self" | "ally" = "front"
): BattleCreature | null {
  const allAlive = targetTeam.creatures.filter(c => c.currentHP > 0);
  if (allAlive.length === 0) return null;

  // Self targeting returns null (handled by useSkill directly)
  if (targetType === "self") return null;

  // Ally targeting selects a random alive ally
  if (targetType === "ally") {
    return allAlive[Math.floor(Math.random() * allAlive.length)];
  }

  // TAUNT PRIORITY: If any enemy has taunt, target them first
  // This overrides normal position-based targeting (including back-row targeting)
  const tauntedCreatures = allAlive.filter(c => hasTaunt(c));
  if (tauntedCreatures.length > 0) {
    // Random taunted creature (if multiple have taunt)
    return tauntedCreatures[Math.floor(Math.random() * tauntedCreatures.length)];
  }

  // If targeting specifically back row, skip front row check
  if (targetType === "back") {
    const backRowAlive = getBackRowAlive(targetTeam, teamSize);
    if (backRowAlive.length > 0) {
      return backRowAlive[0]; // Return highest priority in back row
    }
    // Fallback to front row if back row empty
    const frontRowAlive = getFrontRowAlive(targetTeam, teamSize);
    return frontRowAlive.length > 0 ? frontRowAlive[0] : null;
  }

  // AOE targeting: return a representative target (first alive)
  // The actual AOE effect should handle applying to all targets
  if (targetType === "all") {
    return allAlive[0]; // Return first alive as representative
  }

  // Default front-row priority targeting
  if (targetType === "front" || targetType === "random") {
    // Check front row first
    const frontRowAlive = getFrontRowAlive(targetTeam, teamSize);
    if (frontRowAlive.length > 0) {
      return frontRowAlive[0]; // Return highest priority (lowest position index)
    }

    // If front row wiped, target back row
    const backRowAlive = getBackRowAlive(targetTeam, teamSize);
    return backRowAlive.length > 0 ? backRowAlive[0] : null;
  }

  // Random target from all alive
  return allAlive[Math.floor(Math.random() * allAlive.length)];
}

/**
 * Switch positions of two creatures within a team
 * Consumes entire turn (no attack, no skill use)
 */
export function switchPositions(
  team: BattleTeam,
  creatureA: BattleCreature,
  creatureB: BattleCreature,
  log: BattleLogEntry[]
): boolean {
  if (creatureA.position === undefined || creatureB.position === undefined) {
    return false; // Both creatures must have positions
  }

  // Swap positions
  const tempPos = creatureA.position;
  creatureA.position = creatureB.position;
  creatureB.position = tempPos;

  log.push({
    text: `🔄 ${creatureA.name} et ${creatureB.name} ont échangé de position!`,
    type: "info",
  });

  return true;
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
 * @param teamSize Team size (for position calculations)
 * @returns Updated battle log entries
 */
export function executeCreatureTurn(
  activeCreature: BattleCreature,
  playerTeam: BattleTeam,
  enemyTeam: BattleTeam,
  isAuto: boolean = false,
  teamSize: TeamSize = 3
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

  // Log buff expirations
  const expiredBuffs = getBuffExpirationMessages(activeCreature);
  if (expiredBuffs.length > 0) {
    const buffNames = expiredBuffs.join(", ");
    log.push({
      text: `✨ Buff expiré sur ${activeCreature.name}: ${buffNames}`,
      type: "info",
    });
  }

  // For auto-play (AI), choose an action with position-aware targeting
  if (isAuto) {
    const targetTeam = isPlayerCreature ? enemyTeam : playerTeam;
    const allyTeam = isPlayerCreature ? playerTeam : enemyTeam;

    // AI uses skill 30% of the time when available
    let usedSkill = false;
    if (activeCreature.creature.skill && canUseSkill(activeCreature)) {
      if (Math.random() < 0.3) {
        const skill = activeCreature.creature.skill;
        const targetType = skill.target || "front";

        // Handle different skill targeting modes
        if (targetType === "all") {
          useSkill(activeCreature, log);
          usedSkill = true;
          // Apply skill effect to all enemies if it's a damage skill
          // (This is a placeholder - actual damage-all logic would need skill effect types)
        } else if (targetType === "self") {
          // Self-buff skill
          useSkill(activeCreature, log, activeCreature, undefined, allyTeam, allyTeam, playerTeam, enemyTeam);
          usedSkill = true;
        } else if (skill.effect === "special" && skill.name === "Roue du Destin") {
          // Roue du Destin: target allies randomly or strategically (level 5)
          useSkill(activeCreature, log, activeCreature, undefined, allyTeam, allyTeam, playerTeam, enemyTeam);
          usedSkill = true;
        } else if (skill.name === "Miroir des Âmes") {
          // Miroir des Âmes: target enemy team specifically (swap buffs with most buffed enemy)
          const enemyTarget = selectTargetByPosition(activeCreature, targetTeam, teamSize, "random");
          if (enemyTarget) {
            useSkill(activeCreature, log, enemyTarget, undefined, targetTeam, enemyTeam, playerTeam, enemyTeam);
            usedSkill = true;
          }
        } else if (skill.name === "Assaut Rapide") {
          // Assaut Rapide: target enemy team specifically (never allies)
          const enemyTarget = selectTargetByPosition(activeCreature, targetTeam, teamSize, "random");
          if (enemyTarget) {
            useSkill(activeCreature, log, enemyTarget, undefined, targetTeam, enemyTeam, playerTeam, enemyTeam);
            usedSkill = true;
          }
        } else if (skill.effect === "heal" || skill.effect === "defense" || skill.effect === "dodge" || skill.effect === "speed") {
          // Support/heal skill - target allies
          const targetAlly = selectTargetByPosition(activeCreature, allyTeam, teamSize, targetType);
          if (targetAlly) {
            useSkill(activeCreature, log, targetAlly, undefined, allyTeam, allyTeam, playerTeam, enemyTeam);
            usedSkill = true;
          } else {
            // Fallback to self if no allies available
            useSkill(activeCreature, log, activeCreature, undefined, allyTeam, allyTeam, playerTeam, enemyTeam);
            usedSkill = true;
          }
        } else {
          // Offensive skill (including "random", "front", "back") - target enemies
          const target = selectTargetByPosition(activeCreature, targetTeam, teamSize, targetType);
          if (target) {
            useSkill(activeCreature, log, target, undefined, targetTeam, enemyTeam, playerTeam, enemyTeam);
            usedSkill = true;
          }
        }
      }
    }

    if (!usedSkill) {
      // Attack with position-aware targeting (front row priority)
      const target = selectTargetByPosition(activeCreature, targetTeam, teamSize, "front");
      if (target) {
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
 * Automatically assigns positions based on order in array
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
  const creatures = creatureConfigs.map((config, index) =>
    createBattleCreature(
      config.creatureTemplate,
      config.stats,
      config.name,
      config.traits,
      index // Position is assigned based on array order
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
