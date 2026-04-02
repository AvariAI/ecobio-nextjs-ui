"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Rank } from "@/lib/database";
import { spawnEasyModeEnemy } from "@/lib/easy-mode";

interface HuntedCreature {
  id: string;
  name: string;
  rank?: Rank;
  customStats?: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    crit: number;
    level: number;
  };
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    crit: number;
  };
  traits?: string[];
  stars?: number;
  statusEffects: any[];
}

export default function BattleEntrainementSetupPage() {
  const router = useRouter();
  const [collection, setCollection] = useState<HuntedCreature[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isTraining, setIsTraining] = useState(false);

  // Load collection on mount (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return; // Skip SSR

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

  const handleToggleCreature = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        // Remove if already selected
        return prev.filter(selectedId => selectedId !== id);
      } else if (prev.length < 5) {
        // Add if under limit
        return [...prev, id];
      }
      // Prevent selecting more than 5
      return prev;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const canStart = selectedIds.length === 5;

  const startTraining = () => {
    if (!canStart || isTraining) return;

    setIsTraining(true);

    // Get selected creatures
    const selectedCreatures = collection.filter(c => selectedIds.includes(c.id));

    // Generate enemy team on-the-fly (Rank E, Level 1)
    const enemyTemplates = [];
    for (let i = 0; i < 5; i++) {
      enemyTemplates.push(spawnEasyModeEnemy());
    }

    const enemyCreatures = enemyTemplates.map((template, i) => ({
      creatureId: template.creatureTemplate.id,
      stats: {
        ...template.stats,
        rank: template.stats.rank || "E",
        level: 1,
      },
      name: template.name,
      traits: template.traits || [],
    }));

    // Store data in sessionStorage for battle page
    const battleData = {
      mode: "training",
      playerIds: selectedIds,
      playerCreatures: selectedCreatures,
      enemyCreatures,
    };

    // Store in sessionStorage (cleans up after battle)
    if (typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("ecobio-training-battle", JSON.stringify(battleData));
    }

    // Navigate to battle page using Next.js router
    router.push("/battle?mode=training");
  };

  // Get selected creatures
  const selectedCreatures = collection.filter(c => selectedIds.includes(c.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-block px-4 py-2 mb-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            ← Retour
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🎮 Entraînement (5v5)
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Sélectionne 5 créatures de ta collection • Affronte 5 créatures Rank E (Niveau 1) • +100 XP par créature (si pas d'étoile ★)
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Player Team Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-blue-400 hover:shadow-2xl transition-all">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">🔵 Ton Équipe ({selectedIds.length}/5)</h2>
              {selectedIds.length > 0 && (
                <button
                  onClick={handleClearSelection}
                  className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                >
                  Effacer
                </button>
              )}
            </div>

            {/* Selected Creatures */}
            {selectedCreatures.length > 0 && (
              <div className="mb-4 grid grid-cols-5 gap-2">
                {selectedCreatures.map(creature => (
                  <div key={creature.id} className="bg-blue-50 dark:bg-blue-900 rounded-lg p-2 text-center border-2 border-blue-300 dark:border-blue-700">
                    <div className="text-2xl mb-1">🪲</div>
                    <p className="text-xs font-bold truncate">{creature.name}</p>
                    <p className="text-xs text-gray-500">N{creature.customStats?.level || 1}</p>
                    {creature.customStats && (
                      <p className="text-xs text-yellow-600 font-bold">★</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Collection Selection */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {collection.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Aucune créature dans ta collection. Commence par faire du hunting!
                </p>
              ) : (
                collection.map(creature => (
                  <button
                    key={creature.id}
                    onClick={() => handleToggleCreature(creature.id)}
                    disabled={!selectedIds.includes(creature.id) && selectedIds.length >= 5}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedIds.includes(creature.id)
                        ? "bg-blue-100 dark:bg-blue-900 border-blue-500 dark:border-blue-500"
                        : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700"
                    } ${!selectedIds.includes(creature.id) && selectedIds.length >= 5 ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🪲</span>
                        <div>
                          <p className="font-bold">{creature.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            R{creature.rank || "E"} • N{creature.customStats?.level || 1} • HP: {creature.customStats?.hp || creature.baseStats.hp}/{creature.customStats?.hp || creature.baseStats.hp}
                          </p>
                          <div className="flex gap-1">
                            {creature.traits?.slice(0, 3).map((trait, i) => (
                              <span key={i} className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                                {trait}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {selectedIds.includes(creature.id) && (
                          <span className="text-2xl">✅</span>
                        )}
                        {creature.customStats && (
                          <span className="text-xl text-yellow-600">★</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Enemy Team Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-red-400 hover:shadow-2xl transition-all">
            <h2 className="text-2xl font-bold mb-4">⚔️ Ennemis (5 × Rank E, Niveau 1)</h2>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border-2 border-gray-300 dark:border-gray-600">
              <p className="text-center text-gray-500">
                🎲 5 créatures Rank E (Niveau 1) seront générées aléatoirement au démarrage.
              </p>
              <div className="mt-4 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="bg-red-50 dark:bg-red-900 rounded-lg p-3 border-2 border-red-300 dark:border-red-700 opacity-50">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🪲</span>
                        <div>
                          <p className="font-bold">Créature #{i}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Rank E • Niveau 1
                          </p>
                        </div>
                      </div>
                      <span className="text-xl">🎯</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* XP Info */}
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg border-2 border-yellow-300 dark:border-yellow-700">
              <h3 className="font-bold text-yellow-800 dark:text-yellow-200 mb-2">💰 Récompenses XP</h3>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                <li>• +100 XP par créature survivante</li>
                <li>• Maximum: +500 XP (5 créatures)</li>
                <li>• ❌ Bloqué si créature a déjà une étoile ★</li>
              </ul>
            </div>

            {/* Start Button */}
            <button
              onClick={startTraining}
              disabled={!canStart || isTraining}
              className={`w-full mt-6 px-8 py-4 text-white text-xl font-bold rounded-xl shadow-lg transition-all ${
                canStart && !isTraining
                  ? "bg-gradient-to-r from-green-500 to-green-600 hover:shadow-xl transform hover:scale-105"
                  : "from-gray-400 to-gray-500 cursor-not-allowed opacity-50"
              }`}
            >
              {isTraining ? "⏳ Chargement..." : "🗡️ DÉMARRER L'ENTRAÎNEMENT"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
