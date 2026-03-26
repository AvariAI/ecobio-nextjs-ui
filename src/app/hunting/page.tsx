"use client";

import { useState } from "react";
import { CREATURES, Rank, Creature } from "@/lib/database";
import { generateIndividualStats, getVarianceRange, BattleStats } from "@/lib/battle";
import Link from "next/link";

type HuntingPhase = "ready" | "spawned";

interface HuntedCreature extends Creature {
  finalStats: BattleStats;
  varianceBreakdown: {
    hp: { base: number; variance: number; final: number };
    atk: { base: number; variance: number; final: number };
    def: { base: number; variance: number; final: number };
    spd: { base: number; variance: number; final: number };
    crit: { base: number; variance: number; final: number };
  };
}

type RarityRank = "E" | "D" | "C" | "B" | "A" | "S" | "S+";

function rollRarity(): RarityRank {
  const dist: { rank: RarityRank; weight: number }[] = [
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

function spawnCreature(): HuntedCreature {
  // Random 50/50 between Ant and Fly
  const creatureId = Math.random() < 0.5 ? "ant" : "housefly";
  const creature: Creature = CREATURES[creatureId];

  // Roll random rank with distribution
  const rank: Rank = rollRarity();
  const [minVar, maxVar] = getVarianceRange(rank);

  // Generate individual variance per stat (APPLIED AS MULTIPLIER, NOT +1)
  const hpVariance = minVar + Math.random() * (maxVar - minVar);
  const atkVariance = minVar + Math.random() * (maxVar - minVar);
  const defVariance = minVar + Math.random() * (maxVar - minVar);
  const spdVariance = minVar + Math.random() * (maxVar - minVar);
  const critVariance = minVar + Math.random() * (maxVar - minVar);

  // FINAL STATS: base stats × rank multiplier × variance multiplier
  // Variance IS the multiplier (0.80-1.10 for E), not added to 1
  const rankMult = { E: 1.0, D: 1.2, C: 1.4, B: 1.6, A: 1.8, S: 2.0, "S+": 2.2 }[rank];
  const finalStats: BattleStats = {
    hp: Math.max(1, Math.floor(creature.baseStats.hp * rankMult * hpVariance)),
    attack: Math.max(1, Math.floor(creature.baseStats.attack * rankMult * atkVariance)),
    defense: Math.max(1, Math.floor(creature.baseStats.defense * rankMult * defVariance)),
    speed: Math.max(1, Math.floor(creature.baseStats.speed * rankMult * spdVariance)),
    crit: Math.max(1, Math.floor(creature.baseStats.crit * rankMult * critVariance)),
    rank,
  };

  return {
    ...creature,
    finalStats,
    varianceBreakdown: {
      hp: {
        base: creature.baseStats.hp,
        variance: (hpVariance - 1) * 100, // Show % from 1.0 baseline
        final: finalStats.hp,
      },
      atk: {
        base: creature.baseStats.attack,
        variance: (atkVariance - 1) * 100,
        final: finalStats.attack,
      },
      def: {
        base: creature.baseStats.defense,
        variance: (defVariance - 1) * 100,
        final: finalStats.defense,
      },
      spd: {
        base: creature.baseStats.speed,
        variance: (spdVariance - 1) * 100,
        final: finalStats.speed,
      },
      crit: {
        base: creature.baseStats.crit,
        variance: (critVariance - 1) * 100,
        final: finalStats.crit,
      },
    },
  };
}

export default function HuntingPage() {
  const [phase, setPhase] = useState<HuntingPhase>("ready");
  const [huntedCreature, setHuntedCreature] = useState<HuntedCreature | null>(null);
  const [collection, setCollection] = useState<HuntedCreature[]>([]);

  const handleSpawn = () => {
    const spawned = spawnCreature();
    setHuntedCreature(spawned);
    setPhase("spawned");
  };

  const handleKeep = () => {
    if (huntedCreature) {
      setCollection([...collection, huntedCreature]);
      setHuntedCreature(null);
      setPhase("ready");
    }
  };

  const handleRelease = () => {
    setHuntedCreature(null);
    setPhase("ready");
  };

  const formatVariance = (variance: number) => {
    const sign = variance >= 0 ? "+" : "";
    return `${sign}${variance.toFixed(1)}%`;
  };

  const getVarianceColor = (variance: number) => {
    if (variance >= 20) return "text-yellow-400 font-bold";
    if (variance >= 10) return "text-yellow-300";
    if (variance >= 0) return "text-green-400";
    if (variance >= -10) return "text-yellow-300";
    return "text-red-400";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-950 p-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-green-300 hover:text-green-200 mb-6 inline-block">
          ← Retour à l'accueil
        </Link>

        <h1 className="text-4xl font-bold text-green-100 mb-2">🏹 Chasse Créatures</h1>
        <p className="text-green-200 mb-8">
          Spawn des créatures RNG-optimisées et build ta collection unique!
        </p>

        {phase === "ready" && (
          <button
            onClick={handleSpawn}
            className="w-full bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 text-white rounded-lg p-4 text-xl font-bold shadow-lg transition-all duration-200"
          >
            🎯 Spawn Nouvelle Créature
          </button>
        )}

        {phase === "spawned" && huntedCreature && (
          <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-xl p-6 shadow-xl border border-green-700">
            <div className="flex items-start gap-6 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-green-100">{huntedCreature.name}</h2>
                  <span className="text-2xl font-bold bg-yellow-600 text-white px-3 py-1 rounded-full">
                    {huntedCreature.finalStats.rank}
                  </span>
                </div>
                <p className="text-green-200 mb-4">{huntedCreature.desc}</p>

                {huntedCreature.skill && (
                  <div className="bg-green-700 bg-opacity-50 rounded-lg p-3 mb-4">
                    <h3 className="font-bold text-green-100">🎯 Compétence</h3>
                    <div className="text-sm text-green-200">
                      <p><strong>{huntedCreature.skill.name}</strong>: {huntedCreature.skill.description}</p>
                      <p className="text-xs text-green-300 mt-1">Cooldown: {huntedCreature.skill.cooldown} tours | Durée: {huntedCreature.skill.duration} tours</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-xl font-bold text-green-100 mb-4">📊 Stats RNG</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {Object.entries(huntedCreature.varianceBreakdown).map(([statName, data]) => {
                const labelMap: Record<string, string> = {
                  hp: "HP",
                  atk: "ATK",
                  def: "DEF",
                  spd: "SPD",
                  crit: "CRIT",
                };
                return (
                  <div key={statName} className="bg-green-950 rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <p className="text-green-200 font-semibold">{labelMap[statName]}</p>
                      <p className="text-xs text-green-400">Base: {data.base}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getVarianceColor(data.variance)}`}>
                        {data.final}
                      </p>
                      <p className={`text-sm ${getVarianceColor(data.variance)}`}>
                        {formatVariance(data.variance)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleKeep}
                className="flex-1 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white rounded-lg p-3 font-bold shadow-lg"
              >
                ♻️ Ajouter à Collection
              </button>
              <button
                onClick={handleRelease}
                className="flex-1 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white rounded-lg p-3 font-bold shadow-lg"
              >
                ❌ Relâcher
              </button>
            </div>
          </div>
        )}

        {collection.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-green-100 mb-4">📦 Ta Collection ({collection.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {collection.map((c, i) => (
                <div key={i} className="bg-gradient-to-br from-green-800 to-green-900 rounded-lg p-4 border border-green-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-green-100">{c.name}</h3>
                    <span className={`font-bold ${c.finalStats.rank === "S+" ? "bg-purple-600" : c.finalStats.rank === "S" ? "bg-yellow-600" : "bg-yellow-700"} text-white px-2 py-1 rounded-full text-sm`}>
                      {c.finalStats.rank}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 mt-3 text-center text-xs">
                    <div className="bg-green-950 rounded p-1">
                      <p className="text-green-200">HP</p>
                      <p className="text-green-100 font-bold">{c.finalStats.hp}</p>
                    </div>
                    <div className="bg-green-950 rounded p-1">
                      <p className="text-green-200">ATK</p>
                      <p className="text-green-100 font-bold">{c.finalStats.attack}</p>
                    </div>
                    <div className="bg-green-950 rounded p-1">
                      <p className="text-green-200">DEF</p>
                      <p className="text-green-100 font-bold">{c.finalStats.defense}</p>
                    </div>
                    <div className="bg-green-950 rounded p-1">
                      <p className="text-green-200">SPD</p>
                      <p className="text-green-100 font-bold">{c.finalStats.speed}</p>
                    </div>
                    <div className="bg-green-950 rounded p-1">
                      <p className="text-green-200">CRIT</p>
                      <p className="text-green-100 font-bold">{c.finalStats.crit}</p>
                    </div>
                  </div>
                </div>
))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
