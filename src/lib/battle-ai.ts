/**
 * AI Logic for enemy turns and skill usage
 * Supports dual-skill system (specimen + personality)
 */

import {
  BattleCreature,
  BattleLogEntry,
  useSkill,
  executeAttack,
} from "./battle";
import { selectTargetByPosition } from "./battle-multi";

/**
 * Determine if skill should be used based on creature state and context
 */
export function shouldUseSkill(
  creature: BattleCreature,
  skill: any,
  skillType: "specimen" | "personality"
): boolean {
  // Check cooldown
  const cooldownKey = `${skill.name}_${skillType}_${creature.name}`;
  const currentCooldown = creature.skillCooldowns[cooldownKey];
  if (currentCooldown !== undefined && currentCooldown > 0) {
    return false; // Skill on cooldown
  }

  return true;
}

/**
 * Choose best skill (specimen or personality) based on AI strategy
 */
export function chooseBestSkillForAI(
  creature: BattleCreature
): { skill: any; type: "specimen" | "personality" } | null {
  const specimenSkill = creature.creature.specimenSkill;
  const personalitySkill = creature.creature.personalitySkill;

  const specimenAvailable = specimenSkill && shouldUseSkill(creature, specimenSkill, "specimen");
  const personalityAvailable = personalitySkill && shouldUseSkill(creature, personalitySkill, "personality");

  if (!specimenAvailable && !personalityAvailable) {
    return null;
  }

  // AI strategy: 50% chance to use skill when available
  if (Math.random() > 0.50) {
    return null;
  }

  // Choose based on current HP and skill types
  const hpPercent = creature.currentHP / creature.stats.hp;
  const isLowHP = hpPercent < 0.30;
  const isCriticalHP = hpPercent < 0.15;

  if (specimenAvailable && personalityAvailable) {
    // Both available: smart choice
    if (isCriticalHP) {
      // Critical: Use any heal/sustain skill first
      if (personalitySkill.effect === "heal") {
        return { skill: personalitySkill, type: "personality" };
      }
      if (specimenSkill.effect === "heal") {
        return { skill: specimenSkill, type: "specimen" };
      }
    }

    if (isLowHP) {
      // Low HP: Prefer defensive/support skills
      if (personalitySkill.effect === "heal" || personalitySkill.effect === "defense") {
        return { skill: personalitySkill, type: "personality" };
      }
      return { skill: specimenSkill, type: "specimen" };
    }

    // Healthy: Prefer offensive skills
    if (specimenSkill.effect === "attack" || specimenSkill.effect === "aoe_damage") {
      return { skill: specimenSkill, type: "specimen" };
    }
    return { skill: personalitySkill, type: "personality" };
  } else if (specimenAvailable) {
    return { skill: specimenSkill, type: "specimen" };
  } else if (personalityAvailable) {
    return { skill: personalitySkill, type: "personality" };
  }

  return null;
}

/**
 * Execute AI turn: choose to use skill or attack
 */
export function executeAITurn(
  attacker: BattleCreature,
  defender: BattleCreature,
  log: BattleLogEntry[]
): void {
  const skillChoice = chooseBestSkillForAI(attacker);

  if (skillChoice) {
    // Use skill
    const success = useSkill(
      attacker,
      log,
      defender,
      skillChoice.type
    );

    if (!success) {
      // Skill failed to use, fallback to attack
      executeAttack(attacker, defender, log);
    }
  } else {
    // No usable skill or chose not to use it, attack normally
    executeAttack(attacker, defender, log);
  }
}
