/**
 * ÉcoBio Battle System - Overhaul Version v2
 * Ant/Fly mechanics, dodge/crit overhaul, skills, cooldowns, RNG, rarity, traits
 */

import { Creature, BaseStats, Rank, RANK_MULTIPLIERS } from "./database";
import { applyTraits as applyTraitEffects, getTraitsByIds } from "./traits";
import { calculateCombatXP } from "./combat-xp";
import { Skill } from "./skills";
import type { Skill as SkillType } from "./skills";
import {
  getPersonalityBuff,
  PersonalityType,
  PersonalityBuff,
  SoinLeurreState,
  trackDamageForSoinLeurre,
} from "./personality-buffs";

export interface BattleElement {
  creature: BattleCreature;
  team: "player" | "enemy" | "attacker" | "defender";
  name: string;
}

export interface BattleStats extends BaseStats {
  rank: Rank;
  maxHP?: number; // For stratège buff tracking
}

export interface SkillCooldowns {
  [skillName: string]: number;
}

export interface StatModifiers {
  hpBonus: number;  // Percentage bonus from traits (e.g., 20 for +20%)
  attackBonus: number;
  defenseBonus: number;
  speedBonus: number;
  critBonus: number;
}

export enum BuffType {
  ATTACK = "attack",
  DEFENSE = "defense",
  DODGE = "dodge",  // Kept for backward compatibility
  HEAL = "heal",
  POISON = "poison",
  SLOW = "slow",
  STUN = "stun",
  SPEED = "speed",  // Speed buff (increases both turn order and dodge chance)
  TAUNT = "taunt",  // NEW: Forces enemies to target this creature first
}

export interface ActiveBuff {
  type: BuffType;
  value: number;  // Strength of the effect (e.g., 0.5 for +50%)
  turnsRemaining: number;  // Turns remaining
  sourceSkillId: string;  // ID of the skill that created this buff
  sourceCreatureId: string;  // ID of the creature that created this buff
}

export enum StatusEffectType {
  STUN = "stun",
  POISON = "poison",
  SLOW = "slow",
}

export interface StatusEffect {
  type: StatusEffectType;
  duration: number;  // Turns remaining
  value?: number;  // Effect strength (e.g., poison damage %, slow % reduction)
}

export type BuffsDictionary = { [buffId: string]: ActiveBuff };

export interface BuffsCompatibility {
  attackBuff: number;
  defenseBuff: number;
  dodgeBuff: number;
  attackBuffTurns: number;
  defenseBuffTurns: number;
  dodgeBuffTurns: number;
}

export interface BattleTeam {
  creatures: BattleCreature[];
  teamId: "player" | "enemy";
}

export interface BattleCreature {
  creature: Creature;
  stats: BattleStats;
  currentHP: number;
  skillCooldowns: SkillCooldowns;
  buffs: BuffsDictionary;  // NEW: Dictionary for buffs only
  name: string;
  traits: string[];  // Trait IDs
  baseStats?: BattleStats;  // Original stats before trait modifications
  statModifiers?: StatModifiers;  // Bonus breakdown from traits
  statusEffects: StatusEffect[];  // Active status effects (deprecated, integrated into buffs)
  attackCounter: number;  // Track attack count for "every X attacks" traits
  position?: number;  // Slot position (0-4) for multi-row battles
  logBuffExpiration?: string[];  // Buff types that expired this turn (for logging)

  // NEW: Track battle stats for XP calculation
  damageDealt: number; // Track damage dealt this battle
  kills: number; // Track kills this battle
  id: string; // Creature ID for XP mapping
  ignoreDodge?: boolean; // If true, ignore dodge for this attack (Tir Critique)

  // Personality buff system
  personality?: PersonalityType;
  activePersonalityBuff?: PersonalityBuff; // Currently active personality buff
  personalityBuffCooldown?: number; // Current cooldown (reduces on each turn)
  originalMaxHP?: number; // For stratège buff
  soinLeurreState?: SoinLeurreState; // For stratège damage tracking
  mystérieuxBoostedStat?: "atk" | "def" | "speed" | "crit" | null; // Track which stat mystérieux boosted
  tempStats?: BattleStats; // Temporary stats during buff (- applied when buff is active)
}

/**
 * Generate a unique buff ID
 */
function generateBuffId(skillId: string, creatureId: string, type: BuffType): string {
  return `${skillId}_${creatureId}_${type}`;
}

/**
 * Add a buff to a creature
 * If a buff of the same type from the same source exists, it refreshes duration
 */
export function addBuff(
  creature: BattleCreature,
  type: BuffType,
  value: number,
  turns: number,
  sourceSkillId: string,
  sourceCreatureId: string,
  log?: BattleLogEntry[] // Optional log for detailed buff explanations
): void {
  const buffId = generateBuffId(sourceSkillId, sourceCreatureId, type);

  // Check if buff already exists (refresh duration)
  const existingBuff = creature.buffs[buffId];
  const isNew = !existingBuff;

  creature.buffs[buffId] = {
    type,
    value,
    turnsRemaining: turns,
    sourceSkillId,
    sourceCreatureId,
  };

  // Generate detailed log if log array provided
  if (log) {
    const valuePercent = Math.floor(value * 100);
    const sign = value >= 0 ? "+" : "";
    const durationText = turns > 0 ? `(${turns} tours)` : "(permanent)";

    let effectDescription = "";
    switch (type) {
      case BuffType.ATTACK:
        effectDescription = `ATK ${sign}${valuePercent}%`;
        break;
      case BuffType.DEFENSE:
        effectDescription = `DEF ${sign}${valuePercent}%`;
        break;
      case BuffType.SPEED:
        effectDescription = `VIT ${sign}${valuePercent}% (+esquive chance)`;
        break;
      case BuffType.DODGE:
        effectDescription = `Esquive +${valuePercent}%`;
        break;
      case BuffType.HEAL:
        effectDescription = `Soin`;
        break;
      case BuffType.POISON:
        effectDescription = `Poison -${valuePercent}% PV/tour`;
        break;
      case BuffType.SLOW:
        effectDescription = `Lent -${valuePercent}% VIT`;
        break;
      case BuffType.STUN:
        effectDescription = `Étourdi ${value} tours`;
        break;
      case BuffType.TAUNT:
        effectDescription = `Taunt (force ciblage)`;
        break;
      default:
        effectDescription = `${type} ${sign}${valuePercent}%`;
    }

    if (isNew) {
      log.push({
        text: `📊 ${creature.name} gagne [${effectDescription}] via ${sourceSkillId} ${durationText}`,
        type: "info",
      });
    } else {
      log.push({
        text: `🔄 ${creature.name} rafraîchit [${sourceSkillId} → ${effectDescription}] ${durationText}`,
        type: "info",
      });
    }
  }
}

/**
 * Get all buffs of a specific type
 */
export function getBuffsByType(creature: BattleCreature, type: BuffType): ActiveBuff[] {
  return Object.values(creature.buffs).filter(b => b.type === type);
}

/**
 * Check if a creature has taunt active
 */
export function hasTaunt(creature: BattleCreature): boolean {
  const tauntBuffs = getBuffsByType(creature, BuffType.TAUNT);
  return tauntBuffs.length > 0;
}

/**
 * Get the total value of buffs of a specific type
 * For debuffs (like poison, slow), negative values are summed
 * For buffs (like attack, defense), positive values are summed
 */
export function getBuffValueByType(creature: BattleCreature, type: BuffType): number {
  const buffs = getBuffsByType(creature, type);
  return buffs.reduce((sum, b) => sum + b.value, 0);
}

/**
 * Remove a specific buff by ID
 */
export function removeBuff(creature: BattleCreature, buffId: string): void {
  delete creature.buffs[buffId];
}

/**
 * Tick down all buff durations and remove expired buffs
 * Returns an array of expired buff types for logging
 */
export function tickBuffs(creature: BattleCreature): BuffType[] {
  const expiredBuffTypes: BuffType[] = [];

  for (const [buffId, buff] of Object.entries(creature.buffs)) {
    buff.turnsRemaining--;

    if (buff.turnsRemaining <= 0) {
      expiredBuffTypes.push(buff.type);
      removeBuff(creature, buffId);
    }
  }

  return expiredBuffTypes;
}

/**
 * BACKWARD COMPATIBILITY FUNCTIONS
 * These functions allow existing UI code to work while we migrate internally
 */

