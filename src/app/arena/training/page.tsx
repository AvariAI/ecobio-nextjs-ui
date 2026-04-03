"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Rank, PERSONALITIES, PersonalityType } from "@/lib/database";
import { getTraitsByIds } from "@/lib/traits";

type SortBy = "name" | "rank" | "hp" | "attack" | "defense" | "speed" | "crit";
type SortOrder = "asc" | "desc";

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
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    crit: number;
  };
  baseStats: { hp: number; attack: number; defense: number; speed: number; crit: number; };
  geneticType?: string;
  traits?: string[];
  stars?: number;
  personality?: string;
  level?: number;
  currentHP?: number;
  maxHP?: number;
  isFavorite?: boolean;
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
  if (creatureId === "polyops") {
    return "/ecobio-nextjs-ui/images/creatures/polyops.png";
  }
  if (creatureId === "gravaille") {
    return "/ecobio-nextjs-ui/images/creatures/gravaille.png";
  }
  if (creatureId === "maworm") {
    return "/ecobio-nextjs-ui/images/creatures/polyops.png"; // Placeholder for now
  }
  return "/ecobio-nextjs-ui/images/creatures/spider_mutant_e.png";
}

function getRankColor(rank: Rank): string {
  const colors: Record<Rank, string> = {
    "E": "text-gray-500",
    "D": "text-green-600",
    "C": "text-blue-600",
    "B": "text-purple-600",
    "A": "text-orange-600",
    "S": "text-pink-600",
    "S+": "text-yellow-500",
  };
  return colors[rank] || "text-gray-500";
}

const renderStars = (stars: number) => {
  return Array(5).fill(0).map((_, i) => (
    <span key={i} className={i < stars ? "text-yellow-400" : "text-gray-600"}>
      ★
    </span>
  ));
};

const RANK_ORDER: Record<Rank, number> = {
  "E": 0, "D": 1, "C": 2, "B": 3, "A": 4, "S": 5, "S+": 6
};

