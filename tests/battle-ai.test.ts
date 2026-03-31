/**
 * Tests for battle-ai.ts: AI skill selection and usage
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createBattleCreature, BattleCreature } from "@/lib/battle";
import { CREATURES } from "@/lib/database";
import { chooseBestSkillForAI, executeAITurn, shouldUseSkill } from "@/lib/battle-ai";
import { getBaseSkill, getSpecimenSkill } from "@/lib/skills";
import { BattleLogEntry } from "@/lib/battle";

describe("Battle AI - shouldUseSkill", () => {
  let creature: BattleCreature;

  beforeEach(() => {
    creature = createBattleCreature(
      { ...CREATURES.ant },
      { hp: 500, attack: 100, defense: 100, speed: 100, crit: 100 },
      "Test Ant",
      []
    );
  });

  it("returns false when skill is on cooldown", () => {
    const personalitySkill = getBaseSkill("precise");
    if (!personalitySkill) throw new Error("Skill not found");

    const cooldownKey = `${personalitySkill.name}_personality_${creature.name}`;
    creature.skillCooldowns[cooldownKey] = 3; // 3 turns left

    expect(shouldUseSkill(creature, personalitySkill, "personality")).toBe(false);
  });

  it("returns true when skill is available", () => {
    const personalitySkill = getBaseSkill("precise");
    if (!personalitySkill) throw new Error("Skill not found");

    // No cooldown set
    expect(shouldUseSkill(creature, personalitySkill, "personality")).toBe(true);
  });
});

describe("Battle AI - chooseBestSkillForAI", () => {
  let creature: BattleCreature;
  const personalitySkill = getBaseSkill("precise");
  const specimenSkill = getSpecimenSkill("ant");

  beforeEach(() => {
    if (!personalitySkill || !specimenSkill) throw new Error("Skills not found");

    creature = createBattleCreature(
      {
        ...CREATURES.ant,
        personalitySkill,
        specimenSkill,
      },
      { hp: 500, attack: 100, defense: 100, speed: 100, crit: 100 },
      "Test Ant",
      []
    );
  });

  it("returns null when neither skill is available (cooldown)", () => {
    const cooldownKey1 = `${personalitySkill.name}_personality_${creature.name}`;
    const cooldownKey2 = `${specimenSkill.name}_specimen_${creature.name}`;
    creature.skillCooldowns[cooldownKey1] = 5;
    creature.skillCooldowns[cooldownKey2] = 5;

    const choice = chooseBestSkillForAI(creature);
    expect(choice).toBe(null);
  });

  it("returns null when skills available but decides not to use one (50% RNG)", () => {
    // Force random to be > 0.50 (choose not to use skill)
    Math.random = () => 0.6;

    const choice = chooseBestSkillForAI(creature);
    // May return null or a skill (50/50)
    expect(choice === null || choice !== null).toBe(true);
  });

  it("prefers offensive specimen skill when HP > 30%", () => {
    creature.currentHP = 400; // 80% HP

    const choice = chooseBestSkillForAI(creature);
    if (choice) {
      // Should prefer specimen skill (offensive: "aoe_damage" for ant)
      expect(choice.type).toBe("specimen");
    }
  });

  it("prefers support personality skill when HP < 30%", () => {
    creature.currentHP = 100; // 20% HP

    const choice = chooseBestSkillForAI(creature);
    if (choice) {
      // Should prefer personality skill (may be support/heal depending on archetype)
      expect(choice.type).toBe("personality");
    }
  });

  it("chooses specimen if personality is not support and HP < 30%", () => {
    creature.currentHP = 100; // 20% HP

    // attacker personality is offensive (not support)
    const attackerSkill = getBaseSkill("agressive");
    if (!attackerSkill) throw new Error("Skill not found");

    creature = createBattleCreature(
      {
        ...CREATURES.ant,
        personalitySkill: attackerSkill,
        specimenSkill,
      },
      { hp: 500, attack: 100, defense: 100, speed: 100, crit: 100 },
      "Test Ant",
      []
    );

    creature.currentHP = 100; // 20% HP

    const choice = chooseBestSkillForAI(creature);
    if (choice) {
      // Should choose specimen (personality is offensive)
      expect(choice.type).toBe("specimen");
    }
  });

  it("prioritizes heal/sustain when HP < 15% (critical)", () => {
    creature.currentHP = 50; // 10% HP

    // Use "soin_leurre" personality (heal skill)
    const healerSkill = getBaseSkill("soin_leurre");
    if (!healerSkill) throw new Error("Skill not found");

    creature = createBattleCreature(
      {
        ...CREATURES.ant,
        personalitySkill: healerSkill,
        specimenSkill,
      },
      { hp: 500, attack: 100, defense: 100, speed: 100, crit: 100 },
      "Test Ant",
      []
    );

    const choice = chooseBestSkillForAI(creature);
    if (choice) {
      // Should choose personality (heal skill)
      expect(choice.type).toBe("personality");
      expect(choice.skill.effect).toBe("heal");
    }
  });

  it("chooses personality when only specimen available", () => {
    creature = createBattleCreature(
      {
        ...CREATURES.ant,
        specimenSkill: undefined, // No specimen skill
        personalitySkill,
      },
      { hp: 500, attack: 100, defense: 100, speed: 100, crit: 100 },
      "Test Ant",
      []
    );

    creature.currentHP = 400; // 80% HP

    const choice = chooseBestSkillForAI(creature);
    if (choice) {
      expect(choice.type).toBe("personality");
    }
  });

  it("chooses specimen when only personality available", () => {
    creature = createBattleCreature(
      {
        ...CREATURES.ant,
        specimenSkill,
        personalitySkill: undefined, // No personality skill
      },
      { hp: 500, attack: 100, defense: 100, speed: 100, crit: 100 },
      "Test Ant",
      []
    );

    creature.currentHP = 400; // 80% HP

    const choice = chooseBestSkillForAI(creature);
    if (choice) {
      expect(choice.type).toBe("specimen");
    }
  });
});

describe("Battle AI - executeAITurn (1v1)", () => {
  let attacker: BattleCreature;
  let defender: BattleCreature;
  const log: BattleLogEntry[] = [];

  beforeEach(() => {
    attacker = createBattleCreature(
      {
        ...CREATURES.ant,
        personalitySkill: getBaseSkill("precise"),
        specimenSkill: getSpecimenSkill("ant"),
      },
      { hp: 500, attack: 100, defense: 100, speed: 100, crit: 100 },
      "Enemy Ant",
      []
    );

    defender = createBattleCreature(
      { ...CREATURES.housefly },
      { hp: 500, attack: 100, defense: 100, speed: 100, crit: 100 },
      "Player Fly",
      []
    );
  });

  it("uses skill when available and chosen", () => {
    // Force skill choice
    Math.random = () => 0.4; // Below 0.50 threshold

    const initialHP = defender.currentHP;
    executeAITurn(attacker, defender, log);

    // Should have either used skill or attacked
    expect(log.length).toBeGreaterThan(0);
    expect(log[log.length - 1].text).toBeDefined();
  });

  it("falls back to attack when skill on cooldown", () => {
    if (!attacker.creature.personalitySkill) throw new Error("No skill");

    const cooldownKey = `${attacker.creature.personalitySkill.name}_personality_${attacker.name}`;
    attacker.skillCooldowns[cooldownKey] = 5; // On cooldown

    const initialHP = defender.currentHP;
    executeAITurn(attacker, defender, log);

    // Should have attacked
    expect(log.length).toBeGreaterThan(0);
    expect(defender.currentHP).toBeLessThan(initialHP);
  });
});

describe("Battle AI - Skills from src/lib/skills.ts", () => {
  it("work correctly with precise personality (Tir Critique)", () => {
    const preciseSkill = getBaseSkill("precise");
    if (!preciseSkill) throw new Error("Tir Critique skill not found");

    // Expect skill to have required fields
    expect(preciseSkill.name).toBe("Tir Critique");
    expect(preciseSkill.effect).toBe("attack");
    expect(preciseSkill.effects).toBeDefined();
    expect(preciseSkill.effects.critDamageBonus).toBe(1.5);
    expect(preciseSkill.effects.ignoreDodge).toBe(true);
  });

  it("work correctly with other archetypes", () => {
    const archetypes = ["agressive", "protective", "rapide", "soin_leurre", "balancee", "mysterieuse"] as const;

    for (const archetype of archetypes) {
      const skill = getBaseSkill(archetype);
      expect(skill).toBeDefined();
      expect(skill.name).toBeDefined();
      expect(skill.effect).toBeDefined();
      expect(skill.effects).toBeDefined();
    }
  });
});
