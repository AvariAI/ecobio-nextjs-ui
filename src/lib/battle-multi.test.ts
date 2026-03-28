/**
 * Example usage of the multi-row positioning system
 * This file demonstrates how to use the new position-aware battle features
 */

import {
  createBattleTeam,
  switchPositions,
  selectTargetByPosition,
  isFrontRow,
  isBackRow,
  getFrontRowPositions,
  getBackRowPositions,
  getFrontRowAlive,
  getBackRowAlive,
  executeCreatureTurn,
} from "./battle-multi";
import {
  createBattleCreature,
} from "./battle";
import { BattleLogEntry } from "./battle";

// Example: Setting up a 3v3 battle with positioning

function setup3v3Battle() {
  // For this example, we'll use mock creature templates
  const mockTemplates = {
    tank: { id: "tank", name: "Tank Creature", baseStats: { hp: 500, attack: 50, defense: 150, speed: 50, crit: 50 }, desc: "", skill: { name: "Shield", description: "", effect: "defense", value: 0.5, duration: 2, cooldown: 3, target: "self" } },
    dps: { id: "dps", name: "DPS Creature", baseStats: { hp: 250, attack: 100, defense: 50, speed: 100, crit: 100 }, desc: "", skill: { name: "Snipe", description: "", effect: "attack", value: 1.2, duration: 1, cooldown: 4, target: "back" } },
    support: { id: "support", name: "Support Creature", baseStats: { hp: 350, attack: 75, defense: 100, speed: 90, crit: 60 }, desc: "", skill: { name: "Heal", description: "", effect: "defense", value: 0.3, duration: 2, cooldown: 3, target: "self" } },
  };

  const mockStats = {
    tank: { hp: 500, attack: 50, defense: 150, speed: 50, crit: 50, rank: "E" as const },
    dps: { hp: 250, attack: 100, defense: 50, speed: 100, crit: 100, rank: "E" as const },
    support: { hp: 350, attack: 75, defense: 100, speed: 90, crit: 60, rank: "E" as const },
  };

  // Create player team (positions auto-assigned based on array order)
  const playerTeam = createBattleTeam([
    { creatureTemplate: mockTemplates.tank, stats: mockStats.tank, name: "Front Tank" },      // Position 0 (front row)
    { creatureTemplate: mockTemplates.dps, stats: mockStats.dps, name: "Back DPS 1" },         // Position 1 (back row, priority)
    { creatureTemplate: mockTemplates.support, stats: mockStats.support, name: "Back Support" }, // Position 2 (back row)
  ], "player");

  // Create enemy team
  const enemyTeam = createBattleTeam([
    { creatureTemplate: mockTemplates.tank, stats: mockStats.tank, name: "Enemy Tank" },
    { creatureTemplate: mockTemplates.dps, stats: mockStats.dps, name: "Enemy DPS 1" },
    { creatureTemplate: mockTemplates.support, stats: mockStats.support, name: "Enemy Support" },
  ], "enemy");

  return { playerTeam, enemyTeam };
}

// Example: Using position-aware targeting
function examplePositionAwareTargeting() {
  const { playerTeam, enemyTeam } = setup3v3Battle();

  // Check position layout
  console.log("Front row positions (3v3):", getFrontRowPositions(3));  // [0]
  console.log("Back row positions (3v3):", getBackRowPositions(3));    // [1, 2]

  // Check if specific positions are front/back row
  console.log("Position 0 is front row?", isFrontRow(0, 3));  // true
  console.log("Position 1 is back row?", isBackRow(1, 3));    // true
  console.log("Position 2 is back row?", isBackRow(2, 3));    // true

  // Get alive creatures in each row
  const frontRow = getFrontRowAlive(playerTeam, 3);
  const backRow = getBackRowAlive(playerTeam, 3);

  console.log("Front row alive:", frontRow.map(c => c.name));
  console.log("Back row alive:", backRow.map(c => c.name));

  // Select target with front-row priority
  const attacker = playerTeam.creatures[0];
  const target = selectTargetByPosition(attacker, enemyTeam, 3, "front");
  console.log("Selected target:", target?.name);  // Should prioritize front row creature

  // Select target for back-row snipe skill
  const snipeTarget = selectTargetByPosition(attacker, enemyTeam, 3, "back");
  console.log("Snipe target:", snipeTarget?.name);  // Can target back row directly
}

