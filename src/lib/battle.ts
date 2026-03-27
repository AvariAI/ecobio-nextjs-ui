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
 * Higher speed = attacks FIRST (turn-based order)
 * @returns BattleElement[] sorted by speed DESCENDING (fastest to slowest)
 */
export function getRoundOrder(creatures: BattleElement[]): BattleElement[] {
  return [...creatures].sort((a, b) => b.creature.stats.speed - a.creature.stats.speed);
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
  attackBuff: number;
  defenseBuffTurns: number;
  dodgeBuffTurns: number;
  attackBuffTurns: number;
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

export interface BattleConfig {
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

/**
 * Calculate dodge chance based on relative speed (attacker vs defender)
 * Formula: log10((defenderSpeed + 1) / (attackerSpeed + 1)) × 100
 * Capped at 60% max dodge
 * Uses ratio rather than absolute difference for more balanced scaling
 */
export function calculateDodgeChance(
  attackerSpeed: number,
  defenderSpeed: number,
  dodgeBuff: number = 0
): number {
  if (defenderSpeed <= attackerSpeed) {
    return 0;
  }

  const speedRatio = (defenderSpeed + 1) / (attackerSpeed + 1);
  const baseChance = Math.log10(speedRatio) * 0.5; // Changed to 0.5 for lower scaling
  const totalChance = Math.min(baseChance + dodgeBuff, 0.60);
  return totalChance;
}

/**
 * Calculate damage based on attack and defense
 * Formula: attack * (attack / (attack + defense))
 */
export function calculateDamage(attacker: BattleCreature, defender: BattleCreature): number {
  const atk = attacker.stats.attack;
  const def = defender.stats.defense;

  let damage = atk * (atk / (atk + def));

  // Apply attack buff
  if (attacker.buffs.attackBuff > 0) {
    damage = damage * (1 + attacker.buffs.attackBuff);
  }

  // Apply defense buff
  if (defender.buffs.defenseBuff > 0) {
    damage = damage * (1 - defender.buffs.defenseBuff);
  }

  return Math.floor(Math.max(1, damage));
}

/**
 * Check if a skill can be used (not on cooldown)
 */
export function canUseSkill(battleCreature: BattleCreature): boolean {
  if (!battleCreature.creature.skill) {
    return false;
  }

  const skillName = battleCreature.creature.skill.name;
  const cooldownKey = `${skillName}_${battleCreature.name}`;
  const currentCooldown = battleCreature.skillCooldowns[cooldownKey];

  if (currentCooldown !== undefined && currentCooldown > 0) {
    return false;
  }

  return true;
}

/**
 * Apply skill effect
 */
export function useSkill(
  battleCreature: BattleCreature,
  log: BattleLogEntry[]
): boolean {
  if (!battleCreature.creature.skill) {
    return false;
  }

  const skill = battleCreature.creature.skill;
  const skillName = skill.name;
  const cooldownKey = `${skillName}_${battleCreature.name}`;

  if (!canUseSkill(battleCreature)) {
    return false;
  }

  if (skill.effect === "defense") {
    battleCreature.buffs.defenseBuff = skill.value;
    battleCreature.buffs.defenseBuffTurns = skill.duration;
  } else if (skill.effect === "dodge") {
    battleCreature.buffs.dodgeBuff = skill.value;
    battleCreature.buffs.dodgeBuffTurns = skill.duration;
  } else if (skill.effect === "attack") {
    battleCreature.buffs.attackBuff = skill.value;
    battleCreature.buffs.attackBuffTurns = skill.duration;
  }

  battleCreature.skillCooldowns[cooldownKey] = skill.cooldown;
  log.push({
    text: `${battleCreature.name} utilise ${skill.name}!`,
    type: "skill",
  });
  return true;
}

/**
 * Tick cooldowns and buff durations
 */
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
  if (battleCreature.buffs.attackBuffTurns > 0) {
    battleCreature.buffs.attackBuffTurns--;
    if (battleCreature.buffs.attackBuffTurns === 0) {
      battleCreature.buffs.attackBuff = 0;
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

/**
 * Execute attack and handle dodge, crit, damage
 */
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

/**
 * Check if battle is over
 */
export function isBattleOver(player: BattleCreature, enemy: BattleCreature): boolean {
  return player.currentHP <= 0 || enemy.currentHP <= 0;
}

/**
 * Get battle winner
 */
export function getBattleWinner(player: BattleCreature, enemy: BattleCreature): "player" | "enemy" | "draw" {
  if (player.currentHP <= 0 && enemy.currentHP <= 0) {
    return "draw";
  }
  if (player.currentHP <= 0) {
    return "enemy";
  }
  return "player";
}

/**
 * Create battle creature from creature template
 */
export function createBattleCreature(
  creature: Creature,
  stats: BattleStats,
  name?: string
): BattleCreature {
  return {
    creature,
    stats,
    currentHP: stats.hp,
    skillCooldowns: {},
    buffs: {
      defenseBuff: 0,
      dodgeBuff: 0,
      attackBuff: 0,
      defenseBuffTurns: 0,
      dodgeBuffTurns: 0,
      attackBuffTurns: 0,
    },
    name: name || creature.name,
  };
}

/**
 * Calculate stats with level scaling BUT NO RNG variance
 * Used for Battle page testing - pure level scaling only
 * Final = Base × LevelScale × RankMultiplier (no RNG variance)
 */
export function calculateScaledStats(
  creature: Creature,
  level: number,
  rank: Rank
): BattleStats {
  // Apply rank multiplier
  const rankMultiplier = getRankMultiplier(rank);

  // Apply level scaling only - no variance
  const hpScale = getLevelScale(level, "hp");
  const statScale = getLevelScale(level, "other");

  return {
    hp: Math.floor(creature.baseStats.hp * hpScale * rankMultiplier),
    attack: Math.floor(creature.baseStats.attack * statScale * rankMultiplier),
    defense: Math.floor(creature.baseStats.defense * statScale * rankMultiplier),
    speed: Math.floor(creature.baseStats.speed * statScale * rankMultiplier),
    crit: Math.floor(creature.baseStats.crit * statScale * rankMultiplier),
    rank,
  };
}

/**
 * Level scaling formulas
 * Level 1 = 1.0 (stats de base - PAS de scaling), Level 50 = max scaling
 * HP: Base → ~15.7x at lvl 50
 * Other stats: Base → ~8.4x at lvl 50
 */
function getLevelScale(level: number, stat: "hp" | "other"): number {
  if (level === 1) {
    return 1.0; // Level 1 = stats de base, pas de scaling
  }

  // Map level 2-50 to 0-1 scale for scaling
  const normalizedLevel = (level - 1) / 49;

  if (stat === "hp") {
    // HP scales linearly: 1.0 at lvl 1 to ~15.7 at lvl 50
    return 1.0 + normalizedLevel * 14.7;
  } else {
    // Other stats scale with sqrt: 1.0 at lvl 1 to ~8.4 at lvl 50
    return 1.0 + Math.sqrt(normalizedLevel) * 7.4;
  }
}

/**
 * Calculate final stats for a creature with level and rank
 * Final = (Base × Variance) × LevelScale
 * Unused: Rank multiplier (as per user request)
 */
export function calculateFinalStats(
  creature: Creature,
  level: number,
  rank: Rank
): BattleStats {
  // Get RNG stats with variance
  const varianceStats = generateIndividualStats(creature.baseStats, rank);

  // Apply level scaling
  const hpScale = getLevelScale(level, "hp");
  const statScale = getLevelScale(level, "other");

  return {
    hp: Math.floor(varianceStats.hp * hpScale),
    attack: Math.floor(varianceStats.attack * statScale),
    defense: Math.floor(varianceStats.defense * statScale),
    speed: Math.floor(varianceStats.speed * statScale),
    crit: Math.floor(varianceStats.crit * statScale),
    rank,
  };
}
