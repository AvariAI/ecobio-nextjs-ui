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

        const enemyTeam: Creature[] = Array(5).fill(0).map((_, i) => {
          const creature = CREATURES[0];
          
          if (!creature) {
            console.error("Creature reference is undefined!");
            return {
              id: `enemy-${Math.random()}`,
              name: "Fourmi",
              creatureId: "ant",
              finalStats: {
                rank: "E",
                hp: 100,
                attack: 15,
                defense: 10,
                speed: 12,
                crit: 5
              },
              level: 1,
              currentHP: 100,
              maxHP: 100
            };
          }

          const baseHP = creature.baseStats?.hp || 100;
          
          return {
            id: `enemy-${Math.random()}`,
            name: creature.name || "Fourmi",
            creatureId: creature.id || "ant",
            finalStats: {
              rank: "E",
              hp: baseHP,
              attack: creature.baseStats?.attack || 15,
              defense: creature.baseStats?.defense || 10,
              speed: creature.baseStats?.speed || 12,
              crit: creature.baseStats?.crit || 5
            },
            level: 1,
            currentHP: baseHP,
            maxHP: baseHP
          };
        });

        console.log("Enemy team generated");

        const playerTeamWithHP = [...playerTeam];

        setBattleState({
          playerTeam: playerTeamWithHP,
          enemyTeam,
          turn: 1,
          log: ["⚔️ Combat commencé!"],
          winner: null
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

      // Add damage number animation
      setDamageNumbers(prev => [...prev, {
        id: `damage-${Date.now()}`,
        damage,
        isCrit,
        x: Math.random() * 50 - 25, // Random offset
        y: Math.random() * 20 - 10
      }]);

      // Remove damage number after animation
      setTimeout(() => {
        setDamageNumbers(prev => prev.filter(d => d.id !== `damage-${Date.now()}`));
      }, 1500);

      if (attacker.owner === "player") {
        const targetIndex = newEnemyTeam.findIndex(c => c.id === target.id);
        newEnemyTeam[targetIndex] = { ...target, currentHP: Math.max(0, target.currentHP - damage) };
      } else {
        const targetIndex = newPlayerTeam.findIndex(c => c.id === target.id);
        newPlayerTeam[targetIndex] = { ...target, currentHP: Math.max(0, target.currentHP - damage) };
      }

      const attackerName = attacker.owner === "player" ? `${attacker.name}` : `Ennemi`;
      const targetName = attacker.owner === "player" ? target.name : `Ennemi`;
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
        {/* Back button */}
        <Link href="/arena/training" className="inline-block px-4 py-2 mb-4 bg-black/30 hover:bg-black/50 text-white rounded-lg transition-colors">
          ← Retour
        </Link>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-6 text-center">⚔️ Combat</h1>

        {/* Winner/Victory modal */}
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

        {/* Battle arena */}
        <div className="bg-black/20 rounded-3xl p-6 backdrop-blur-sm">
          {/* Turn indicator */}
          <div className="text-center mb-4">
            <span className="text-gray-300 text-xs">Tour {battleState.turn}</span>
          </div>

          {/* Team counts */}
          <div className="flex justify-between mb-3 px-2">
            <span className="text-blue-400 font-bold text-xs">TON ÉQUIPE ({playerAlive}/5)</span>
            <span className="text-red-400 font-bold text-xs">ENNEMIS ({enemyAlive}/5)</span>
          </div>

          {/* Battle grid - formation pattern */}
          <div className="grid grid-cols-5 gap-x-4 gap-y-2 mb-6 items-center relative">
            {/* Back row - smaller, behind */}
            {/* Position 3 */}
            <div className="col-span-2 flex justify-center opacity-80" style={{ transform: "scale(0.8)" }}>
              {battleState.playerTeam.find(c => c.position === 3) && (
                <button
                  onClick={() => !battleState.winner && setSelectedCreature(battleState.playerTeam.find(c => c.position === 3)!)}
                  className="relative bg-gradient-to-br from-blue-900/60 to-blue-950/80 rounded-xl p-1 cursor-pointer transition-all hover:scale-110"
                >
                  {battleState.playerTeam.find(c => c.position === 3)!.currentHP <= 0 && (
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                      <span className="text-lg">💀</span>
                    </div>
                  )}
                  <img
                    src={getCreatureImage(battleState.playerTeam.find(c => c.position === 3)!.creatureId, battleState.playerTeam.find(c => c.position === 3)!.finalStats.rank)}
                    alt={battleState.playerTeam.find(c => c.position === 3)!.name}
                    className="w-12 h-12 object-contain"
                  />
                </button>
              )}
            </div>
            <div className="col-span-1" />
            <div className="col-span-2 flex justify-center opacity-80" style={{ transform: "scale(0.8)" }}>
              {battleState.enemyTeam[2] && (
                <button
                  onClick={() => !battleState.winner && setSelectedCreature(battleState.enemyTeam[2])}
                  className="relative bg-gradient-to-br from-red-900/60 to-red-950/80 rounded-xl p-1 cursor-pointer transition-all hover:scale-110"
                >
                  {battleState.enemyTeam[2].currentHP <= 0 && (
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                      <span className="text-lg">💀</span>
                    </div>
                  )}
                  <img
                    src={getCreatureImage(battleState.enemyTeam[2].creatureId, battleState.enemyTeam[2].finalStats.rank)}
                    alt={battleState.enemyTeam[2].name}
                    className="w-12 h-12 object-contain"
                  />
                </button>
              )}
            </div>

            {/* Front row 1 - larger, in front */}
            <div className="col-span-2 flex justify-center relative z-10">
              {battleState.playerTeam.find(c => c.position === 1) && (
                <button
                  onClick={() => !battleState.winner && setSelectedCreature(battleState.playerTeam.find(c => c.position === 1)!)}
                  className="relative bg-gradient-to-br from-blue-900/90 to-blue-950 rounded-2xl p-2 cursor-pointer transition-all hover:scale-105 shadow-xl shadow-blue-500/20"
                >
                  {battleState.playerTeam.find(c => c.position === 1)!.currentHP <= 0 && (
                    <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                      <span className="text-2xl">💀</span>
                    </div>
                  )}
                  {damageNumbers.find(dn => dn.id === battleState.playerTeam.find(c => c.position === 1)!.id) && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-xl font-bold text-red-500 animate-[float-up_1s_ease-out_forwards]">
                      {damageNumbers.find(dn => dn.id === battleState.playerTeam.find(c => c.position === 1)!.id)?.damage}
                    </div>
                  )}
                  <img
                    src={getCreatureImage(battleState.playerTeam.find(c => c.position === 1)!.creatureId, battleState.playerTeam.find(c => c.position === 1)!.finalStats.rank)}
                    alt={battleState.playerTeam.find(c => c.position === 1)!.name}
                    className="w-20 h-20 object-contain"
                  />
                  <div className="w-20 bg-gray-700 rounded-full h-2 mt-1 mx-auto">
                    <div className="h-full rounded-full from-green-500 to-green-600" style={{ width: `${(battleState.playerTeam.find(c => c.position === 1)!.currentHP / battleState.playerTeam.find(c => c.position === 1)!.maxHP) * 100}%` }} />
                  </div>
                </button>
              )}
            </div>
            <div className="col-span-1 flex items-center justify-center relative z-20">
              <div className="text-3xl animate-[pulse_2s_ease-in-out_infinite]">⚔️</div>
            </div>
            <div className="col-span-2 flex justify-center relative z-10">
              {battleState.enemyTeam[0] && (
                <button
                  onClick={() => !battleState.winner && setSelectedCreature(battleState.enemyTeam[0])}
                  className="relative bg-gradient-to-br from-red-900/90 to-red-950 rounded-2xl p-2 cursor-pointer transition-all hover:scale-105 shadow-xl shadow-red-500/20"
                >
                  {battleState.enemyTeam[0].currentHP <= 0 && (
                    <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                      <span className="text-2xl">💀</span>
                    </div>
                  )}
                  <img
                    src={getCreatureImage(battleState.enemyTeam[0].creatureId, battleState.enemyTeam[0].finalStats.rank)}
                    alt={battleState.enemyTeam[0].name}
                    className="w-20 h-20 object-contain"
                  />
                  <div className="w-20 bg-gray-700 rounded-full h-2 mt-1 mx-auto">
                    <div className="h-full rounded-full from-green-500 to-green-600" style={{ width: `${(battleState.enemyTeam[0].currentHP / battleState.enemyTeam[0].maxHP) * 100}%` }} />
                  </div>
                </button>
              )}
            </div>

            {/* Back row - smaller, behind */}
            {/* Position 4 */}
            <div className="col-span-2 flex justify-center opacity-80" style={{ transform: "scale(0.8)" }}>
              {battleState.playerTeam.find(c => c.position === 4) && (
                <button
                  onClick={() => !battleState.winner && setSelectedCreature(battleState.playerTeam.find(c => c.position === 4)!)}
                  className="relative bg-gradient-to-br from-blue-900/60 to-blue-950/80 rounded-xl p-1 cursor-pointer transition-all hover:scale-110"
                >
                  {battleState.playerTeam.find(c => c.position === 4)!.currentHP <= 0 && (
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                      <span className="text-lg">💀</span>
                    </div>
                  )}
                  <img
                    src={getCreatureImage(battleState.playerTeam.find(c => c.position === 4)!.creatureId, battleState.playerTeam.find(c => c.position === 4)!.finalStats.rank)}
                    alt={battleState.playerTeam.find(c => c.position === 4)!.name}
                    className="w-12 h-12 object-contain"
                  />
                </button>
              )}
            </div>
            <div className="col-span-1" />
            <div className="col-span-2 flex justify-center opacity-80" style={{ transform: "scale(0.8)" }}>
              {battleState.enemyTeam[3] && (
                <button
                  onClick={() => !battleState.winner && setSelectedCreature(battleState.enemyTeam[3])}
                  className="relative bg-gradient-to-br from-red-900/60 to-red-950/80 rounded-xl p-1 cursor-pointer transition-all hover:scale-110"
                >
                  {battleState.enemyTeam[3].currentHP <= 0 && (
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                      <span className="text-lg">💀</span>
                    </div>
                  )}
                  <img
                    src={getCreatureImage(battleState.enemyTeam[3].creatureId, battleState.enemyTeam[3].finalStats.rank)}
                    alt={battleState.enemyTeam[3].name}
                    className="w-12 h-12 object-contain"
                  />
                </button>
              )}
            </div>

            {/* Front row 2 - larger, in front */}
            <div className="col-span-2 flex justify-center relative z-10">
              {battleState.playerTeam.find(c => c.position === 2) && (
                <button
                  onClick={() => !battleState.winner && setSelectedCreature(battleState.playerTeam.find(c => c.position === 2)!)}
                  className="relative bg-gradient-to-br from-blue-900/90 to-blue-950 rounded-2xl p-2 cursor-pointer transition-all hover:scale-105 shadow-xl shadow-blue-500/20"
                >
                  {battleState.playerTeam.find(c => c.position === 2)!.currentHP <= 0 && (
                    <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                      <span className="text-2xl">💀</span>
                    </div>
                  )}
                  {damageNumbers.find(dn => dn.id === battleState.playerTeam.find(c => c.position === 2)!.id) && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-xl font-bold text-red-500 animate-[float-up_1s_ease-out_forwards]">
                      {damageNumbers.find(dn => dn.id === battleState.playerTeam.find(c => c.position === 2)!.id)?.damage}
                    </div>
                  )}
                  <img
                    src={getCreatureImage(battleState.playerTeam.find(c => c.position === 2)!.creatureId, battleState.playerTeam.find(c => c.position === 2)!.finalStats.rank)}
                    alt={battleState.playerTeam.find(c => c.position === 2)!.name}
                    className="w-20 h-20 object-contain"
                  />
                  <div className="w-20 bg-gray-700 rounded-full h-2 mt-1 mx-auto">
                    <div className="h-full rounded-full from-green-500 to-green-600" style={{ width: `${(battleState.playerTeam.find(c => c.position === 2)!.currentHP / battleState.playerTeam.find(c => c.position === 2)!.maxHP) * 100}%` }} />
                  </div>
                </button>
              )}
            </div>
            <div className="col-span-1" />
            <div className="col-span-2 flex justify-center relative z-10">
              {battleState.enemyTeam[1] && (
                <button
                  onClick={() => !battleState.winner && setSelectedCreature(battleState.enemyTeam[1])}
                  className="relative bg-gradient-to-br from-red-900/90 to-red-950 rounded-2xl p-2 cursor-pointer transition-all hover:scale-105 shadow-xl shadow-red-500/20"
                >
                  {battleState.enemyTeam[1].currentHP <= 0 && (
                    <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                      <span className="text-2xl">💀</span>
                    </div>
                  )}
                  <img
                    src={getCreatureImage(battleState.enemyTeam[1].creatureId, battleState.enemyTeam[1].finalStats.rank)}
                    alt={battleState.enemyTeam[1].name}
                    className="w-20 h-20 object-contain"
                  />
                  <div className="w-20 bg-gray-700 rounded-full h-2 mt-1 mx-auto">
                    <div className="h-full rounded-full from-green-500 to-green-600" style={{ width: `${(battleState.enemyTeam[1].currentHP / battleState.enemyTeam[1].maxHP) * 100}%` }} />
                  </div>
                </button>
              )}
            </div>

            {/* Back row - smaller, behind */}
            {/* Position 5 */}
            <div className="col-span-2 flex justify-center opacity-80" style={{ transform: "scale(0.8)" }}>
              {battleState.playerTeam.find(c => c.position === 5) && (
                <button
                  onClick={() => !battleState.winner && setSelectedCreature(battleState.playerTeam.find(c => c.position === 5)!)}
                  className="relative bg-gradient-to-br from-blue-900/60 to-blue-950/80 rounded-xl p-1 cursor-pointer transition-all hover:scale-110"
                >
                  {battleState.playerTeam.find(c => c.position === 5)!.currentHP <= 0 && (
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                      <span className="text-lg">💀</span>
                    </div>
                  )}
                  <img
                    src={getCreatureImage(battleState.playerTeam.find(c => c.position === 5)!.creatureId, battleState.playerTeam.find(c => c.position === 5)!.finalStats.rank)}
                    alt={battleState.playerTeam.find(c => c.position === 5)!.name}
                    className="w-12 h-12 object-contain"
                  />
                </button>
              )}
            </div>
            <div className="col-span-1" />
            <div className="col-span-2 flex justify-center opacity-80" style={{ transform: "scale(0.8)" }}>
              {battleState.enemyTeam[4] && (
                <button
                  onClick={() => !battleState.winner && setSelectedCreature(battleState.enemyTeam[4])}
                  className="relative bg-gradient-to-br from-red-900/60 to-red-950/80 rounded-xl p-1 cursor-pointer transition-all hover:scale-110"
                >
                  {battleState.enemyTeam[4].currentHP <= 0 && (
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                      <span className="text-lg">💀</span>
                    </div>
                  )}
                  <img
                    src={getCreatureImage(battleState.enemyTeam[4].creatureId, battleState.enemyTeam[4].finalStats.rank)}
                    alt={battleState.enemyTeam[4].name}
                    className="w-12 h-12 object-contain"
                  />
                </button>
              )}
            </div>
          </div>

          {/* Attack button */}
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

          {/* Battle log */}
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

        {/* Creature details modal */}
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
                  src={getCreatureImage(selectedCreature.creatureId, selectedCreature.finalStats.rank)}
                  alt={selectedCreature.name}
                  className="w-32 h-32 mx-auto mb-4 object-contain"
                />
                <h3 className="text-3xl font-bold text-white">{selectedCreature.name}</h3>
                {selectedCreature.position && (
                  <span className="text-yellow-400 text-sm">Position #{selectedCreature.position}</span>
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
