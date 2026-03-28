"use client"

import { useState, useEffect } from "react";
import { Rank, Creature } from "@/lib/database";
import { getTraitsByIds } from "@/lib/traits";
import Link from "next/link";

type BreedingMode = "basic" | "enhanced" | "advanced";

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
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  feedCount: number;
  feedStat: "hp" | "atk" | "def" | "spd" | "crit" | null;
  createdAt: number;
  creatureId: string;
  traits: string[];
  isFavorite: boolean;
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
  return "/ecobio-nextjs-ui/images/giant_fly.png";
}

const RANK_ORDER: Record<Rank, number> = {
  "S+": 7,
  "S": 6,
  "A": 5,
  "B": 4,
  "C": 3,
  "D": 2,
  "E": 1,
};

function getRankBadgeColor(rank: Rank) {
  if (rank === "S+") return "bg-purple-600";
  if (rank === "S") return "bg-yellow-600";
  if (rank === "A") return "bg-red-600";
  if (rank === "B") return "bg-orange-600";
  if (rank === "C") return "bg-green-600";
  if (rank === "D") return "bg-blue-600";
  return "bg-gray-600";
}

const MODE_LABELS: Record<BreedingMode, { fr: string; desc: string }> = {
  basic: { fr: "Basique", desc: "Reproduction standard" },
  enhanced: { fr: "Amélioré", desc: "Bonus aux traits" },
  advanced: { fr: "Avancé", desc: "Meilleure héritabilité" },
};

