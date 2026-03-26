/**
 * ÉcoBio Battle System - Overhaul Version
 * With Ant/Fly mechanics, dodge formulas, crit system, skills, cooldowns
 */

import { Creature, BaseStats, DamageType, Rank, RANK_MULTIPLIERS } from "./database";

export interface BattleStats extends BaseStats {
  rank: Rank;
}

export interface SkillCooldowns {
  [skillName: string]: number; // Current cooldown count
}

export interface ActiveBuffs {
  defenseBuff: number; // +0.25 for Carapace Renforcée
  dodgeBuff: number; // +0.25 for Esquive Aérienne
  defenseBuffTurns: number; // Remaining turns
  dodgeBuffTurns: number; // Remaining turns
}

export interface BattleCreature {
  creature: Creature;
  stats: BattleStats;
  currentHP: number;
  skillCooldowns: SkillCooldowns;
  buffs: ActiveBuffs;
  name: string; // For logging
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
 * Rank multipliers
 */
export function getRankMultiplier(rank: Rank): number {
  return RANK_MULTIPLIERS[rank] || 1.0;
}

/**
 * Calculate final stats with level scaling and rank multiplier
 * Level Scaling Option 4:
 * - HP: Base × (1 + level × 0.3) × 3.0 × rankMult
 * - ATK/DEF/SPD: Base × (1 + level × 0.16) × 2.0 × rankMult
 * - Crit: Base × rankMult
 */
export function calculateFinalStats(
  creature: Creature,
  level: number,
  rank: Rank = "E"
): BattleStats {
  const rankMult = getRankMultiplier(rank);

  // HP scaling: ×3.0 (level × 0.3)
  const hp = Math.floor(
    creature.baseStats.hp * (1 + level * 0.3) * 3.0 * rankMult
  );

  // ATK/DEF/SPD scaling: ×2.0 (level × 0.16)
  const attack = Math.floor(
    creature.baseStats.attack * (1 + level * 0.16) * 2.0 * rankMult
  );
  const defense = Math.floor(
    creature.baseStats.defense * (1 + level * 0.16) * 2.0 * rankMult
  );
  const speed = Math.floor(
    creature.baseStats.speed * (1 + level * 0.16) * 2.0 * rankMult
  );

  // Crit just gets rank multiplier
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

/**
 * Calculate damage using overhaul formula
 * Damage = (ATK × 1.5) - DEF
 * Min damage: 1
 */
export function calculateDamage(attacker: BattleCreature, defender: BattleCreature): number {
  const baseDamage = attacker.stats.attack * 1.5;
  const defense = defender.stats.defense * (1 + defender.buffs.defenseBuff);
  const damage = baseDamage - defense;
  return Math.max(1, Math.floor(damage));
}

/**
 * Calculate dodge chance
 * Dodge % = log(SPD_diff + 1) × 10%
 * Where SPD_diff = attacker SPD - defender SPD (negative means defender faster)
 * Capped at 75%
 */
export function calculateDodgeChance(
  attackerSpeed: number,
  defenderSpeed: number,
  dodgeBuff: number = 0
): number {
  const spdDiff = attackerSpeed - defenderSpeed;
  const logValue = Math.log10(Math.abs(spdDiff) + 1);
  const dodgePercent = logValue * 0.1 + dodgeBuff; // Base dodge + buff

  // Cap at 75%
  return Math.min(0.75, Math.max(0.0, dodgePercent));
}

/**
 * Calculate critical hit chance
 * Crit % = score / (score + 200)
 * Where score = Base Crit + (SPD / 10)
 */
export function calculateCritChance(stats: BattleStats): number {
  const score = stats.crit + stats.speed / 10;
  return score / (score + 200);
}

/**
 * Determine creature with initiative
 * Faster speed = higher chance to go first
 */
export function determineInitiative(
  player: BattleCreature,
  enemy: BattleCreature
): boolean {
  const playerRoll = player.stats.speed * (0.9 + Math.random() * 0.2);
  const enemyRoll = enemy.stats.speed * (0.9 + Math.random() * 0.2);
  return playerRoll >= enemyRoll;
}

/**
 * Use an active skill
 * Returns true if successful (cooldown ready)
 */
export function useSkill(
  battleCreature: BattleCreature,
  log: BattleLogEntry[]
): boolean {
  const skill = battleCreature.creature.skill;
  if (!skill) return false;

  // Check cooldown
  const cooldownKey = skill.name;
  const cooldown = battleCreature.skillCooldowns[cooldownKey] || 0;
  if (cooldown > 0) {
    log.push({
      text: `${battleCreature.name} se prépare à utiliser ${skill.name}... (Cooldown: ${cooldown} tours)`,
      type: "info",
    });
    return false;
  }

  // Apply buff
  if (skill.effect === "defense") {
    battleCreature.buffs.defenseBuff = skill.value;
    battleCreature.buffs.defenseBuffTurns = skill.duration;
    log.push({
      text: `✨ ${battleCreature.name} utilise ${skill.name}! DEF +${skill.value * 100}% pendant ${skill.duration} tours`,
      type: "skill",
    });
  } else if (skill.effect === "dodge") {
    battleCreature.buffs.dodgeBuff = skill.value;
    battleCreature.buffs.dodgeBuffTurns = skill.duration;
    log.push({
      text: `✨ ${battleCreature.name} utilise ${skill.name}! Esquive +${skill.value * 100}% pendant ${skill.duration} tours`,
      type: "skill",
    });
  }

  // Set cooldown
  battleCreature.skillCooldowns[cooldownKey] = skill.cooldown;
  return true;
}

/**
 * Decrement cooldowns and buff durations
 */
export function tickCooldownsAndBuffs(battleCreature: BattleCreature): void {
  // Decrement skill cooldowns
  for (const [skillName, cd] of Object.entries(battleCreature.skillCooldowns)) {
    if (cd > 0) {
      battleCreature.skillCooldowns[skillName] = cd - 1;
    }
  }

  // Decrement buff durations
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
 * Execute a single attack turn
 * Returns damage dealt, or 0 if dodged
 */
export function executeAttack(
  attacker: BattleCreature,
  defender: BattleCreature,
  log: BattleLogEntry[]
): number {
  // Calculate dodge chance
  const dodgeChance = calculateDodgeChance(
    attacker.stats.speed,
    defender.stats.speed,
    defender.buffs.dodgeBuff
  );

  // Roll for dodge
  if (Math.random() < dodgeChance) {
    log.push({
      text: `💨 ${defender.name} esquive l'attaque! (${(dodgeChance * 100).toFixed(1)}% chance)`,
      type: "dodge",
    });
    return 0;
  }

  // Calculate damage
  let damage = calculateDamage(attacker, defender);

  // Check for crit
  const critChance = calculateCritChance(attacker.stats);
  const isCrit = Math.random() < critChance;
  if (isCrit) {
    damage = Math.floor(damage * 1.5); // ×1.5 crit multiplier
    log.push({
      text: `💥 CRITICAL HIT! Dégâts ×1.5 (${(critChance * 100).toFixed(1)}% chance)`,
      type: "critical",
    });
  }

  // Apply damage
  const oldHP = defender.currentHP;
  defender.currentHP = Math.max(0, defender.currentHP - damage);
  log.push({
    text: `🔵 ${attacker.name} attaque! Dégâts: ${damage} (HP: ${oldHP} → ${defender.currentHP})`,
    type: "damage",
  });

  return damage;
}

/**
 * Simulate a complete battle
 */
export function simulateBattle(
  playerCreature: Creature,
  enemyCreature: Creature,
  playerLevel: number,
  playerRank: Rank,
  enemyLevel: number,
  enemyRank: Rank
): BattleResult {
  const playerStats = calculateFinalStats(playerCreature, playerLevel, playerRank);
  const enemyStats = calculateFinalStats(enemyCreature, enemyLevel, enemyRank);

  const player: BattleCreature = {
    creature: playerCreature,
    stats: playerStats,
    currentHP: playerStats.hp,
    skillCooldowns: {},
    buffs: {
      defenseBuff: 0,
      dodgeBuff: 0,
      defenseBuffTurns: 0,
      dodgeBuffTurns: 0,
    },
    name: `${playerCreature.name} (R${playerRank} L${playerLevel})`,
  };

  const enemy: BattleCreature = {
    creature: enemyCreature,
    stats: enemyStats,
    currentHP: enemyStats.hp,
    skillCooldowns: {},
    buffs: {
      defenseBuff: 0,
      dodgeBuff: 0,
      defenseBuffTurns: 0,
      dodgeBuffTurns: 0,
    },
    name: `${enemyCreature.name} (R${enemyRank} L${enemyLevel})`,
  };

  const playerFirst = determineInitiative(player, enemy);
  const log: BattleLogEntry[] = [];

  log.push({ text: "⚔️ BATTLE START!", type: "info" });
  log.push({ text: "—".repeat(40), type: "info" });
  log.push({ text: `${player.name}`, type: "info" });
  log.push({
    text: `HP: ${player.currentHP} | ATK: ${player.stats.attack} | DEF: ${player.stats.defense} | SPD: ${player.stats.speed}`,
    type: "info",
  });
  log.push({ text: `${enemy.name}`, type: "info" });
  log.push({
    text: `HP: ${enemy.currentHP} | ATK: ${enemy.stats.attack} | DEF: ${enemy.stats.defense} | SPD: ${enemy.stats.speed}`,
    type: "info",
  });
  log.push({ text: "—" * 40, type: "info" });

  // Combat loop
  let round = 1;
  while (player.currentHP > 0 && enemy.currentHP > 0 && round <= 20) {
    log.push({ text: `\n--- Tour ${round} ---`, type: "info" });

    const { attacker, defender } = playerFirst
      ? { attacker: player, defender: enemy }
      : { attacker: enemy, defender: player };

    // Decay cooldowns/buffs from previous turn
    tickCooldownsAndBuffs(attacker);
    tickCooldownsAndBuffs(defender);

    // Player turn
    if (playerFirst) {
      // Player action would go here (Attack or Skill)
      executeAttack(player, enemy, log);

      if (enemy.currentHP <= 0) {
        log.push({ text: "", type: "info" });
        log.push({ text: "🏆 VICTORY! Ta créature gagne!", type: "victory" });
        break;
      }

      // Enemy attacks
      executeAttack(enemy, player, log);

      if (player.currentHP <= 0) {
        log.push({ text: "", type: "info" });
        log.push({ text: "💀 DEFEAT! Ta créature est vaincue...", type: "defeat" });
        break;
      }
    } else {
      // Enemy attacks first
      executeAttack(enemy, player, log);

      if (player.currentHP <= 0) {
        log.push({ text: "", type: "info" });
        log.push({ text: "💀 DEFEAT! Ta créature est vaincue...", type: "defeat" });
        break;
      }

      // Player attacks
      executeAttack(player, enemy, log);

      if (enemy.currentHP <= 0) {
        log.push({ text: "", type: "info" });
        log.push({ text: "🏆 VICTORY! Ta créature gagne!", type: "victory" });
        break;
      }
    }

    round++;
  }

  if (round > 20) {
    log.push({ text: "\n⏱️ TIME OUT! En match nul.", type: "info" });
  }

  const winner: BattleResult["winner"] =
    player.currentHP > enemy.currentHP
      ? "player"
      : enemy.currentHP > player.currentHP
      ? "enemy"
      : round > 20
      ? "timeout"
      : "draw";

  return {
    winner,
    rounds: round - 1,
    playerHP: player.currentHP,
    enemyHP: enemy.currentHP,
    log,
  };
}