/**
 * GetDefenseBuff for backward compatibility (DEPRECATED)
 */
export function getDefenseBuff(creature: BattleCreature): number {
  return getBuffValueByType(creature, BuffType.DEFENSE);
}

/**
 * GetDodgeBuff for backward compatibility (DEPRECATED)
 */
export function getDodgeBuff(creature: BattleCreature): number {
  return getBuffValueByType(creature, BuffType.DODGE);
}

/**
 * GetAttackBuff for backward compatibility (DEPRECATED)
 */
export function getAttackBuff(creature: BattleCreature): number {
  return getBuffValueByType(creature, BuffType.ATTACK);
}

/**
 * GetDefenseBuffTurns for backward compatibility (DEPRECATED)
 * Returns the minimum remaining turns among all defense buffs
 */
export function getDefenseBuffTurns(creature: BattleCreature): number {
  const buffs = getBuffsByType(creature, BuffType.DEFENSE);
  return buffs.length > 0 ? Math.min(...buffs.map(b => b.turnsRemaining)) : 0;
}

/**
 * GetDodgeBuffTurns for backward compatibility (DEPRECATED)
 * Returns the minimum remaining turns among all dodge buffs
 */
export function getDodgeBuffTurns(creature: BattleCreature): number {
  const buffs = getBuffsByType(creature, BuffType.DODGE);
  return buffs.length > 0 ? Math.min(...buffs.map(b => b.turnsRemaining)) : 0;
}

/**
 * GetAttackBuffTurns for backward compatibility (DEPRECATED)
 * Returns the minimum remaining turns among all attack buffs
 */
export function getAttackBuffTurns(creature: BattleCreature): number {
  const buffs = getBuffsByType(creature, BuffType.ATTACK);
  return buffs.length > 0 ? Math.min(...buffs.map(b => b.turnsRemaining)) : 0;
}

/**
 * Helper to get buff object with readable fields (for UI compatibility)
 * Returns an object with .defenseBuff, .attackBuff, etc. for easy access
 */
export function getBuffsAsObject(creature: BattleCreature): {
  attackBuff: number;
  defenseBuff: number;
  dodgeBuff: number;
  attackBuffTurns: number;
  defenseBuffTurns: number;
  dodgeBuffTurns: number;
} {
  return {
    attackBuff: getAttackBuff(creature),
    defenseBuff: getDefenseBuff(creature),
    dodgeBuff: getDodgeBuff(creature),
    attackBuffTurns: getAttackBuffTurns(creature),
    defenseBuffTurns: getDefenseBuffTurns(creature),
    dodgeBuffTurns: getDodgeBuffTurns(creature),
  };
}

// ============================================================================
// PERSONALITY BUFF SYSTEM
// ============================================================================

/**
 * Get a creature's personality buff (if it has one)
 */
export function getCreaturePersonalityBuff(
  creature: BattleCreature
): PersonalityBuff | null {
  if (!creature.personality) return null;
  return getPersonalityBuff(creature.personality);
}

/**
 * Check if a creature can activate its personality buff
 */
export function canActivatePersonalityBuff(creature: BattleCreature): boolean {
  if (!creature.personality) return false;
  if (!getPersonalityBuff(creature.personality)) return false;
  if (creature.activePersonalityBuff) return false; // Already active
  if (creature.personalityBuffCooldown && creature.personalityBuffCooldown > 0) return false; // On cooldown
  return true;
}

/**
 * Activate a creature's personality buff
 */
export function activatePersonalityBuff(
  creature: BattleCreature,
  log: BattleLogEntry[]
): boolean {
  if (!canActivatePersonalityBuff(creature)) {
    return false;
  }

  const buff = getPersonalityBuff(creature.personality!);
  if (!buff) return false;

  // Reset cooldown to full duration
  creature.personalityBuffCooldown = buff.cooldown;

  // Store current stats in tempStats (copy)
  if (!creature.tempStats) {
    creature.tempStats = {
      hp: creature.stats.hp,
      attack: creature.stats.attack,
      defense: creature.stats.defense,
      speed: creature.stats.speed,
      crit: creature.stats.crit,
      rank: creature.stats.rank,
      maxHP: creature.stats.hp, // For stratège
    };
  }

  // Apply buff effects
  buff.onApply(creature);

  // Set active buff with remaining turns
  creature.activePersonalityBuff = buff;

  log.push({
    text: `🔮 ${creature.name} active [${buff.name}] (${buff.duration} tours, CD: ${buff.cooldown})`,
    type: "info",
  });

  return true;
}

/**
 * Tick down personality buff duration and handle expiration
 * Returns true if buff expired (was active and is now removed)
 */
export function tickPersonalityBuff(
  creature: BattleCreature,
  log: BattleLogEntry[]
): boolean {
  if (!creature.activePersonalityBuff) return false;

  // Decrement duration
  creature.activePersonalityBuff.duration--;

  const buff = creature.activePersonalityBuff;

  if (buff.duration <= 0) {
    // Buff expired - apply onRemove
    buff.onRemove(creature);

    // Healing recovery notification for stratège
    if (creature.personality === "stratège" && creature.soinLeurreState?.damageTakenDuringBuff) {
      const damageTaken = creature.soinLeurreState.damageTakenDuringBuff;
      if (damageTaken > 0) {
        const reduction = Math.floor(damageTaken * 0.5);
        if (reduction > 0) {
          log.push({
            text: `💊 Bouclier Temporel expire: ${creature.name} récupère ${reduction} HP (${damageTaken} dégâts absorbés → -50%)`,
            type: "info",
          });
        }
      }
    }

    log.push({
      text: `⏳ [${buff.name}] expire sur ${creature.name}`,
      type: "info",
    });

    // Clear active buff
    creature.activePersonalityBuff = undefined;

    // Reset tempStats to base stats
    creature.tempStats = undefined;

    return true; // Buff expired
  }

  return false; // Buff still active
}

/**
 * Tick down personality buff cooldown
 */
export function tickPersonalityBuffCooldown(creature: BattleCreature): void {
  if (creature.personalityBuffCooldown && creature.personalityBuffCooldown > 0) {
    creature.personalityBuffCooldown--;
  }
}

/**
 * Get effective stats considering personality buff (if active)
 */
export function getEffectiveStats(creature: BattleCreature): BattleStats {
  if (creature.tempStats) {
    return { ...creature.tempStats, rank: creature.stats.rank };
  }
  return creature.stats;
}

/**
 * Add a status effect to a creature
 */
export function addStatusEffect(
  creature: BattleCreature,
  type: StatusEffectType,
  duration: number,
  value?: number
): void {
  // For stacking effects like Slow, combine durations
  const existingIndex = creature.statusEffects.findIndex(e => e.type === type);
  if (existingIndex !== -1 && type === StatusEffectType.SLOW) {
    // Slow stacks by adding to value and maxing duration
    const existing = creature.statusEffects[existingIndex];
    const maxValue = (existing.value || 0) + (value || 0);
    creature.statusEffects[existingIndex] = {
      type,
      duration: Math.max(duration, existing.duration),
      value: Math.min(maxValue, 0.5), // Cap slow at 50% reduction
    };
  } else if (existingIndex === -1) {
    // New effect
    creature.statusEffects.push({ type, duration, value });
  }
  // For Stun and Poison, don't refresh (existing effect continues)
}

/**
 * Remove a status effect from a creature
 */
export function removeStatusEffect(
  creature: BattleCreature,
  type: StatusEffectType
): void {
  creature.statusEffects = creature.statusEffects.filter(e => e.type !== type);
}

/**
 * Check if a creature has a specific status effect
 */
export function hasStatusEffect(
  creature: BattleCreature,
  type: StatusEffectType
): boolean {
  return creature.statusEffects.some(e => e.type === type);
}

/**
 * Get all status effects of a specific type
 */
export function getStatusEffects(
  creature: BattleCreature,
  type: StatusEffectType
): StatusEffect[] {
  return creature.statusEffects.filter(e => e.type === type);
}

/**
 * Calculate effective speed with Slow effect applied
 * Uses NEW buff system for compatibility
 */
