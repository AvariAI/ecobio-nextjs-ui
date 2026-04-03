"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Rank, CREATURES, PERSONALITIES, PersonalityType, generateRandomPersonality, applyLevelScaling } from "@/lib/database";
import { rollRandomGeneticType } from "@/lib/genetic-types";
import { getVarianceRange, BattleStats } from "@/lib/battle";
import { rollRandomTraits, applyTraitStatModifiers } from "@/lib/traits";

interface Creature {
  id: string;
  name: string;
  creatureId: string;
  finalStats: {
    rank: Rank;
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    crit: number;
  };
  level: number;
  currentHP: number;
  maxHP: number;
  position?: number;
  geneticType: string;
  personality: PersonalityType;
}

interface BattleState {
  playerTeam: Creature[];
  enemyTeam: Creature[];
  turn: number;
  log: string[];
  winner: "player" | "enemy" | null;
  turnOrder: Array<{ id: string; owner: "player" | "enemy" }>;
  currentAttackerIndex: number;
}

function getCreatureImage(creatureId: string, rank: Rank, geneticType?: string): string {
  if (creatureId === "housefly") {
    const rankSuffix = rank === "S+" ? "S+" : rank;
    return `/ecobio-nextjs-ui/creatures/fly-rank-${rankSuffix}.png`;
  }
  if (creatureId === "ant") {
    const rankSuffix = rank === "S+" ? "S+" : rank;
    return `/ecobio-nextjs-ui/creatures/ant_rank_${rankSuffix}.png`;
  }
  if (creatureId === "honeybee") {
    const rankSuffix = rank === "S+" ? "S+" : rank;
    return `/ecobio-nextjs-ui/creatures/bee-rank-${rankSuffix}.png`;
  }
  if (creatureId === "spider_mutant") {
    return "/ecobio-nextjs-ui/images/creatures/spider_mutant_e.png";
  }
  if (creatureId === "ravaryn" && geneticType) {
    const normalizedType = geneticType.toLowerCase().replace("é", "e").replace("è", "e");
    return `/ecobio-nextjs-ui/images/creatures/ravaryn_${normalizedType}_e.png`;
  }
  return "/ecobio-nextjs-ui/images/creatures/spider_mutant_e.png";
}

function calculateDamage(attacker: Creature, defender: Creature, isCrit: boolean): number {
  const multiplier = isCrit ? 2 : 1;
  const rawDamage = attacker.finalStats.attack * multiplier - defender.finalStats.defense * 0.5;
  return Math.max(1, Math.floor(rawDamage));
}

function isCriticalHit(crit: number): boolean {
  return Math.random() * 100 < crit;
}

function getPersonalityEmoji(personality?: PersonalityType): string {
  const emojiMap: Record<PersonalityType, string> = {
    agressif: "🦁",
    protecteur: "🛡️",
    rapide: "💨",
    stratège: "❤️",
    précis: "🎯",
    mystérieux: "🌙"
  };
  return personality ? emojiMap[personality] : "";
}

// Rarity roll for enemy creatures (like hunting)
function rollRarity(): Rank {
  const dist: { rank: Rank; weight: number }[] = [
    { rank: "E", weight: 8175 },
    { rank: "D", weight: 1000 },
    { rank: "C", weight: 600 },
    { rank: "B", weight: 150 },
    { rank: "A", weight: 50 },
    { rank: "S", weight: 20 },
    { rank: "S+", weight: 5 },
  ];
  const totalWeight = dist.reduce((sum, item) => sum + item.weight, 0);
  const roll = Math.random() * totalWeight;
  let cum = 0;
  for (const item of dist) {
    cum += item.weight;
    if (roll < cum) return item.rank;
  }
  return "E";
}

