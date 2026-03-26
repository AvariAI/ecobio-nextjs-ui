/**
 * ÉcoBio Battle System - Overhaul Version v2
 * Ant/Fly mechanics, dodge/crit overhaul, skills, cooldowns, RNG, rarity
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
 * Get variance range by rank (symétrique autour de 1.0)
 * E: ±10% (0.90-1.10) - fluctuation autour du rank default
 * D: ±15% (0.85-1.15)
 * C: ±20% (0.80-1.20)
 * B: ±25% (0.75-1.25)
 * A: +10% à +30% (1.10-1.40) - always bonus
 * S: +15% à +35% (1.15-1.50) - always bonus
 * S+: +20% à +40% (1.20-1.60) - always bonus
 *
 * IMPORTANT: Ces variances s'appliquent SUR la valeur par défaut du rang
 * Ex: Fourmi HP 100 × rankMult (E×1.0 = 100, B×1.6 = 160)
 * puis × varianceMultiplier (E 0.90-1.10, B 0.75-1.25)
 * Résultat: E HP 90-110, B HP 120-200
 */
export function getVarianceRange(rank: Rank): [number, number] {
  const ranges: Record<Rank, [number, number]> = {
    E: [0.90, 1.10],         // ±10%
    D: [0.85, 1.15],         // ±15%
    C: [0.80, 1.20],         // ±20%
    B: [0.75, 1.25],         // ±25%
    A: [1.10, 1.40],         // +10% à +30% (seulement bonus)
    S: [1.15, 1.50],         // +15% à +35%
    "S+": [1.20, 1.60],      // +20% à +40%
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

/**
 * Calculate dodge chance - defender faster than attacker
 * If defender is slower/equal: 0% dodge (no evade)
 * If defender is faster: (speedDiff / 200) + dodgeBuff (nerfed /200)
 * - Mouche (SPD 20) vs Fourmi (SPD 10) defends: speedDiff = 10 → 5% base dodge
 * - With +40% dodge buff: 45% total dodge
 * - Level 50 (×2): Mouche 40 vs Fourmi 20 → speedDiff = 20 → 50% dodge
 */
export function calculateDodgeChance(
  attackerSpeed: number,
  defenderSpeed: number,
  dodgeBuff: number = 0
): number {
  const speedDiff = defenderSpeed - attackerSpeed;
  if (speedDiff <= 0) {
    // Defender is slower or equal speed → no natural dodge
    return Math.min(0.60, Math.max(0.0, dodgeBuff));
  }
  // Defender is faster → evade based on speed advantage (nerfed)
  const dodgePercent = speedDiff / 200 + dodgeBuff;
  return Math.min(0.60, Math.max(0.0, dodgePercent));
}

/**
 * Calculate crit chance AND crit damage multiplier
 * - Chance: crit / (crit + 200) - nerfed, less frequent (μa centrélsas)
 * - Damage: 1.3 + (crit / 100) - nerfed, smaller bonus from crit
 *
 * Examples (nerfed):
 * - Fourmi CRIT 10 → 4.76% chance, 1.40x damage
 * - Mouche CRIT 20 → 9.09% chance, 1.50x damage
 * - Level 50 CRIT 40 → 16.67% chance, 1.70x damage
 * - CRIT 100 (epic): 33.33% chance, 2.30x damage
 */
export function calculateCritChance(stats: BattleStats): number {
  return stats.crit / (stats.crit + 200);
}

export function calculateCritMultiplier(stats: BattleStats): number {
  return 1.3 + (stats.crit / 100);
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
