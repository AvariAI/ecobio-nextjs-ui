/**
 * ÉcoBio Battle System - Overhaul Version
 * With Ant/Fly mechanics, dodge, crit, skills, cooldowns, RNG, rarity
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

/**
 * Get variance range by rank (corrected per user requirements)
 * E: ±10% (0.80-1.10)
 * D: ±15% (0.85-1.15)
 * C: ±20% (0.90-1.20)
 * B: ±25% (0.95-1.25) - mutants avec floor 0.95 minimum
 * A: +10% à +30% (1.10-1.40) - épiques avec floor 1.10 minimum
 * S: +15% à +35% (1.15-1.50) - légendaires puissants
 * S+: +20% à +40% (1.20-1.60) - ultra légendaires
 */
export function getVarianceRange(rank: Rank): [number, number] {
  const ranges: Record<Rank, [number, number]> = {
    E: [0.80, 1.10],         // ±10%
    D: [0.85, 1.15],         // ±15%
    C: [0.90, 1.20],         // ±20%
    B: [0.95, 1.25],         // ±25% avec floor 0.95 minimum
    A: [1.10, 1.40],         // +10% à +30%
    S: [1.15, 1.50],         // +15% à +35%
    "S+": [1.20, 1.60],       // +20% à +40%
  };
  return ranges[rank];
}

/**
 * Generate RNG individual stats with rank-based variance
 * E: ±10% (0.90-1.10), D: ±15% (0.85-1.15), C: ±20% (0.90-1.20)
 * B: ±25% (0.75-1.25) - Rare outliers with negatives allowed
 * A: +10% à +30% (1.10-1.40) - Epics with floor
 * S: +15% à +35% (1.15-1.50)
 * S+: +20% à +40% (1.20-1.60) - Legendaries
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
    hp: Math.max(1, Math.floor(baseStats.hp * rankMult)),
    attack: Math.max(1, Math.floor(baseStats.attack * rankMult)),
    defense: Math.max(1, Math.floor(baseStats.defense * rankMult)),
    speed: Math.max(1, Math.floor(baseStats.speed * rankMult)),
    crit: Math.max(1, Math.floor(baseStats.crit * rankMult)),
    rank,
  };
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

  // Level 1 → ×1.0, Level 50 → ×2.0 (power multiplier)
  const levelMult = 1 + ((level - 1) / 49);

  // Level scaling: (1 + (level - 1) × coeff) so Level 1 = 1.0
  const hpScale = 1 + (level - 1) * 0.3;
  const statScale = 1 + (level - 1) * 0.16;

  const hp = Math.floor(
    creature.baseStats.hp * hpScale * levelMult * rankMult
  );

  const attack = Math.floor(
    creature.baseStats.attack * statScale * levelMult * rankMult
  );
  const defense = Math.floor(
    creature.baseStats.defense * statScale * levelMult * rankMult
  );
  const speed = Math.floor(
    creature.baseStats.speed * statScale * levelMult * rankMult
  );

  const crit = Math.floor(
    creature.baseStats.crit * statScale * levelMult * rankMult
  );

  return {
    hp: Math.max(1, hp),
    attack: Math.max(1, attack),
    defense: Math.max(1, defense),
    speed: Math.max(1, speed),
    crit: Math.max(1, crit),
    rank,
  };
}

/**
 * Calculate damage with percentage-based defense reduction
 * Damage = (ATK × 1.5) × (1 - DEF / 250)
 * Capped at 50% reduction (DEF 125)
 */
export function calculateDamage(attacker: BattleCreature, defender: BattleCreature): number {
  const baseDamage = attacker.stats.attack * 1.5;
  const defense = defender.stats.defense * (1 + defender.buffs.defenseBuff);
  const reduction = defense / 250;
  const damage = baseDamage * (1 - Math.min(0.5, reduction));
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
