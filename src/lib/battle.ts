/**
 * ÉcoBio Battle System - Overhaul Version v2
 * Ant/Fly mechanics, dodge/crit overhaul, skills, cooldowns, RNG, rarity, traits
 */

import { Creature, BaseStats, Rank, RANK_MULTIPLIERS } from "./database";
import { applyTraits as applyTraitEffects, getTraitsByIds } from "./traits";
import { calculateCombatXP } from "./combat-xp";

export interface BattleElement {
  creature: BattleCreature;
  team: "player" | "enemy" | "attacker" | "defender";
  name: string;
}

// Battle team interface (used by both battle.ts and battle-multi.ts)
export interface BattleTeam {
  creatures: BattleCreature[];
  teamId: "player" | "enemy";
}

/**
 * Get round order for multiple creatures based on speed
 * Higher speed = attacks FIRST (turn-based order)
 * Uses effective speed (accounts for Slow status effect)
 * @returns BattleElement[] sorted by speed DESCENDING (fastest to slowest)
 */
export function getRoundOrder(creatures: BattleElement[]): BattleElement[] {
  return [...creatures].sort(
    (a, b) => getEffectiveSpeed(b.creature) - getEffectiveSpeed(a.creature)
  );
}

export interface BattleStats extends BaseStats {
  rank: Rank;
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
  DODGE = "dodge",
  HEAL = "heal",
  POISON = "poison",
  SLOW = "slow",
  STUN = "stun",
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
  sourceCreatureId: string
): void {
  const buffId = generateBuffId(sourceSkillId, sourceCreatureId, type);
  creature.buffs[buffId] = {
    type,
    value,
    turnsRemaining: turns,
    sourceSkillId,
    sourceCreatureId,
  };
}

/**
 * Get all buffs of a specific type
 */
