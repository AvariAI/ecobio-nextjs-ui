/**
 * ÉcoBio Battle System - Overhaul Version
 * With Ant/Fly mechanics, dodge formulas, crit system, skills, cooldowns
 */

import { Creature, BaseStats, Rank, RANK_MULTIPLIERS } from "./database";

export interface BattleStats extends BaseStats {
  rank: Rank;
}

export interface SkillCooldowns {
  [skillName: string]: number;
}

export interface ActiveBuffs {
  defenseBuff: number;
  dodgeBuff: number;
  defenseBuffTurns: number;
  dodgeBuffTurns: number;
}

export interface BattleCreature {
  creature: Creature;
  stats: BattleStats;
  currentHP: number;
  skillCooldowns: SkillCooldowns;
  buffs: ActiveBuffs;
  name: string;
}

export interface BattleLogEntry {
  text: string;
  type?: "info" | "critical" | "damage" | "victory" | "defeat" | "skill" | "dodge" | "miss";
}

export interface BattleResult {
  winner: "player" | "enemy" | "draw" | "timeout";
  rounds: number;
  playerHP: number;
  enemyHP: number;
  log: BattleLogEntry[];
}

export function getRankMultiplier(rank: Rank): number {
  return RANK_MULTIPLIERS[rank] || 1.0;
}

export function calculateFinalStats(
  creature: Creature,
  level: number,
  rank: Rank = "E"
): BattleStats {
  const rankMult = getRankMultiplier(rank);

  const hp = Math.floor(
    creature.baseStats.hp * (1 + level * 0.3) * 2.0 * rankMult
  );

  const attack = Math.floor(
    creature.baseStats.attack * (1 + level * 0.16) * 2.0 * rankMult
  );
  const defense = Math.floor(
    creature.baseStats.defense * (1 + level * 0.16) * 2.0 * rankMult
  );
  const speed = Math.floor(
    creature.baseStats.speed * (1 + level * 0.16) * 2.0 * rankMult
  );

  const crit = Math.floor(creature.baseStats.crit * rankMult);

  return {
    hp: Math.max(1, hp),
    attack: Math.max(1, attack),
    defense: Math.max(1, defense),
    speed: Math.max(1, speed),
    crit: Math.max(1, crit),
    rank,
  };
}

export function calculateDamage(attacker: BattleCreature, defender: BattleCreature): number {
  const baseDamage = attacker.stats.attack * 1.5;
  const defense = defender.stats.defense * (1 + defender.buffs.defenseBuff);
  const damage = baseDamage - defense;
  return Math.max(1, Math.floor(damage));
}

export function calculateDodgeChance(
  attackerSpeed: number,
  defenderSpeed: number,
  dodgeBuff: number = 0
): number {
  const spdDiff = attackerSpeed - defenderSpeed;
  const logValue = Math.log10(Math.abs(spdDiff) + 1);
  const dodgePercent = logValue * 0.1 + dodgeBuff;
  return Math.min(0.75, Math.max(0.0, dodgePercent));
}

export function calculateCritChance(stats: BattleStats): number {
  const score = stats.crit + stats.speed / 10;
  return score / (score + 200);
}

export function useSkill(
  battleCreature: BattleCreature,
  log: BattleLogEntry[]
): boolean {
  const skill = battleCreature.creature.skill;
  if (!skill) return false;

  const cooldownKey = skill.name;
  const currentCooldown = battleCreature.skillCooldowns[cooldownKey] || 0;

  if (currentCooldown > 0) {
    log.push({
      text: `${skill.name} en cooldown (${currentCooldown} tours restants)`,
      type: "info",
    });
    return false;
  }

  if (skill.effect === "defense") {
    battleCreature.buffs.defenseBuff = skill.value;
    battleCreature.buffs.defenseBuffTurns = skill.duration;
  } else if (skill.effect === "dodge") {
    battleCreature.buffs.dodgeBuff = skill.value;
    battleCreature.buffs.dodgeBuffTurns = skill.duration;
  }

  battleCreature.skillCooldowns[cooldownKey] = skill.cooldown;
  log.push({
    text: `${battleCreature.name} utilise ${skill.name}!`,
    type: "skill",
  });
  return true;
}

export function tickCooldownsAndBuffs(battleCreature: BattleCreature): void {
  for (const [skillName, cd] of Object.entries(battleCreature.skillCooldowns)) {
    if (cd > 0) {
      battleCreature.skillCooldowns[skillName] = cd - 1;
    }
  }

  if (battleCreature.buffs.defenseBuffTurns > 0) {
    battleCreature.buffs.defenseBuffTurns--;
    if (battleCreature.buffs.defenseBuffTurns === 0) {
      battleCreature.buffs.defenseBuff = 0;
    }
  }
  if (battleCreature.buffs.dodgeBuffTurns > 0) {
    battleCreature.buffs.dodgeBuffTurns--;
    if (battleCreature.buffs.dodgeBuffTurns === 0) {
      battleCreature.buffs.dodgeBuff = 0;
    }
  }
}

export function executeAttack(
  attacker: BattleCreature,
  defender: BattleCreature,
  log: BattleLogEntry[]
): number {
  const dodgeChance = calculateDodgeChance(
    attacker.stats.speed,
    defender.stats.speed,
    defender.buffs.dodgeBuff
  );

  if (Math.random() < dodgeChance) {
    log.push({
      text: `${defender.name} esquive l'attaque!`,
      type: "dodge",
    });
    return 0;
  }

  let damage = calculateDamage(attacker, defender);

  const critChance = calculateCritChance(attacker.stats);
  const isCrit = Math.random() < critChance;
  if (isCrit) {
    damage = Math.floor(damage * 1.5);
    log.push({
      text: `CRITICAL HIT! Dégâts: ${damage}`,
      type: "critical",
    });
  }

  defender.currentHP = Math.max(0, defender.currentHP - damage);
  log.push({
    text: `${attacker.name} attaque! Dégâts: ${damage} (${defender.name} HP: ${defender.currentHP})`,
    type: "damage",
  });

  return damage;
}