// Example: Position switching
function examplePositionSwitch() {
  const { playerTeam, enemyTeam } = setup3v3Battle();
  const log: BattleLogEntry[] = [];

  // Switch positions of two creatures (simulates player action)
  const creatureA = playerTeam.creatures[0];  // Front tank (pos 0)
  const creatureB = playerTeam.creatures[1];  // Back DPS (pos 1)

  console.log("Before switch:");
  console.log("  ", creatureA.name, "at position", creatureA.position);
  console.log("  ", creatureB.name, "at position", creatureB.position);

  switchPositions(playerTeam, creatureA, creatureB, log);

  console.log("After switch:");
  console.log("  ", creatureA.name, "now at position", creatureA.position);
  console.log("  ", creatureB.name, "now at position", creatureB.position);
  console.log("Log:", log[0]?.text);
}

// Example: AI turn with position targeting
function exampleAITurn() {
  const { playerTeam, enemyTeam } = setup3v3Battle();
  const log: BattleLogEntry[] = [];

  // Simulate an AI turn for an enemy creature
  const enemyCreature = enemyTeam.creatures[0];

  // Execute turn with AI auto-play (uses position-aware targeting)
  const turnLog = executeCreatureTurn(
    enemyCreature,
    enemyTeam,
    playerTeam,
    true,  // isAuto
    3     // teamSize
  );

  console.log("AI Turn Log:");
  turnLog.forEach(entry => console.log("  ", entry.text));
}

// Example: Setting up a 5v5 battle
function setup5v5Battle() {
  const mockTemplates = {
    tank1: { id: "tank1", name: "Tank 1", baseStats: { hp: 500, attack: 50, defense: 150, speed: 50, crit: 50 }, desc: "", skill: { name: "Shield", description: "", effect: "defense", value: 0.5, duration: 2, cooldown: 3, target: "self" } },
    tank2: { id: "tank2", name: "Tank 2", baseStats: { hp: 500, attack: 50, defense: 150, speed: 50, crit: 50 }, desc: "", skill: { name: "Shield", description: "", effect: "defense", value: 0.5, duration: 2, cooldown: 3, target: "self" } },
    dps1: { id: "dps1", name: "DPS 1", baseStats: { hp: 250, attack: 100, defense: 50, speed: 100, crit: 100 }, desc: "", skill: { name: "Snipe", description: "", effect: "attack", value: 1.2, duration: 1, cooldown: 4, target: "back" } },
    dps2: { id: "dps2", name: "DPS 2", baseStats: { hp: 250, attack: 100, defense: 50, speed: 100, crit: 100 }, desc: "", skill: { name: "Snipe", description: "", effect: "attack", value: 1.2, duration: 1, cooldown: 4, target: "back" } },
    support: { id: "support", name: "Support", baseStats: { hp: 350, attack: 75, defense: 100, speed: 90, crit: 60 }, desc: "", skill: { name: "Heal", description: "", effect: "defense", value: 0.3, duration: 2, cooldown: 3, target: "self" } },
  };

  const mockStats = {
    tank1: { hp: 500, attack: 50, defense: 150, speed: 50, crit: 50, rank: "E" as const },
    tank2: { hp: 500, attack: 50, defense: 150, speed: 50, crit: 50, rank: "E" as const },
    dps1: { hp: 250, attack: 100, defense: 50, speed: 100, crit: 100, rank: "E" as const },
    dps2: { hp: 250, attack: 100, defense: 50, speed: 100, crit: 100, rank: "E" as const },
    support: { hp: 350, attack: 75, defense: 100, speed: 90, crit: 60, rank: "E" as const },
  };

  // Create player team with 2 tanks in front row, 2 DPS + 1 support in back row
  const playerTeam = createBattleTeam([
    { creatureTemplate: mockTemplates.tank1, stats: mockStats.tank1, name: "Front Tank 1" },    // Position 0 (front)
    { creatureTemplate: mockTemplates.tank2, stats: mockStats.tank2, name: "Front Tank 2" },    // Position 1 (front)
    { creatureTemplate: mockTemplates.dps1, stats: mockStats.dps1, name: "Back DPS 1" },       // Position 2 (back, priority)
    { creatureTemplate: mockTemplates.dps2, stats: mockStats.dps2, name: "Back DPS 2" },       // Position 3 (back)
    { creatureTemplate: mockTemplates.support, stats: mockStats.support, name: "Back Support" }, // Position 4 (back)
  ], "player");

  console.log("5v5 Front row positions:", getFrontRowPositions(5));  // [0, 1]
  console.log("5v5 Back row positions:", getBackRowPositions(5));    // [2, 3, 4]

  return playerTeam;
}

// Run examples (commented out to avoid execution on import)
// examplePositionAwareTargeting();
// examplePositionSwitch();
// exampleAITurn();
// setup5v5Battle();

export {
  examplePositionAwareTargeting,
  examplePositionSwitch,
  exampleAITurn,
  setup3v3Battle,
  setup5v5Battle,
};