export function getBuffsByType(creature: BattleCreature, type: BuffType): ActiveBuff[] {
  return Object.values(creature.buffs).filter(b => b.type === type);
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

  // Also check legacy statusEffects for backward compatibility
  const slowEffects = getStatusEffects(creature, StatusEffectType.SLOW);
  for (const effect of slowEffects) {
    totalSlowReduction += effect.value || 0;
  }

  // Cap at 50% reduction
  totalSlowReduction = Math.min(totalSlowReduction, 0.5);
  return Math.floor(creature.stats.speed * (1 - totalSlowReduction));
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
  const reflectedDamage = applyTraitOnDamageTaken(defender, damage, attacker, log);
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
 */
function applyTraitOnDamageTaken(
  defender: BattleCreature,
  damage: number,
  attacker: BattleCreature,
  log: BattleLogEntry[]
): number {
  const traits = getTraitsByIds(defender.traits);
  let reflectedDamage = 0;

  for (const trait of traits) {
    if (trait.id === "epines") {
      // Épines: Reflect X% of damage back to attacker
      const reflectPercent = 0.2; // 20% reflection (will vary by rarity)
      reflectedDamage += Math.floor(damage * reflectPercent);
    }
  }

  return reflectedDamage;
}

/**
 * Apply trait effects when attacking
 */
function applyTraitOnAttack(
  attacker: BattleCreature,
  defender: BattleCreature,
  log: BattleLogEntry[]
): void {
  const traits = getTraitsByIds(attacker.traits);

  for (const trait of traits) {
    if (trait.id === "slowTrait") {
      const attacksNeeded = 3; // Every 3 attacks
      if (attacker.attackCounter % attacksNeeded === 0) {
        const slowAmount = 0.15; // 15% speed reduction
        addStatusEffect(defender, StatusEffectType.SLOW, 2, slowAmount);
        log.push({
          text: `🐌 ${defender.name} est ralentit (${Math.floor(slowAmount * 100)}% SPD) pour 2 tours!`,
          type: "info",
        });
      }
    } else if (trait.id === "venom") {
      const poisonChance = 0.3; // 30% chance to apply poison
      if (Math.random() < poisonChance) {
        const poisonDamage = 0.06; // 6% HP per turn
        addStatusEffect(defender, StatusEffectType.POISON, 3, poisonDamage);
        log.push({
          text: `☠️ ${defender.name} est empoisonné!`,
          type: "info",
        });
      }
    } else if (trait.id === "coupBas") {
      const defenderHpPercent = defender.currentHP / defender.stats.hp;
      const myHpPercent = attacker.currentHP / attacker.stats.hp;
      // When my HP < 20%, chance to stun target
      if (myHpPercent < 0.2 && Math.random() < 0.25) {
        addStatusEffect(defender, StatusEffectType.STUN, 1);
        log.push({
          text: `💫 ${defender.name} est étourdi par Coup Bas!`,
          type: "info",
        });
      }
    }
  }
}

/**
 * Calculate damage based on attack and defense
 * Formula: attack * (attack / (attack + defense))
 */
export function calculateDamage(attacker: BattleCreature, defender: BattleCreature): number {
  const atk = attacker.stats.attack;
  const def = defender.stats.defense;

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
  targetTeam?: BattleTeam | null
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

  // Determine target for logging
  const isSelfBuff = skill.target === "self" || (!target && skill.target !== "ally");
  const targetCreature = isSelfBuff ? battleCreature : target!;
  const targetName = isSelfBuff ? "soi-même" : target!.name;

  // Map skill effect to BuffType
  let buffType: BuffType;
  if (skill.effect === "defense") {
    buffType = BuffType.DEFENSE;
  } else if (skill.effect === "dodge") {
    buffType = BuffType.DODGE;
  } else if (skill.effect === "attack") {
    buffType = BuffType.ATTACK;
  } else if (skill.effect === "heal") {
    buffType = BuffType.HEAL;
  } else if (skill.effect === "aoe_damage") {
    // Handle AOE skills actually dealing damage (ant's mandibles, fly's infiltration)

    // Select targets (use direct target for 1v1, position logic for 3v3/5v5)
    let targets: BattleCreature[] = [];
    if (targetTeam) {
      // Multi-battle mode: front row, back row, or all
      const teamSize = targetTeam.creatures.length;
      if (skill.target === "front") {
        // Front row: positions 0 (1v1/3v3) or 0-1 (5v5)
        const frontPositions = teamSize === 5 ? [0, 1] : teamSize === 3 ? [0] : [0];
        targets = targetTeam.creatures.filter(c => c.currentHP > 0 && c.position !== undefined && frontPositions.includes(c.position));

        // Fallback: if front row is empty, target all enemies
        if (targets.length === 0) {
          targets = targetTeam.creatures.filter(c => c.currentHP > 0);
          log.push({
            text: `${battleCreature.name} s'adapte: rangée avant vide, cible tous les ennemis`,
            type: "info",
          });
        }
      } else if (skill.target === "back") {
        // Back row: positions 1-2 (3v3) or 2-3-4 (5v5)
        const backPositions = teamSize === 5 ? [2, 3, 4] : teamSize === 3 ? [1, 2] : [];
        targets = targetTeam.creatures.filter(c => c.currentHP > 0 && c.position !== undefined && backPositions.includes(c.position));

        // Fallback: if back row is empty, target random enemy
        if (targets.length === 0) {
          const aliveTargets = targetTeam.creatures.filter(c => c.currentHP > 0);
          targets = aliveTargets.length > 0 ? [aliveTargets[Math.floor(Math.random() * aliveTargets.length)]] : [];
          log.push({
            text: `${battleCreature.name} s'adapte: rangée arrière vide, cible aléatoire`,
            type: "info",
          });
        }
      } else if (skill.target === "all") {
        targets = targetTeam.creatures.filter(c => c.currentHP > 0);
      } else {
        const aliveTargets = targetTeam.creatures.filter(c => c.currentHP > 0);
        targets = aliveTargets.length > 0 ? [aliveTargets[Math.floor(Math.random() * aliveTargets.length)]] : [];
      }
    } else {
      // 1v1 mode: use the direct target
      if (target && target.currentHP > 0) {
        targets = [target];
      } else {
        log.push({
          text: `${battleCreature.name} utilise ${skill.name} (aucune cible)`,
          type: "info",
        });
        battleCreature.skillCooldowns[cooldownKey] = skill.cooldown;
        return false;
      }
    }

    // Deal damage
    targets.forEach(target => {
      const damage = Math.floor(battleCreature.stats.attack * skill.value);
      const finalDamage = Math.max(1, damage - Math.floor(target.stats.defense / 2));
      target.currentHP = Math.max(0, target.currentHP - finalDamage);

      log.push({
        text: `${battleCreature.name} utilise ${skill.name} sur ${target.name}: ${finalDamage} dégâts`,
        type: "damage",
      });

      battleCreature.damageDealt += finalDamage;

      if (target.currentHP <= 0) {
        battleCreature.kills++;
        log.push({
          text: `💀 ${target.name} est KO!`,
          type: "critical",
        });
      }
    });

    battleCreature.skillCooldowns[cooldownKey] = skill.cooldown;
    return true;
  } else if (skill.effect === "debuff") {
    // For debuffs (slow), directly apply status effect
    if (!targetTeam) {
      log.push({
        text: `${battleCreature.name} utilise ${skill.name} (aucune cible disponible)`,
        type: "info",
      });
      return false;
    }

    // Apply to all alive enemies
    const allEnemies = targetTeam.creatures.filter(c => c.currentHP > 0);
    if (allEnemies.length > 0) {
      // Apply slow status to each enemy
      allEnemies.forEach(enemy => {
        enemy.statusEffects.push({
          type: StatusEffectType.SLOW,
          duration: skill.duration || 2,
          value: skill.value || 0.15, // 15% slow
        });
      });
      log.push({
        text: `${battleCreature.name} utilise ${skill.name} sur toute l'équipe ennemie (VIT -${Math.floor((skill.value || 0.15) * 100)}% pour ${skill.duration} tours)`,
        type: "skill",
      });
    }

    battleCreature.skillCooldowns[cooldownKey] = skill.cooldown;
    return true;
  } else {
    // Fallback for other skill types - log without creating buff
    log.push({
      text: `${battleCreature.name} utilise ${skill.name} (${st === "specimen" ? "spécimen" : "personnalité"}) sur ${targetName}!`,
      type: "skill",
    });
    battleCreature.skillCooldowns[cooldownKey] = skill.cooldown;
    return true;
  }

  // Apply skill effect using addBuff (NEW system)
  addBuff(
    targetCreature,
    buffType,
    skill.value,
    skill.duration,
    skillName,  // Use skill.name as sourceSkillId since interface doesn't have id field
    battleCreature.id
  );

  // Detailed logging
  if (skill.effect === "defense") {
    const buffedDef = Math.floor(targetCreature.stats.defense * (1 + skill.value));
    log.push({
      text: `${battleCreature.name} utilise ${skill.name} sur ${targetName} (DEF ${targetCreature.stats.defense} → ${buffedDef}, +${Math.floor(skill.value * 100)}% pour ${skill.duration} tours)`,
      type: "skill",
    });
  } else if (skill.effect === "dodge") {
    log.push({
      text: `${battleCreature.name} utilise ${skill.name} sur ${targetName} (Dodge +${Math.floor(skill.value * 100)}% pour ${skill.duration} tours)`,
      type: "skill",
    });
  } else if (skill.effect === "attack") {
    const buffedAtk = Math.floor(targetCreature.stats.attack * (1 + skill.value));
    log.push({
      text: `${battleCreature.name} utilise ${skill.name} sur ${targetName} (ATK ${targetCreature.stats.attack} → ${buffedAtk}, +${Math.floor(skill.value * 100)}% pour ${skill.duration} tours)`,
      type: "skill",
    });
  }

  battleCreature.skillCooldowns[cooldownKey] = skill.cooldown;
  return true;
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
 */
export function applyTraitRegeneration(
  battleCreature: BattleCreature,
  log: BattleLogEntry[]
): void {
  const hpPercent = battleCreature.currentHP / battleCreature.stats.hp;
  const traitMods = applyTraitModifiers(battleCreature, hpPercent);

  if (traitMods.regenPerTurn > 0 && battleCreature.currentHP > 0) {
    const regenAmount = Math.floor(battleCreature.stats.hp * traitMods.regenPerTurn);
    const oldHP = battleCreature.currentHP;
    battleCreature.currentHP = Math.min(battleCreature.stats.hp, battleCreature.currentHP + regenAmount);
    const actualHeal = battleCreature.currentHP - oldHP;

    if (actualHeal > 0) {
      log.push({
        text: `${battleCreature.name} se régénère (+${actualHeal} HP)`,
        type: "info",
      });
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
 * Apply trait effects to battle stats
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
  const hpPercent = creature.currentHP / creature.stats.hp;

  // Apply creature's traits with conditional context if available
  let statsContext: any = {};
  if (targetHpPercent !== undefined) {
    statsContext.targetHpPercent = targetHpPercent;
  }

  const traitEffects = applyTraitEffects(creature.traits, hpPercent, statsContext);

  return {
    critRateBonus: traitEffects.critRateAdjustment,
    critMultBonus: traitEffects.critMultAdjustment,
    damageDealtMult: traitEffects.damageDealtMult,
    damageReceivedMult: traitEffects.damageReceivedMult,
    dodgeBonus: traitEffects.dodgeAdjustment,
    regenPerTurn: traitEffects.regenPerTurn,
  };
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
  position?: number
): BattleCreature {
  return {
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