// Spawn ephemeral creature for battle (like hunting, no persistence)
function spawnCreatureForBattle(): Creature {
  const creaturePool = ["ravaryn"];
  const creatureId = creaturePool[Math.floor(Math.random() * creaturePool.length)];
  const creature = CREATURES[creatureId];

  if (!creature) {
    console.error("Creature reference is undefined!");
    throw new Error("Failed to spawn creature");
  }

  // Roll random rank (like hunting)
  const rank: Rank = rollRarity();

  // Get variance range based on rank
  let [minVar, maxVar] = getVarianceRange(rank);

  // Variance RNG: Stats variation based on rank (like hunting)
  const hpVariance = minVar + Math.random() * (maxVar - minVar);
  const atkVariance = minVar + Math.random() * (maxVar - minVar);
  const defVariance = minVar + Math.random() * (maxVar - minVar);
  const spdVariance = minVar + Math.random() * (maxVar - minVar);
  const critVariance = minVar + Math.random() * (maxVar - minVar);

  // Stats POST-variance ONLY (variance RNG only)
  const varianceStats: BattleStats = {
    hp: Math.max(1, Math.floor(creature.baseStats.hp * hpVariance)),
    attack: Math.max(1, Math.floor(creature.baseStats.attack * atkVariance)),
    defense: Math.max(1, Math.floor(creature.baseStats.defense * defVariance)),
    speed: Math.max(1, Math.floor(creature.baseStats.speed * spdVariance)),
    crit: Math.max(1, Math.floor(creature.baseStats.crit * critVariance)),
    rank,
  };

  // Generate random personality (RNG!)
  const personality = generateRandomPersonality();

  // Roll random genetic type
  const geneticType = rollRandomGeneticType();

  // Roll random traits based on rank
  const traitIds = rollRandomTraits(rank);

  // Apply personality-based level scaling (level 1 = no scaling, like hunting spawn)
  const scaledStats = applyLevelScaling({ ...varianceStats }, 1, personality);

  // Apply trait stat modifiers (level-dependent scaling, like hunting)
  const { modifiedStats: traitStats } = applyTraitStatModifiers(
    {
      hp: scaledStats.hp,
      attack: scaledStats.attack,
      defense: scaledStats.defense,
      speed: scaledStats.speed,
      crit: scaledStats.crit,
    },
    traitIds,
    1 // Start at level 1 (ephemeral creatures don't grow)
  );

  // Final stats with personality scaling + trait modifications
  const finalStats: BattleStats = {
    hp: traitStats.hp,
    attack: traitStats.attack,
    defense: traitStats.defense,
    speed: traitStats.speed,
    crit: traitStats.crit,
    rank,
  };

  return {
    id: `enemy-${Math.random().toString(36).substr(2, 9)}`,
    name: creature.name,
    creatureId: creature.id,
    geneticType,
    personality,
    finalStats,
    level: 1,
    currentHP: finalStats.hp,
    maxHP: finalStats.hp,
    // Ephemeral - not saved to localStorage!
  };
}

