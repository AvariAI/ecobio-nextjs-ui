"use client";

import { useState } from "react";
import { CREATURES, CREATURE_TYPES, Creature, Rank } from "@/lib/database";
import Link from "next/link";

const RANKS: Rank[] = ["E", "D", "C", "B", "A", "S", "S+"];

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`bg-${color}-100 dark:bg-${color}-900 rounded-lg p-3 text-center`}>
      <div className={`text-xs text-${color}-600 dark:text-${color}-400 font-semibold mb-1`}>
        {label}
      </div>
      <div className={`text-xl font-bold text-${color}-800 dark:text-${color}-200`}>
        {value}
      </div>
    </div>
  );
}

function getCreatureRankImage(creatureId: string, rank: Rank): string {
  const rankSuffix = rank === "S+" ? "S+" : rank;
  return `creatures/${creatureId}_rank_${rankSuffix}.png`;
}

function getRankBadgeColor(rank: Rank): string {
  if (rank === "S+") return "bg-purple-600";
  if (rank === "S") return "bg-yellow-600";
  if (rank === "A") return "bg-red-600";
  if (rank === "B") return "bg-orange-600";
  if (rank === "C") return "bg-green-600";
  if (rank === "D") return "bg-blue-600";
  return "bg-gray-600";
}

type CreatureRanks = Record<string, Rank>;

export default function PokedexPage() {
  const [search, setSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(CREATURE_TYPES));
  const [selectedRanks, setSelectedRanks] = useState<CreatureRanks>(() => {
    const ranks: CreatureRanks = {};
    Object.keys(CREATURES).forEach(id => {
      ranks[id] = "E";
    });
    return ranks;
  });

  const toggleType = (type: string) => {
    const newTypes = new Set(selectedTypes);

    if (newTypes.has(type)) {
      newTypes.delete(type);
      if (newTypes.size === 0) {
        newTypes.add(type);
      }
    } else {
      newTypes.add(type);
    }

    setSelectedTypes(newTypes);
  };

  const handleRankChange = (creatureId: string, rank: Rank) => {
    setSelectedRanks(prev => ({
      ...prev,
      [creatureId]: rank
    }));
  };

  const filteredCreatures = Object.values(CREATURES).filter(
    (creature) =>
      selectedTypes.has(creature.type) &&
      creature.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <Link href="/" className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-lg shadow-md hover:shadow-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-gray-700 dark:hover:to-gray-700 transition-all duration-200 mb-4 border border-blue-200 dark:border-blue-800 font-semibold">
            <span className="mr-2">←</span> Back to Home
          </Link>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-4">
            📚 ÉcoBio Pokedex
          </h1>
        </header>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Search creatures
            </label>
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Filter by Type
            </label>
            <div className="flex flex-wrap gap-2">
              {CREATURE_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    selectedTypes.has(type)
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {filteredCreatures.map((creature) => {
            const currentRank = selectedRanks[creature.id] || "E";

            return (
              <div
                key={creature.id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all border-2 border-transparent hover:border-green-400 overflow-hidden"
              >
                <div className="md:flex">
                  <div className="md:w-1/4 p-6 flex items-center justify-center bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900 dark:to-blue-900">
                    <img
                      src={getCreatureRankImage(creature.id, currentRank)}
                      alt={`${creature.name} Rank ${currentRank}`}
                      className="max-w-full h-auto rounded-lg shadow-lg"
                      width={200}
                      height={200}
                    />
                  </div>

                  <div className="md:w-3/4 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
                        {creature.name}
                      </h2>
                      <span className="px-4 py-1 rounded-full text-sm font-semibold bg-green-600 text-white">
                        {creature.type}
                      </span>
                    </div>

                    {/* Rank Selector */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        View by Rank
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {RANKS.map((rank) => (
                          <button
                            key={rank}
                            onClick={() => handleRankChange(creature.id, rank)}
                            className={`px-2 py-1 rounded text-sm font-bold transition-all ${
                              currentRank === rank
                                ? `${getRankBadgeColor(rank)} ring-2 ring-white`
                                : `${getRankBadgeColor(rank)} opacity-60 hover:opacity-100`
                            }`}
                          >
                            {rank}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 mb-4">{creature.desc}</p>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <StatCard label="HP" value={creature.baseStats.hp} color="red" />
                      <StatCard label="Attack" value={creature.baseStats.attack} color="orange" />
                      <StatCard label="Speed" value={creature.baseStats.speed} color="blue" />
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <StatCard label="Defense" value={creature.baseStats.defense} color="purple" />
                      <StatCard label="Crit" value={creature.baseStats.crit} color="pink" />
                    </div>

                    {creature.skill && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Skill
                        </h3>
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                          <div className="font-bold text-gray-800 dark:text-white">
                            {creature.skill.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {creature.skill.description}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Cooldown: {creature.skill.cooldown} tours | Duration: {creature.skill.duration} tours
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredCreatures.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              No creatures found
            </h3>
            <p className="text-gray-500 dark:text-gray-500">
              Try adjusting your filters or search term
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
