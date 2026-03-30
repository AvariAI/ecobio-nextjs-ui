/**
 * ÉcoBio Battle System - Version v3 (Refactored for Skills)
 * Clean interfaces: Buff[] instead of individual buff fields
 * Skills are typed objects from skills.ts
 */

import { Creature, BaseStats, Rank } from "./database";

// Import Skill from new skills system
import { Skill } from "./skills";

export interface BattleStats extends BaseStats {
  rank: Rank;
}

export enum BuffType {
  ATTACK_BOOST = "attack_boost",
  DEFENSE_BOOST = "defense_boost",
  DODGE_BOOST = "dodge_boost",
  HEAL = "heal",
  POISON = "poison",
  ATK_DEBUFF = "atk_debuff",
  DEF_DEBUFF = "def_debuff",
  SPD_DEBUFF = "spd_debuff",
  CRIT_BOOST = "crit_boost",
  CRIT_DEBUFF = "crit_debuff",
  DMG_REDIRECT = "dmg_redirect",
  RECOIL = "recoil",
  REDIRECT_REDUCED = "redirect_reduced",
  STAT_BOOST = "stat_boost",
  STAT_DEBUFF = "stat_debuff",
  DODGE_HEAL = "dodge_heal",
  POISON_SELF = "poison_self",
}

export interface ActiveBuff {
  type: BuffType;
  value: number;
  turnsRemaining: number;
  sourceSkillId: string;
  sourceCreatureId: string;
}

export enum StatusEffectType {
  STUN = "stun",
  POISON = "poison",
  SLOW = "slow",
}

export interface ActiveBuffs {
  // Index signature for string keys that are NOT the reserved property names
  [key: string]: ActiveBuff | undefined;
}

export interface StatusEffect {
  type: StatusEffectType;
  duration: number;
  value?: number;
}

export interface SkillCooldowns {
  [skillId: string]: number;
}

export interface ActiveSkill {
  skill: Skill;
  cooldownRemaining: number;
  activationTime: number;
  targetCreatureIds: string[];
}

export interface StatModifiers {
  hpBonus: number;
  attackBonus: number;
  defenseBonus: number;
  speedBonus: number;
  critBonus: number;
}

export interface BattleCreature {
  creature: Creature;
  stats: BattleStats;
  currentHP: number;
  maxHP: number;  // Track max HP for healing calculations
  skillCooldowns: SkillCooldowns;
  buffs: { [type: string]: ActiveBuff | undefined };
  activeSkill?: ActiveSkill;
  skills: Skill[];
  name: string;
  traits: string[];
  baseStats?: BattleStats;
  statModifiers?: StatModifiers;
  statusEffects: StatusEffect[];
  attackCounter: number;
  position?: number;
  damageDealt: number;
  kills: number;
  id: string;
}

export interface BattleElement {
  creature: BattleCreature;
  team: "player" | "enemy" | "attacker" | "defender";
  name: string;
}

// ================== Buff Management Functions ==================

/**
 * Add a buff to a creature
 */
export function addBuff(
  creature: BattleCreature,
  type: BuffType,
  value: number,
  turnsRemaining: number,
  sourceSkillId: string,
  sourceCreatureId: string
): void {
  // Remove existing buff of same type if it exists
  removeBuff(creature, type);

  creature.buffs[type] = {
    type,
    value,
    turnsRemaining,
    sourceSkillId,
    sourceCreatureId,
  };
}

/**
 * Remove a specific buff from a creature
 */
export function removeBuff(creature: BattleCreature, type: BuffType): void {
  delete creature.buffs[type];
}

/**
 * Get a specific buff from a creature
 */
export function getBuff(creature: BattleCreature, type: BuffType): ActiveBuff | undefined {
  return creature.buffs[type];
}

/**
 * Get all buffs as an array
 */
export function getAllBuffs(creature: BattleCreature): ActiveBuff[] {
  return Object.values(creature.buffs).filter((b): b is ActiveBuff => b !== undefined);
}

