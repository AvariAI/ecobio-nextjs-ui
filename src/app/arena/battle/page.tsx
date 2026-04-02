"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Rank, CREATURES } from "@/lib/database";

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
}

interface BattleState {
  playerTeam: Creature[];
  enemyTeam: Creature[];
  turn: number;
  log: string[];
  winner: "player" | "enemy" | null;
}

function getCreatureImage(creatureId: string, rank: Rank): string {
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

export default function BattlePage() {
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Load team from sessionStorage
    const teamIds = sessionStorage.getItem("battle-team");
    if (!teamIds) {
      window.location.href = "/arena/training";
      return;
    }

    const ids = JSON.parse(teamIds) as string[];
    
    // Load collection
    const saved = localStorage.getItem("ecobio-collection");
    if (!saved) {
      window.location.href = "/arena/training";
      return;
    }

    const collection = JSON.parse(saved) as any[];
    const selectedCreatures = ids
      .map(id => collection.find((c: any) => c.id === id))
      .filter(Boolean);

    if (selectedCreatures.length !== 5) {
      window.location.href = "/arena/training";
      return;
    }

    // Build player team with all required fields
    const playerTeam: (Creature & { position: number; currentHP: number })[] = selectedCreatures.map((c: any, index: number) => ({
      id: c.id,
      name: c.name,
      creatureId: c.creatureId,
      finalStats: c.finalStats || c.customStats || c.baseStats,
      level: c.level || c.customStats?.level || 1,
      currentHP: c.currentHP || c.maxHP || c.finalStats?.hp,
      maxHP: c.maxHP || c.finalStats?.hp,
      position: index + 1
    }));

    // Generate enemy team (5 Rank E creatures)
    const enemyTeam: Creature[] = Array(5).fill(0).map(() => {
      const creature = CREATURES[0]; // Use first creature for simplicity
      return {
        id: `enemy-${Math.random()}`,
        name: creature.name,
        creatureId: creature.id,
        finalStats: {
          rank: "E",
          hp: creature.baseStats.hp,
          attack: creature.baseStats.attack,
          defense: creature.baseStats.defense,
          speed: creature.baseStats.speed,
          crit: creature.baseStats.crit
        },
        level: 1,
        currentHP: creature.baseStats.hp,
        maxHP: creature.baseStats.hp
      };
    });

    // Initialize player team with preserved HP
    const playerTeamWithHP = playerTeam.map(c => ({ ...c, currentHP: c.currentHP }));

    setBattleState({
      playerTeam: playerTeamWithHP,
      enemyTeam,
      turn: 1,
      log: ["⚔️ Combat commencé!"],
      winner: null
    });
  }, []);

  const processTurn = () => {
    if (!battleState || isProcessing || battleState.winner) return;

    setIsProcessing(true);

    // Simple turn-based: fastest creature attacks first
    const allCreatures = [
      ...battleState.playerTeam.filter(c => c.currentHP > 0).map(c => ({ ...c, owner: "player" as const })),
      ...battleState.enemyTeam.filter(c => c.currentHP > 0).map(c => ({ ...c, owner: "enemy" as const }))
    ];

    // Sort by speed
    allCreatures.sort((a, b) => b.finalStats.speed - a.finalStats.speed);

    const newLog = [...battleState.log];
    const newPlayerTeam = [...battleState.playerTeam];
    const newEnemyTeam = [...battleState.enemyTeam];
    let newWinner: "player" | "enemy" | null = null;

    for (const attacker of allCreatures) {
      if (attacker.currentHP <= 0) continue;

      const targets = attacker.owner === "player" 
        ? newEnemyTeam.filter(c => c.currentHP > 0)
        : newPlayerTeam.filter(c => c.currentHP > 0);

      if (targets.length === 0) {
        newWinner = attacker.owner === "player" ? "player" : "enemy";
        break;
      }

      const target = targets[0];
      const isCrit = isCriticalHit(attacker.finalStats.crit);
      const damage = calculateDamage(attacker, target, isCrit);

      if (attacker.owner === "player") {
        const targetIndex = newEnemyTeam.findIndex(c => c.id === target.id);
        newEnemyTeam[targetIndex] = { ...target, currentHP: Math.max(0, target.currentHP - damage) };
      } else {
        const targetIndex = newPlayerTeam.findIndex(c => c.id === target.id);
        newPlayerTeam[targetIndex] = { ...target, currentHP: Math.max(0, target.currentHP - damage) };
      }

      const attackerName = attacker.owner === "player" ? `${attacker.position}. ${attacker.name}` : `Ennemi ${attacker.name}`;
      const targetName = attacker.owner === "player" ? target.name : `Ennemi ${target.name}`;
      const critText = isCrit ? " **CRITIQUE!**" : "";
      newLog.push(`${attackerName} → ${targetName}: ${damage} dégâts${critText}`);
    }

    setBattleState({
      playerTeam: newPlayerTeam,
      enemyTeam: newEnemyTeam,
      turn: battleState.turn + 1,
      log: newLog,
      winner: newWinner
    });

    setIsProcessing(false);
  };

  if (!battleState) {
    return <div className="min-h-screen bg-gray-900 text-white p-6">Chargement...</div>;
  }

  const playerAlive = battleState.playerTeam.filter(c => c.currentHP > 0).length;
  const enemyAlive = battleState.enemyTeam.filter(c => c.currentHP > 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-orange-900 dark:from-black dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <Link href="/arena/training" className="inline-block px-4 py-2 mb-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg">← Retour</Link>

        <h1 className="text-4xl font-bold text-white mb-4">⚔️ Combat</h1>
        <p className="text-gray-300 mb-6">Tour {battleState.turn}</p>

        {battleState.winner ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 mb-6 text-center">
            <h2 className={`text-4xl font-bold mb-4 ${battleState.winner === "player" ? "text-green-600" : "text-red-600"}`}>
              {battleState.winner === "player" ? "🎉 VICTOIRE!" : "💀 DÉFAITE!"}
            </h2>
            {battleState.winner === "player" && (
              <div className="text-gray-600 dark:text-gray-300">
                Survivants: {playerAlive}/5
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={processTurn}
            disabled={isProcessing}
            className="w-full p-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl mb-6 text-xl"
          >
            {isProcessing ? "⚡ En cours..." : "🗡️ Attaquer"}
          </button>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Player Team */}
          <div className="bg-blue-900 bg-opacity-50 rounded-2xl p-4">
            <h2 className="text-2xl font-bold text-blue-300 mb-4">🔵 Ton Équipe ({playerAlive}/5)</h2>
            <div className="space-y-2">
              {battleState.playerTeam.map((creature, index) => (
                <div
                  key={creature.id}
                  className="bg-gray-800 dark:bg-gray-700 rounded-lg p-3 flex items-center gap-3"
                >
                  <span className="text-2xl font-bold text-blue-400">#{creature.position}</span>
                  <img
                    src={getCreatureImage(creature.creatureId, creature.finalStats.rank)}
                    alt={creature.name}
                    className="w-12 h-12 object-contain"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="font-bold text-white">{creature.name}</p>
                      <p className="text-sm text-gray-300">
                        {creature.currentHP > 0 ? `${creature.currentHP}/${creature.maxHP}` : "💀 K.O."}
                      </p>
                    </div>
                    <div className="w-full bg-gray-600 rounded h-2 mt-1">
                      <div
                        className={`h-2 rounded ${creature.currentHP > 0 ? "bg-gradient-to-r from-green-500 to-green-600" : "bg-red-600"}`}
                        style={{ width: `${Math.max(0, (creature.currentHP / creature.maxHP) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enemy Team */}
          <div className="bg-red-900 bg-opacity-50 rounded-2xl p-4">
            <h2 className="text-2xl font-bold text-red-300 mb-4">⚔️ Ennemis ({enemyAlive}/5)</h2>
            <div className="space-y-2">
              {battleState.enemyTeam.map((creature, index) => (
                <div
                  key={creature.id}
                  className="bg-gray-800 dark:bg-gray-700 rounded-lg p-3 flex items-center gap-3"
                >
                  <img
                    src={getCreatureImage(creature.creatureId, creature.finalStats.rank)}
                    alt={creature.name}
                    className="w-12 h-12 object-contain"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-white">{creature.name}</p>
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-300">
                        {creature.currentHP > 0 ? `${creature.currentHP}/${creature.maxHP}` : "💀 K.O."}
                      </p>
                      <p className="text-xs text-gray-400">R{creature.finalStats.rank}</p>
                    </div>
                    <div className="w-full bg-gray-600 rounded h-2 mt-1">
                      <div
                        className={`h-2 rounded ${creature.currentHP > 0 ? "bg-gradient-to-r from-orange-500 to-red-500" : "bg-gray-500"}`}
                        style={{ width: `${Math.max(0, (creature.currentHP / creature.maxHP) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Battle Log */}
        <div className="mt-6 bg-gray-800 dark:bg-gray-900 rounded-2xl p-4 max-h-64 overflow-y-auto">
          <h3 className="text-xl font-bold text-gray-300 mb-2">📜 Journal</h3>
          <div className="space-y-1">
            {battleState.log.map((entry, index) => (
              <p key={index} className="text-gray-400 text-sm">
                {entry}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
