import { Creature, BaseStats, DamageType } from "./database";

export interface BattleStats extends BaseStats {}

/**
 * Calculate final stats based on level and photo quality
 */
export function calculateFinalStats(
  creature: Creature,
  level: number,
  photoQuality: number
): BattleStats {
  const qualityFactor = photoQuality / 100.0;
  const statRoll = Math.random() * (1.2 - 0.8) + 0.8 * (1 + qualityFactor * 0.1);

  const stats: BattleStats = {
    hp: Math.floor(creature.baseStats.hp * level * 0.1 + (creature.baseStats.hp * 0.5) * statRoll),
    attack: Math.floor(creature.baseStats.attack * level * 0.08 * statRoll),
    speed: Math.floor(creature.baseStats.speed * level * 0.05 * statRoll),
  };

  return stats;
}

/**
 * Calculate damage between two creatures
 */
export function calculateDamage(
  attacker: Creature,
  defender: Creature,
  attackerStats: BattleStats,
  defenderStats: BattleStats,
  damageType: DamageType
): number {
  const baseDamage = attackerStats.attack * 0.8;

  // Type bonus
  let typeBonus = 1.0;
  const defBonus = defender.typeBonus;
  for (const [tType, bonus] of Object.entries(defBonus)) {
    if ((damageType === (tType as DamageType) || tType === "all")) {
      typeBonus = bonus;
      break;
    }
  }

  // Random variance
  const variance = Math.random() * (1.1 - 0.9) + 0.9;

  return Math.max(1, Math.floor(baseDamage * typeBonus * variance));
}

export interface BattleLogEntry {
  text: string;
  type?: "info" | "critical" | "damage" | "victory" | "defeat";
}

export interface BattleResult {
  winner: "player" | "enemy" | "draw" | "timeout";
  rounds: number;
  playerHP: number;
  enemyHP: number;
  log: BattleLogEntry[];
}

/**
 * Simulate a complete battle
 */