export default function TrainingPage() {
  const router = useRouter();
  const [collection, setCollection] = useState<HuntedCreature[]>([]);
  const [selectedIds, setSelectedIds] = useState<(string | null)[]>([null, null, null, null, null]);
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("ecobio-collection");
      if (saved) setCollection(JSON.parse(saved));
    } catch (e) { console.error("Failed load collection", e); }
  }, []);

  const handleToggleCreature = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        // Remove and keep others in slots (use null for empty slots)
        return prev.map(p => p === id ? null : p);
      }
      // Find first empty slot and add there
      const newTeam = [...prev];
      for (let i = 0; i < newTeam.length; i++) {
        if (newTeam[i] === null) {
          newTeam[i] = id;
          return newTeam as string[];
        }
      }
      // No empty slots, add to end
      if (newTeam.length >= 5) return prev;
      newTeam.push(id);
      return newTeam as string[];
    });
  };

  const handleStartBattle = () => {
    const activeSlots = selectedIds.filter(id => id !== null) as string[];
    if (activeSlots.length === 5) {
      // Store team order in sessionStorage (positions 1-5 preserved)
      sessionStorage.setItem("battle-team", JSON.stringify(activeSlots));
      router.push("/arena/battle");
    }
  };

  const sortedCollection = [...collection].sort((a, b) => {
    // Favorites first
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    
    let comparison = 0;
    
    if (sortBy === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === "rank") {
      const rankA = a.finalStats?.rank || a.rank || "E";
      const rankB = b.finalStats?.rank || b.rank || "E";
      comparison = RANK_ORDER[rankB] - RANK_ORDER[rankA];
    } else if (sortBy === "hp" || sortBy === "attack" || sortBy === "defense" || sortBy === "speed" || sortBy === "crit") {
      const statsA = a.finalStats || a.customStats || a.baseStats;
      const statsB = b.finalStats || b.customStats || b.baseStats;
      comparison = statsB[sortBy] - statsA[sortBy];
    }
    
    return sortOrder === "desc" ? comparison : -comparison;
  });

  const activeSlots = selectedIds.filter(id => id !== null) as string[];
  const selectedCreatures = collection.filter(c => activeSlots.includes(c.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-blue-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href="/arena" className="inline-block px-4 py-2 mb-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg">← Retour</Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Entraînement</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Sélectionne 5 créatures pour affronter des Rank E</p>
        </div>

        {/* Collection/Favorites Sort Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border-2 border-blue-400">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setSortBy("rank");
                setSortOrder("desc");
              }}
              className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded font-bold"
            >
              ❤️ Favoris
            </button>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 border-2 border-blue-400">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="sortBy" className="text-blue-800 dark:text-blue-200 font-semibold">Trier:</label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded px-3 py-2 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
              >
                <option value="name">Alpha</option>
                <option value="rank">Rang</option>
                <option value="hp">HP</option>
                <option value="attack">ATK</option>
                <option value="defense">DEF</option>
                <option value="speed">VIT</option>
                <option value="crit">CRIT</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="sortOrder" className="text-blue-800 dark:text-blue-200 font-semibold">Ordre:</label>
              <select
                id="sortOrder"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded px-3 py-2 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
              >
                <option value="asc">↑</option>
                <option value="desc">↓</option>
              </select>
            </div>
            
            <div className="flex items-center gap-4 ml-auto">
              <span className="text-blue-800 dark:text-blue-200 font-bold">Sélection: {activeSlots.length}/5</span>
              {activeSlots.length > 0 && (
                <button
                  onClick={() => setSelectedIds([null, null, null, null, null])}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold"
                >
                  Effacer
                </button>
              )}
              {activeSlots.length === 5 && (
                <button
                  onClick={handleStartBattle}
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-bold shadow-lg"
                >
                  🗡️ DÉMARRER
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Selected Team Preview */}
        {activeSlots.length > 0 && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 rounded-xl p-4 mb-6 border-2 border-blue-500">
            <div className="grid grid-cols-5 gap-2">
              {selectedIds.map((id, index) => {
                if (!id) {
                  return (
                    <div key={`slot-${index}`} className="bg-blue-800 dark:bg-blue-950 rounded-lg p-2 text-center border border-dashed border-blue-600">
                      <div className="text-blue-400 text-lg mb-1">#{index + 1}</div>
                      <div className="w-12 h-12 mx-auto mb-1 flex items-center justify-center text-blue-400 text-2xl">?</div>
                      <p className="text-xs text-blue-400">Vide</p>
                    </div>
                  );
                }
                const c = selectedCreatures.find(sc => sc.id === id);
                if (!c) return null;
                return (
                  <div key={id} className="bg-blue-500 dark:bg-blue-900 rounded-lg p-2 text-center border border-blue-400 relative">
                    <div className="text-yellow-300 text-xs absolute top-1 left-1 font-bold">#{index + 1}</div>
                    <img
                      src={getCreatureImage(c.creatureId, c.finalStats?.rank || c.rank || "E", c.geneticType)}
                      alt={c.name}
                      className="w-12 h-12 mx-auto mb-1 object-contain"
                    />
                    <p className="text-xs font-bold truncate text-white">{c.name}</p>
                    <p className="text-xs text-blue-100">R{c.rank} N{c.level || c.customStats?.level || 1}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Creature Grid */}
        {collection.length === 0 ? (
          <p className="text-center text-gray-500 py-12">Aucune créature.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedCollection.map(c => {
              const rank = c.finalStats?.rank || c.rank || "E";
              const stats = c.finalStats || c.customStats || c.baseStats;
              const slotIndex = activeSlots.indexOf(c.id);
              const isSelected = slotIndex !== -1;
              const slotNumber = isSelected ? slotIndex + 1 : null;

              return (
                <button
                  key={c.id}
                  onClick={() => handleToggleCreature(c.id)}
                  disabled={!isSelected && activeSlots.length >= 5}
                  className={`bg-gradient-to-br ${isSelected ? 'from-blue-800 to-blue-900 border-blue-500' : 'from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border-gray-300 dark:border-gray-600'} rounded-lg p-4 pt-12 border-2 transition-all relative hover:scale-105 hover:shadow-xl ${
                    !isSelected && activeSlots.length >= 5 ? "opacity-40 cursor-not-allowed" : ""
                  }`}
                >
                  {/* Favorite badge */}
                  <div className="absolute top-2 right-2 text-2xl">
                    {c.isFavorite ? "❤️" : "🤍"}
                  </div>

                  {/* Slot number badge */}
                  {slotNumber && (
                    <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-lg font-bold z-10">
                      #{slotNumber}
                    </div>
                  )}

                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-16 h-16 flex-shrink-0">
                      <img
                        src={getCreatureImage(c.creatureId, rank, c.geneticType)}
                        alt={c.name}
                        className="w-full h-full object-cover rounded border border-blue-300 dark:border-blue-700"
                      />
                    </div>

                    <div className="flex-1 pr-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{c.name}</h3>
                        <span className={`font-bold bg-white dark:bg-gray-800 px-2 py-1 rounded-full text-sm border-2 ${getRankColor(rank)} ${getRankColor(rank).replace('text', 'border')}`}>
                          {rank}
                        </span>
                      </div>

                      <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-1">Level {c.level || c.customStats?.level || 1}</p>

                      {c.personality && (() => {
                        const p = PERSONALITIES[c.personality as PersonalityType];
                        return (
                          <span className="inline-block mt-1 px-2 py-1 rounded-full bg-purple-700 text-purple-200 text-xs font-bold">
                            {p.emoji} {p.name}
                          </span>
                        );
                      })()}

                      <div className="flex items-center gap-1 mt-1">
                        {renderStars(c.stars || 0)}
                      </div>

                      {c.traits && c.traits.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {getTraitsByIds(c.traits).slice(0, 2).map(trait => (
                            <span key={trait.id} className="px-1 py-0.5 text-xs rounded bg-purple-700 text-white">
                              {trait.name}
                            </span>
                          ))}
                          {c.traits.length > 2 && (
                            <span className="px-1 py-0.5 text-xs rounded bg-purple-900 text-purple-200">
                              +{c.traits.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-1 mt-3 text-center text-xs">
                    <div className="bg-gray-200 dark:bg-gray-600 rounded p-1">
                      <p className="text-gray-600 dark:text-gray-300">HP</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {c.currentHP || stats.hp}/{c.maxHP || stats.hp}
                      </p>
                    </div>
                    <div className="bg-gray-200 dark:bg-gray-600 rounded p-1">
                      <p className="text-gray-600 dark:text-gray-300">ATK</p>
                      <p className="font-bold text-gray-900 dark:text-white">{stats.attack}</p>
                    </div>
                    <div className="bg-gray-200 dark:bg-gray-600 rounded p-1">
                      <p className="text-gray-600 dark:text-gray-300">DEF</p>
                      <p className="font-bold text-gray-900 dark:text-white">{stats.defense}</p>
                    </div>
                    <div className="bg-gray-200 dark:bg-gray-600 rounded p-1">
                      <p className="text-gray-600 dark:text-gray-300">SPD</p>
                      <p className="font-bold text-gray-900 dark:text-white">{stats.speed}</p>
                    </div>
                    <div className="bg-gray-200 dark:bg-gray-600 rounded p-1">
                      <p className="text-gray-600 dark:text-gray-300">CRIT</p>
                      <p className="font-bold text-gray-900 dark:text-white">{stats.crit}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