export function getEffectiveSpeed(creature: BattleCreature): number {
  // Check both old statusEffects and new buffs (for transition period)
  let totalSlowReduction = getBuffValueByType(creature, BuffType.SLOW);

  // NEW: Add speed boost support
  let totalSpeedBoost = getBuffValueByType(creature, BuffType.SPEED);

  // Also check legacy statusEffects for backward compatibility
  const slowEffects = getStatusEffects(creature, StatusEffectType.SLOW);
  for (const effect of slowEffects) {
    totalSlowReduction += effect.value || 0;
  }

  // Cap at 50% reduction
  totalSlowReduction = Math.min(totalSlowReduction, 0.5);

  // Cap speed boost at 40% (consistent with dodge chance cap)
  totalSpeedBoost = Math.min(totalSpeedBoost, 0.40);

  return Math.floor(creature.stats.speed * (1 - totalSlowReduction + totalSpeedBoost));
}

/**
 * Apply status effects at the start of a creature's turn
 * Returns true if the turn should be skipped (stunned)
 */
export function applyStatusEffects(
  creature: BattleCreature,
  log: BattleLogEntry[]
): boolean {
  let turnSkipped = false;

  // Check for Stun - skip turn
  if (hasStatusEffect(creature, StatusEffectType.STUN)) {
    log.push({
      text: `${creature.name} est étourdi et ne peut pas agir!`,
      type: "info",
    });
    turnSkipped = true;
  }

  // Apply Poison damage
  const poisonEffects = getStatusEffects(creature, StatusEffectType.POISON);
  for (const poison of poisonEffects) {
    const damagePercent = poison.value || 0.05; // Default 5% of max HP
    const poisonDamage = Math.floor(creature.stats.hp * damagePercent);
    if (poisonDamage > 0 && creature.currentHP > 0) {
      creature.currentHP = Math.max(0, creature.currentHP - poisonDamage);
      log.push({
        text: `☠️ ${creature.name} subit les dégâts du poison: -${poisonDamage} HP`,
        type: "damage",
      });
    }
  }

  return turnSkipped;
}

/**
 * Tick down status effect durations and remove expired ones
 */
