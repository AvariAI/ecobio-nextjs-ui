"use client";

import { useState } from "react";
import { CREATURES, CREATURE_TYPES, Creature } from "@/lib/database";
import Link from "next/link";

export default function PokedexPage() {
  const [search, setSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(CREATURE_TYPES));

  const toggleType = (type: string) => {
    const newTypes = new Set(selectedTypes);

    if (newTypes.has(type)) {
      // Type is selected - try to deselect it
      newTypes.delete(type);
      // If this would leave no filters selected, ensure at least one remains
      if (newTypes.size === 0) {
        newTypes.add(type);
      }
    } else {
      // Type is not selected - select it
      newTypes.add(type);
    }

    setSelectedTypes(newTypes);
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

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Search Creatures
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Filter by Type
            </label>
            <div className="flex flex-wrap gap-3">
              {CREATURE_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`px-4 py-2 rounded-full font-medium transition-all ${
                    selectedTypes.has(type)
                      ? "bg-green-600 text-white shadow-lg"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Creatures Grid */}
        <div className="grid gap-6">
          {filteredCreatures.map((creature) => (
            <CreatureCard key={creature.id} creature={creature} />
          ))}
        </div>

        <footer className="text-center mt-12 text-gray-600 dark:text-gray-400">
          <p>Showing {filteredCreatures.length} of {Object.values(CREATURES).length} creatures</p>
        </footer>
      </div>
    </main>
  );
}

function CreatureCard({ creature }: { creature: Creature }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all border-2 border-transparent hover:border-green-400 overflow-hidden">
      <div className="md:flex">
        <div className="md:w-1/4 p-6 flex items-center justify-center bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900 dark:to-blue-900">
          <img
            src={creature.image}
            alt={creature.name}
            className="max-w-full h-auto rounded-lg shadow-lg"
            width={200}
            height={200}
          />
        </div>

        <div className="md:w-3/4 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
              {creature.name}
            </h2>
            <span className={`px-4 py-1 rounded-full text-sm font-semibold ${
              creature.type === 'Insect' ? 'bg-green-600 text-white' :
              creature.type === 'Arachnid' ? 'bg-purple-600 text-white' :
              'bg-yellow-600 text-white'
            }`}>
              {creature.type}
            </span>
          </div>

          <p className="text-gray-600 dark:text-gray-300 mb-4">{creature.desc}</p>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <StatCard label="HP" value={creature.baseStats.hp} color="red" />
            <StatCard label="Attack" value={creature.baseStats.attack} color="orange" />
            <StatCard label="Speed" value={creature.baseStats.speed} color="blue" />
          </div>

          {Object.keys(creature.typeBonus).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Type Effectiveness
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(creature.typeBonus).map(([type, bonus]) => (
                  <span
                    key={type}
                    className={`px-3 py-1 rounded-full text-sm ${
                      bonus > 1
                        ? "bg-green-600 text-white"
                        : bonus < 1
                        ? "bg-red-600 text-white"
                        : "bg-gray-600 text-white"
                    }`}
                  >
                    {type}: {bonus}x
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClass = {
    red: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
    orange: "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
    blue: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
  }[color];

  return (
    <div className={`${colorClass} rounded-lg p-4 text-center`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium">{label}</div>
    </div>
  );
}