export default function BattlePage() {
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCreature, setSelectedCreature] = useState<Creature | null>(null);
  const [damageNumbers, setDamageNumbers] = useState<Array<{ id: string; damage: number; isCrit: boolean; x: number; y: number }>>([]);

  useEffect(() => {
    const initBattle = async () => {
      if (typeof window === "undefined") return;

      try {
        const teamIdsJson = sessionStorage.getItem("battle-team");
        if (!teamIdsJson) {
          setError("Aucune équipe trouvée. Redirection vers la sélection...");
          setTimeout(() => window.location.href = "/arena/training", 1500);
          return;
        }

        const teamIds = JSON.parse(teamIdsJson) as string[];
        console.log("Team IDs loaded:", teamIds);

        const saved = localStorage.getItem("ecobio-collection");
        if (!saved) {
          setError("Collection vide. Redirection vers l'home...");
          setTimeout(() => window.location.href = "/", 1500);
          return;
        }

        const collection = JSON.parse(saved) as any[];
        console.log("Collection loaded:", collection.length, "creatures");

        const playerTeam: Creature[] = [];
        
        for (let i = 0; i < teamIds.length; i++) {
          const id = teamIds[i];
          const c = collection.find((item: any) => item.id === id);
          
          if (!c) {
            console.error(`Creature with id ${id} not found`);
            continue;
          }

          const stats = c.finalStats || c.customStats || c.baseStats || c.baseStats;
          const hp = c.currentHP || c.maxHP || stats?.hp || 100;
          const maxHP = c.maxHP || stats?.hp || 100;

          playerTeam.push({
            id: c.id,
            name: c.name,
            creatureId: c.creatureId,
            geneticType: c.geneticType || "resilient", // Default fallback
            personality: c.personality || generateRandomPersonality(), // Default fallback
            finalStats: {
              rank: stats?.rank || c.rank || "E",
              hp: maxHP,
              attack: stats?.attack || c.baseStats?.attack || 10,
              defense: stats?.defense || c.baseStats?.defense || 5,
              speed: stats?.speed || c.baseStats?.speed || 10,
              crit: stats?.crit || c.baseStats?.crit || 5
            },
            level: c.level || c.customStats?.level || 1,
            currentHP: hp,
            maxHP: maxHP,
            position: i + 1
          });
        }

        console.log("Player team built:", playerTeam.length, "creatures");

        if (playerTeam.length !== 5) {
          setError(`Équipe incomplète (${playerTeam.length}/5). Redirection...`);
          setTimeout(() => window.location.href = "/arena/training", 1500);
          return;
        }

        // Generate enemy team (5 creatures) - ephemeral creatures with full RNG like hunting
        const enemyTeam: Creature[] = [];

        for (let i = 0; i < 5; i++) {
          const creature = spawnCreatureForBattle();
          enemyTeam.push({
            ...creature,
            position: i + 1
          });
        }

        console.log("Enemy team generated:", enemyTeam.map(c => `${c.name} (${c.personality}, ${c.geneticType}, ${c.finalStats.rank})`));

        const playerTeamWithHP = [...playerTeam];

        // Create initial turn order based on speed (fastest first, 50/50 tiebreaker)
        const allCreaturesWithOwner = [
          ...playerTeamWithHP.map(c => ({ ...c, owner: "player" as const })),
          ...enemyTeam.map(c => ({ ...c, owner: "enemy" as const }))
        ];

        // Sort by speed, with random tiebreaker for equal speeds
        allCreaturesWithOwner.sort((a, b) => {
          if (b.finalStats.speed !== a.finalStats.speed) {
            return b.finalStats.speed - a.finalStats.speed;
          }
          // Same speed: 50% random
          return Math.random() - 0.5;
        });

        const turnOrder = allCreaturesWithOwner.map(c => ({
          id: c.id,
          owner: c.owner
        }));

        setBattleState({
          playerTeam: playerTeamWithHP,
          enemyTeam,
          turn: 1,
          log: ["⚔️ Combat commencé!"],
          winner: null,
          turnOrder,
          currentAttackerIndex: 0
        });
      } catch (err) {
        console.error("Battle initialization error:", err);
        setError(`Erreur: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    initBattle();
  }, []);

  const processTurn = () => {
    if (!battleState || isProcessing || battleState.winner) return;

    setIsProcessing(true);

    const newLog = [...battleState.log];
    const newPlayerTeam = [...battleState.playerTeam];
    const newEnemyTeam = [...battleState.enemyTeam];
    let newWinner: "player" | "enemy" | null = null;
    let newIndex = battleState.currentAttackerIndex;

    // Find the next alive creature in the turn order
    let attacker: any = null;
    let attackerFound = false;
    let attempts = 0;
    const maxAttempts = battleState.turnOrder.length; // Prevent infinite loop

    while (attempts < maxAttempts && !attackerFound) {
      const turnEntry = battleState.turnOrder[newIndex];
      
      if (turnEntry.owner === "player") {
        const creature = newPlayerTeam.find(c => c.id === turnEntry.id);
        if (creature && creature.currentHP > 0) {
          attacker = { ...creature, owner: "player" as const };
          attackerFound = true;
        }
      } else {
        const creature = newEnemyTeam.find(c => c.id === turnEntry.id);
        if (creature && creature.currentHP > 0) {
          attacker = { ...creature, owner: "enemy" as const };
          attackerFound = true;
        }
      }

      if (!attackerFound) {
        newIndex = (newIndex + 1) % battleState.turnOrder.length;
        attempts++;
      }
    }

    // If no alive attacker found, someone won
    if (!attackerFound) {
      const alivePlayers = newPlayerTeam.filter(c => c.currentHP > 0).length;
      const aliveEnemies = newEnemyTeam.filter(c => c.currentHP > 0).length;
      newWinner = alivePlayers > 0 ? "player" : "enemy";
      
      setBattleState({
        playerTeam: newPlayerTeam,
        enemyTeam: newEnemyTeam,
        turn: battleState.turn + 1,
        log: newLog,
        winner: newWinner,
        turnOrder: battleState.turnOrder,
        currentAttackerIndex: newIndex
      });
      setIsProcessing(false);
      return;
    }

    // Determine target based on who attacks
    let target: any;
    let targetTeam: "player" | "enemy";

    if (attacker.owner === "player") {
      // Player attacks: target random alive enemy
      const aliveEnemies = newEnemyTeam.filter(c => c.currentHP > 0);
      if (aliveEnemies.length === 0) {
        newWinner = "player";
        setBattleState({
          playerTeam: newPlayerTeam,
          enemyTeam: newEnemyTeam,
          turn: battleState.turn + 1,
          log: newLog,
          winner: newWinner,
          turnOrder: battleState.turnOrder,
          currentAttackerIndex: newIndex
        });
        setIsProcessing(false);
        return;
      }
      target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
      targetTeam = "enemy";
    } else {
      // Enemy attacks: target random alive player
      const alivePlayers = newPlayerTeam.filter(c => c.currentHP > 0);
      if (alivePlayers.length === 0) {
        newWinner = "enemy";
        setBattleState({
          playerTeam: newPlayerTeam,
          enemyTeam: newEnemyTeam,
          turn: battleState.turn + 1,
          log: newLog,
          winner: newWinner,
          turnOrder: battleState.turnOrder,
          currentAttackerIndex: newIndex
        });
        setIsProcessing(false);
        return;
      }
      target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      targetTeam = "player";
    }

    const isCrit = isCriticalHit(attacker.finalStats.crit);
    const damage = calculateDamage(attacker, target, isCrit);

    // Show damage number
    setDamageNumbers(prev => [...prev, {
      id: `damage-${Date.now()}`,
      damage,
      isCrit,
      x: Math.random() * 50 - 25,
      y: Math.random() * 20 - 10
    }]);

    setTimeout(() => {
      setDamageNumbers(prev => prev.filter(d => d.id !== `damage-${Date.now()}`));
    }, 1500);

    // Apply damage to target team
    if (targetTeam === "enemy") {
      const targetIndex = newEnemyTeam.findIndex(c => c.id === target.id);
      newEnemyTeam[targetIndex] = { ...target, currentHP: Math.max(0, target.currentHP - damage) };
      
      // Check if enemy team is defeated
      const stillAliveEnemies = newEnemyTeam.filter(c => c.currentHP > 0);
      if (stillAliveEnemies.length === 0) {
        newWinner = "player";
      }
    } else {
      const targetIndex = newPlayerTeam.findIndex(c => c.id === target.id);
      newPlayerTeam[targetIndex] = { ...target, currentHP: Math.max(0, target.currentHP - damage) };
      
      // Check if player team is defeated
      const stillAlivePlayers = newPlayerTeam.filter(c => c.currentHP > 0);
      if (stillAlivePlayers.length === 0) {
        newWinner = "enemy";
      }
    }

    const critText = isCrit ? " **CRITIQUE!**" : "";
    newLog.push(`${attacker.name} → ${target.name}: ${damage} dégâts${critText}`);

    // Move to next attacker in turn order
    let nextIndex = (newIndex + 1) % battleState.turnOrder.length;

    setBattleState({
      playerTeam: newPlayerTeam,
      enemyTeam: newEnemyTeam,
      turn: battleState.turn + 1,
      log: newLog,
      winner: newWinner,
      turnOrder: battleState.turnOrder,
      currentAttackerIndex: nextIndex
    });

    setIsProcessing(false);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">⚠️ Erreur</h1>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!battleState) {
    return <div className="min-h-screen bg-gray-900 text-white p-6">Chargement...</div>;
  }

  const playerAlive = battleState.playerTeam.filter(c => c.currentHP > 0).length;
  const enemyAlive = battleState.enemyTeam.filter(c => c.currentHP > 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-orange-950 to-purple-950 p-6">
      <div className="max-w-7xl mx-auto">
        <Link href="/arena/training" className="inline-block px-4 py-2 mb-4 bg-black/30 hover:bg-black/50 text-white rounded-lg transition-colors">
          ← Retour
        </Link>

        <h1 className="text-3xl font-bold text-white mb-6 text-center">⚔️ Combat</h1>

        {battleState.winner && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center animate-[bounce_0.5s_ease-out]">
              <h2 className={`text-6xl font-bold mb-4 ${battleState.winner === "player" ? "text-green-600" : "text-red-600"}`}>
                {battleState.winner === "player" ? "🎉 VICTOIRE!" : "💀 DÉFAITE!"}
              </h2>
              {battleState.winner === "player" && (
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">Survivants: {playerAlive}/5</p>
              )}
              <Link href="/arena/training" className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xl font-bold rounded-xl transition-all">
                Continuer
              </Link>
            </div>
          </div>
        )}

        <div className="bg-black/20 rounded-3xl p-6 backdrop-blur-sm">
          <div className="text-center mb-4">
            <span className="text-gray-300 text-xs">Tour {battleState.turn}</span>
          </div>

          <div className="flex justify-between mb-3 px-2">
            <span className="text-blue-400 font-bold text-xs">TON ÉQUIPE ({playerAlive}/5)</span>
            <span className="text-red-400 font-bold text-xs">ENNEMIS ({enemyAlive}/5)</span>
          </div>

          <div className="grid grid-cols-5 gap-x-4 mb-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              {battleState.playerTeam.map((creature) => (
                <div
                  key={creature.id}
                  onClick={() => !battleState.winner && setSelectedCreature(creature)}
                  className={`relative bg-gradient-to-br from-blue-900/90 to-blue-950 rounded-xl p-2.5 cursor-pointer transition-all hover:scale-105 shadow-lg border-2 border-blue-500/30 ${
                    creature.currentHP <= 0 ? "opacity-40 grayscale" : ""
                  }`}
                >
                  {creature.currentHP <= 0 && (
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                      <span className="text-xl">💀</span>
                    </div>
                  )}
                  {damageNumbers.find(dn => dn.id === creature.id) && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-lg font-bold text-red-500 animate-[float-up_1s_ease-out_forwards]">
                      {damageNumbers.find(dn => dn.id === creature.id)?.damage}
                    </div>
                  )}

                  <div className="absolute -top-1 -left-1 bg-yellow-500 text-white text-xs px-1 py-0.5 rounded-full font-bold">
                    #{creature.position}
                  </div>

                  <div className="flex items-center gap-2">
                    <img
                      src={getCreatureImage(creature.creatureId, creature.finalStats.rank, creature.geneticType)}
                      alt={creature.name}
                      className="w-14 h-14 object-contain"
                    />
                    <div className="flex-1">
                      <p className="text-white font-bold text-xs">{creature.name}</p>
                      <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            creature.currentHP / creature.maxHP > 0.5
                              ? "from-green-500 to-green-600"
                              : creature.currentHP / creature.maxHP > 0.25
                              ? "from-orange-500 to-orange-600"
                              : "from-red-500 to-red-600"
                          }`}
                          style={{ width: `${(creature.currentHP / creature.maxHP) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 flex justify-between">
                        <span>{creature.currentHP}/{creature.maxHP}</span>
                        <span className="text-cyan-400 capitalize">🔬 {creature.geneticType}</span>
                      </div>
                      {creature.personality && PERSONALITIES[creature.personality] && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          <span className="text-purple-400">{getPersonalityEmoji(creature.personality)} {PERSONALITIES[creature.personality].name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-1.5 pt-1.5 border-t border-blue-600/30">
                    <div className="flex gap-1">
                      <div className="w-6 h-6 bg-blue-600/30 rounded border border-blue-400/50 flex items-center justify-center text-blue-300 text-xs">+</div>
                      <div className="w-6 h-6 bg-gray-600/30 rounded border border-gray-400/30 flex items-center justify-center text-gray-400 text-xs">-</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="col-span-1 flex items-center justify-center">
              <div className="text-3xl animate-[pulse_2s_ease-in-out_infinite]">⚔️</div>
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              {battleState.enemyTeam.map((creature) => (
                <div
                  key={creature.id}
                  onClick={() => !battleState.winner && setSelectedCreature(creature)}
                  className={`relative bg-gradient-to-br from-red-900/90 to-red-950 rounded-xl p-2.5 cursor-pointer transition-all hover:scale-105 shadow-lg border-2 border-red-500/30 ${
                    creature.currentHP <= 0 ? "opacity-40 grayscale" : ""
                  }`}
                >
                  {creature.currentHP <= 0 && (
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                      <span className="text-xl">💀</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 justify-end">
                    <div className="flex-1 text-right">
                      <p className="text-white font-bold text-xs">{creature.name}</p>
                      <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1 ml-auto">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            creature.currentHP / creature.maxHP > 0.5
                              ? "from-green-500 to-green-600"
                              : creature.currentHP / creature.maxHP > 0.25
                              ? "from-orange-500 to-orange-600"
                              : "from-red-500 to-red-600"
                          }`}
                          style={{ width: `${(creature.currentHP / creature.maxHP) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 flex justify-between">
                        {creature.personality && PERSONALITIES[creature.personality] && (
                          <span className="text-purple-400">{PERSONALITIES[creature.personality].name} {getPersonalityEmoji(creature.personality)}</span>
                        )}
                        <span>{creature.currentHP}/{creature.maxHP}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        <span className="text-cyan-400 capitalize">🔬 {creature.geneticType}</span>
                      </div>
                    </div>
                    <img
                      src={getCreatureImage(creature.creatureId, creature.finalStats.rank, creature.geneticType)}
                      alt={creature.name}
                      className="w-14 h-14 object-contain"
                    />
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 py-0.5 rounded-full font-bold">
                      #{creature.position}
                    </div>
                  </div>

                  <div className="mt-1.5 pt-1.5 border-t border-red-600/30">
                    <div className="flex gap-1 justify-end">
                      <div className="w-6 h-6 bg-gray-600/30 rounded border border-gray-400/30 flex items-center justify-center text-gray-400 text-xs">-</div>
                      <div className="w-6 h-6 bg-red-600/30 rounded border border-red-400/50 flex items-center justify-center text-red-300 text-xs">-</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!battleState.winner && (
            <div className="text-center">
              <button
                onClick={processTurn}
                disabled={isProcessing}
                className="px-12 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-xl font-bold rounded-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
              >
                {isProcessing ? "⚡ Attaque..." : "🗡️ ATTAQUER"}
              </button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-700">
            <h3 className="text-gray-400 font-bold text-sm mb-3">JOURNAL DE COMBAT</h3>
            <div className="bg-black/30 rounded-xl p-4 max-h-40 overflow-y-auto scroll-smooth">
              <div className="space-y-1">
                {battleState.log.slice(-10).map((entry, index) => (
                  <p key={index} className="text-gray-300 text-sm">
                    {entry}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {selectedCreature && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40"
            onClick={() => setSelectedCreature(null)}
          >
            <div 
              className="bg-gray-800 dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <img
                  src={getCreatureImage(selectedCreature.creatureId, selectedCreature.finalStats.rank, selectedCreature.geneticType)}
                  alt={selectedCreature.name}
                  className="w-32 h-32 mx-auto mb-4 object-contain"
                />
                <h3 className="text-3xl font-bold text-white">{selectedCreature.name}</h3>
                {selectedCreature.position && (
                  <span className="text-yellow-400 text-sm">Position #{selectedCreature.position}</span>
                )}
                {selectedCreature.personality && PERSONALITIES[selectedCreature.personality] && (
                  <p className="text-purple-400 text-sm mt-1">{getPersonalityEmoji(selectedCreature.personality)} {PERSONALITIES[selectedCreature.personality].name}</p>
                )}
              </div>

              <div className="space-y-4 grid grid-cols-2 gap-4">
                <div className="bg-gray-700 dark:bg-gray-800 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-sm">HP</p>
                  <p className="text-2xl font-bold text-white">{selectedCreature.currentHP}</p>
                  <p className="text-gray-500 text-xs">/ {selectedCreature.maxHP}</p>
                </div>
                <div className="bg-gray-700 dark:bg-gray-800 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-sm">ATK</p>
                  <p className="text-2xl font-bold text-white">{selectedCreature.finalStats.attack}</p>
                </div>
                <div className="bg-gray-700 dark:bg-gray-800 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-sm">DEF</p>
                  <p className="text-2xl font-bold text-white">{selectedCreature.finalStats.defense}</p>
                </div>
                <div className="bg-gray-700 dark:bg-gray-800 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-sm">SPD</p>
                  <p className="text-2xl font-bold text-white">{selectedCreature.finalStats.speed}</p>
                </div>
                <div className="bg-gray-700 dark:bg-gray-800 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-sm">CRIT</p>
                  <p className="text-2xl font-bold text-white">{selectedCreature.finalStats.crit}</p>
                </div>
                <div className="bg-gray-700 dark:bg-gray-800 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-sm">Rang</p>
                  <p className="text-2xl font-bold text-green-400">{selectedCreature.finalStats.rank}</p>
                </div>
                {/* Show genetic type in modal */}
                <div className="bg-gray-700 dark:bg-gray-800 rounded-xl p-4 text-center col-span-2">
                  <p className="text-gray-400 text-sm mb-1">Type Génétique</p>
                  <p className="text-2xl font-bold text-cyan-400 capitalize">🔬 {selectedCreature.geneticType}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCreature(null)}
                className="w-full mt-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xl font-bold rounded-xl transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes float-up {
          0% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -50px); }
        }
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