/**
 * Decrement buff turns
 */
export function decrementBuffTurns(creature: BattleCreature): ActiveBuff[] {
  const expired: ActiveBuff[] = [];

  Object.values(creature.buffs).forEach((buff) => {
    if (!buff) return;
    buff.turnsRemaining--;
    if (buff.turnsRemaining <= 0) {
      expired.push(buff);
      delete creature.buffs[buff.type];
    }
  });

  return expired;
}

/**
 * Clear all buffs from a creature
 */
export function clearBuffs(creature: BattleCreature): void {
  creature.buffs = {};
}

// ================== Status Effect Functions ==================

/**
 * Add a status effect to a creature
 */
export function addStatusEffect(
  creature: BattleCreature,
  type: StatusEffectType,
  duration: number,
  value?: number
): void {
  const existingIndex = creature.statusEffects.findIndex(e => e.type === type);
  if (existingIndex !== -1 && type === StatusEffectType.SLOW) {
    const existing = creature.statusEffects[existingIndex];
    const maxValue = (existing.value || 0) + (value || 0);
    creature.statusEffects[existingIndex] = {
      type,
      duration: Math.max(duration, existing.duration),
      value: Math.min(maxValue, 0.5),
    };
  } else if (existingIndex === -1) {
    creature.statusEffects.push({ type, duration, value });
  }
}

/**
 * Remove a status effect
 */
export function removeStatusEffect(creature: BattleCreature, type: StatusEffectType): void {
  creature.statusEffects = creature.statusEffects.filter(e => e.type !== type);
}

/**
 * Check if creature has a specific status effect
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
 * Get effective speed with slow effects
 */
export function getEffectiveSpeed(creature: BattleCreature): number {
  const slowEffects = getStatusEffects(creature, StatusEffectType.SLOW);
  let totalSlowReduction = 0;
  for (const effect of slowEffects) {
    totalSlowReduction += effect.value || 0;
  }
  totalSlowReduction = Math.min(totalSlowReduction, 0.5);
  return Math.floor(creature.stats.speed * (1 - totalSlowReduction));
}

// ================== Skill Functions ==================

/**
 * Check if a skill is on cooldown
 */
export function isSkillOnCooldown(creature: BattleCreature, skillId: string): boolean {
  const cooldown = creature.skillCooldowns[skillId];
  return cooldown !== undefined && cooldown > 0;
}

/**
 * Set skill cooldown
 */
export function setSkillCooldown(
  creature: BattleCreature,
  skillId: string,
  cooldown: number
): void {
  creature.skillCooldowns[skillId] = cooldown;
}

/**
 * Decrement all skill cooldowns
 */
export function decrementSkillCooldowns(creature: BattleCreature): void {
  Object.keys(creature.skillCooldowns).forEach(skillId => {
    creature.skillCooldowns[skillId]--;
    if (creature.skillCooldowns[skillId] <= 0) {
      delete creature.skillCooldowns[skillId];
    }
  });
}

/**
 * Activate a skill
 */
export function activateSkill(
  creature: BattleCreature,
  skill: Skill,
  targetCreatureIds: string[]
): void {
  creature.activeSkill = {
    skill,
    cooldownRemaining: skill.cooldown,
    activationTime: Date.now(),
    targetCreatureIds,
  };

  setSkillCooldown(creature, skill.id, skill.cooldown);
}

// ================== Getting Creature Index Strings ==================

/**
 * Get skill display name with level
 */
export function getSkillDisplayName(skill: Skill): string {
  return `${skill.name} (Lvl ${skill.level})`;
}

/**
 * Get skill cooldown status
 */
export function getSkillCooldownStatus(creature: BattleCreature, skillId: string): string {
  const cooldown = creature.skillCooldowns[skillId];
  if (cooldown && cooldown > 0) {
    return `${cooldown} CD`;
  }
  return "Ready";
}