export function tickStatusEffects(creature: BattleCreature, log: BattleLogEntry[]): void {
  const expiredEffects: StatusEffectType[] = [];

  for (let i = 0; i < creature.statusEffects.length; i++) {
    const effect = creature.statusEffects[i];
    effect.duration--;

    if (effect.duration <= 0) {
      expiredEffects.push(effect.type);
    }
  }

  // Remove expired effects
  for (const expiredType of expiredEffects) {
    removeStatusEffect(creature, expiredType);
    const effectNames: Record<StatusEffectType, string> = {
      [StatusEffectType.STUN]: "Étourdissement",
      [StatusEffectType.POISON]: "Poison",
      [StatusEffectType.SLOW]: "Lenteur",
    };
    log.push({
      text: `✨ ${effectNames[expiredType]} sur ${creature.name} s'est dissipé`,
      type: "info",
    });
  }
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
 * Hook point for traits that trigger when damage is taken
 * Returns any additional damage to apply (e.g., reflection from Épines)
 */
export function onDamageTakenHooks(
  defender: BattleCreature,
  damage: number,
  attacker: BattleCreature,
  log: BattleLogEntry[]
): number {
  // --- TRAITS DISABLED FOR NOW - will be re-integrated later ---
  const reflectedDamage = 0;  // No trait damage reflection, return 0
  if (reflectedDamage > 0) {
    log.push({
      text: `🔥 Épines renvoie ${reflectedDamage} dégâts à ${attacker.name}!`,
      type: "damage",
    });
  }
  return reflectedDamage;
}

/**
 * Hook point for traits that trigger when attacking
 * Returns any status effects to apply to the defender
 */
export function onAttackHooks(
  attacker: BattleCreature,
  defender: BattleCreature,
  damage: number,
  log: BattleLogEntry[]
): void {
  // Increment attack counter for "every X attacks" traits
  attacker.attackCounter++;

  // Apply Slow trait (every X attacks, reduce target speed)
  applyTraitOnAttack(attacker, defender, log);
}

/**
 * Apply trait effects when damage is taken
 * TRAITS DISABLED FOR NOW - returns 0 (no damage reflection)
 */
function applyTraitOnDamageTaken(
  defender: BattleCreature,
  damage: number,
  attacker: BattleCreature,
  log: BattleLogEntry[]
): number {
  // TRAITS DISABLED - no damage reflection
  return 0;

  // Original logic (disabled) - implements trait reflec-t Damage like "Épines"
  // const traits = getTraitsByIds(defender.traits);
  // let reflectedDamage = 0;

  // for (const trait of traits) {
  //   if (trait.id === "epines") {
  //     const reflectPercent = 0.2;
  //     reflectedDamage += Math.floor(damage * reflectPercent);
  //   }
  // }

  // return reflectedDamage;
}

/**
 * Apply trait effects when attacking
 * TRAITS DISABLED FOR NOW - does nothing (no status effects)
 */
function applyTraitOnAttack(
  attacker: BattleCreature,
  defender: BattleCreature,
  log: BattleLogEntry[]
): void {
  // TRAITS DISABLED - do nothing (no Slow, Poison, etc.)

  // Original logic (disabled) - implements traits like SlowTrait, PoisonTrait
  // const traits = getTraitsByIds(attacker.traits);

  // for (const trait of traits) {
  //   if (trait.id === "slowTrait") {
  //     const attacksNeeded = 3;
  //     if (attacker.attackCounter % attacksNeeded === 0) {
  //       const slowAmount = 0.15;
  //       addStatusEffect(defender, StatusEffectType.SLOW, 2, slowAmount);
  //       log.push({
  //         text: `🐌 ${defender.name} est ralentit (${Math.floor(slowAmount * 100)}% SPD) pour 2 tours!`,
  //         type: "info",
  //       });
  //     }
  //   } else if (trait.id === "poisonTrait") {
  //     // ... poison logic
  //   }
  //   // ... other traits
  // }
}

/**
 * Calculate damage based on attack and defense
 * Formula: attack * (attack / (attack + defense))
 */
export function calculateDamage(attacker: BattleCreature, defender: BattleCreature): number {
  const attackerStats = getEffectiveStats(attacker);
  const defenderStats = getEffectiveStats(defender);

  const atk = attackerStats.attack;
  const def = defenderStats.defense;

  let damage = atk * (atk / (atk + def));

  // Apply attack buff (NEW system)
  const attackBuffValue = getBuffValueByType(attacker, BuffType.ATTACK);
  if (attackBuffValue > 0) {
    damage = damage * (1 + attackBuffValue);
  }

  // Apply defense buff (NEW system)
  const defenseBuffValue = getBuffValueByType(defender, BuffType.DEFENSE);
  if (defenseBuffValue > 0) {
    damage = damage * (1 - Math.min(defenseBuffValue, 0.8)); // Cap damage reduction at 80%
  }

  return Math.floor(Math.max(1, damage));
}

/**
 * Check if a skill can be used (not on cooldown)
 * @param skillType - "specimen" or "personality" or undefined (defaults to specimen)
 */
export function canUseSkill(battleCreature: BattleCreature, skillType?: "specimen" | "personality"): boolean {
  const skill = battleCreature.creature.specimenSkill || battleCreature.creature.personalitySkill;
  if (!skill) {
    return false;
  }

  // Use specified skill type, default to specimen
  const st = skillType || "specimen";
  const skillToUse = st === "specimen" ? battleCreature.creature.specimenSkill : battleCreature.creature.personalitySkill;
  if (!skillToUse) {
    return false;
  }

  const skillName = skillToUse.name;
  const cooldownKey = `${skillName}_${st}_${battleCreature.name}`;
  const currentCooldown = battleCreature.skillCooldowns[cooldownKey];

  if (currentCooldown !== undefined && currentCooldown > 0) {
    return false;
  }

  return true;
}

export function getCooldownRemaining(battleCreature: BattleCreature, skillType: "specimen" | "personality"): number {
  const skill = skillType === "specimen" ? battleCreature.creature.specimenSkill : battleCreature.creature.personalitySkill;
  if (!skill) return 999;

  const skillName = skill.name;
  const cooldownKey = `${skillName}_${skillType}_${battleCreature.name}`;
  return battleCreature.skillCooldowns[cooldownKey] || 0;
}

/**
 * Apply skill effect with target information
 * @param skillType - "specimen" or "personality" or undefined (defaults to specimen)
 * @param targetTeam - Optional enemy team for AOE skills
 */
export function useSkill(
  battleCreature: BattleCreature,
  log: BattleLogEntry[],
  target?: BattleCreature | null,
  skillType?: "specimen" | "personality",
  targetTeam?: BattleTeam | null,
  allyTeam?: BattleTeam | null,
  playerTeam?: BattleTeam | null,
  enemyTeam?: BattleTeam | null
): boolean {
  // Use specified skill type, default to specimen
  const st = skillType || "specimen";
  const skill = st === "specimen" ? battleCreature.creature.specimenSkill : battleCreature.creature.personalitySkill;
  if (!skill) {
    return false;
  }

  const skillName = skill.name;
  const cooldownKey = `${skillName}_${st}_${battleCreature.name}`;

  if (!canUseSkill(battleCreature, st)) {
    return false;
  }

  // Build battle context
  const battleContext: BattleContext = {
    playerTeam,
    enemyTeam,
  };

  // Determine what to pass as target (creature or team)
  let executionTarget: BattleCreature | BattleTeam | null;
  if (skill.target === "self" || (!target && skill.target !== "ally" && skill.target !== "all")) {
    // Self-buff: pass the creature itself as target
    executionTarget = battleCreature;
  } else if (skill.target === "ally" && targetTeam) {
    // Heal all allies: pass the player's own team
    executionTarget = targetTeam;
  } else if (skill.effect === "aoe_damage" || skill.target === "all" || skill.effect === "debuff") {
    // AOE damage or debuffs: pass enemy team (or null)
    executionTarget = targetTeam || null;
  } else {
    // Single target: pass the targeted creature (or null if undefined)
    executionTarget = target || null;
  }

  // Convert old skill format to new Skill format for executeSkill
  const newSkill = convertToSkillFormat(skill, st);
  if (!newSkill) {
    return false;
  }

  // Execute skill using the new executor (pass battle context)
  return executeSkill(battleCreature, executionTarget, newSkill, log, battleContext);
}

/**
 * Convert old skill format from database.ts to new Skill format for executeSkill
 */
function convertToSkillFormat(
  oldSkill: Creature["specimenSkill"] | Creature["personalitySkill"],
  source: "specimen" | "personality"
): Skill | null {
  if (!oldSkill) {
    return null;
  }

  // Import skills dynamically to avoid circular dependency
  const { BASE_SKILLS, SPECIMEN_SKILLS } = require("./skills");

  // If this is a known personality skill, load directly from skills.ts (preserves effects like recoilPercent)
  if (source === "personality") {
    const personalityTypes = ["agressive", "protective", "rapide", "soin_leurre", "précise", "balancee", "mysterieuse"] as const;
    for (const type of personalityTypes) {
      const baseSkill = BASE_SKILLS[type];
      if (baseSkill && baseSkill.name === oldSkill.name) {
        return {
          ...baseSkill,
          id: `${source}_${oldSkill.name}`,
          level: 1, // Reset to level 1
        };
      }
    }
  }

  // If this is a known specimen skill, load directly from skills.ts
  if (source === "specimen") {
    const specimenSkill = SPECIMEN_SKILLS[oldSkill.name.toLowerCase()];
    if (specimenSkill) {
      return {
        ...specimenSkill,
        id: `${source}_${oldSkill.name}`,
        level: 1, // Reset to level 1
      };
    }
  }

  // Fallback: Build effects object based on old skill properties (for unknown/legacy skills)
  const effects: Skill["effects"] = {};

  switch (oldSkill.effect) {
    case "attack":
    case "aoe_damage":
      effects.offenseMultiplier = oldSkill.value;
      break;
    case "heal":
      effects.healPercent = oldSkill.value;
      // Sacrifice Vital: self sacrifice (no poison)
      if (source === "personality" && oldSkill.name === "Sacrifice Vital") {
        effects.selfSacrificePercent = 0.15;  // Sacrifice 15% own HP
        // Poison removed - no longer applies
      }
      break;
    case "speed":
      effects.speedBonus = oldSkill.value;
      // Esquive Aérienne buff allies too
      if (oldSkill.name === "Esquive Aérienne") {
        effects.allyBoostSelf = true;
      }
      break;
    case "defense":
      // Forteresse v4: DEF boost + Taunt
      if (oldSkill.name === "Forteresse") {
        effects.defenseRedirect = oldSkill.value;  // DEF bonus
        effects.taunt = true;  // NEW: Forces enemy targeting
      } else {
        effects.damageReduction = oldSkill.value;
      }
      break;
    case "debuff":
      effects.enemyDebuffPercent = oldSkill.value;
      // Échange Solaire also boosts self
      if (oldSkill.name === "Échange Solaire") {
        effects.selfBoostPercent = oldSkill.value;
      }
      break;
    case "special":
      // Ravage: AOE (special case - converts to AOE logic)
      if (oldSkill.name === "Ravage") {
        effects.offenseMultiplier = 1.0;  // 100% per target
        effects.recoilPercent = 0.20;
        // Note: no ignoreDodge - Ravage can be dodged
        // Handled in conversion: will return aoe_damage effect and "all" target
      }
      // Tir Critique: COUP GARANTI - MUST be loaded from skills.ts to preserve ALL effects
      if (oldSkill.name === "Tir Critique") {
        const { BASE_SKILLS } = require("./skills");
        return {
          ...BASE_SKILLS.précise,
          id: `${source}_${oldSkill.name}`,
          level: 1,
        };
      }
      // Roue du Destin handled in executeSkill
      break;
  }

  return {
    id: `${source}_${oldSkill.name}`,
    name: oldSkill.name,
    description: oldSkill.description,
    source,
    type: oldSkill.effect === "heal" ? "heal" : oldSkill.effect === "defense" ? "defensive" : "offensive",
    effect: oldSkill.effect,
    value: oldSkill.value,
    duration: oldSkill.duration,
    cooldown: oldSkill.cooldown,
    target: oldSkill.target,
    level: 1, // Default level 1 for now
    effects,
    archetype: "agressive" as any, // Not available in old format, use placeholder
    creatureId: undefined,
  };
}

/**
 * Tick cooldowns and buff durations (NEW system)
 */
export function tickCooldownsAndBuffs(battleCreature: BattleCreature): void {
  // Tick skill cooldowns
  for (const [skillName, cd] of Object.entries(battleCreature.skillCooldowns)) {
    if (cd > 0) {
      battleCreature.skillCooldowns[skillName] = cd - 1;
    }
  }

  // Tickbuffs using new system
  const expiredBuffs = tickBuffs(battleCreature);

  // Log expired buff types for UI compatibility
  if (expiredBuffs.length > 0) {
    battleCreature.logBuffExpiration = battleCreature.logBuffExpiration || [];
    const buffTypeNames: Record<BuffType, string> = {
      [BuffType.ATTACK]: "ATK",
      [BuffType.DEFENSE]: "DEF",
      [BuffType.DODGE]: "Dodge",
      [BuffType.HEAL]: "Heal",
      [BuffType.POISON]: "Poison",
      [BuffType.SLOW]: "Slow",
      [BuffType.STUN]: "Stun",
      [BuffType.SPEED]: "VIT",
      [BuffType.TAUNT]: "Taunt",  // NEW
    };
    for (const buffType of expiredBuffs) {
      battleCreature.logBuffExpiration.push(buffTypeNames[buffType]);
    }
  }
}

/**
 * Get and clear buff expiration messages for logging
 */
export function getBuffExpirationMessages(battleCreature: BattleCreature): string[] {
  const messages = battleCreature.logBuffExpiration || [];
  battleCreature.logBuffExpiration = [];
  return messages;
}


/**
 * Apply trait regeneration during each turn
 * TRAITS DISABLED FOR NOW - does nothing (no HP regeneration)
 */
export function applyTraitRegeneration(
  battleCreature: BattleCreature,
  log: BattleLogEntry[]
): void {
  // TRAITS DISABLED - do nothing (no regeneration)
  return;

  // Original logic (disabled) - implements traits like Régénération
  // const hpPercent = battleCreature.currentHP / battleCreature.stats.hp;
  // const traitMods = applyTraitModifiers(battleCreature, hpPercent);

  // if (traitMods.regenPerTurn > 0 && battleCreature.currentHP > 0) {
  //   const regenAmount = Math.floor(battleCreature.stats.hp * traitMods.regenPerTurn);
  //   const oldHP = battleCreature.currentHP;
  //   battleCreature.currentHP = Math.min(battleCreature.stats.hp, battleCreature.currentHP + regenAmount);
  //   const actualHeal = battleCreature.currentHP - oldHP;

  //   if (actualHeal > 0) {
  //     log.push({
  //       text: `${battleCreature.name} se régénère (+${actualHeal} HP)`,
  //       type: "info",
  //     });
  //   }
  // }
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
 * Apply trait effects to battle stats
 * TRAITS DISABLED FOR NOW - returns neutral values (no stat modifications)
 */
export function applyTraitModifiers(
  creature: BattleCreature,
  targetHpPercent?: number  // Target's HP for conditional traits
): {
  critRateBonus: number;
  critMultBonus: number;
  damageDealtMult: number;
  damageReceivedMult: number;
  dodgeBonus: number;
  regenPerTurn: number;
} {
  // TRAITS DISABLED - return neutral values (no stat modifications)
  return {
    critRateBonus: 0,
    critMultBonus: 0,
    damageDealtMult: 1,
    damageReceivedMult: 1,
    dodgeBonus: 0,
    regenPerTurn: 0,
  };

  // Original logic (disabled) - applies trait effects to stats
  // const hpPercent = creature.currentHP / creature.stats.hp;

  // let statsContext: any = {};
  // if (targetHpPercent !== undefined) {
  //   statsContext.targetHpPercent = targetHpPercent;
  // }

  // const traitEffects = applyTraitEffects(creature.traits, hpPercent, statsContext);

  // return {
  //   critRateBonus: traitEffects.critRateAdjustment,
  //   critMultBonus: traitEffects.critMultAdjustment,
  //   damageDealtMult: traitEffects.damageDealtMult,
  //   damageReceivedMult: traitEffects.damageReceivedMult,
  //   dodgeBonus: traitEffects.dodgeAdjustment,
  //   regenPerTurn: traitEffects.regenPerTurn,
  // };
}

/**
 * Execute attack and handle dodge, crit, damage
 */
export function executeAttack(
  attacker: BattleCreature,
  defender: BattleCreature,
  log: BattleLogEntry[]
): number {
  // Get HP percentages for conditional trait evaluation
  const attackerHpPercent = attacker.currentHP / attacker.stats.hp;
  const defenderHpPercent = defender.currentHP / defender.stats.hp;

  // Apply trait modifiers for both attacker and defender
  const attackerMods = applyTraitModifiers(attacker, defenderHpPercent);
  const defenderMods = applyTraitModifiers(defender, attackerHpPercent);

  // Use effective speed in dodge calculation (accounts for Slow)
  const defenderEffectiveSpeed = getEffectiveSpeed(defender);

  // Use NEW buff system for dodge (backward compatible)
  const dodgeBuffValue = getDodgeBuff(defender);
  
  const dodgeChance = calculateDodgeChance(
    attacker.stats.speed,
    defenderEffectiveSpeed,
    dodgeBuffValue + defenderMods.dodgeBonus
  );

  if (Math.random() < dodgeChance) {
    log.push({
      text: `${defender.name} esquive l'attaque!`,
      type: "dodge",
    });
    return 0;
  }

  let damage = calculateDamage(attacker, defender);

  // Apply trait damage multipliers
  damage = Math.floor(damage * attackerMods.damageDealtMult * defenderMods.damageReceivedMult);

  const critChance = Math.min(calculateCritChance(attacker.stats) + attackerMods.critRateBonus, 0.40);  // Cap at 40%
  const isCrit = Math.random() < critChance;
  if (isCrit) {
    const critMult = calculateCritMultiplier(attacker.stats) + attackerMods.critMultBonus;
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

  // Track damage dealt
  attacker.damageDealt = (attacker.damageDealt || 0) + damage;

  // Track kills
  if (defender.currentHP <= 0) {
    attacker.kills = (attacker.kills || 0) + 1;
  }

  // Track damage for soin_leurre Bouclier Temporel (if active)
  if (defender.personality === "soin_leurre" && defender.activePersonalityBuff?.id === "buff_bouclier_temporel") {
    trackDamageForSoinLeurre(defender, damage);
  }

  // Apply damage taken hooks (e.g., Épines reflection)
  if (damage > 0) {
    const reflectedDamage = onDamageTakenHooks(defender, damage, attacker, log);
    if (reflectedDamage > 0) {
      attacker.currentHP = Math.max(0, attacker.currentHP - reflectedDamage);
    }
  }

  // Apply attack hooks (e.g., Slow, Venom, Coup Bas)
  onAttackHooks(attacker, defender, damage, log);

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
  name?: string,
  traits?: string[],
  position?: number,
  personality?: PersonalityType
): BattleCreature {
  const battleCreature: BattleCreature = {
    creature,
    stats,
    currentHP: stats.hp,
    skillCooldowns: {},
    buffs: {},  // NEW: Empty dictionary for buffs
    name: name || creature.name,
    traits: traits || [],
    statusEffects: [],  // Kept for backward compatibility during transition
    attackCounter: 0,
    position,
    damageDealt: 0,
    kills: 0,
    id: creature.id,
  };

  // Initialize personality if provided
  if (personality) {
    battleCreature.personality = personality;
    battleCreature.personalityBuffCooldown = 0; // Start with no cooldown
  }

  return battleCreature;
}

/**
 * Calculate XP rewards after battle
 */
export function calculateXPRewards(
  playerCreatures: BattleCreature[],
  enemyCreatures: BattleCreature[],
  playerWon: boolean
): Array<{ creatureId: string; xpEarned: number }> {
  const rewards: Array<{ creatureId: string; xpEarned: number }> = [];

  for (const playerCreature of playerCreatures) {
    if (playerCreature.currentHP <= 0) continue; // Dead creatures get less/no XP

    // Find this creature's damage contributed
    const damageDealt = playerCreature.damageDealt || 0;

    // Sum enemy HP total for calculations
    const totalEnemyHP = enemyCreatures.reduce((sum, c) => sum + c.stats.hp, 0);

    // Check if this creature got final kills
    const kills = playerCreature.kills || 0;

    const xp = calculateCombatXP(
      damageDealt,
      totalEnemyHP,
      kills > 0,
      playerWon
    );

    rewards.push({
      creatureId: playerCreature.id,
      xpEarned: xp
    });
  }

  return rewards;
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

// ============================================================================
// NEW SKILL EXECUTION SYSTEM (Refactored)
// ============================================================================

interface BattleContext {
  playerTeam?: BattleTeam | null;
  enemyTeam?: BattleTeam | null;
}

interface SkillExecutionContext {
  attacker: BattleCreature;
  target: BattleCreature | BattleTeam | null;
  skill: Skill;
  log: BattleLogEntry[];
  battleContext?: BattleContext;
  // Additional properties for cascade mechanics
  isCascadeActive?: boolean;
  cascadeEnemyTeam?: BattleCreature[];
}

export function executeSkill(
  attacker: BattleCreature,
  target: BattleCreature | BattleTeam | null,
  skill: Skill,
  log: BattleLogEntry[],
  battleContext?: BattleContext
): boolean {
  const ctx: SkillExecutionContext = { attacker, target, skill, log, battleContext };

  // Determine targets based on skill.target
  const targets = determineTargetCreatures(ctx);

  if (targets.length === 0 && skill.effect !== "aoe_damage" && skill.effect !== "debuff") {
    log.push({
      text: `${attacker.name} tente d'utiliser ${skill.name} mais n'a pas de cible`,
      type: "info",
    });
    return false;
  }

  // Execute each effect in order
  const effects = skill.effects;

  // 1. Damage effects (offenseMultiplier, aoe_damage)
  if (effects.offenseMultiplier || skill.effect === "aoe_damage") {
    applyDamageEffect(ctx, targets);
  }

  // 2. Heal effects
  if (effects.healPercent) {
    applyHealEffect(ctx, targets);
  }

  // 3. Buff effects (speed, dodge, attack, defense)
  if (effects.speedBonus) {
    applySpeedBuffEffect(ctx, targets);
  }
  if (effects.defenseRedirect) {
    applyDefenseRedirectEffect(ctx, target as BattleTeam);
  }
  if (effects.damageReduction || skill.effect === "defense") {
    applyDefenseBuffEffect(ctx, targets);
  }
  // NOTE: Do NOT use skill.effect === "attack" for buff application
  // skill.effect === "attack" means "deals damage", not "applies ATK buff"
  // Only apply ATK buff if effect specifically sets selfBoostPercent or attackBuff
  if (effects.selfBoostPercent) {
    applyAttackBuffEffect(ctx, targets);
  }

  // 4. Debuff effects (slow, poison)
  if (effects.enemyDebuffPercent || skill.effect === "debuff") {
    applyDebuffEffect(ctx, targets);
  }
  if (effects.poisonPercent) {
    applyPoisonEffect(ctx, targets);
  }

  // 5. Special effects
  if (skill.archetype === "mysterieuse") {
    applyRoueDuDestinCooldownReset(ctx, targets);
  }

  // Set cooldown
  const cooldownKey = `${skill.name}_${skill.source}_${attacker.name}`;
  attacker.skillCooldowns[cooldownKey] = skill.cooldown;

  return true;
}

// ============================================================================
// TARGET DETERMINATION
// ============================================================================

function determineTargetCreatures(ctx: SkillExecutionContext): BattleCreature[] {
  const { attacker, target, skill } = ctx;

  // Self-targeting skills
  if (skill.target === "self" || (!target && skill.target !== "ally" && skill.target !== "all")) {
    return [attacker];
  }

  // Single target
  if (skill.target === "random" && target && "stats" in target) {
    return [target as BattleCreature];
  }

  // Team targeting for AOE/debuffs
  if (target && "creatures" in target && "teamId" in target) {
    const team = target as BattleTeam;
    const teamSize = team.creatures.length;
    const isEnemyTeam = team.teamId === "enemy";

    switch (skill.target) {
      case "front": {
        // For ally healing: select FIRST ally in front row (position 1 → 2 → 3)
        // For enemy AOE: select ALL front row targets
        
        if (isEnemyTeam && skill.type === "offensive") {
          // Enemy team + offensive skill (AOE damage) = target all front row
          const frontPositions = teamSize === 5 ? [0, 1] : teamSize === 3 ? [0] : [0];
          let frontTargets = team.creatures.filter(c =>
            c.currentHP > 0 &&
            c.position !== undefined &&
            frontPositions.includes(c.position)
          );
          // Fallback: target all if front row empty
          if (frontTargets.length === 0) {
            frontTargets = team.creatures.filter(c => c.currentHP > 0);
            logFallbackMessage(ctx, "rangée avant vide, cible tous les ennemis");
          }
          return frontTargets;
        } else {
          // Ally team = select FIRST ally (priority: position 0 → 1 → 2 → ...)
          const sortedAllies = team.creatures
            .filter(c => c.currentHP > 0)
            .sort((a, b) => (a.position || 0) - (b.position || 0));
          return sortedAllies.length > 0 ? [sortedAllies[0]] : [];
        }
      }

      case "back": {
        // Back row: positions 1-2 (3v3) or 2-3-4 (5v5)
        const backPositions = teamSize === 5 ? [2, 3, 4] : teamSize === 3 ? [1, 2] : [];
        let backTargets = team.creatures.filter(c =>
          c.currentHP > 0 &&
          c.position !== undefined &&
          backPositions.includes(c.position)
        );
        // Fallback: target random if back row empty
        if (backTargets.length === 0) {
          const alive = team.creatures.filter(c => c.currentHP > 0);
          backTargets = alive.length > 0 ? [alive[Math.floor(Math.random() * alive.length)]] : [];
          logFallbackMessage(ctx, "rangée arrière vide, cible aléatoire");
        }
        return backTargets;
      }

      case "all":
        return team.creatures.filter(c => c.currentHP > 0);

      case "ally":
        // Heal all allies (including self)
        return target.creatures.filter(c => c.currentHP > 0);

      default: {
        // Random target
        const alive = team.creatures.filter(c => c.currentHP > 0);
        return alive.length > 0 ? [alive[Math.floor(Math.random() * alive.length)]] : [];
      }
    }
  }

  // Single creature target
  if (target && "stats" in target) {
    const creature = target as BattleCreature;
    return creature.currentHP > 0 ? [creature] : [];
  }

  return [];
}

function logFallbackMessage(ctx: SkillExecutionContext, message: string): void {
  ctx.log.push({
    text: `${ctx.attacker.name} s'adapte: ${message}`,
    type: "info",
  });
}

// ============================================================================
// DAMAGE EFFECTS
// ============================================================================

function applyDamageEffect(ctx: SkillExecutionContext, targets: BattleCreature[]): void {
  const { attacker, skill, log } = ctx;
  const effects = skill.effects;

  const offenseMult = effects.offenseMultiplier || skill.value || 1.0;

  // Check if skill ignores dodge (Ravage, Tir Critique)
  const ignoreDodge = effects.ignoreDodge || false;
  
  // Check if skill is cascade (Esquive Aérienne)
  const isCascade = effects.cascade || false;
  const cascadeChances = effects.cascadeChances || [1.0];  // [1.0] = single attack default
  
  // For recoil skills (Ravage), accumulate total damage first
  let totalDamageDealt = 0;

  targets.forEach(target => {
    // If ignoreDodge is true, check dodge anyway but override
    let targetDodged = false;
    
    if (!ignoreDodge) {
      // Normal dodge calculation (based on speed difference)
      const attackerEffectiveSpeed = getEffectiveSpeed(attacker);
      const targetEffectiveSpeed = getEffectiveSpeed(target);
      const dodgeBuff = getDodgeBuff(target);
      const dodgeChanceCalc = calculateDodgeChance(attackerEffectiveSpeed, targetEffectiveSpeed, dodgeBuff);
      
      targetDodged = Math.random() < dodgeChanceCalc;
    }

    if (targetDodged) {
      log.push({
        text: `${target.name} esquive l'attaque de ${skill.name}!`,
        type: "dodge",
      });
      return; // Exit early for this target
    }

    // Calculate base damage ONCE (same for all cascade attacks)
    let rawDamage = attacker.stats.attack * offenseMult;

    // Ignore defense percentage
    const ignoreDefPercent = effects.ignoreDefPercent || 0;
    const effectiveDefense = target.stats.defense * (1 - ignoreDefPercent);
    const defenseReduction = Math.floor(effectiveDefense / 2);
    let baseDamage = Math.max(1, Math.floor(rawDamage - defenseReduction));

    // Cascade attacks: apply damage multiple times with decreasing probability
    let attackNum = 0;
    let cascadeTotal = 0;

    // For cascade skills, we need to pick a random enemy for each attack
    // Get enemy team from battle context (the OPPOSITE team, not just enemyTeam)
    if (isCascade && ctx.battleContext) {
      const playerTeam = ctx.battleContext.playerTeam?.creatures || [];
      const enemyTeam = ctx.battleContext.enemyTeam?.creatures || [];

      // Determine if attacker belongs to player or enemy team
      const attackerInPlayer = playerTeam.some(c => c.id === attacker.id);

      // Enemy team = OPPOSITE of attacker's team
      const actualEnemyTeam = attackerInPlayer ? enemyTeam : playerTeam;

      const aliveEnemies = actualEnemyTeam.filter(c => c.currentHP > 0);
      if (aliveEnemies.length > 0) {
        // Set a flag to use actual enemy team for cascade
        ctx.isCascadeActive = true;
        ctx.cascadeEnemyTeam = aliveEnemies;
      }
    }

    for (const chance of cascadeChances) {
      attackNum++;

      // Skip if this attack's chance fails
      if (Math.random() > chance) {
        break; // Cascade stops
      }

      // For cascade: pick a random enemy for each attack (different from target)
      let cascadeTarget = target;
      if (isCascade && ctx.isCascadeActive && ctx.cascadeEnemyTeam && ctx.cascadeEnemyTeam.length > 0) {
        cascadeTarget = ctx.cascadeEnemyTeam[Math.floor(Math.random() * ctx.cascadeEnemyTeam.length)];
      }

      // Calculate damage for this attack
      let finalDamage = baseDamage;

      // Critical hit (independent for each attack)
      const critChance = Math.min((attacker.stats.crit / 100), 0.40);
      // For Tir Critique (precise) with ignoreDodge = true, force critical hit
      const isCrit = ignoreDodge || Math.random() < critChance;

      if (isCrit) {
        let critMult = 1.5 + (attacker.stats.crit / 100) * 0.25;

        // Bonus crit multiplier from skill (e.g., Tir Critique)
        if (effects.critDamageBonus) {
          critMult += effects.critDamageBonus;
        }

        finalDamage = Math.floor(finalDamage * critMult);
        if (ignoreDodge) {
          log.push({
            text: `💥 COUP GARANTI CRITICAL HIT [#{attackNum}/ cascade] sur ${cascadeTarget.name}! Dégâts: ${finalDamage} (${critMult.toFixed(2)}x)`,
            type: "critical",
          });
        } else {
          log.push({
            text: `💥 CRITICAL HIT [#{attackNum}/ cascade] sur ${cascadeTarget.name}! Dégâts: ${finalDamage} (${critMult.toFixed(2)}x)`,
            type: "critical",
          });
        }
      }

      // Apply damage
      cascadeTarget.currentHP = Math.max(0, cascadeTarget.currentHP - finalDamage);
      attacker.damageDealt += finalDamage;
      totalDamageDealt += finalDamage;
      cascadeTotal += finalDamage;

      // Check for KO
      if (cascadeTarget.currentHP <= 0) {
        attacker.kills++;
        log.push({
          text: `💀 ${cascadeTarget.name} est KO!`,
          type: "critical",
        });
        // Don't break - continue cascade to next random target
      }

      // Log each cascade attack SEPARATELY
      if (isCascade) {
        log.push({
          text: `${attacker.name} 💨 Assaut rapide [#${attackNum}/${cascadeChances.length}] sur ${cascadeTarget.name}: ${finalDamage} dégâts${isCrit ? " 💥 CRITICAL" : ""}${ignoreDodge ? " (COUP GARANTI)" : ""}`,
          type: isCrit ? "critical" : "damage",
        });
      }

      // Don't break - continue cascade to next random target
    }

    // Summary log for cascade
    if (isCascade && cascadeChances.length > 1) {
      log.push({
        text: `🔁 ${skill.name}: ${attackNum} attaque(s) pour un total de ${cascadeTotal} dégâts sur les ennemis!`,
        type: "damage",
      });
    } else {
      // Normal single attack log
      const normCritChance = Math.min((attacker.stats.crit / 100), 0.40);
      const normIsCrit = Math.random() < normCritChance;
      let normDamage = baseDamage;
      if (normIsCrit) {
        let normCritMult = 1.5 + (attacker.stats.crit / 100) * 0.25;
        if (effects.critDamageBonus) normCritMult += effects.critDamageBonus;
        normDamage = Math.floor(normDamage * normCritMult);
      }

      log.push({
        text: `${attacker.name} utilise ${skill.name} sur ${target.name}: ${normDamage} dégâts${normIsCrit ? " 💥 CRITICAL" : ""}${ignoreDodge ? " (COUP GARANTI - ignore esquive)" : ""}`,
        type: normIsCrit ? "critical" : "damage",
      });
    }
  });
  
  // Apply recoil damage AFTER all targets processed (for AOE recoil calculation)
  if (effects.recoilPercent && totalDamageDealt > 0) {
    const recoilDamage = Math.floor(totalDamageDealt * effects.recoilPercent);
    attacker.currentHP = Math.max(0, attacker.currentHP - recoilDamage);
    log.push({
      text: `${attacker.name} subit ${recoilDamage} dégâts de recul (${totalDamageDealt} dégâts infligés)`,
      type: "damage",
    });
  }
}

// ============================================================================
// HEAL EFFECTS
// ============================================================================

function applyHealEffect(ctx: SkillExecutionContext, targets: BattleCreature[]): void {
  const { attacker, skill, log } = ctx;
  const effects = skill.effects;

  const healPercent = effects.healPercent || skill.value || 0;
  const selfSacrifice = effects.selfSacrificePercent || 0;

  targets.forEach(target => {
    // Calculate heal amount
    const maxHP = Math.floor(target.stats.hp);
    const healAmount = Math.floor(maxHP * healPercent);
    
    // Calculate self sacrifice (if any)
    let selfDamage = 0;
    if (selfSacrifice > 0) {
      selfDamage = Math.floor(attacker.stats.hp * selfSacrifice);
      // Apply self damage
      attacker.currentHP = Math.max(0, attacker.currentHP - selfDamage);
      
      log.push({
        text: `${attacker.name} sacrifie ${selfDamage} HP (${Math.floor(selfSacrifice * 100)}%)`,
        type: "damage",
      });
    }

    // Apply heal
    const oldHP = target.currentHP;
    target.currentHP = Math.min(maxHP, target.currentHP + healAmount);
    const actualHealed = target.currentHP - oldHP;

    if (actualHealed > 0) {
      log.push({
        text: `${attacker.name} utilise ${skill.name} sur ${target.name}: +${actualHealed}/${healAmount} HP (${Math.floor(healPercent * 100)}% du max)`,
        type: "skill",
      });
    } else {
      log.push({
        text: `${attacker.name} utilise ${skill.name} sur ${target.name} (HP deja full)`,
        type: "info",
      });
    }
  });
}

// ============================================================================
// BUFF EFFECTS
// ============================================================================

function applySpeedBuffEffect(ctx: SkillExecutionContext, targets: BattleCreature[]): void {
  const { attacker, skill, log } = ctx;
  const effects = skill.effects;

  const speedBonus = effects.speedBonus || skill.value || 0;
  const duration = effects.effectDuration || skill.duration || 2;

  targets.forEach(target => {
    addBuff(
      target,
      BuffType.SPEED,
      speedBonus,
      duration,
      skill.name,
      attacker.id,
      log
    );

    const newSpeed = getEffectiveSpeed(target);
    log.push({
      text: `${attacker.name} utilise ${skill.name} sur ${target.name}: VIT +${Math.floor(speedBonus * 100)}% (nouvelle VIT: ${newSpeed}, ${duration} tours)`,
      type: "skill",
    });
  });
}

function applyDefenseBuffEffect(ctx: SkillExecutionContext, targets: BattleCreature[]): void {
  const { attacker, skill, log } = ctx;
  const effects = skill.effects;
  const isForteresseLvl5 = skill.archetype === "protective" && skill.level === 5;

  const damageReduction = effects.damageReduction || effects.defenseRedirect || 0;
  const duration = effects.effectDuration || skill.duration || 2;

  targets.forEach(target => {
    const finalReduction = isForteresseLvl5 ? 0.30 : damageReduction;

    addBuff(
      target,
      BuffType.DEFENSE,
      finalReduction,
      duration,
      skill.name,
      attacker.id,
      log
    );

    const bonusHP = Math.floor(target.stats.defense * finalReduction);
    log.push({
      text: `${attacker.name} utilise ${skill.name} sur ${target.name}: DEF +${Math.floor(finalReduction * 100)}% (${bonusHP} effective DEF, ${duration} tours)`,
      type: "skill",
    });
  });
}

function applyAttackBuffEffect(ctx: SkillExecutionContext, targets: BattleCreature[]): void {
  const { attacker, skill, log } = ctx;
  const effects = skill.effects;

  const attackBonus = effects.offenseMultiplier || effects.selfBoostPercent || skill.value || 0;
  const duration = effects.effectDuration || skill.duration || 1;

  targets.forEach(target => {
    addBuff(
      target,
      BuffType.ATTACK,
      attackBonus,
      duration,
      skill.name,
      attacker.id
    );

    const bonusAtk = Math.floor(target.stats.attack * attackBonus);
    log.push({
      text: `${attacker.name} utilise ${skill.name} sur ${target.name}: ATK +${Math.floor(attackBonus * 100)}% (+${bonusAtk}, ${duration} tours)`,
      type: "skill",
    });
  });
}

function applyDefenseRedirectEffect(ctx: SkillExecutionContext, team: BattleTeam): void {
  const { attacker, skill, log } = ctx;
  const effects = skill.effects;

  const defBoostPercent = effects.defenseRedirect || skill.value || 0;
  const duration = effects.effectDuration || skill.duration || 2;
  const hasTauntEffect = effects.taunt || false;

  // Apply DEF buff (tank becomes tankier)
  addBuff(
    attacker,
    BuffType.DEFENSE,
    defBoostPercent,
    duration,
    skill.name,
    attacker.id
  );

  // Apply taunt buff if Forteresse has taunt effect
  if (hasTauntEffect) {
    addBuff(
      attacker,
      BuffType.TAUNT,
      1.0,  // Taunt is binary, value doesn't matter
      duration,
      skill.name,
      attacker.id
    );
  }

  log.push({
    text: `${attacker.name} utilise ${skill.name}: DEF +${Math.floor(defBoostPercent * 100)}%${hasTauntEffect ? " + TAUNT" : ""} (${duration} tours)`,
    type: "skill",
  });
}

// ============================================================================
// DEBUFF EFFECTS
// ============================================================================

function applyDebuffEffect(ctx: SkillExecutionContext, targets: BattleCreature[]): void {
  const { attacker, skill, log } = ctx;
  const effects = skill.effects;

  const debuffPercent = effects.enemyDebuffPercent || skill.value || 0;
  const duration = effects.effectDuration || skill.duration || 1;

  targets.forEach(target => {
    addBuff(target, BuffType.ATTACK, debuffPercent, duration, skill.name, attacker.id, log);
    addBuff(target, BuffType.DEFENSE, debuffPercent, duration, skill.name, attacker.id, log);
    addBuff(target, BuffType.SPEED, debuffPercent, duration, skill.name, attacker.id, log);

    log.push({
      text: `${attacker.name} utilise ${skill.name} sur ${target.name}: Toutes stats ${Math.floor(debuffPercent * 100)}% (${duration} tours)`,
      type: "skill",
    });
  });
}

function applyPoisonEffect(ctx: SkillExecutionContext, targets: BattleCreature[]): void {
  const { attacker, skill, log } = ctx;
  const effects = skill.effects;

  const poisonPercent = effects.poisonPercent || 0;
  const poisonSelfDamage = effects.poisonSelfDamage || 0;
  const duration = effects.effectDuration || skill.duration || 2;

  targets.forEach(target => {
    addBuff(
      target,
      BuffType.POISON,
      poisonPercent,
      duration,
      skill.name,
      attacker.id
    );

    const maxHP = Math.floor(target.stats.hp);
    const poisonDamage = Math.floor(maxHP * poisonPercent);
    log.push({
      text: `${attacker.name} utilise ${skill.name} sur ${target.name}: Poison ${Math.floor(poisonPercent * 100)}% (${poisonDamage} dégâts/tour, ${duration} tours)`,
      type: "skill",
    });
  });

  // Self poison (Piquer Soignant level 5)
  if (poisonSelfDamage > 0) {
    const selfPoisonDamage = Math.floor(attacker.stats.hp * poisonSelfDamage);
    addBuff(
      attacker,
      BuffType.POISON,
      poisonSelfDamage,
      duration,
      skill.name,
      attacker.id
    );

    log.push({
      text: `${attacker.name} s'empoisonne aussi: ${Math.floor(poisonSelfDamage * 100)}% propres dégâts/tour`,
      type: "skill",
    });
  }
}

// ============================================================================
// SPECIAL EFFECTS (Roue du Destin + Miroir des Âmes)
// ============================================================================

function applyRoueDuDestinCooldownReset(ctx: SkillExecutionContext, targets: BattleCreature[]): void {
  const { attacker, log, battleContext, skill } = ctx;

  // Get attacker's ally team (find which team contains the attacker)
  const playerCreatures = battleContext?.playerTeam?.creatures || [];
  const enemyCreatures = battleContext?.enemyTeam?.creatures || [];

  const allyTeam = playerCreatures.some(c => c.id === attacker.id)
    ? playerCreatures
    : enemyCreatures;

  if (!allyTeam || allyTeam.length === 0) {
    log.push({
      text: `🎰 Roue du Destin: ${attacker.name} active le mystère mais aucune équipe disponible!`,
      type: "info",
    });
    return;
  }

  // Find all allies with active cooldowns (>=1 turn remaining)
  const alliesWithCooldowns: Array<{ creature: BattleCreature; cooldowns: string[] }> = [];

  allyTeam.forEach(creature => {
    if (creature.currentHP <= 0) return;
    if (!creature.creature.personalitySkill && !creature.creature.specimenSkill) return;

    const creatureCooldowns: string[] = [];

    // Check personality skill cooldown
    if (creature.creature.personalitySkill) {
      const cooldownKey = `${creature.creature.personalitySkill.name}_personality_${creature.name}`;
      if (creature.skillCooldowns[cooldownKey] !== undefined && creature.skillCooldowns[cooldownKey] > 0) {
        creatureCooldowns.push(creature.creature.personalitySkill.name);
      }
    }

    // Check specimen skill cooldown
    if (creature.creature.specimenSkill) {
      const cooldownKey = `${creature.creature.specimenSkill.name}_specimen_${creature.name}`;
      if (creature.skillCooldowns[cooldownKey] !== undefined && creature.skillCooldowns[cooldownKey] > 0) {
        creatureCooldowns.push(creature.creature.specimenSkill.name);
      }
    }

    if (creatureCooldowns.length > 0) {
      // Allow target to be attacker (self-cast) if it's the only surviving ally
      const isSelf = creature.id === attacker.id;
      const hasOtherAllies = allyTeam.some(c => c.id !== attacker.id && c.currentHP > 0);

      if (hasOtherAllies) {
        // Multiple allies: prefer others over self
        if (!isSelf) {
          alliesWithCooldowns.push({ creature, cooldowns: creatureCooldowns });
        }
      } else {
        // Only survivor (just attacker alive): allow self-cast
        alliesWithCooldowns.push({ creature, cooldowns: creatureCooldowns });
      }
    }
  });

  if (alliesWithCooldowns.length === 0) {
    log.push({
      text: `🎰 Roue du Destin: ${attacker.name} n'a pas d'alliés avec cooldown actif!`,
      type: "info",
    });
    return;
  }

  // Reset cooldowns for the target ally
  let targetAlly: BattleCreature;
  let skillsReset: string[] = [];

  if (skill.level === 5) {
    // Level 5: Choose the ally with most cooldowns (strategic)
    alliesWithCooldowns.sort((a, b) => b.cooldowns.length - a.cooldowns.length);
    const bestChoice = alliesWithCooldowns[0];
    targetAlly = bestChoice.creature;
    skillsReset = bestChoice.cooldowns;
    log.push({
      text: `🎰🎰 Roue du Destin NIVEAU 5: ${attacker.name} choisit stratégiquement ${targetAlly.name}!`,
      type: "skill",
    });
  } else {
    // Level 1-4: Random
    const randomChoice = alliesWithCooldowns[Math.floor(Math.random() * alliesWithCooldowns.length)];
    targetAlly = randomChoice.creature;
    skillsReset = randomChoice.cooldowns;
  }

  // Reset cooldowns
  skillsReset.forEach(skillName => {
    const personalitySkill = targetAlly.creature.personalitySkill;
    const specimenSkill = targetAlly.creature.specimenSkill;

    if (personalitySkill && personalitySkill.name === skillName) {
      const cooldownKey = `${skillName}_personality_${targetAlly.name}`;
      targetAlly.skillCooldowns[cooldownKey] = 0;
    }

    if (specimenSkill && specimenSkill.name === skillName) {
      const cooldownKey = `${skillName}_specimen_${targetAlly.name}`;
      targetAlly.skillCooldowns[cooldownKey] = 0;
    }
  });

  // Different log message if self-cast vs ally cast
  const isSelfCast = targetAlly.id === attacker.id;
  if (isSelfCast) {
    log.push({
      text: `🎰 Roue du Destin: ${attacker.name} se régénère mystérieusement! (${skillsReset.join(", ")}) sont maintenant disponibles!`,
      type: "skill",
    });
  } else {
    log.push({
      text: `🎰 Roue du Destin: ${attacker.name} a activé ${targetAlly.name}! (${skillsReset.join(", ")}) sont maintenant disponibles!`,
      type: "skill",
    });
  }
}

// Helper to format buff type for logging
function formatBuffName(type: BuffType): string {
  const names: Record<BuffType, string> = {
    [BuffType.ATTACK]: "+ATK",
    [BuffType.DEFENSE]: "+DEF",
    [BuffType.DODGE]: "+DODGE",
    [BuffType.HEAL]: "HEAL",
    [BuffType.SPEED]: "+SPD",
    [BuffType.POISON]: "POISON",
    [BuffType.SLOW]: "SLOW",
    [BuffType.STUN]: "STUN",
    [BuffType.TAUNT]: "TAUNT",
  };
  return names[type] || type;
}