export default function BreedingPage() {
  const [parent1, setParent1] = useState<HuntedCreature | null>(null);
  const [parent2, setParent2] = useState<HuntedCreature | null>(null);
  const [collection, setCollection] = useState<HuntedCreature[]>([]);
  const [showDropdown1, setShowDropdown1] = useState(false);
  const [showDropdown2, setShowDropdown2] = useState(false);
  const [search1, setSearch1] = useState("");
  const [search2, setSearch2] = useState("");
  const [mode, setMode] = useState<BreedingMode>("basic");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("ecobio-collection");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCollection(parsed);
      } catch (e) {
        console.error("Failed load collection", e);
      }
    }
  }, []);

  // Filter and sort creatures (all creatures available, no level restriction)
  const filteredCollection = [...collection].sort((a, b) => {
    // Sort by rank descending first, then level descending
    const rankDiff = RANK_ORDER[b.finalStats.rank] - RANK_ORDER[a.finalStats.rank];
    if (rankDiff !== 0) return rankDiff;
    return b.level - a.level;
  });

  // Filter creatures for dropdown based on search and creature type
  const getDropdownCreatures = (search: string, otherParent: HuntedCreature | null) => {
    return filteredCollection.filter(creature => {
      const matchesSearch = creature.name.toLowerCase().includes(search.toLowerCase());
      const notSelectedAsOther = otherParent ? creature.id !== otherParent.id : true;
      const notSelectedAsSelf = parent1 ? creature.id !== parent1.id : true;
      const notSelectedAsSelf2 = parent2 ? creature.id !== parent2.id : true;
      // Only show creatures of the same type as the selected parent
      const matchesType = otherParent ? creature.creatureId === otherParent.creatureId : true;
      return matchesSearch && notSelectedAsOther && notSelectedAsSelf && notSelectedAsSelf2 && matchesType;
    });
  };

  const handleSelectParent1 = (creature: HuntedCreature) => {
    if (parent2?.id === creature.id) {
      setError("Vous ne pouvez pas sélectionner la même créature deux fois");
      return;
    }
    if (parent2 && parent2.creatureId !== creature.creatureId) {
      setError(`La reproduction n'est possible qu'entre créatures du même type (${parent2.name} ≠ ${creature.name})`);
      return;
    }
    setParent1(creature);
    setShowDropdown1(false);
    setSearch1("");
    setError(null);
  };

  const handleSelectParent2 = (creature: HuntedCreature) => {
    if (parent1?.id === creature.id) {
      setError("Vous ne pouvez pas sélectionner la même créature deux fois");
      return;
    }
    if (parent1 && parent1.creatureId !== creature.creatureId) {
      setError(`La reproduction n'est possible qu'entre créatures du même type (${parent1.name} ≠ ${creature.name})`);
      return;
    }
    setParent2(creature);
    setShowDropdown2(false);
    setSearch2("");
    setError(null);
  };

  const handleClearParent1 = () => {
    setParent1(null);
    setError(null);
  };

  const handleClearParent2 = () => {
    setParent2(null);
    setError(null);
  };

  const getBreedingStatus = () => {
    if (collection.length === 0) {
      return "Aucune créature dans votre collection. Allez chasser!";
    }
    if (filteredCollection.length === 0) {
      return "Aucune créature disponible.";
    }
    if (!parent1 || !parent2) {
      return "Sélectionnez deux créatures du même type pour reproduire";
    }
    if (parent1.creatureId !== parent2.creatureId) {
      return `Les parents doivent être du même type (${parent1.name} ≠ ${parent2.name})`;
    }
    return "Prêt à reproduire!";
  };

  const renderCreatureCard = (creature: HuntedCreature, index: number) => {
    const traits = getTraitsByIds(creature.traits);
    return (
      <div
        key={creature.id}
        onClick={() => index === 1 ? handleSelectParent1(creature) : handleSelectParent2(creature)}
        className="flex items-center gap-3 p-3 hover:bg-green-700 rounded-lg cursor-pointer transition-colors"
      >
        <img
          src={getCreatureImage(creature.creatureId, creature.finalStats.rank)}
          alt={creature.name}
          className="w-16 h-16 object-cover rounded border border-green-600"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-green-100">{creature.name}</p>
            {creature.isFavorite && <span className="text-red-400">❤️</span>}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-yellow-300 text-sm">Lvl {creature.level}</span>
            <span className={`text-xs font-bold ${getRankBadgeColor(creature.finalStats.rank)} text-white px-2 py-0.5 rounded-full`}>
              {creature.finalStats.rank}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {traits.slice(0, 3).map(trait => (
              <span key={trait.id} className="px-1.5 py-0.5 text-xs rounded bg-purple-700 text-white">
                {trait.name}
              </span>
            ))}
            {traits.length > 3 && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-purple-900 text-purple-200">
                +{traits.length - 3}
              </span>
            )}
          </div>
        </div>
        <div className="text-right grid grid-cols-5 gap-1 text-xs">
          <div className="bg-green-950 rounded p-1"><p className="text-green-100">{creature.finalStats.hp}</p></div>
          <div className="bg-green-950 rounded p-1"><p className="text-green-100">{creature.finalStats.attack}</p></div>
          <div className="bg-green-950 rounded p-1"><p className="text-green-100">{creature.finalStats.defense}</p></div>
          <div className="bg-green-950 rounded p-1"><p className="text-green-100">{creature.finalStats.speed}</p></div>
          <div className="bg-green-950 rounded p-1"><p className="text-green-100">{creature.finalStats.crit}</p></div>
        </div>
      </div>
    );
  };

  const renderEmptySlot = (slotNumber: number) => (
    <div
      onClick={() => slotNumber === 1 ? setShowDropdown1(!showDropdown1) : setShowDropdown2(!showDropdown2)}
      className="flex-1 border-2 border-dashed border-green-600 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-green-500 transition-colors"
    >
      <span className="text-4xl mb-2">؟</span>
      <p className="text-green-200 font-semibold">Parent {slotNumber}</p>
      <p className="text-green-400 text-sm mt-1">Cliquez pour sélectionner</p>
    </div>
  );

  const renderSelectedSlot = (creature: HuntedCreature, slotNumber: number) => {
    const traits = getTraitsByIds(creature.traits);
    return (
      <div className="flex-1 border-2 border-green-600 rounded-lg p-4 bg-gradient-to-br from-green-800 to-green-900">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <img
              src={getCreatureImage(creature.creatureId, creature.finalStats.rank)}
              alt={creature.name}
              className="w-20 h-20 object-cover rounded-lg border border-green-600"
            />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-green-100">{creature.name}</p>
                {creature.isFavorite && <span className="text-lg">❤️</span>}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-yellow-300 font-bold">Lvl {creature.level}</span>
                <span className={`text-sm font-bold ${getRankBadgeColor(creature.finalStats.rank)} text-white px-2 py-0.5 rounded-full`}>
                  {creature.finalStats.rank}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={slotNumber === 1 ? handleClearParent1 : handleClearParent2}
            className="text-green-400 hover:text-red-400 font-semibold text-sm"
          >
            ✕ Changer
          </button>
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {traits.slice(0, 3).map(trait => (
            <span key={trait.id} className="px-2 py-1 text-xs rounded bg-purple-700 text-white">
              {trait.name}
            </span>
          ))}
          {traits.length > 3 && (
            <span className="px-2 py-1 text-xs rounded bg-purple-900 text-purple-200">
              +{traits.length - 3}
            </span>
          )}
        </div>
        <div className="grid grid-cols-5 gap-1 text-center text-xs mt-3">
          <div className="bg-green-950 rounded p-1.5"><p className="text-green-200 text-[10px]">HP</p><p className="text-green-100 font-bold">{creature.finalStats.hp}</p></div>
          <div className="bg-green-950 rounded p-1.5"><p className="text-green-200 text-[10px]">ATK</p><p className="text-green-100 font-bold">{creature.finalStats.attack}</p></div>
          <div className="bg-green-950 rounded p-1.5"><p className="text-green-200 text-[10px]">DEF</p><p className="text-green-100 font-bold">{creature.finalStats.defense}</p></div>
          <div className="bg-green-950 rounded p-1.5"><p className="text-green-200 text-[10px]">SPD</p><p className="text-green-100 font-bold">{creature.finalStats.speed}</p></div>
          <div className="bg-green-950 rounded p-1.5"><p className="text-green-200 text-[10px]">CRIT</p><p className="text-green-100 font-bold">{creature.finalStats.crit}</p></div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-950 p-6">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-green-300 hover:text-green-200 mb-6 inline-block">← Retour</Link>
        <h1 className="text-4xl font-bold text-green-100 mb-2">🧬 Reproduction</h1>
        <p className="text-green-200 mb-8">Créez de nouvelles créatures en reproduisant votre collection!</p>

        {/* Mode Selector */}
        <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-lg p-4 mb-6 border border-green-700">
          <p className="text-green-200 font-semibold mb-2">Mode de reproduction:</p>
          <div className="flex flex-wrap gap-2">
            {(["basic", "enhanced", "advanced"] as BreedingMode[]).map(modeKey => (
              <button
                key={modeKey}
                onClick={() => setMode(modeKey)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  mode === modeKey
                    ? "bg-gradient-to-r from-blue-700 to-blue-600 text-white ring-2 ring-white"
                    : "bg-green-950 text-green-200 hover:bg-green-700"
                }`}
                title={MODE_LABELS[modeKey].desc}
              >
                {MODE_LABELS[modeKey].fr}
              </button>
            ))}
          </div>
        </div>

        {/* Parent Slots */}
        <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-lg p-6 mb-6 border border-green-700">
          <h2 className="text-2xl font-bold text-green-100 mb-4">Parents</h2>
          <div className="flex gap-4 mb-6">
            {parent1 ? renderSelectedSlot(parent1, 1) : renderEmptySlot(1)}
            {parent2 ? renderSelectedSlot(parent2, 2) : renderEmptySlot(2)}
          </div>

          {/* Dropdown for Parent 1 */}
          {showDropdown1 && (
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Rechercher une créature..."
                value={search1}
                onChange={(e) => setSearch1(e.target.value)}
                className="w-full bg-green-950 text-green-100 rounded-lg px-4 py-3 border border-green-600 focus:outline-none focus:border-green-500 mb-2"
                autoFocus
              />
              <div className="absolute w-full bg-green-950 border-2 border-green-600 rounded-lg max-h-80 overflow-y-auto z-10">
                {getDropdownCreatures(search1, parent2).length > 0 ? (
                  getDropdownCreatures(search1, parent2).map(creature => renderCreatureCard(creature, 1))
                ) : (
                  <p className="text-center text-green-400 p-4">Aucune créature trouvée</p>
                )}
              </div>
            </div>
          )}

          {/* Dropdown for Parent 2 */}
          {showDropdown2 && (
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher une créature..."
                value={search2}
                onChange={(e) => setSearch2(e.target.value)}
                className="w-full bg-green-950 text-green-100 rounded-lg px-4 py-3 border border-green-600 focus:outline-none focus:border-green-500 mb-2"
                autoFocus
              />
              <div className="absolute w-full bg-green-950 border-2 border-green-600 rounded-lg max-h-80 overflow-y-auto z-10">
                {getDropdownCreatures(search2, parent1).length > 0 ? (
                  getDropdownCreatures(search2, parent1).map(creature => renderCreatureCard(creature, 2))
                ) : (
                  <p className="text-center text-green-400 p-4">Aucune créature trouvée</p>
                )}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="mt-4 p-3 bg-green-950 rounded-lg border border-green-700">
            <p className={`text-lg font-semibold ${error ? "text-red-300" : "text-green-200"}`}>
              [Status] {getBreedingStatus()}
            </p>
          </div>
        </div>

        {/* Baby Preview (placeholder for future) */}
        <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-lg p-6 border border-green-700">
          <h2 className="text-2xl font-bold text-green-100 mb-4">🐣 Prévision du bébé</h2>
          {parent1 && parent2 && parent1.id !== parent2.id ? (
            <div className="text-center p-8 bg-green-950 rounded-lg border-2 border-dashed border-green-600">
              <p className="text-green-300 text-lg">🔮 Prévisions à venir...</p>
              <p className="text-green-400 text-sm mt-2">Les calculs de reproduction arrivent bientôt!</p>
            </div>
          ) : (
            <div className="text-center p-8 bg-green-950 rounded-lg">
              <p className="text-green-400">Sélectionnez deux parents différents pour voir les prévisions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
