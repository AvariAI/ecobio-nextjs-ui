"use client";

import { useState, useEffect } from "react";
import { CREATURES, Rank, RANKS, Creature } from "@/lib/database";
import { getSpecimenSkill } from "@/lib/skills";
import {
  BattleCreature,
  calculateFinalStats,
  calculateScaledStats,
  executeAttack,
  useSkill,
  tickCooldownsAndBuffs,
  tickStatusEffects,
  applyTraitRegeneration,
  applyStatusEffects,
  getEffectiveSpeed,
  BattleLogEntry,
  createBattleCreature,
  BattleElement,
  getBuffExpirationMessages,
  calculateXPRewards,
  // BACKWARD COMPATIBILITY: Buff getters for UI
  getDefenseBuff,
  getAttackBuff,
  getDodgeBuff,
  getDefenseBuffTurns,
  getAttackBuffTurns,
  getDodgeBuffTurns,
} from "@/lib/battle";
import { getTraitsByIds, applyTraitStatModifiers } from "@/lib/traits";
import { applyCombatXP } from "@/lib/combat-xp";
import { TeamSize, BattleTeam, getAllBattleElements, executeCreatureTurn, isTeamBattleOver, getTeamBattleWinner, validateTeamSize, createBattleTeam, countAliveCreatures, switchPositions, selectTargetByPosition } from "@/lib/battle-multi";
import { MultiCreatureTestSelector, MultiCreatureCollectionSelector, SlotConfig } from "./multi-battle-components";
import { MultiCreatureBattleDisplay, MultiCreatureBattleCompleteDisplay, BattleLogDisplay as MultiBattleLogDisplay } from "./multi-battle-display";
import { generateRandomEnemyTeam, spawnEasyModeEnemy } from "@/lib/easy-mode";
import Link from "next/link";

type HuntingPhase = "ready" | "spawned" | "viewing";

type RarityRank = "E" | "D" | "C" | "B" | "A" | "S" | "S+";

interface HuntedCreature extends Creature {
  id: string;
  finalStats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    crit: number;
    rank: Rank;
  };
  customStats: any;
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  varianceBreakdown: any;
  feedCount: number;
  feedStat: "hp" | "atk" | "def" | "spd" | "crit" | null;
  createdAt: number;
  creatureId: string;
  traits: string[];
  isFavorite: boolean;

  // Star progression
  stars: number; // 0-5 (visual progression only, no unlocks)
  combatXP: number;
  combatXPToNextStar: number;
  battlesWon: number;
  battlesTotal: number;

  // Exploration system
  isOnMission: boolean; // True if creature is on exploration mission
}

function getCreatureImage(creatureId: string, rank: Rank): string {
  if (creatureId === "housefly") {
    const rankSuffix = rank === "S+" ? "S+" : rank;
    return `/creatures/fly-rank-${rankSuffix}.png`;
  }
  if (creatureId === "ant") {
    const rankSuffix = rank === "S+" ? "S+" : rank;
    return `/creatures/ant_rank_${rankSuffix}.png`;
  }
  if (creatureId === "honeybee") {
    const rankSuffix = rank === "S+" ? "S+" : rank;
    return `/creatures/bee-rank-${rankSuffix}.png`;
  }
  if (creatureId === "spider_mutant") {
    return `/images/creatures/spider_mutant_e.png`;
  }
  return `/images/creatures/spider_mutant_e.png`; // Fallback
}

type BattlePhase = "setup" | "battle" | "complete";

function formatBuffChange(
  buffType: string,
  oldValue: number,
  newValue: number
): string {
  const diffNumeric = (newValue - oldValue) * 100;
  const sign = diffNumeric > 0 ? "+" : "";
  return `${buffType} ${sign}${diffNumeric.toFixed(0)}%`;
}