export function simulateBattle(
  playerCreature: Creature,
  enemyCreature: Creature,
  playerLevel: number,
  playerQuality: number,
  enemyLevel: number,
  enemyQuality: number,
  damageType: DamageType
): BattleResult {
  const playerStats = calculateFinalStats(playerCreature, playerLevel, playerQuality);
  const enemyStats = calculateFinalStats(enemyCreature, enemyLevel, enemyQuality);

  // Determine initiative
  const playerInitiative = playerStats.speed * (Math.random() * (1.2 - 1.0) + 1.0);
  const enemyInitiative = enemyStats.speed * (Math.random() * (1.2 - 1.0) + 1.0);
  const playerFirst = playerInitiative >= enemyInitiative;

  let playerHP = playerStats.hp;
  let enemyHP = enemyStats.hp;
  let round = 1;
  const log: BattleLogEntry[] = [];

  log.push({ text: "🎯 Battle Start!", type: "info" });
  log.push({
    text: `🔵 ${playerCreature.name} (Lvl ${playerLevel})`,
    type: "info",
  });
  log.push({
    text: `   HP: ${playerHP} | ATK: ${playerStats.attack} | SPD: ${playerStats.speed}`,
    type: "info",
  });
  log.push({
    text: `🔴 ${enemyCreature.name} (Lvl ${enemyLevel})`,
    type: "info",
  });
  log.push({
    text: `   HP: ${enemyHP} | ATK: ${enemyStats.attack} | SPD: ${enemyStats.speed}`,
    type: "info",
  });
  log.push({ text: "", type: "info" });

  // Combat loop
  while (playerHP > 0 && enemyHP > 0 && round <= 20) {
    log.push({ text: `--- Round ${round} ---`, type: "info" });

    // Critical hit chance calculation
    const getCritChance = (levelDiff: number) => 0.05 + levelDiff * 0.02;
    const isCrit = (chance: number) => Math.random() < chance;

    if (playerFirst) {
      // Player attacks
      let damage = calculateDamage(
        playerCreature,
        enemyCreature,
        playerStats,
        enemyStats,
        damageType
      );
      const critChance = getCritChance(playerLevel - enemyLevel);

      if (isCrit(critChance)) {
        damage = Math.floor(damage * 2.0);
        log.push({ text: "💥 CRITICAL HIT!", type: "critical" });
      }

      enemyHP = Math.max(0, enemyHP - damage);
      log.push({
        text: `🔵 ${playerCreature.name} attacks with ${damageType}!`,
        type: "damage",
      });
      log.push({
        text: `   Deals ${damage} damage! (Enemy HP: ${enemyHP})`,
        type: "damage",
      });

      if (enemyHP <= 0) {
        log.push({ text: "", type: "info" });
        log.push({ text: "🏆 VICTORY! Your creature wins!", type: "victory" });
        break;
      }

      // Enemy attacks
      const enemyDamageType = ["normal", "grass", "water", "ground", "air"][
        Math.floor(Math.random() * 5)
      ] as DamageType;
      let enemyDamage = calculateDamage(
        enemyCreature,
        playerCreature,
        enemyStats,
        playerStats,
        enemyDamageType
      );

      if (isCrit(0.05)) {
        enemyDamage = Math.floor(enemyDamage * 2.0);
        log.push({ text: "💥 Enemy CRITICAL!", type: "critical" });
      }

      playerHP = Math.max(0, playerHP - enemyDamage);
      log.push({
        text: `🔴 ${enemyCreature.name} attacks with ${enemyDamageType}!`,
        type: "damage",
      });
      log.push({
        text: `   Deals ${enemyDamage} damage! (Your HP: ${playerHP})`,
        type: "damage",
      });

      if (playerHP <= 0) {
        log.push({ text: "", type: "info" });
        log.push({ text: "💀 DEFEAT! Your creature was defeated...", type: "defeat" });
        break;
      }
    } else {
      // Enemy attacks first
      const enemyDamageType = ["normal", "grass", "water", "ground", "air"][
        Math.floor(Math.random() * 5)
      ] as DamageType;
      let enemyDamage = calculateDamage(
        enemyCreature,
        playerCreature,
        enemyStats,
        playerStats,
        enemyDamageType
      );

      if (isCrit(0.05)) {
        enemyDamage = Math.floor(enemyDamage * 2.0);
        log.push({ text: "💥 Enemy CRITICAL!", type: "critical" });
      }

      playerHP = Math.max(0, playerHP - enemyDamage);
      log.push({
        text: `🔴 ${enemyCreature.name} attacks with ${enemyDamageType}!`,
        type: "damage",
      });
      log.push({
        text: `   Deals ${enemyDamage} damage! (Your HP: ${playerHP})`,
        type: "damage",
      });

      if (playerHP <= 0) {
        log.push({ text: "", type: "info" });
        log.push({ text: "💀 DEFEAT! Your creature was defeated...", type: "defeat" });
        break;
      }

      // Player attacks
      let damage = calculateDamage(
        playerCreature,
        enemyCreature,
        playerStats,
        enemyStats,
        damageType
      );
      const critChance = getCritChance(playerLevel - enemyLevel);

      if (isCrit(critChance)) {
        damage = Math.floor(damage * 2.0);
        log.push({ text: "💥 CRITICAL HIT!", type: "critical" });
      }

      enemyHP = Math.max(0, enemyHP - damage);
      log.push({
        text: `🔵 ${playerCreature.name} attacks with ${damageType}!`,
        type: "damage",
      });
      log.push({
        text: `   Deals ${damage} damage! (Enemy HP: ${enemyHP})`,
        type: "damage",
      });

      if (enemyHP <= 0) {
        log.push({ text: "", type: "info" });
        log.push({ text: "🏆 VICTORY! Your creature wins!", type: "victory" });
        break;
      }
    }

    log.push({ text: "", type: "info" });
    round++;
  }

  if (round > 20) {
    log.push({ text: "⏱️ TIME OUT! Battle ended in a draw.", type: "info" });
  }

  const winner: BattleResult["winner"] =
    playerHP > enemyHP ? "player" : enemyHP > playerHP ? "enemy" : round > 20 ? "timeout" : "draw";

  return {
    winner,
    rounds: round - 1,
    playerHP,
    enemyHP,
    log,
  };
}
