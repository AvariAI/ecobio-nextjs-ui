/**
 * ÉcoBio Battle System - Overhaul Version v2
 * Ant/Fly mechanics, dodge/crit overhaul, skills, cooldowns, RNG, rarity
 */

import { Creature, BaseStats, Rank, RANK_MULTIPLIERS } from "./database";

export interface BattleElement {
  creature: BattleCreature;
  team: "player" | "enemy" | "attacker" | "defender";
  name: string;
}

/**
 * Get round order for multiple creatures based on speed
 * Lower speed = attacks FIRST (turn-based order)
 * @returns BattleElement[] sorted by speed ASCENDING (slowest to fastest)
 */
export function getRoundOrder(creatures: BattleElement[]): BattleElement[] {
  return [...creatures].sort((a, b) => a.creature.stats.speed - b.creature.stats.speed);
}

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

/**
 * Variance ranges per rang (corrigé per user specs)
 * E: 0.75-1.10 (-25% à +10%, asymétrique, ±20% au maximum)
 * D: 0.80-1.10 (-20% à +10%, asymétrique, ±20% au maximum)
 * C: 0.85-1.15 (-15% à +15%, symétrique)
 * B: 0.90-1.20 (-10% à +20%, asymétrique, ±20% au maximum)
 * A: 1.00-1.25 (+0% à +25%, pure positif)
 * S: 1.15-1.30 (+15% à +30%, pure positif)
 * S+: 1.20-1.40 (+20% à +40%, pure positif)
 */
export function getVarianceRange(rank: Rank): [number, number] {
  const ranges: Record<Rank, [number, number]> = {
    E: [0.75, 1.10],
    D: [0.80, 1.10],
    C: [0.85, 1.15],
    B: [0.90, 1.20],
    A: [1.00, 1.25],
    S: [1.15, 1.30],
    "S+": [1.20, 1.40],
  };
  return ranges[rank];
}

/**
 * Generate RNG individual stats with rank-based variance
 * Variance symétrique autour de 1.0: fluctuation ± autour du rank default
 */
export function generateIndividualStats(
  baseStats: BaseStats,
  rank: Rank = "E"
): BattleStats {
  const rankMult = getRankMultiplier(rank);

  const [minVar, maxVar] = getVarianceRange(rank);

  // Individual variance per stat (independent)
  const hpVariance = minVar + Math.random() * (maxVar - minVar);
  const atkVariance = minVar + Math.random() * (maxVar - minVar);
  const defVariance = minVar + Math.random() * (maxVar - minVar);
  const spdVariance = minVar + Math.random() * (maxVar - minVar);
  const critVariance = minVar + Math.random() * (maxVar - minVar);

  const hp = Math.floor(baseStats.hp * (1 + hpVariance));
  const attack = Math.floor(baseStats.attack * (1 + atkVariance));
  const defense = Math.floor(baseStats.defense * (1 + defVariance));
  const speed = Math.floor(baseStats.speed * (1 + spdVariance));
  const crit = Math.floor(baseStats.crit * (1 + critVariance));

  return {
/**
 * Generate RNG individual stats with rank-based variance
 * NO rank multiplier - only variance applied
 * Final = Base × Variance
 */
export function generateIndividualStats(
  baseStats: BaseStats,
  rank: Rank = "E"
): BattleStats {
  const [minVar, maxVar] = getVarianceRange(rank);

  // Individual variance per stat (independent)
  const hpVariance = minVar + Math.random() * (maxVar - minVar);
  const atkVariance = minVar + Math.random() * (maxVar - minVar);
  const defVariance = minVar + Math.random() * (maxVar - minVar);
  const spdVariance = minVar + Math.random() * (maxVar - minVar);
  const critVariance = minVar + Math.random() * (maxVar - minVar);

  // Final = Base × Variance (NO rankMult)
  const hp = Math.floor(baseStats.hp * hpVariance);
  const attack = Math.floor(baseStats.attack * atkVariance);
  const defense = Math.floor(baseStats.defense * defVariance);
  const speed = Math.floor(baseStats.speed * spdVariance);
  const crit = Math.floor(baseStats.crit * critVariance);

  return {
    hp: Math.max(1, hp),
    attack: Math.max(1, attack),
    defense: Math.max(1, defense),
    speed: Math.max(1, speed),
    crit: Math.max(1, crit),
    rank,
  };
}

export function getRankMultiplier(rank: Rank): number {
  // Kept for compatibility but NOT used in stat calculation anymore
  return RANK_MULTIPLIERS[rank] || 1.0;
}
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

/**
 * Calculate critical strike chance from crit stat
 * CAPPED at 40% to prevent absurd crit rates at high levels
 * Formula: crit / 100, max 0.40 (40%)
 */
export function calculateCritChance(stats: BaseStats): number {
  const rawChance = stats.crit / 100;
  return Math.min(rawChance, 0.40);
}

/**
 * Calculate critical strike multiplier from crit stat
 * CAPPED at 1.75x to prevent one-shot kills
 * Formula: 1.5x + (crit / 100) * 0.25, max 1.75x
 */
export function calculateCritMultiplier(stats: BaseStats): number {
  const baseMult = 1.5;
  const bonusMult = (stats.crit / 100) * 0.25;
  return Math.min(baseMult + bonusMult, 1.75);
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
    const critMult = calculateCritMultiplier(attacker.stats);
    damage = Math.floor(damage * critMult);
    log.push({
      text: `CRITICAL HIT! Dégâts: ${damage} (${critMult.toFixed(2)}x)`,
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