export default function BattlePage() {
  // Mode: "test" (default, brute stats) or "easy" (use hunting creatures)
  const [battleMode, setBattleMode] = useState<"test" | "easy">("test");

  // Team size: 1v1, 3v3, or 5v5
  const [teamSize, setTeamSize] = useState<TeamSize>(1);

  // Test mode state
  const [playerCreatureId, setPlayerCreatureId] = useState("ant");
  const [playerLevel, setPlayerLevel] = useState(10);
  const [playerRank, setPlayerRank] = useState<Rank>("E");
  const [enemyCreatureId, setEnemyCreatureId] = useState("housefly");
  const [enemyLevel, setEnemyLevel] = useState(10);
  const [enemyRank, setEnemyRank] = useState<Rank>("E");

  // Multi-slot test mode state
  const [playerSlotConfigs, setPlayerSlotConfigs] = useState<SlotConfig[]>([
    { creatureId: "ant", level: 10, rank: "E" },
    { creatureId: "", level: 10, rank: "E" },
    { creatureId: "", level: 10, rank: "E" },
    { creatureId: "", level: 10, rank: "E" },
    { creatureId: "", level: 10, rank: "E" },
  ]);
  const [enemySlotConfigs, setEnemySlotConfigs] = useState<SlotConfig[]>([
    { creatureId: "housefly", level: 10, rank: "E" },
    { creatureId: "", level: 10, rank: "E" },
    { creatureId: "", level: 10, rank: "E" },
    { creatureId: "", level: 10, rank: "E" },
    { creatureId: "", level: 10, rank: "E" },
  ]);

  // Multi-creature selection state
  const [playerTeamIds, setPlayerTeamIds] = useState<(string | null)[]>([null, null, null, null, null]);
  const [enemyTeamIds, setEnemyTeamIds] = useState<(string | null)[]>([null, null, null, null, null]);

  // Collection mode state
  const [collection, setCollection] = useState<HuntedCreature[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null);

  // Battle state
  const [phase, setPhase] = useState<BattlePhase>("setup");
  const [player, setPlayer] = useState<BattleCreature | null>(null);
  const [enemy, setEnemy] = useState<BattleCreature | null>(null);
  const [playerTeam, setPlayerTeam] = useState<BattleTeam | null>(null);
  const [enemyTeam, setEnemyTeam] = useState<BattleTeam | null>(null);
  const [log, setLog] = useState<BattleLogEntry[]>([]);
  const [turn, setTurn] = useState<"player" | "enemy">("player");
  const [currentActingCreature, setCurrentActingCreature] = useState<BattleCreature | null>(null);
  const [round, setRound] = useState(1);
  const [turnOrder, setTurnOrder] = useState<BattleElement[]>([]);
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  // Swap selector state
  const [showSwapSelector, setShowSwapSelector] = useState(false);
  const [swapSourceCreature, setSwapSourceCreature] = useState<BattleCreature | null>(null);

  // Creature detail modal state
  const [showCreatureDetail, setShowCreatureDetail] = useState(false);
  const [detailCreature, setDetailCreature] = useState<BattleCreature | null>(null);

  // Skill selector state (for dual skills: specimen + personality)
  const [selectedSkillType, setSelectedSkillType] = useState<"specimen" | "personality">("specimen");
  const [showSkillSelector, setShowSkillSelector] = useState(false);

  // Load collection from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ecobio-collection");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCollection(parsed);
      } catch (e) {
        console.error("Failed to load collection", e);
      }
    }
  }, []);

  // Apply XP rewards when battle ends (in collection mode only)
  useEffect(() => {
    if (phase === "complete" && battleMode === "easy") {
      // Determine winner
      let winner: "player" | "enemy" | "draw" = "draw";
      if (teamSize === 1) {
        if (player && enemy) {
          if (player.currentHP === 0 && enemy.currentHP === 0) {
            winner = "draw";
          } else if (player.currentHP === 0) {
            winner = "enemy";
          } else {
            winner = "player";
          }
        }
      } else if (playerTeam && enemyTeam) {
        winner = getTeamBattleWinner(playerTeam, enemyTeam);
      }

      // Calculate XP rewards if player won
      if (winner === "player") {
        const playerCreatures = teamSize === 1 && player ? [player] : (playerTeam?.creatures || []);
        const enemyCreatures = teamSize === 1 && enemy ? [enemy] : (enemyTeam?.creatures || []);

        const xpRewards = calculateXPRewards(
          playerCreatures as BattleCreature[],
          enemyCreatures as BattleCreature[],
          true
        );

        // Apply XP and HP persistence to collection creatures
        // For easy mode, match creatures by name instead of ID since random enemies don't have IDs in collection
        const updatedCollection = collection.map(creature => {
          const battleCreature = playerCreatures.find(bc => bc.name.includes(creature.name));
          if (battleCreature) {
            // Find corresponding XP reward using creature ID or name match
            const reward = xpRewards.find(r =>
              r.creatureId === creature.id ||
              playerCreatures.find(pc => pc.id === r.creatureId)?.name.includes(creature.name)
            );

            if (reward) {
              const xpResult = applyCombatXP({ ...creature }, reward.xpEarned);
              const updated = xpResult.updated;
              updated.battlesWon = (updated.battlesWon || 0) + 1;
              updated.battlesTotal = (updated.battlesTotal || 0) + 1;

              // NEW: Persist HP from battle to collection
              if (battleCreature) {
                // Calculate maxHP from customStats.hp with level scaling
                const baseHP = updated.customStats?.hp || updated.finalStats?.hp || 100;
                const level = updated.level || 1;
                const levelScale = 1 + (level - 1) * 0.2;
                updated.maxHP = Math.floor(baseHP * levelScale);
                // Keep currentHP from battle (0 if died, else remaining HP)
                updated.currentHP = battleCreature.currentHP;
                updated.lastHealTime = Date.now();
              }

              if (xpResult.starLeveled) {
                console.log(`⭐ ${creature.name} leveled up to Star ${xpResult.newStars}!`);
              }
              return updated;
            }
          }
          return creature;
        });

        setCollection(updatedCollection);
        localStorage.setItem("ecobio-collection", JSON.stringify(updatedCollection));
      }
    }
  }, [phase, battleMode, teamSize, player, enemy, playerTeam, enemyTeam]);

  const playerCreature = CREATURES[playerCreatureId];
  const enemyCreature = CREATURES[enemyCreatureId];

  const selectedPlayer = collection.find(c => c.id === selectedPlayerId);
  const selectedEnemy = collection.find(c => c.id === selectedEnemyId);

  // Helper to check if we're in multi-creature mode
  const isMultiCreatureMode = teamSize > 1;

  // Calculate stats with level scaling BUT NO RNG variance (deterministic for testing)
  const playerBattleStats = calculateScaledStats(playerCreature, playerLevel, playerRank);
  const enemyBattleStats = calculateScaledStats(enemyCreature, enemyLevel, enemyRank);

  const playerPreviewStats = playerBattleStats;
  const enemyPreviewStats = enemyBattleStats;

  // Auto-trigger next turn based on current actor
  useEffect(() => {
    if (phase !== "battle") return;

    // For 1v1 mode, use the old logic
    if (teamSize === 1 && turn === "enemy" && enemy && player) {
      const timer = setTimeout(() => {
        enemyTurn();
      }, 1500);

      return () => clearTimeout(timer);
    }

    // For multi-creature mode, check if it's enemy creature's turn
    if (teamSize > 1 && currentActingCreature && enemyTeam && playerTeam) {
      const isEnemyCreature = enemyTeam.creatures.some(c => c === currentActingCreature);

      if (isEnemyCreature) {
        const timer = setTimeout(() => {
          // Inline enemy turn execution to avoid closure issues
          // Capture current state now, inside the setTimeout
          setIsActionProcessing(true);

          if (!playerTeam || !enemyTeam || !currentActingCreature || phase !== "battle") {
            setIsActionProcessing(false);
            return;
          }

          // Check if battle is over
          if (isTeamBattleOver(playerTeam, enemyTeam)) {
            const winner = getTeamBattleWinner(playerTeam, enemyTeam);
            const newLog = [...log];
            newLog.push({
              text: winner === "player" ? "🏆 VICTORY!" : "💀 DEFEAT!",
              type: winner === "player" ? "victory" : "defeat",
            });
            setLog(newLog);
            setPhase("complete");
            setIsActionProcessing(false);
            return;
          }

          const newLog = [...log];
          const turnResult = executeCreatureTurn(
            currentActingCreature,
            playerTeam,
            enemyTeam,
            true, // isAuto = true (AI)
            teamSize
          );

          newLog.push(...turnResult);

          // Create new team references
          const newPlayerTeam = { ...playerTeam, creatures: playerTeam.creatures.map(c => ({ ...c })) };
          const newEnemyTeam = { ...enemyTeam, creatures: enemyTeam.creatures.map(c => ({ ...c })) };

          // Rebuild turn order with new creature references
          const newTurnOrder = getAllBattleElements(newPlayerTeam, newEnemyTeam).sort((a, b) =>
            getEffectiveSpeed(b.creature) - getEffectiveSpeed(a.creature)
          );

          // Find the current creature reference in newTurnOrder by unique combination
          const isPlayerTeamCurrent = playerTeam.creatures.includes(currentActingCreature);
          const currentTeamCreatures = isPlayerTeamCurrent ? newPlayerTeam.creatures : newEnemyTeam.creatures;

          const newCurrentCreature = currentTeamCreatures.find(c =>
            c.name === currentActingCreature.name &&
            c.position === currentActingCreature.position
          ) || currentActingCreature;

          setLog(newLog);
          setPlayerTeam(newPlayerTeam);
          setEnemyTeam(newEnemyTeam);
          setTurnOrder(newTurnOrder);

          // Check if battle ended after this turn
          if (isTeamBattleOver(newPlayerTeam, newEnemyTeam)) {
            const winner = getTeamBattleWinner(newPlayerTeam, newEnemyTeam);
            newLog.push({
              text: winner === "player" ? "🏆 VICTORY!" : "💀 DEFEAT!",
              type: winner === "player" ? "victory" : "defeat",
            });
            setLog(newLog);
            setPhase("complete");
            setIsActionProcessing(false);
            return;
          }

          // Move to next creature - skip DEAD creatures (stunned creatures still get their turn for DoT/poison)
          const currentIndex = newTurnOrder.findIndex(el =>
            el.creature.name === newCurrentCreature.name &&
            el.team === (isPlayerTeamCurrent ? "player" : "enemy") &&
            el.creature.position === newCurrentCreature.position
          );

          let nextIndex = -1;
          let nextCreature: BattleElement | null = null;
          let attempts = 0;

          if (currentIndex === -1) {
            console.warn("AI Loop: Could not find current creature in turn order:", newCurrentCreature.name);
            // Fallback: find first alive creature
            let targetIndex = 0;
            let targetCreature = newTurnOrder[targetIndex];

            attempts = 0;
            while (targetCreature.creature.currentHP <= 0 && attempts < newTurnOrder.length) {
              targetIndex = (targetIndex + 1) % newTurnOrder.length;
              targetCreature = newTurnOrder[targetIndex];
              attempts++;
            }

            nextIndex = targetIndex;
            nextCreature = targetCreature;
          } else {
            nextIndex = (currentIndex + 1) % newTurnOrder.length;
            nextCreature = newTurnOrder[nextIndex];

            // Find next alive creature (stunned creatures still get their turn - they just skip actions but take DoT/poison)
            attempts = 0;
            while (nextCreature != null && nextCreature.creature.currentHP <= 0 && attempts < newTurnOrder.length) {
              nextIndex = (nextIndex + 1) % newTurnOrder.length;
              nextCreature = newTurnOrder[nextIndex];
              attempts++;
            }
          }

          // If all creatures are dead, battle is over
          if (!nextCreature || attempts >= newTurnOrder.length) {
            const winner = getTeamBattleWinner(newPlayerTeam, newEnemyTeam);
            newLog.push({
              text: winner === "player" ? "🏆 VICTORY!" : "💀 DEFEAT!",
              type: winner === "player" ? "victory" : "defeat",
            });
            setLog(newLog);
            setPhase("complete");
            setIsActionProcessing(false);
            return;
          }

          const currentCreatureIndex = currentIndex === -1 ? 0 : currentIndex;
          setCurrentActingCreature(nextCreature.creature);
          setTurn(nextCreature.team as "player" | "enemy");
          if (nextIndex < currentCreatureIndex) {
            setRound((prev) => prev + 1);
          }

          setTimeout(() => setIsActionProcessing(false), 1000);
        }, 1500);

        return () => clearTimeout(timer);
      }
    }
  }, [phase, turn, currentActingCreature, teamSize]);

  const startBattle = () => {
    // Check team size validation for multi-creature mode
    if (teamSize > 1) {
      const playerValid = battleMode === "test"
        ? validateTestSlotConfigs(playerSlotConfigs, teamSize)
        : battleMode === "easy"
        ? validateTeamSize(playerTeamIds, teamSize)
        : false;  // Fallthrough (should not happen)

      // Easy mode: enemies are generated automatically, skip validation
      // Test/Collection mode: validate enemy team
      const enemyValid = battleMode === "test"
        ? validateTestSlotConfigs(enemySlotConfigs, teamSize)
        : battleMode === "easy"
        ? true  // Easy mode always has valid random enemies
        : validateTeamSize(enemyTeamIds, teamSize);  // Collection mode

      if (!playerValid || !enemyValid) {
        if (!playerValid) {
          alert(`Pour ${teamSize}v${teamSize}, vous devez sélectionner ${teamSize} créatures pour votre équipe!`);
        } else {
          alert(`Pour ${teamSize}v${teamSize}, vous devez sélectionner ${teamSize} créatures pour l'équipe ennemie!`);
        }
        return;
      }
    }

    // 1v1 mode
    if (teamSize === 1) {
      let p: BattleCreature;
      let e: BattleCreature;

      // Test mode: Calculate stats with level scaling (deterministic)
      if (battleMode === "test") {
        p = createBattleCreature(
          playerCreature,
          playerBattleStats,
          `${playerCreature.name} (R${playerRank} L${playerLevel})`,
          []  // Test mode: no traits
        );

        e = createBattleCreature(
          enemyCreature,
          enemyBattleStats,
          `${enemyCreature.name} (R${enemyRank} L${enemyLevel})`,
          []  // Test mode: no traits
        );
      } else if (battleMode === "easy") {
        // Easy mode: Player from collection, enemy auto-generated
        if (!selectedPlayer) {
          alert("Sélectionnez votre créature de collection!");
          return;
        }

        // Player creature from collection
        const playerStatMods = applyTraitStatModifiers(
          {
            hp: selectedPlayer.finalStats.hp,
            attack: selectedPlayer.finalStats.attack,
            defense: selectedPlayer.finalStats.defense,
            speed: selectedPlayer.finalStats.speed,
            crit: selectedPlayer.finalStats.crit,
          },
          selectedPlayer.traits || []
        );

        const playerCreatureWithSkills = {
          ...CREATURES[selectedPlayer.creatureId],
          specimenSkill: selectedPlayer.specimenSkill,
          personalitySkill: selectedPlayer.personalitySkill,
        };

        p = createBattleCreature(
          playerCreatureWithSkills,
          {
            hp: playerStatMods.modifiedStats.hp,
            attack: playerStatMods.modifiedStats.attack,
            defense: playerStatMods.modifiedStats.defense,
            speed: playerStatMods.modifiedStats.speed,
            crit: playerStatMods.modifiedStats.crit,
            rank: selectedPlayer.finalStats.rank,
          },
          `${selectedPlayer.name} (R${selectedPlayer.finalStats.rank} L${selectedPlayer.level})`,
          selectedPlayer.traits || []
        );
        p.baseStats = {
          hp: selectedPlayer.finalStats.hp,
          attack: selectedPlayer.finalStats.attack,
          defense: selectedPlayer.finalStats.defense,
          speed: selectedPlayer.finalStats.speed,
          crit: selectedPlayer.finalStats.crit,
          rank: selectedPlayer.finalStats.rank,
        };
        p.statModifiers = playerStatMods.breakdown;

        // Enemy: auto-generated random creature
        const randomEnemy = spawnEasyModeEnemy();
        e = createBattleCreature(
          randomEnemy.creatureTemplate,
          randomEnemy.stats,
          randomEnemy.name,
          randomEnemy.traits || []
        );
      } else {
        // Collection mode: Use hunting creatures with RNG stats and traits
        if (!selectedPlayer || !selectedEnemy) {
          alert("Sélectionnez deux créatures de votre collection!");
          return;
        }

        // Apply trait stat modifiers to base stats
        const playerStatMods = applyTraitStatModifiers(
          {
            hp: selectedPlayer.finalStats.hp,
            attack: selectedPlayer.finalStats.attack,
            defense: selectedPlayer.finalStats.defense,
            speed: selectedPlayer.finalStats.speed,
            crit: selectedPlayer.finalStats.crit,
          },
          selectedPlayer.traits || []
        );

        const enemyStatMods = applyTraitStatModifiers(
          {
            hp: selectedEnemy.finalStats.hp,
            attack: selectedEnemy.finalStats.attack,
            defense: selectedEnemy.finalStats.defense,
            speed: selectedEnemy.finalStats.speed,
            crit: selectedEnemy.finalStats.crit,
          },
          selectedEnemy.traits || []
        );

        // Create creature templates with dual skills for 1v1 collection mode
        const playerCreatureWithSkills = {
          ...CREATURES[selectedPlayer.creatureId],
          specimenSkill: selectedPlayer.specimenSkill,
          personalitySkill: selectedPlayer.personalitySkill,
        };

        const enemyCreatureWithSkills = {
          ...CREATURES[selectedEnemy.creatureId],
          specimenSkill: selectedEnemy.specimenSkill,
          personalitySkill: selectedEnemy.personalitySkill,
        };

        p = createBattleCreature(
          playerCreatureWithSkills,
          {
            hp: playerStatMods.modifiedStats.hp,
            attack: playerStatMods.modifiedStats.attack,
            defense: playerStatMods.modifiedStats.defense,
            speed: playerStatMods.modifiedStats.speed,
            crit: playerStatMods.modifiedStats.crit,
            rank: selectedPlayer.finalStats.rank,
          },
          `${selectedPlayer.name} (R${selectedPlayer.finalStats.rank} L${selectedPlayer.level})`,
          selectedPlayer.traits || []
        );
        p.baseStats = {
          hp: selectedPlayer.finalStats.hp,
          attack: selectedPlayer.finalStats.attack,
          defense: selectedPlayer.finalStats.defense,
          speed: selectedPlayer.finalStats.speed,
          crit: selectedPlayer.finalStats.crit,
          rank: selectedPlayer.finalStats.rank,
        };
        p.statModifiers = playerStatMods.breakdown;

        e = createBattleCreature(
          enemyCreatureWithSkills,
          {
            hp: enemyStatMods.modifiedStats.hp,
            attack: enemyStatMods.modifiedStats.attack,
            defense: enemyStatMods.modifiedStats.defense,
            speed: enemyStatMods.modifiedStats.speed,
            crit: enemyStatMods.modifiedStats.crit,
            rank: selectedEnemy.finalStats.rank,
          },
          `${selectedEnemy.name} (R${selectedEnemy.finalStats.rank} L${selectedEnemy.level})`,
          selectedEnemy.traits || []
        );
        e.baseStats = {
          hp: selectedEnemy.finalStats.hp,
          attack: selectedEnemy.finalStats.attack,
          defense: selectedEnemy.finalStats.defense,
          speed: selectedEnemy.finalStats.speed,
          crit: selectedEnemy.finalStats.crit,
          rank: selectedEnemy.finalStats.rank,
        };
        e.statModifiers = enemyStatMods.breakdown;
      }

      setPlayer(p);
      setEnemy(e);
      setPlayerTeam(null);
      setEnemyTeam(null);

      // Determine who starts based on effective speed - higher speed goes first
      const playerEffectiveSpeed = getEffectiveSpeed(p);
      const enemyEffectiveSpeed = getEffectiveSpeed(e);
      const firstAttacker = playerEffectiveSpeed >= enemyEffectiveSpeed ? "player" : "enemy";

      setLog([
        { text: `⚔️ BATTLE START!`, type: "info" },
        { text: `—`.repeat(40), type: "info" },
        { text: `—`.repeat(40), type: "info" },
        { text: `C'est le tour de ${firstAttacker === "player" ? "Player" : "Enemy"} d'attaquer en premier!`, type: "info" },
      ]);
      setPhase("battle");
      setTurn(firstAttacker as "player" | "enemy");
      setRound(1);
    } else {
      // Multi-creature mode (3v3 or 5v5)
      const playerCreatures: Array<{ creatureTemplate: any; stats: any; name: string; traits?: string[] }> = [];
      const enemyCreatures: Array<{ creatureTemplate: any; stats: any; name: string; traits?: string[] }> = [];

      // Build player team
      for (let i = 0; i < teamSize; i++) {
        const creatureId = playerTeamIds[i];
        if (!creatureId && battleMode !== "test") continue;

        if (battleMode === "test") {
          // Test mode: Use slot-based creature configuration
          const slotConfig = playerSlotConfigs[i];
          if (!slotConfig || !slotConfig.creatureId) continue;

          const testCreature = CREATURES[slotConfig.creatureId];
          const testStats = calculateScaledStats(testCreature, slotConfig.level, slotConfig.rank);

          // Get specimen skill from skills.ts database
          const creatureWithSpecimenSkill = {
            ...testCreature,
            specimenSkill: getSpecimenSkill(slotConfig.creatureId),
          };

          playerCreatures.push({
            creatureTemplate: creatureWithSpecimenSkill,
            stats: testStats,
            name: `${testCreature.name} ${i + 1} (R${slotConfig.rank} L${slotConfig.level})`,
            traits: [],
          });
        } else {
          // Collection mode: Use selected creatures
          const collected = collection.find(c => c.id === creatureId);
          if (!collected) continue;

          const statMods = applyTraitStatModifiers(
            {
              hp: collected.finalStats.hp,
              attack: collected.finalStats.attack,
              defense: collected.finalStats.defense,
              speed: collected.finalStats.speed,
              crit: collected.finalStats.crit,
            },
            collected.traits || []
          );

          // Create creature template with dual skills from collected creature
          const creatureTemplateWithSkills = {
            ...CREATURES[collected.creatureId],
            specimenSkill: collected.specimenSkill,
            personalitySkill: collected.personalitySkill,
          };

          playerCreatures.push({
            creatureTemplate: creatureTemplateWithSkills,
            stats: {
              hp: statMods.modifiedStats.hp,
              attack: statMods.modifiedStats.attack,
              defense: statMods.modifiedStats.defense,
              speed: statMods.modifiedStats.speed,
              crit: statMods.modifiedStats.crit,
              rank: collected.finalStats.rank,
            },
            name: `${collected.name} (R${collected.finalStats.rank} L${collected.level})`,
            traits: collected.traits || [],
          });
        }
      }

      // Build enemy team
      if (battleMode === "easy") {
        // Easy mode: Generate random enemies ONCE for the entire team
        const randomEnemies = generateRandomEnemyTeam();

        for (let i = 0; i < teamSize; i++) {
          const randomEnemy = randomEnemies[i];

          if (randomEnemy) {
            enemyCreatures.push({
              creatureTemplate: randomEnemy.creatureTemplate,
              stats: randomEnemy.stats,
              name: randomEnemy.name,
              traits: randomEnemy.traits,
            });
          }
        }
      } else {
        // Test mode or Collection mode: iterate through slots
        for (let i = 0; i < teamSize; i++) {
          const creatureId = enemyTeamIds[i];
          if (!creatureId && battleMode !== "test") continue;

          if (battleMode === "test") {
            // Test mode: Use slot-based creature configuration
            const slotConfig = enemySlotConfigs[i];
            if (!slotConfig || !slotConfig.creatureId) continue;

            const testCreature = CREATURES[slotConfig.creatureId];
            const testStats = calculateScaledStats(testCreature, slotConfig.level, slotConfig.rank);

            // Get specimen skill from skills.ts database
            const creatureWithSpecimenSkill = {
              ...testCreature,
              specimenSkill: getSpecimenSkill(slotConfig.creatureId),
            };

            enemyCreatures.push({
              creatureTemplate: creatureWithSpecimenSkill,
              stats: testStats,
              name: `${testCreature.name} ${i + 1} (R${slotConfig.rank} L${slotConfig.level})`,
              traits: [],
            });
          } else {
            // Collection mode: Use selected creatures
            const collected = collection.find(c => c.id === creatureId);
            if (!collected) continue;

            const statMods = applyTraitStatModifiers(
              {
                hp: collected.finalStats.hp,
                attack: collected.finalStats.attack,
                defense: collected.finalStats.defense,
                speed: collected.finalStats.speed,
                crit: collected.finalStats.crit,
              },
              collected.traits || []
            );

            // Create creature template with dual skills from collected creature
            const creatureTemplateWithSkills = {
              ...CREATURES[collected.creatureId],
              specimenSkill: collected.specimenSkill,
              personalitySkill: collected.personalitySkill,
            };

            enemyCreatures.push({
              creatureTemplate: creatureTemplateWithSkills,
              stats: {
                hp: statMods.modifiedStats.hp,
                attack: statMods.modifiedStats.attack,
                defense: statMods.modifiedStats.defense,
                speed: statMods.modifiedStats.speed,
                crit: statMods.modifiedStats.crit,
                rank: collected.finalStats.rank,
              },
              name: `${collected.name} (R${collected.finalStats.rank} L${collected.level})`,
              traits: collected.traits || [],
            });
          }
        }
      }

      const pTeam = createBattleTeam(playerCreatures, "player");
      const eTeam = createBattleTeam(enemyCreatures, "enemy");

      // DEBUG: Check specimenSkill values immediately after team creation
      pTeam.creatures.forEach((creature, idx) => {
        if (creature.creature.specimenSkill) {
          console.log(`PLAYER CREATURE ${idx}: ${creature.name}, specimenSkill.effect=${creature.creature.specimenSkill.effect}, specimenSkill.name=${creature.creature.specimenSkill.name}`);
        }
      });

      eTeam.creatures.forEach((creature, idx) => {
        if (creature.creature.specimenSkill) {
          console.log(`ENEMY CREATURE ${idx}: ${creature.name}, specimenSkill.effect=${creature.creature.specimenSkill.effect}, specimenSkill.name=${creature.creature.specimenSkill.name}`);
        }
      });

      // Set team reference on each creature (needed for turn logic)
      pTeam.creatures.forEach(c => (c as any).team = "player");
      eTeam.creatures.forEach(c => (c as any).team = "enemy");

      setPlayerTeam(pTeam);
      setEnemyTeam(eTeam);
      setPlayer(null);
      setEnemy(null);

      // Create turn order based on speed
      const allElements = getAllBattleElements(pTeam, eTeam);
      const sortedTurnOrder = [...allElements].sort(
        (a, b) => getEffectiveSpeed(b.creature) - getEffectiveSpeed(a.creature)
      );

      setTurnOrder(sortedTurnOrder);
      const firstCreature = sortedTurnOrder[0];
      setCurrentActingCreature(firstCreature.creature);
      setTurn(firstCreature.team as "player" | "enemy");

      setLog([
        { text: `⚔️ ${teamSize}v${teamSize} BATTLE START!`, type: "info" },
        { text: `—`.repeat(40), type: "info" },
        { text: `Tour order (par vitesse):`, type: "info" },
        ...sortedTurnOrder.map((el, i) => ({
          text: `  ${i + 1}. ${el.name} (${el.team === "player" ? "Joueur" : "Ennemi"})`,
          type: "info" as const,
        })),
      ]);
      setPhase("battle");
      setRound(1);
    }
  };

  // Multi-creature battle turn execution
  const executeMultiCreatureTurn = (isAuto: boolean = false) => {
    if (!playerTeam || !enemyTeam || !currentActingCreature || phase !== "battle") return;

    // Check if battle is over
    if (isTeamBattleOver(playerTeam, enemyTeam)) {
      const winner = getTeamBattleWinner(playerTeam, enemyTeam);
      const logCopy = [...log];
      logCopy.push({
        text: winner === "player" ? "🏆 VICTORY!" : "💀 DEFEAT!",
        type: winner === "player" ? "victory" : "defeat",
      });
      setLog(logCopy);
      setPhase("complete");
      setIsActionProcessing(false);
      return;
    }

    const logCopy = [...log];
    const turnResult = executeCreatureTurn(
      currentActingCreature,
      playerTeam,
      enemyTeam,
      isAuto,
      teamSize  // Pass teamSize for position-aware targeting
    );

    logCopy.push(...turnResult);
    setLog(logCopy);

    // Update team states - create new references for React to detect changes
    const newPlayerTeam = { ...playerTeam, creatures: playerTeam.creatures.map(c => ({ ...c })) };
    const newEnemyTeam = { ...enemyTeam, creatures: enemyTeam.creatures.map(c => ({ ...c })) };

    // Rebuild turn order with new creature references before advancing
    const newTurnOrder = getAllBattleElements(newPlayerTeam, newEnemyTeam).sort(
      (a, b) => getEffectiveSpeed(b.creature) - getEffectiveSpeed(a.creature)
    );

    // Find the new creature reference corresponding to the current acting creature
    const newCurrentCreature = newTurnOrder.find(el =>
      el.creature.name === currentActingCreature.name &&
      el.team === (playerTeam.creatures.includes(currentActingCreature) ? "player" : "enemy")
    )?.creature || currentActingCreature;

    setPlayerTeam(newPlayerTeam);
    setEnemyTeam(newEnemyTeam);

    // Check if battle ended after this turn
    if (isTeamBattleOver(newPlayerTeam, newEnemyTeam)) {
      const winner = getTeamBattleWinner(newPlayerTeam, newEnemyTeam);
      logCopy.push({
        text: winner === "player" ? "🏆 VICTORY!" : "💀 DEFEAT!",
        type: winner === "player" ? "victory" : "defeat",
      });
      setLog(logCopy);
      setPhase("complete");
      setIsActionProcessing(false);
      return;
    }

    // Move to next creature in turn order that's still alive
    const currentIndex = newTurnOrder.findIndex(el => el.creature === newCurrentCreature);
    let nextIndex = (currentIndex + 1) % newTurnOrder.length;
    let nextCreature = newTurnOrder[nextIndex];

    // Find next alive creature, handling wrap-around
    let attempts = 0;
    while (nextCreature.creature.currentHP <= 0 && attempts < newTurnOrder.length) {
      nextIndex = (nextIndex + 1) % newTurnOrder.length;
      nextCreature = newTurnOrder[nextIndex];
      attempts++;
    }

    // If all creatures are dead, battle should have ended already
    if (attempts >= newTurnOrder.length) {
      const winner = getTeamBattleWinner(newPlayerTeam, newEnemyTeam);
      logCopy.push({
        text: winner === "player" ? "🏆 VICTORY!" : "💀 DEFEAT!",
        type: winner === "player" ? "victory" : "defeat",
      });
      setLog(logCopy);
      setPhase("complete");
      setIsActionProcessing(false);
      return;
    }

    setCurrentActingCreature(nextCreature.creature);
    setTurn(nextCreature.team as "player" | "enemy");
    setTurnOrder(newTurnOrder);

    // Increment round if we've cycled back to the first creature
    if (nextIndex < currentIndex) {
      setRound((prev) => prev + 1);
    }
  };

  // Handle multi-creature selection
  const handlePlayerTeamSelect = (slot: number, creatureId: string | null) => {
    const newTeam = [...playerTeamIds];
    newTeam[slot] = creatureId;
    setPlayerTeamIds(newTeam);
  };

  const handleEnemyTeamSelect = (slot: number, creatureId: string | null) => {
    const newTeam = [...enemyTeamIds];
    newTeam[slot] = creatureId;
    setEnemyTeamIds(newTeam);
  };

  // Handle multi-slot test mode configuration changes
  const handlePlayerSlotChange = (slot: number, config: SlotConfig) => {
    const newConfigs = [...playerSlotConfigs];
    newConfigs[slot] = config;
    setPlayerSlotConfigs(newConfigs);
  };

  const handleEnemySlotChange = (slot: number, config: SlotConfig) => {
    const newConfigs = [...enemySlotConfigs];
    newConfigs[slot] = config;
    setEnemySlotConfigs(newConfigs);
  };

  // Validate slot configurations for test mode
  const validateTestSlotConfigs = (configs: SlotConfig[], teamSize: TeamSize): boolean => {
    return configs.slice(0, teamSize).every(config => config.creatureId !== "");
  };

  const handleAttack = () => {
    if (isActionProcessing) return; // Prevent multiple actions in same turn

    // Multi-creature mode: inline turn execution to avoid closure issues
    if (teamSize > 1) {
      setIsActionProcessing(true);

      // Execute turn inline - same logic as executeMultiCreatureTurn but with local state
      if (!playerTeam || !enemyTeam || !currentActingCreature || phase !== "battle") {
        setIsActionProcessing(false);
        return;
      }

      // Check if battle is over
      if (isTeamBattleOver(playerTeam, enemyTeam)) {
        const winner = getTeamBattleWinner(playerTeam, enemyTeam);
        const logCopy = [...log];
        logCopy.push({
          text: winner === "player" ? "🏆 VICTORY!" : "💀 DEFEAT!",
          type: winner === "player" ? "victory" : "defeat",
        });
        setLog(logCopy);
        setPhase("complete");
        setIsActionProcessing(false);
        return;
      }

      const logCopy = [...log];
      const turnResult = executeCreatureTurn(
        currentActingCreature,
        playerTeam,
        enemyTeam,
        false, // isAuto = false (player initiated)
        teamSize
      );

      logCopy.push(...turnResult);

      // Create new team references
      const newPlayerTeam = { ...playerTeam, creatures: playerTeam.creatures.map(c => ({ ...c })) };
      const newEnemyTeam = { ...enemyTeam, creatures: enemyTeam.creatures.map(c => ({ ...c })) };

      // Rebuild turn order with new creature references
      const newTurnOrder = getAllBattleElements(newPlayerTeam, newEnemyTeam).sort(
        (a, b) => getEffectiveSpeed(b.creature) - getEffectiveSpeed(a.creature)
      );

      // Update all state
      setLog(logCopy);
      setPlayerTeam(newPlayerTeam);
      setEnemyTeam(newEnemyTeam);

      // Check if battle ended after this turn
      if (isTeamBattleOver(newPlayerTeam, newEnemyTeam)) {
        const winner = getTeamBattleWinner(newPlayerTeam, newEnemyTeam);
        logCopy.push({
          text: winner === "player" ? "🏆 VICTORY!" : "💀 DEFEAT!",
          type: winner === "player" ? "victory" : "defeat",
        });
        setLog(logCopy);
        setPhase("complete");
        setIsActionProcessing(false);
        return;
      }

      // Move to next creature
      // Use name + team + position for robust matching (instead of reference comparison)
      const currentTeam = playerTeam.creatures.includes(currentActingCreature) ? "player" : "enemy";
      const currentIndex = newTurnOrder.findIndex(el =>
        el.creature.name === currentActingCreature.name &&
        el.team === currentTeam &&
        el.creature.position === currentActingCreature.position
      );

      let nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % newTurnOrder.length;
      let nextCreature = newTurnOrder[nextIndex];

      // Find next alive creature
      let attempts = 0;
      while (nextCreature.creature.currentHP <= 0 && attempts < newTurnOrder.length) {
        nextIndex = (nextIndex + 1) % newTurnOrder.length;
        nextCreature = newTurnOrder[nextIndex];
        attempts++;
      }

      // If all dead, end battle
      if (attempts >= newTurnOrder.length) {
        const winner = getTeamBattleWinner(newPlayerTeam, newEnemyTeam);
        logCopy.push({
          text: winner === "player" ? "🏆 VICTORY!" : "💀 DEFEAT!",
          type: winner === "player" ? "victory" : "defeat",
        });
        setLog(logCopy);
        setPhase("complete");
        setTurnOrder(newTurnOrder);
        setIsActionProcessing(false);
        return;
      }

      // Update next creature state
      setTurnOrder(newTurnOrder);
      setCurrentActingCreature(nextCreature.creature);
      setTurn(nextCreature.team as "player" | "enemy");
      if (currentIndex !== -1 && nextIndex < currentIndex) {
        setRound((prev) => prev + 1);
      }

      setTimeout(() => setIsActionProcessing(false), 1000);
      return;
    }

    // 1v1 mode: use original logic
    if (!player || !enemy || phase !== "battle" || turn !== "player") return;

    setIsActionProcessing(true);
    const logCopy = [...log];
    logCopy.push({ text: `--- Round ${round}: Player Turn ---`, type: "info" });
    // Apply status effects at start of turn (check for stun)
    const turnSkipped = applyStatusEffects(player, logCopy);

    if (turnSkipped) {
      // Player is stunned - skip turn and pass to enemy
      setPlayer({ ...player });
      setTimeout(() => {
        setIsActionProcessing(false);
        enemyTurn(logCopy);
      }, 1500);
      return;
    }

    // Apply trait regeneration at start of player's turn
    const oldPlayerHP = player.currentHP;
    const oldEnemyHP = enemy.currentHP;

    applyTraitRegeneration(player, logCopy);
    applyTraitRegeneration(enemy, logCopy);

    if (player.currentHP !== oldPlayerHP && player.currentHP > oldPlayerHP) {
      logCopy.push({ text: `💚 ${player.name} se régénère: +${player.currentHP - oldPlayerHP} HP`, type: "info" });
      setPlayer({ ...player, currentHP: player.currentHP });
    }
    if (enemy.currentHP !== oldEnemyHP && enemy.currentHP > oldEnemyHP) {
      logCopy.push({ text: `💚 ${enemy.name} se régénère: +${enemy.currentHP - oldEnemyHP} HP`, type: "info" });
      setEnemy({ ...enemy, currentHP: enemy.currentHP });
    }

    const oldDefenseBuff = getDefenseBuff(player);
    const oldDodgeBuff = getDodgeBuff(player);
    const oldAttackBuff = getAttackBuff(player);
    tickCooldownsAndBuffs(player);
    tickStatusEffects(player, logCopy);

    // Log buff expirations
    const expiredBuffs = getBuffExpirationMessages(player);
    if (expiredBuffs.length > 0) {
      logCopy.push({ text: `✨ Buff expiré sur ${player.name}: ${expiredBuffs.join(", ")}`, type: "info" });
    }

    if (oldDefenseBuff !== getDefenseBuff(player)) {
      logCopy.push({ text: `✨ ${player.name}: ${formatBuffChange("DEF buff", oldDefenseBuff, getDefenseBuff(player))}`, type: "info" });
    }
    if (oldDodgeBuff !== getDodgeBuff(player)) {
      logCopy.push({ text: `${player.name}: ${formatBuffChange("Dodge buff", oldDodgeBuff, getDodgeBuff(player))}`, type: "info" });
    }
    if (oldAttackBuff !== getAttackBuff(player)) {
      logCopy.push({ text: `${player.name}: ${formatBuffChange("ATK buff", oldAttackBuff, getAttackBuff(player))}`, type: "info" });
    }

    const damage = executeAttack(player, enemy, logCopy);
    setLog(logCopy);
    setEnemy({ ...enemy });

    if (damage === 0) {
      setTimeout(() => {
        setIsActionProcessing(false);
        enemyTurn(logCopy);
      }, 1500);
    } else if (enemy.currentHP <= 0) {
      logCopy.push({ text: `🏆 VICTORY!`, type: "victory" });
      setLog(logCopy);
      setPhase("complete");
      setIsActionProcessing(false);
    } else {
      setTimeout(() => {
        setIsActionProcessing(false);
        enemyTurn(logCopy);
      }, 1500);
    }
  };

  const handleSwitchPosition = (creatureA: BattleCreature, creatureB: BattleCreature) => {
    if (!playerTeam || !enemyTeam || phase !== "battle" || !currentActingCreature || turn !== "player") return;

    // Create new team references (we need fresh copies since switchPositions mutates in place)
    const newPlayerTeam = { ...playerTeam, creatures: playerTeam.creatures.map(c => ({ ...c })) };
    const newEnemyTeam = { ...enemyTeam, creatures: enemyTeam.creatures.map(c => ({ ...c })) };

    const logCopy = [...log];
    const success = switchPositions(newPlayerTeam, creatureA, creatureB, logCopy);

    if (success) {
      // Rebuild turn order with updated team after position swap
      const newTurnOrder = getAllBattleElements(newPlayerTeam, newEnemyTeam).sort(
        (a, b) => getEffectiveSpeed(b.creature) - getEffectiveSpeed(a.creature)
      );

      // Find the current creature in the new team
      const newCurrentCreature = newPlayerTeam.creatures.find(
        c => c.name === currentActingCreature.name
      ) || newTurnOrder.find(el => el.name === currentActingCreature.name)?.creature;

      if (!newCurrentCreature) {
        setIsActionProcessing(false);
        return;
      }

      setLog(logCopy);
      setPlayerTeam(newPlayerTeam);
      setEnemyTeam(newEnemyTeam);
      setTurnOrder(newTurnOrder);

      // Check if battle is over
      if (isTeamBattleOver(newPlayerTeam, newEnemyTeam)) {
        const winner = getTeamBattleWinner(newPlayerTeam, newEnemyTeam);
        logCopy.push({
          text: winner === "player" ? "🏆 VICTORY!" : "💀 DEFEAT!",
          type: winner === "player" ? "victory" : "defeat",
        });
        setLog(logCopy);
        setPhase("complete");
        return;
      }

      // Move to next creature
      // Use name + position for robust matching (instead of reference comparison)
      const currentIndex = newTurnOrder.findIndex(el =>
        el.creature.name === currentActingCreature.name &&
        el.creature.position === currentActingCreature.position
      );

      let nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % newTurnOrder.length;
      let nextCreature = newTurnOrder[nextIndex];

      // Find next alive creature
      let attempts = 0;
      while (nextCreature.creature.currentHP <= 0 && attempts < newTurnOrder.length) {
        nextIndex = (nextIndex + 1) % newTurnOrder.length;
        nextCreature = newTurnOrder[nextIndex];
        attempts++;
      }

      if (attempts >= newTurnOrder.length) {
        // All creatures dead - should have been caught by battle over check
        const winner = getTeamBattleWinner(newPlayerTeam, newEnemyTeam);
        logCopy.push({
          text: winner === "player" ? "🏆 VICTORY!" : "💀 DEFEAT!",
          type: winner === "player" ? "victory" : "defeat",
        });
        setLog(logCopy);
        setPhase("complete");
        return;
      }

      setCurrentActingCreature(nextCreature.creature);
      setTurn(nextCreature.team as "player" | "enemy");
      if (currentIndex !== -1 && nextIndex < currentIndex) {
        setRound((prev) => prev + 1);
      }
    }
  };

  // Open swap selector modal for a creature
  const handleOpenSwapSelector = (creature: BattleCreature) => {
    setSwapSourceCreature(creature);
    setShowSwapSelector(true);
  };

  // Confirm swap with selected target creature from modal
  const handleConfirmSwap = (targetCreature: BattleCreature) => {
    if (swapSourceCreature) {
      handleSwitchPosition(swapSourceCreature, targetCreature);
      setShowSwapSelector(false);
      setSwapSourceCreature(null);
    }
  };

  // Creature detail handlers
  const handleViewCreatureDetails = (creature: BattleCreature) => {
    setDetailCreature(creature);
    setShowCreatureDetail(true);
  };

  const handleCloseCreatureDetail = () => {
    setShowCreatureDetail(false);
    setDetailCreature(null);
  };

  const handleSkill = (skillType: "specimen" | "personality" = "specimen") => {
    if (isActionProcessing) return; // Prevent multiple actions in same turn

    // Multi-creature mode: use skill for current creature
    if (teamSize > 1 && currentActingCreature) {
      const skill = skillType === "specimen" 
        ? currentActingCreature.creature.specimenSkill 
        : currentActingCreature.creature.personalitySkill;

      if (!skill) {
        console.log(`No ${skillType} skill found`);
        return;
      }

      const skillName = skill.name;
      const cooldownKey = `${skillName}_${skillType}_${currentActingCreature.name}`;
      const currentCooldown = currentActingCreature.skillCooldowns[cooldownKey] || 0;

      if (currentCooldown > 0 || !playerTeam || !enemyTeam) return;

      setIsActionProcessing(true);
      const logCopy = [...log];

      // Determine skill target based on skill type
      const isPlayerCreature = playerTeam.creatures.includes(currentActingCreature);
      const allyTeam = isPlayerCreature ? playerTeam : enemyTeam;
      const enemyTeamForTarget = isPlayerCreature ? enemyTeam : playerTeam;

      let target: BattleCreature | null = null;
      const targetType = skill.target || "self";
      const isOffensive = skill.effect === "aoe_damage" || skill.effect === "attack";
      const targetTeamForAOE = isPlayerCreature ? enemyTeam : playerTeam;

      if (targetType === "self") {
        target = currentActingCreature;
      } else if (targetType === "ally") {
        // Support buff - target allies using position-aware selection
        target = selectTargetByPosition(currentActingCreature, allyTeam, teamSize, targetType);
        if (!target || !allyTeam.creatures.includes(target)) {
          // Fallback to self if no valid ally target found
          target = currentActingCreature;
        }
      } else if (targetType === "front" || targetType === "back" || targetType === "random") {
        // Offensive AOE skills target enemies, support skills target allies
        const teamToTarget = isOffensive ? enemyTeamForTarget : allyTeam;
        target = selectTargetByPosition(currentActingCreature, teamToTarget, teamSize, targetType);
        if (!target) {
          // Fallback to any alive target from target team
          const aliveTargets = teamToTarget.creatures.filter(c => c.currentHP > 0);
          if (aliveTargets.length > 0) {
            target = aliveTargets[0];
          } else if (isOffensive) {
            // If all enemies dead, fallback to self
            target = currentActingCreature;
          }
        }
      } else if (targetType === "all") {
        // AOE skills - select first alive enemy for targeting (useSkill will handle all targets with targetTeamForAOE)
        const aliveEnemies = targetTeamForAOE.creatures.filter(c => c.currentHP > 0);
        if (aliveEnemies.length > 0) {
          target = aliveEnemies[0];
        } else {
          target = currentActingCreature;
        }
      }

      const success = useSkill(currentActingCreature, logCopy, target, skillType, targetTeamForAOE);

      if (success) {
        // Create new team references for React
        const newPlayerTeam = { ...playerTeam };
        const newEnemyTeam = { ...enemyTeam };

        // Update the team with new state - must create new references for React to detect changes
        if (playerTeam.creatures.includes(currentActingCreature)) {
          newPlayerTeam.creatures = playerTeam.creatures.map(c =>
            c === currentActingCreature || c === target ? { ...c } : c
          );
        } else {
          newEnemyTeam.creatures = enemyTeam.creatures.map(c =>
            c === currentActingCreature || c === target ? { ...c } : c
          );
        }

        // Rebuild turn order with new creature references
        const newTurnOrder = getAllBattleElements(newPlayerTeam, newEnemyTeam).sort(
          (a, b) => getEffectiveSpeed(b.creature) - getEffectiveSpeed(a.creature)
        );

        setLog(logCopy);
        setPlayerTeam(newPlayerTeam);
        setEnemyTeam(newEnemyTeam);
        setTurnOrder(newTurnOrder);

        // Check if battle ended
        if (isTeamBattleOver(newPlayerTeam, newEnemyTeam)) {
          const winner = getTeamBattleWinner(newPlayerTeam, newEnemyTeam);
          logCopy.push({
            text: winner === "player" ? "🏆 VICTORY!" : "💀 DEFEAT!",
            type: winner === "player" ? "victory" : "defeat",
          });
          setLog(logCopy);
          setPhase("complete");
          setIsActionProcessing(false);
          return;
        }

        // Find current turn index - use name + position + team as unique key (not object reference)
        const currentTeam = playerTeam.creatures.includes(currentActingCreature) ? "player" : "enemy";
        let currentIndex = -1;
        for (let i = 0; i < newTurnOrder.length; i++) {
          const el = newTurnOrder[i];
          if (el.creature.name === currentActingCreature.name &&
              el.team === currentTeam &&
              el.creature.position === currentActingCreature.position) {
            currentIndex = i;
            break;
          }
        }

        if (currentIndex === -1) {
          currentIndex = 0;  // Fallback to start if not found
          console.warn("Could not find current creature in turn order, starting from beginning");
        }

        // Move to next creature
        let nextIndex = (currentIndex + 1) % newTurnOrder.length;
        let nextCreature = newTurnOrder[nextIndex];

        // Find next alive creature
        let attempts = 0;
        while (nextCreature.creature.currentHP <= 0 && attempts < newTurnOrder.length) {
          nextIndex = (nextIndex + 1) % newTurnOrder.length;
          nextCreature = newTurnOrder[nextIndex];
          attempts++;
        }

        // If all dead, end battle
        if (attempts >= newTurnOrder.length) {
          const winner = getTeamBattleWinner(newPlayerTeam, newEnemyTeam);
          logCopy.push({
            text: winner === "player" ? "🏆 VICTORY!" : "💀 DEFEAT!",
            type: winner === "player" ? "victory" : "defeat",
          });
          setLog(logCopy);
          setPhase("complete");
          setIsActionProcessing(false);
          return;
        }

        setTimeout(() => {
          setCurrentActingCreature(nextCreature.creature);
          setTurn(nextCreature.team as "player" | "enemy");
          if (nextIndex < currentIndex) {
            setRound((prev) => prev + 1);
          }
          setIsActionProcessing(false);
        }, 1000);
      } else {
        setIsActionProcessing(false);
      }
      return;
    }

    // 1v1 mode: use original logic
    if (!player || !player.creature.skill || phase !== "battle" || turn !== "player") return;

    setIsActionProcessing(true);
    const skill = player.creature.skill;
    const logCopy = [...log];
    logCopy.push({ text: `--- Round ${round}: Player Turn (Skill) ---`, type: "info" });

    const oldDefenseBuff = getDefenseBuff(player);
    const oldDodgeBuff = getDodgeBuff(player);
    tickCooldownsAndBuffs(player);

    if (oldDefenseBuff !== getDefenseBuff(player)) {
      logCopy.push({ text: `✨ ${player.name}: ${formatBuffChange("DEF buff", oldDefenseBuff, getDefenseBuff(player))}`, type: "info" });
    }
    if (oldDodgeBuff !== getDodgeBuff(player)) {
      logCopy.push({ text: `${player.name}: ${formatBuffChange("Dodge buff", oldDodgeBuff, getDodgeBuff(player))}`, type: "info" });
    }

    const success = useSkill(player, logCopy);

    if (!success) {
      setLog(logCopy);
      setTimeout(() => enemyTurn(logCopy), 1500);
      return;
    }

    const buffType = skill.effect === "defense" ? "DEF" : "Dodge";
    const newBuff = skill.effect === "defense" ? getDefenseBuff(player) : getDodgeBuff(player);
    logCopy.push({ text: `✨ ${player.name}: ${buffType} buff actif!`, type: "skill" });

    if (skill.effect === "defense") {
      const newDEF = Math.floor(player.stats.defense * (1 + newBuff));
      logCopy.push({ text: `💪 DEF: ${player.stats.defense} → ${newDEF} (+${Math.floor(newBuff * 100)}%)`, type: "info" });
    } else {
      if (!enemy) {
        logCopy.push({ text: `💨 Dodge: Buff activé (+${Math.floor(newBuff * 100)}%)`, type: "info" });
      } else {
        const baseDodge = Math.log10(Math.abs(player.stats.speed - enemy.stats.speed) + 1) * 0.1;
        const newDodge = Math.min(0.75, baseDodge + newBuff);
        logCopy.push({ text: `💨 Dodge: ${(baseDodge * 100).toFixed(1)}% → ${(newDodge * 100).toFixed(1)}%`, type: "info" });
      }
    }

    setLog(logCopy);
    setPlayer({ ...player });

    // Skill use consumes the entire turn - pass to enemy
    setTimeout(() => {
      setIsActionProcessing(false);
      enemyTurn(logCopy);
    }, 1500);
  };

  const enemyTurn = (currentLog: BattleLogEntry[] = log) => {
    if (!player || !enemy) return;

    if (player.currentHP <= 0) {
      currentLog.push({ text: `💀 DEFEAT!`, type: "defeat" });
      setLog(currentLog);
      setPhase("complete");
      return;
    }
    if (enemy.currentHP <= 0) {
      currentLog.push({ text: `🏆 VICTORY!`, type: "victory" });
      setLog(currentLog);
      setPhase("complete");
      return;
    }

    const logCopy = [...currentLog];

    // Apply status effects at start of turn (check for stun)
    const turnSkipped = applyStatusEffects(enemy, logCopy);

    if (turnSkipped) {
      // Enemy is stunned - skip turn and pass to player
      setEnemy({ ...enemy });
      logCopy.push({ text: `--- Fin round ${round} ---`, type: "info" });
      setLog(logCopy);
      setRound((prev) => prev + 1);
      setTurn("player");
      return;
    }

    // Apply trait regeneration at start of enemy's turn
    const oldEnemyHP = enemy.currentHP;
    const oldPlayerHP = player.currentHP;

    applyTraitRegeneration(enemy, logCopy);
    applyTraitRegeneration(player, logCopy);

    if (enemy.currentHP !== oldEnemyHP && enemy.currentHP > oldEnemyHP) {
      logCopy.push({ text: `💚 ${enemy.name} se régénère: +${enemy.currentHP - oldEnemyHP} HP`, type: "info" });
      setEnemy({ ...enemy, currentHP: enemy.currentHP });
    }
    if (player.currentHP !== oldPlayerHP && player.currentHP > oldPlayerHP) {
      logCopy.push({ text: `💚 ${player.name} se régénère: +${player.currentHP - oldPlayerHP} HP`, type: "info" });
      setPlayer({ ...player, currentHP: player.currentHP });
    }

    const oldDefenseBuff = getDefenseBuff(enemy);
    const oldDodgeBuff = getDodgeBuff(enemy);
    const oldAttackBuff = getAttackBuff(enemy);
    tickCooldownsAndBuffs(enemy);
    tickStatusEffects(enemy, logCopy);

    // Log buff expirations
    const expiredBuffsEnemy = getBuffExpirationMessages(enemy);
    if (expiredBuffsEnemy.length > 0) {
      logCopy.push({ text: `✨ Buff expiré sur ${enemy.name}: ${expiredBuffsEnemy.join(", ")}`, type: "info" });
    }

    if (oldDefenseBuff !== getDefenseBuff(enemy)) {
      logCopy.push({ text: `${enemy.name}: ${formatBuffChange("DEF buff", oldDefenseBuff, getDefenseBuff(enemy))}`, type: "info" });
    }
    if (oldDodgeBuff !== getDodgeBuff(enemy)) {
      logCopy.push({ text: `${enemy.name}: ${formatBuffChange("Dodge buff", oldDodgeBuff, getDodgeBuff(enemy))}`, type: "info" });
    }
    if (oldAttackBuff !== getAttackBuff(enemy)) {
      logCopy.push({ text: `${enemy.name}: ${formatBuffChange("ATK buff", oldAttackBuff, getAttackBuff(enemy))}`, type: "info" });
    }

    logCopy.push({ text: `--- Round ${round}: Enemy Turn ---`, type: "info" });
    const damage = executeAttack(enemy, player, logCopy);
    setPlayer({ ...player });

    if (damage === 0) {
      logCopy.push({ text: `Enemy attack esquivé!`, type: "dodge" });
      setLog(logCopy);
    } else if (player.currentHP <= 0) {
      logCopy.push({ text: `💀 DEFEAT!`, type: "defeat" });
      setLog(logCopy);
      setPhase("complete");
    } else {
      logCopy.push({ text: `--- Fin round ${round} ---`, type: "info" });
      setLog(logCopy);
      setRound((prev) => prev + 1);
      setTurn("player");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <Link href="/" className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 rounded-lg shadow-md hover:shadow-lg transition-all mb-4 border border-red-200 dark:border-red-800 font-semibold">
            <span className="mr-2">←</span> Back
          </Link>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent mb-4">
            ⚔️ Battle Arena
          </h1>

          {/* Mode Toggle */}
          <div className="flex gap-4 mb-6 items-center">
            <span className="text-gray-700 font-semibold">Mode:</span>
            <button
              onClick={() => setBattleMode("test")}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                battleMode === "test"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              🧪 Test Brut
            </button>
            <button
              onClick={() => setBattleMode("easy")}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                battleMode === "easy"
                  ? "bg-green-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              🎮 Easy Mode
            </button>
            <button
              onClick={() => setBattleMode("easy")}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                battleMode === "easy"
                  ? "bg-purple-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              📦 Collection ({collection.length})
            </button>

            {/* Team Size Toggle */}
            <span className="text-gray-700 font-semibold ml-8">Format:</span>
            <button
              onClick={() => {
                setTeamSize(1);
                setPlayerTeamIds([null, null, null, null, null]);
                setEnemyTeamIds([null, null, null, null, null]);
                // Reset test mode slot configs
                setPlayerSlotConfigs([
                  { creatureId: "ant", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                ]);
                setEnemySlotConfigs([
                  { creatureId: "housefly", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                ]);
              }}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                teamSize === 1
                  ? "bg-green-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              1v1
            </button>
            <button
              onClick={() => {
                setTeamSize(3);
                setPlayerTeamIds([null, null, null, null, null]);
                setEnemyTeamIds([null, null, null, null, null]);
                // Reset test mode slot configs for 3v3
                setPlayerSlotConfigs([
                  { creatureId: "ant", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                ]);
                setEnemySlotConfigs([
                  { creatureId: "housefly", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                ]);
              }}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                teamSize === 3
                  ? "bg-orange-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              3v3
            </button>
            <button
              onClick={() => {
                setTeamSize(5);
                setPlayerTeamIds([null, null, null, null, null]);
                setEnemyTeamIds([null, null, null, null, null]);
                // Reset test mode slot configs for 5v5
                setPlayerSlotConfigs([
                  { creatureId: "ant", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                ]);
                setEnemySlotConfigs([
                  { creatureId: "housefly", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                  { creatureId: "", level: 10, rank: "E" },
                ]);
              }}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                teamSize === 5
                  ? "bg-red-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              5v5
            </button>
          </div>
        </header>

        {phase === "setup" && battleMode === "test" && teamSize === 1 && (
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <CreatureSelector
              label="🔵 Your Creature"
              creature={playerCreature}
              creatureId={playerCreatureId}
              onCreatureChange={setPlayerCreatureId}
              level={playerLevel}
              onLevelChange={setPlayerLevel}
              rank={playerRank}
              onRankChange={setPlayerRank}
              previewStats={playerPreviewStats}
              accent="blue"
            />

            <CreatureSelector
              label="🔴 Enemy Creature"
              creature={enemyCreature}
              creatureId={enemyCreatureId}
              onCreatureChange={setEnemyCreatureId}
              level={enemyLevel}
              onLevelChange={setEnemyLevel}
              rank={enemyRank}
              onRankChange={setEnemyRank}
              previewStats={enemyPreviewStats}
              accent="red"
            />
          </div>
        )}

        {phase === "setup" && battleMode === "test" && teamSize > 1 && (
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <MultiCreatureTestSelector
              label={`🔵 Équipe Joueur (${teamSize} créatures)`}
              slotConfigs={playerSlotConfigs}
              onSlotChange={handlePlayerSlotChange}
              teamSize={teamSize}
              accent="blue"
            />

            <MultiCreatureTestSelector
              label={`🔴 Équipe Ennemi (${teamSize} créatures)`}
              slotConfigs={enemySlotConfigs}
              onSlotChange={handleEnemySlotChange}
              teamSize={teamSize}
              accent="red"
            />
          </div>
        )}

        {phase === "setup" && battleMode === "easy" && teamSize === 1 && (
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <CollectionSelector
              label="🔵 Your Creature"
              collection={collection}
              selectedId={selectedPlayerId}
              onSelect={setSelectedPlayerId}
              accent="blue"
            />

            {/* Easy Mode 1v1: Random enemy - no selector needed */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-red-400 hover:shadow-2xl transition-all">
              <h2 className="text-3xl font-bold mb-4">🔴 Enemy Creature</h2>
              <div className="bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900 dark:to-orange-900 rounded-xl p-6 min-h-64 flex flex-col items-center justify-center">
                <div className="text-6xl mb-4">🎲</div>
                <p className="text-lg text-red-700 dark:text-red-300 font-semibold text-center">
                  Ennemi aléatoire
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 text-center mt-2">
                  Généré automatiquement
                </p>
                <div className="mt-4 text-xs text-red-500 dark:text-red-300">
                  <p>• Rang aléatoire (poids E)</p>
                  <p>• Niveau 1</p>
                  <p>• Traits RNG</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === "setup" && battleMode === "easy" && teamSize > 1 && (
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <MultiCreatureCollectionSelector
              label={`🔵 Équipe Joueur (${teamSize} créatures)`}
              collection={collection}
              teamIds={playerTeamIds}
              onTeamSelect={handlePlayerTeamSelect}
              teamSize={teamSize}
              accent="blue"
            />

            {/* Easy Mode: Random enemies - no selector needed */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-red-400 hover:shadow-2xl transition-all">
              <h2 className="text-2xl font-bold mb-4">🔴 Équipe Ennemi ({teamSize} créatures)</h2>
              <div className="bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900 dark:to-orange-900 rounded-xl p-6 min-h-64 flex flex-col items-center justify-center">
                <div className="text-6xl mb-4">🎲</div>
                <p className="text-lg text-red-700 dark:text-red-300 font-semibold text-center">
                  Ennemis aléatoires
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 text-center mt-2">
                  {teamSize} créatures générées automatiquement
                </p>
                <div className="mt-4 text-xs text-red-500 dark:text-red-300">
                  <p>• Rangs E-S+</p>
                  <p>• Niveaux aléatoires</p>
                  <p>• Traits variés</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === "setup" && (
          <div className="text-center mb-8">
            <button
              onClick={startBattle}
              disabled={
                // Easy mode 1v1: only need player selected (enemy is auto-generated)
                (teamSize === 1 && battleMode === "easy" && !selectedPlayerId) ||
                // Collection mode 1v1: need both player and enemy selected
                (teamSize === 1 && battleMode !== "easy" && battleMode !== "test" && (!selectedPlayerId || !selectedEnemyId)) ||
                // Test mode multi-creature: need valid configs for both teams
                (teamSize > 1 && battleMode === "test" && (!validateTestSlotConfigs(playerSlotConfigs, teamSize) || !validateTestSlotConfigs(enemySlotConfigs, teamSize))) ||
                // Easy mode multi-creature: only need player team (enemy is auto-generated)
                (teamSize > 1 && battleMode === "easy" && !validateTeamSize(playerTeamIds, teamSize)) ||
                // Collection mode multi-creature: need valid teams for both sides
                (teamSize > 1 && battleMode !== "easy" && battleMode !== "test" && (!validateTeamSize(playerTeamIds, teamSize) || !validateTeamSize(enemyTeamIds, teamSize)))
              }
              className="px-12 py-4 bg-gradient-to-r from-red-600 to-purple-600 text-white text-2xl font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              ⚔️ START BATTLE!
            </button>
          </div>
        )}

        {phase === "battle" && teamSize === 1 && (
          <div className="grid md:grid-cols-3 gap-8">
            {player && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-blue-400">
                <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4">
                  🎮 {turn === "player" ? "YOUR TURN" : "WAITING"}
                </h2>
                <BattleCreatureDisplay creature={player} isPlayer={true} />
              </div>
            )}

            {turn === "player" && (
              <div className="flex flex-col gap-4 justify-center">
                <button
                  onClick={handleAttack}
                  className="px-8 py-6 bg-gradient-to-r from-green-500 to-green-600 text-white text-xl font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  🗡️ ATTACK
                </button>
                {player?.creature.skill && (
                  <button
                    onClick={() => {
                      const skill = player.creature.skill;
                      if (!skill) return;
                      const cooldownKey = skill.name;
                      const currentCooldown = player.skillCooldowns[cooldownKey] || 0;
                      if (currentCooldown > 0 || phase !== "battle" || turn !== "player") return;
                      handleSkill();
                    }}
                    disabled={
                      !player ||
                      !player.creature.skill ||
                      (player.skillCooldowns[player.creature.skill.name] || 0) > 0
                    }
                    className={`px-8 py-6 bg-gradient-to-r text-white text-xl font-bold rounded-xl shadow-lg transition-all ${
                      (player.skillCooldowns[player.creature.skill.name] || 0) > 0
                        ? "from-gray-400 to-gray-500 cursor-not-allowed opacity-50"
                        : "from-purple-500 to-purple-600 hover:shadow-xl transform hover:scale-105"
                    }`}
                  >
                    ✨ SKILL: {player.creature.skill.name}
                  </button>
                )}
              </div>
            )}

            {enemy && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-red-400">
                <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
                  ⚔️ ENEMY
                </h2>
                <BattleCreatureDisplay creature={enemy} isPlayer={false} />
              </div>
            )}
          </div>
        )}

        {phase === "battle" && teamSize > 1 && (
          <MultiCreatureBattleDisplay
            playerTeam={playerTeam}
            enemyTeam={enemyTeam}
            currentActingCreature={currentActingCreature}
            turn={turn}
            round={round}
            turnOrder={turnOrder}
            teamSize={teamSize}
            onAttack={executeMultiCreatureTurn}
            onSkill={handleSkill}
            onSwitchPosition={handleSwitchPosition}
            isActionProcessing={isActionProcessing}
            showSwapSelector={showSwapSelector}
            swapSourceCreature={swapSourceCreature}
            onOpenSwapSelector={handleOpenSwapSelector}
            onConfirmSwap={handleConfirmSwap}
            onCloseSwapSelector={() => {
              setShowSwapSelector(false);
              setSwapSourceCreature(null);
            }}
            showCreatureDetail={showCreatureDetail}
            detailCreature={detailCreature}
            onCloseCreatureDetail={handleCloseCreatureDetail}
            onViewCreatureDetails={handleViewCreatureDetails}
            onFirstSkill={() => handleSkill("specimen")}
            onSecondSkill={() => handleSkill("personality")}
          />
        )}

        {phase === "battle" && (
          <div className="mt-8">
            {teamSize === 1 ? <BattleLogDisplay log={log} /> : <MultiBattleLogDisplay log={log} />}
          </div>
        )}

        {phase === "complete" && teamSize === 1 && (
          <BattleCompleteDisplay
            player={player}
            enemy={enemy}
            log={log}
            onReset={() => {
              setPhase("setup");
              setLog([]);
              setRound(1);
              setTurn("player");
            }}
          />
        )}

        {phase === "complete" && teamSize > 1 && (
          <MultiCreatureBattleCompleteDisplay
            playerTeam={playerTeam}
            enemyTeam={enemyTeam}
            log={log}
            teamSize={teamSize}
            onReset={() => {
              setPhase("setup");
              setLog([]);
              setRound(1);
              setTurn("player");
              setCurrentActingCreature(null);
              setTurnOrder([]);
              setPlayerTeam(null);
              setEnemyTeam(null);
            }}
          />
        )}
      </div>
    </main>
  );
}

function BattleCreatureDisplay({
  creature,
  isPlayer,
}: {
  creature: BattleCreature;
  isPlayer: boolean;
}) {
  const maxHP = creature.stats.hp;
  const hpPercent = (creature.currentHP / maxHP) * 100;
  const defenseBuffActive = getDefenseBuff(creature) > 0;
  const dodgeBuffActive = getDodgeBuff(creature) > 0;

  const skillOnCooldown = creature.creature.skill
    ? Object.entries(creature.skillCooldowns).some(([k, v]) => k === creature.creature.skill?.name && v > 0)
    : false;

  // Status effect helpers
  const hasStun = creature.statusEffects.some(e => e.type === "stun");
  const hasPoison = creature.statusEffects.some(e => e.type === "poison");
  const hasSlow = creature.statusEffects.some(e => e.type === "slow");
  const slowEffect = creature.statusEffects.find(e => e.type === "slow");
  const poisonEffect = creature.statusEffects.find(e => e.type === "poison");

  const creatureImage = getCreatureImage(creature.creature.id, creature.stats.rank);

  return (
    <div className="space-y-4">
      {/* Creature Image */}
      <div className="mb-4">
        <img
          src={creatureImage}
          alt={creature.name}
          className="w-full h-32 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600"
        />
      </div>

      {/* Status Effects Indicator */}
      {creature.statusEffects.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {hasStun && (
            <span className="px-2 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs rounded-full font-semibold">
              💫 Étourdi (1t)
            </span>
          )}
          {hasPoison && poisonEffect && (
            <span className="px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs rounded-full font-semibold">
              ☠️ Poison ({poisonEffect?.duration}t)
            </span>
          )}
          {hasSlow && slowEffect && (
            <span className="px-2 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded-full font-semibold">
              🐌 Lent ({slowEffect?.duration}t)
            </span>
          )}
        </div>
      )}

      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-bold">HP</span>
          {creature.statModifiers && creature.statModifiers.hpBonus !== 0 && creature.baseStats ? (
            <div>
              <span className="font-bold">{creature.currentHP} / {maxHP}</span>
              <span className="text-xs text-purple-600 ml-1">
                 max ({creature.baseStats.hp} {creature.statModifiers.hpBonus > 0 ? "+" : ""}{creature.statModifiers.hpBonus.toFixed(0)}%)
              </span>
            </div>
          ) : (
            <span className="font-bold">{creature.currentHP} / {maxHP}</span>
          )}
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
          <div
            className="bg-gradient-to-r from-red-400 to-red-600 h-full rounded-full transition-all"
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>ATK</span>
          {creature.statModifiers && creature.statModifiers.attackBonus !== 0 && creature.baseStats ? (
            <div>
              <span className="font-bold">{creature.stats.attack}</span>
              <span className="text-xs text-purple-600 ml-1">({creature.baseStats.attack} +{creature.statModifiers.attackBonus > 0 ? "+" : ""}{creature.statModifiers.attackBonus.toFixed(0)}%)</span>
            </div>
          ) : (
            <span>{creature.stats.attack}</span>
          )}
        </div>
        {defenseBuffActive ? (
          <div className="flex justify-between">
            <span>DEF</span>
            <div>
              <span className="text-purple-600 font-bold">{Math.floor(creature.stats.defense * (1 + getDefenseBuff(creature)))}</span>
              <span className="text-xs ml-1">(+{Math.floor(getDefenseBuff(creature) * 100)}%)</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-between">
            <span>DEF</span>
            {creature.statModifiers && creature.statModifiers.defenseBonus !== 0 && creature.baseStats ? (
              <div>
                <span className="font-bold">{creature.stats.defense}</span>
                <span className="text-xs text-purple-600 ml-1">({creature.baseStats.defense} +{creature.statModifiers.defenseBonus > 0 ? "+" : ""}{creature.statModifiers.defenseBonus.toFixed(0)}%)</span>
              </div>
            ) : (
              <span>{creature.stats.defense}</span>
            )}
          </div>
        )}
        <div className="flex justify-between">
          <span>SPD</span>
          {hasSlow && slowEffect ? (
            <div>
              <span className="text-blue-600 font-bold">{Math.floor(creature.stats.speed * (1 - (slowEffect.value || 0)))}</span>
              <span className="text-xs text-blue-600 ml-1">({creature.stats.speed} -{Math.floor((slowEffect.value || 0) * 100)}%)</span>
            </div>
          ) : creature.statModifiers && creature.statModifiers.speedBonus !== 0 && creature.baseStats ? (
            <div>
              <span className="font-bold">{creature.stats.speed}</span>
              <span className="text-xs text-purple-600 ml-1">({creature.baseStats.speed} +{creature.statModifiers.speedBonus > 0 ? "+" : ""}{creature.statModifiers.speedBonus.toFixed(0)}%)</span>
            </div>
          ) : (
            <span>{creature.stats.speed}</span>
          )}
        </div>
        <div className="flex justify-between">
          <span>CRIT</span>
          {creature.statModifiers && creature.statModifiers.critBonus !== 0 && creature.baseStats ? (
            <div>
              <span className="font-bold">{creature.stats.crit}</span>
              <span className="text-xs text-purple-600 ml-1">({creature.baseStats.crit} +{creature.statModifiers.critBonus > 0 ? "+" : ""}{creature.statModifiers.critBonus.toFixed(0)}%)</span>
            </div>
          ) : (
            <span>{creature.stats.crit}</span>
          )}
        </div>
      </div>

      {creature.creature.skill && (
        <div className="pt-2 border-t">
          <div className="text-xs mb-1">Skill: {creature.creature.skill.name}</div>
          <div className="text-xs">
            {skillOnCooldown ? (
              <div className="text-red-500 font-semibold">
                ❌ CD: {Object.entries(creature.skillCooldowns)
                  .filter(([k, v]) => v > 0)
                  .map(([k, v]) => `${v}t`)
                  .join(", ")}
              </div>
            ) : (
              <div className="text-green-500">✅ Ready</div>
            )}
          </div>
        </div>
      )}

      {(defenseBuffActive || dodgeBuffActive) && (
        <div className="pt-2 border-t">
          <div className="text-xs">
            {defenseBuffActive && <div>✨ DEF +{Math.floor(getDefenseBuff(creature) * 100)}% ({getDefenseBuffTurns(creature)}t)</div>}
            {dodgeBuffActive && <div>💨 Dodge +{Math.floor(getDodgeBuff(creature) * 100)}% ({getDodgeBuffTurns(creature)}t)</div>}
          </div>
        </div>
      )}

      {/* Attack Counter for "every X attacks" traits */}
      {creature.traits.includes("slowTrait") && (
        <div className="pt-2 border-t">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            🔄 Attaques: {creature.attackCounter % 3}/3
          </div>
        </div>
      )}
    </div>
  );
}

function BattleLogDisplay({ log }: { log: BattleLogEntry[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
      <h2 className="text-2xl font-bold mb-4">📜 Battle Log</h2>
      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 max-h-96 overflow-y-auto">
        <div className="space-y-1 text-sm font-mono">
          {log.map((entry, idx) => (
            <div
              key={idx}
              className={
                entry.type === "critical"
                  ? "text-red-600 font-bold"
                  : entry.type === "dodge"
                  ? "text-green-600 italic"
                  : entry.type === "skill"
                  ? "text-purple-600"
                  : entry.type === "victory"
                  ? "text-amber-600 font-bold text-lg"
                  : entry.type === "defeat"
                  ? "text-gray-600"
                  : "text-gray-600 dark:text-gray-300"
              }
            >
              {entry.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BattleCompleteDisplay({
  player,
  enemy,
  log,
  onReset,
}: {
  player: BattleCreature | null;
  enemy: BattleCreature | null;
  log: BattleLogEntry[];
  onReset: () => void;
}) {
  const winner = player && enemy && player.currentHP > 0 ? "player" : "enemy";

  return (
    <div className={`bg-gradient-to-br ${winner === "player" ? "from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900" : "from-red-50 to-orange-50 dark:from-red-900 dark:to-orange-900"} rounded-2xl shadow-xl p-8`}>
      <div className="text-center mb-6">
        <h2 className="text-4xl font-bold mb-4">
          {winner === "player" ? "🏆 VICTORY!" : "💀 DEFEAT"}
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {player && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <h3 className="font-bold mb-2">Final HP</h3>
            <p className="text-3xl font-bold">{player.currentHP} / {player.stats.hp}</p>
          </div>
        )}
        {enemy && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <h3 className="font-bold mb-2">Enemy HP</h3>
            <p className="text-3xl font-bold">{enemy.currentHP} / {enemy.stats.hp}</p>
          </div>
        )}
      </div>

      <div className="mb-6">
        <BattleLogDisplay log={log} />
      </div>

      <div className="text-center">
        <button
          onClick={onReset}
          className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-xl font-bold rounded-xl shadow-lg hover:shadow-xl"
        >
          🔄 NEW BATTLE
        </button>
      </div>
    </div>
  );
}

function CreatureSelector({
  label,
  creature,
  creatureId,
  onCreatureChange,
  level,
  onLevelChange,
  rank,
  onRankChange,
  previewStats,
  accent,
}: {
  label: string;
  creature: typeof CREATURES[keyof typeof CREATURES];
  creatureId: string;
  onCreatureChange: (id: string) => void;
  level: number;
  onLevelChange: (level: number) => void;
  rank: Rank;
  onRankChange: (rank: Rank) => void;
  previewStats: { hp: number; attack: number; defense: number; speed: number; crit: number };
  accent: "blue" | "red";
}) {
  const accentColors = {
    blue: "border-blue-400 hover:border-blue-600",
    red: "border-red-400 hover:border-red-600",
  };
  const accentBg = {
    blue: "from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900",
    red: "from-red-100 to-orange-100 dark:from-red-900 dark:to-orange-900",
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 ${accentColors[accent]} hover:shadow-2xl transition-all`}>
      <h2 className="text-3xl font-bold mb-4">{label}</h2>

      <div className={`bg-gradient-to-br ${accentBg[accent]} rounded-xl p-6 mb-4`}>
        <img
          src={getCreatureImage(creatureId, rank)}
          alt={`${creature.name} Rank ${rank}`}
          className="w-full max-h-48 object-contain mx-auto rounded-lg"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">Creature</label>
        <select
          value={creatureId}
          onChange={(e) => onCreatureChange(e.target.value)}
          className="w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700"
        >
          {Object.values(CREATURES).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">Level: {level}</label>
        <input
          type="range"
          min="1"
          max="50"
          value={level}
          onChange={(e) => onLevelChange(parseInt(e.target.value))}
          className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">Rank:</label>
        <div className="flex flex-wrap gap-2">
          {RANKS.map((r) => (
            <button
              key={r}
              onClick={() => onRankChange(r as Rank)}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                rank === r
                  ? `bg-${accent === "blue" ? "blue" : "red"}-600 text-white`
                  : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="font-bold mb-2">Stats (Base)</h3>
        <div className="text-sm space-y-1">
          <div>HP: {creature.baseStats.hp}</div>
          <div>ATK: {creature.baseStats.attack}</div>
          <div>DEF: {creature.baseStats.defense}</div>
          <div>SPD: {creature.baseStats.speed}</div>
          <div>CRIT: {creature.baseStats.crit}</div>
        </div>
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
        <h3 className="font-bold mb-2 text-blue-900 dark:text-blue-100">Stats (Final)</h3>
        <div className="text-sm space-y-1">
          <div><span className="font-bold">HP:</span> {previewStats.hp}</div>
          <div><span className="font-bold">ATK:</span> {previewStats.attack}</div>
          <div><span className="font-bold">DEF:</span> {previewStats.defense}</div>
          <div><span className="font-bold">SPD:</span> {previewStats.speed}</div>
          <div><span className="font-bold">CRIT:</span> {previewStats.crit}</div>
        </div>
      </div>

      {creature.skill && (
        <div className="mt-4 pt-2 border-t">
          <h4 className="font-bold mb-1">Skill</h4>
          <div className="text-sm">
            <div className="font-semibold">{creature.skill.name}</div>
            <div className="text-xs">{creature.skill.description}</div>
            <div className="text-xs mt-1">Cooldown: {creature.skill.cooldown} tours</div>
          </div>
        </div>
      )}
    </div>
  );
}

function CollectionSelector({
  label,
  collection,
  selectedId,
  onSelect,
  accent,
}: {
  label: string;
  collection: HuntedCreature[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  accent: "blue" | "red";
}) {
  const accentColors = {
    blue: "border-blue-400 hover:border-blue-600",
    red: "border-red-400 hover:border-red-600",
  };

  const accentBg = {
    blue: "from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900",
    red: "from-red-100 to-orange-100 dark:from-red-900 dark:to-orange-900",
  };

  const selectedCreature = collection.find(c => c.id === selectedId);

  const RANK_BADGE_COLORS: Record<Rank, string> = {
    E: "bg-gray-600",
    D: "bg-blue-600",
    C: "bg-green-600",
    B: "bg-orange-600",
    A: "bg-red-600",
    S: "bg-yellow-600",
    "S+": "bg-purple-600",
  };

  const RankOrder: Record<Rank, number> = {
    "S+": 7,
    "S": 6,
    "A": 5,
    "B": 4,
    "C": 3,
    "D": 2,
    "E": 1,
  };

  const sortedCollection = [...collection].sort((a, b) => {
    const rankDiff = RankOrder[b.finalStats.rank] - RankOrder[a.finalStats.rank];
    if (rankDiff !== 0) return rankDiff;
    return b.level - a.level;
  });

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 ${accentColors[accent]} hover:shadow-2xl transition-all`}>
      <h2 className="text-3xl font-bold mb-4">{label}</h2>

      <div className={`bg-gradient-to-br ${accentBg[accent]} rounded-xl p-4 mb-4 min-h-64 overflow-y-auto max-h-96`}>
        {!selectedCreature && (
          <p className="text-center text-gray-500 italic">Sélectionnez une créature...</p>
        )}

        {!selectedCreature && collection.length === 0 && (
          <p className="text-center text-gray-500 italic">Collection vide. Allez au chasseur! 🏹</p>
        )}

        <div className="space-y-3">
          {sortedCollection.map((creature) => (
            <button
              key={creature.id}
              onClick={() => onSelect(creature.id === selectedId ? null : creature.id)}
              className={`w-full text-left rounded-lg p-3 transition-all ${
                creature.id === selectedId
                  ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 bg-white dark:bg-gray-700 shadow-md"
                  : "bg-white/50 dark:bg-gray-700/50 hover:bg-white dark:hover:bg-gray-700"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="text-lg hover:scale-125 transition-transform"
                    title={creature.isFavorite ? "Favori (protégé)" : "Pas favori"}
                  >
                    {creature.isFavorite ? "❤️" : "🤍"}
                  </button>
                  <img
                    src={getCreatureImage(creature.creatureId, creature.finalStats.rank)}
                    alt={creature.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div>
                    <p className="font-bold">{creature.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${RANK_BADGE_COLORS[creature.finalStats.rank]} text-white`}>
                      R{creature.finalStats.rank} L{creature.level}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-semibold">
                  {creature.id === selectedId ? "✓" : "○"}
                </p>
              </div>

              {creature.id === selectedId && (
                <>
                  <div className="grid grid-cols-5 gap-1 mt-3 text-center text-xs">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded p-1">
                      <p className="text-gray-500">HP</p>
                      <p className="font-bold">{creature.finalStats.hp}</p>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded p-1">
                      <p className="text-gray-500">ATK</p>
                      <p className="font-bold">{creature.finalStats.attack}</p>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded p-1">
                      <p className="text-gray-500">DEF</p>
                      <p className="font-bold">{creature.finalStats.defense}</p>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded p-1">
                      <p className="text-gray-500">SPD</p>
                      <p className="font-bold">{creature.finalStats.speed}</p>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded p-1">
                      <p className="text-gray-500">CRIT</p>
                      <p className="font-bold">{creature.finalStats.crit}</p>
                    </div>
                  </div>

                  {creature.traits && creature.traits.length > 0 && (
                    <div className="mt-3 pt-2 border-t">
                      <p className="text-xs font-bold text-purple-600 mb-1">Traits ({creature.traits.length}):</p>
                      <div className="flex flex-wrap gap-1">
                        {getTraitsByIds(creature.traits).slice(0, 3).map(trait => (
                          <span key={trait.id} className="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                            {trait.name}
                          </span>
                        ))}
                        {creature.traits.length > 3 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-200 dark:bg-purple-800 text-purple-600 dark:text-purple-400">
                            +{creature.traits.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
