"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Rank } from "@/lib/database";

interface HuntedCreature {
  id: string;
  name: string;
  rank?: Rank;
  creatureId: string;
  customStats?: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    crit: number;
    level: number;
  };
  finalStats?: {
    rank: Rank;
  };
  baseStats: { hp: number; attack: number; defense: number; speed: number; crit: number; };
  geneticType?: string;
  traits?: string[];
  stars?: number;
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

export default function TrainingPage() {
  const [collection, setCollection] = useState<HuntedCreature[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("ecobio-collection");
      if (saved) setCollection(JSON.parse(saved));
    } catch (e) { console.error("Failed load collection", e); }
  }, []);

  const handleToggleCreature = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  };

  const selectedCreatures = collection.filter(c => selectedIds.includes(c.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-blue-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/arena" className="inline-block px-4 py-2 mb-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg">← Retour</Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Entraînement</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Sélectionne 5 créatures pour affronter des Rank E</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Player Team */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-blue-400">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">🔵 Team ({selectedIds.length}/5)</h2>
              {selectedIds.length > 0 && <button onClick={() => setSelectedIds([])} className="px-3 py-1 bg-red-500 text-white rounded-lg">Effacer</button>}
            </div>

            {selectedCreatures.length > 0 && (
              <div className="mb-4 grid grid-cols-5 gap-2">
                {selectedCreatures.map(c => (
                  <div key={c.id} className="bg-blue-50 dark:bg-blue-900 rounded-lg p-2 text-center border-2 border-blue-300">
                    <img
                      src={getCreatureImage(c.creatureId, c.finalStats?.rank || c.rank || "E", c.geneticType)}
                      alt={c.name}
                      className="w-12 h-12 mx-auto mb-1 object-contain"
                    />
                    <p className="text-xs font-bold truncate">{c.name}</p>
                    <p className="text-xs text-gray-600">{c.rank} N{c.customStats?.level || 1}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="max-h-96 overflow-y-auto space-y-2">
              {collection.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aucune créature.</p>
              ) : (
                collection.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleToggleCreature(c.id)}
                    disabled={!selectedIds.includes(c.id) && selectedIds.length >= 5}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                      selectedIds.includes(c.id)
                        ? "bg-blue-100 border-blue-500 dark:bg-blue-900"
                        : "bg-gray-50 border-gray-200 dark:bg-gray-700"
                    } ${
                      !selectedIds.includes(c.id) && selectedIds.length >= 5
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:shadow-md"
                    }`}
                  >
                    <img
                      src={getCreatureImage(c.creatureId, c.finalStats?.rank || c.rank || "E", c.geneticType)}
                      alt={c.name}
                      className="w-12 h-12 object-contain flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{c.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">R{c.rank || "E"} • N{c.customStats?.level || 1}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Enemy Team */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-red-400">
            <h2 className="text-2xl font-bold mb-4">⚔️ Ennemis (Rank E)</h2>

            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-red-50 dark:bg-red-900 rounded-lg p-3 border-2 border-red-300 mb-2 opacity-50">
                <p className="font-bold">Créature #{i}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Rank E • Niveau 1</p>
              </div>
            ))}

            <button
              disabled={selectedIds.length !== 5}
              onClick={() => {
                if (selectedIds.length === 5) {
                  alert("Battle démarré!");
                }
              }}
              className={`w-full mt-6 p-8 text-white text-xl font-bold rounded-xl transition-all ${
                selectedIds.length === 5
                  ? "bg-gradient-to-r from-green-500 to-green-600 hover:scale-105"
                  : "from-gray-400 to-gray-500 cursor-not-allowed opacity-50"
              }`}
            >
              🗡️ DÉMARRER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
