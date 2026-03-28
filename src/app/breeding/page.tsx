"use client"

import { useState, useEffect } from "react";
import { Rank, Creature } from "@/lib/database";
import { getTraitsByIds } from "@/lib/traits";
import {
  generateBabyCreature,
  validateBreeding,
  previewBabyStats,
  previewBabyRank,
  previewBabyTraits,
  getCreatureName,
  getValidCreatureType,
  BreededCreature
} from "@/lib/breeding";
import Link from "next/link";

type BreedingMode = "basic" | "enhanced" | "advanced";

// Union type for collection items (can be hunted or breeded)
type CollectionItem = HuntedCreature | BreededCreature;

interface HuntedCreature extends Creature {
  id: string;
  baseStats: any; // Base stats from creature data
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
  isOnMission: boolean; // True if creature is on exploration mission
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

// Helper function to check if an item is a HuntedCreature
function isHuntedCreature(item: CollectionItem): item is HuntedCreature {
  return 'baseStats' in item;
}

export default function BreedingPage() {
  const [parent1, setParent1] = useState<CollectionItem | null>(null);
  const [parent2, setParent2] = useState<CollectionItem | null>(null);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [showDropdown1, setShowDropdown1] = useState(false);
  const [showDropdown2, setShowDropdown2] = useState(false);
  const [search1, setSearch1] = useState("");
  const [search2, setSearch2] = useState("");
  const [mode, setMode] = useState<BreedingMode>("basic");
  const [error, setError] = useState<string | null>(null);
  const [babyCreatureType, setBabyCreatureType] = useState<string>("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [breedingSuccess, setBreedingSuccess] = useState(false);

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

  // Auto-set baby creature type when both parents selected and they match
  useEffect(() => {
    if (parent1 && parent2 && parent1.creatureId === parent2.creatureId) {
      setBabyCreatureType(parent1.creatureId);
    } else {
      setBabyCreatureType("");
    }
  }, [parent1, parent2]);

  // Save collection when it changes
  useEffect(() => {
    if (collection.length > 0) {
      localStorage.setItem("ecobio-collection", JSON.stringify(collection));
    } else {
      localStorage.removeItem("ecobio-collection");
    }
  }, [collection]);

  // Filter and sort creatures
  const filteredCollection = [...collection].sort((a, b) => {
    const rankDiff = RANK_ORDER[b.finalStats.rank] - RANK_ORDER[a.finalStats.rank];
    if (rankDiff !== 0) return rankDiff;
    return b.level - a.level;
  });

  // Get valid creature type for dropdown
  const validCreatureType = getValidCreatureType(parent1, parent2);

  // Filter creatures for dropdown based on search and creature type
  const getDropdownCreatures = (search: string, otherParent: CollectionItem | null) => {
    return filteredCollection.filter(creature => {
      const matchesSearch = creature.name.toLowerCase().includes(search.toLowerCase());
      const notSelectedAsOther = otherParent ? creature.id !== otherParent.id : true;
      const notSelectedAsSelf1 = parent1 ? creature.id !== parent1.id : true;
      const notSelectedAsSelf2 = parent2 ? creature.id !== parent2.id : true;
      const matchesType = otherParent ? creature.creatureId === otherParent.creatureId : true;
      const notOnMission = 'isOnMission' in creature ? !(creature as HuntedCreature).isOnMission : true;
      return matchesSearch && notSelectedAsOther && notSelectedAsSelf1 && notSelectedAsSelf2 && matchesType && notOnMission;
    });
  };

  const handleSelectParent1 = (creature: CollectionItem) => {
    // Allow both hunted AND breeded creatures as parents
    if (isHuntedCreature(creature) || (creature as any).breeded) {
      if (parent2?.id === creature.id) {
        setError("Vous ne pouvez pas sélectionner la même créature deux fois");
        return;
      }
      const creatureType = (creature as any).creatureId || (creature as any).creatureType;
      if (parent2) {
        const parent2Type = (parent2 as any).creatureId || (parent2 as any).creatureType;
        if (parent2Type !== creatureType) {
          setError(`La reproduction n'est possible qu'entre créatures du même type (${parent2.name} ≠ ${creature.name})`);
          return;
        }
      }
      setParent1(creature);
      setShowDropdown1(false);
      setSearch1("");
      setError(null);
    } else {
      setError("Créature invalide pour reproduction");
    }
  };

  const handleSelectParent2 = (creature: CollectionItem) => {
    // Allow both hunted AND breeded creatures as parents
    if (isHuntedCreature(creature) || (creature as any).breeded) {
      if (parent1?.id === creature.id) {
        setError("Vous ne pouvez pas sélectionner la même créature deux fois");
        return;
      }
      const creatureType = (creature as any).creatureId || (creature as any).creatureType;
      if (parent1) {
        const parent1Type = (parent1 as any).creatureId || (parent1 as any).creatureType;
        if (parent1Type !== creatureType) {
          setError(`La reproduction n'est possible qu'entre créatures du même type (${parent1.name} ≠ ${creature.name})`);
          return;
        }
      }
      setParent2(creature);
      setShowDropdown2(false);
      setSearch2("");
      setError(null);
    } else {
      setError("Créature invalide pour reproduction");
    }
  };

  const handleClearParent1 = () => {
    setParent1(null);
    setError(null);
  };

  const handleClearParent2 = () => {
    setParent2(null);
    setError(null);
  };

  const handleReproduce = () => {
    if (!parent1 || !parent2 || !babyCreatureType) return;

    const validation = validateBreeding(parent1, parent2, babyCreatureType);
    if (!validation.valid) {
      setError(validation.error || "Invalid breeding parameters");
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmReproduce = () => {
    if (!parent1 || !parent2 || !babyCreatureType) return;

    try {
      const baby = generateBabyCreature(parent1, parent2, babyCreatureType);
      setCollection([...collection, baby]);
      setBreedingSuccess(true);
      setShowConfirmDialog(false);

      // Reset form after success
      setTimeout(() => {
        setParent1(null);
        setParent2(null);
        setBabyCreatureType("");
        setError(null);
        setBreedingSuccess(false);
      }, 2000);
    } catch (err) {
      setError("Failed to generate baby creature");
      setShowConfirmDialog(false);
    }
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

  // Calculate baby preview
  const babyPreview = parent1 && parent2 && babyCreatureType ? {
    stats: previewBabyStats(parent1, parent2, babyCreatureType),
    rank: previewBabyRank(parent1, parent2),
    traits: previewBabyTraits(parent1, parent2, previewBabyRank(parent1, parent2)),
  } : null;

  const renderCreatureCard = (creature: CollectionItem, index: number) => {
    const traits = getTraitsByIds(creature.traits);
    const isOnMission = 'isOnMission' in creature && (creature as HuntedCreature).isOnMission;

    return (
      <div
        key={creature.id}
        onClick={() => !isOnMission && (index === 1 ? handleSelectParent1(creature) : handleSelectParent2(creature))}
        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
          isOnMission
            ? 'bg-gray-700 opacity-50 cursor-not-allowed'
            : 'hover:bg-green-700'
        }`}
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
            {isOnMission && <span className="text-orange-400" title="En mission d'exploration">🗺️</span>}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-yellow-300 text-sm">Lvl {creature.level}</span>
            <span className={`text-xs font-bold ${getRankBadgeColor(creature.finalStats.rank)} text-white px-2 py-0.5 rounded-full`}>
              {creature.finalStats.rank}
            </span>
            {isOnMission && <span className="text-xs text-orange-400">En mission</span>}
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

  const renderSelectedSlot = (creature: CollectionItem, slotNumber: number) => {
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

        {/* Baby Preview */}
        {parent1 && parent2 && parent1.id !== parent2.id && validCreatureType && (
          <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-lg p-6 border border-green-700 mb-6">
            <h2 className="text-2xl font-bold text-green-100 mb-4">🐣 Prévision du bébé</h2>

            {babyPreview ? (
              <div className="space-y-4">
                {/* Creature Type Display */}
                <div className="bg-green-950 rounded-lg p-4">
                  <p className="text-green-200 font-semibold mb-2">Type:</p>
                  <p className="text-2xl font-bold text-green-100">
                    {getCreatureName(validCreatureType)}
                  </p>
                </div>

                {/* Stats Preview */}
                <div className="bg-green-950 rounded-lg p-4">
                  <p className="text-green-200 font-semibold mb-3">Stats (approximatives):</p>
                  <div className="grid grid-cols-5 gap-3">
                    <div className="text-center">
                      <p className="text-green-300 text-sm">HP</p>
                      <p className="text-xl font-bold text-green-100">{babyPreview.stats.hp}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-green-300 text-sm">ATK</p>
                      <p className="text-xl font-bold text-green-100">{babyPreview.stats.attack}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-green-300 text-sm">DEF</p>
                      <p className="text-xl font-bold text-green-100">{babyPreview.stats.defense}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-green-300 text-sm">SPD</p>
                      <p className="text-xl font-bold text-green-100">{babyPreview.stats.speed}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-green-300 text-sm">CRIT</p>
                      <p className="text-xl font-bold text-green-100">{babyPreview.stats.crit}%</p>
                    </div>
                  </div>
                </div>

                {/* Rank Prediction */}
                <div className="bg-green-950 rounded-lg p-4">
                  <p className="text-green-200 font-semibold mb-2">Rang prédit:</p>
                  <span className={`text-3xl font-bold ${getRankBadgeColor(babyPreview.rank)} text-white px-4 py-2 rounded-full`}>
                    {babyPreview.rank}
                  </span>
                  <p className="text-green-400 text-sm mt-2">Peut varier de ±2 rangs</p>
                </div>

                {/* Traits Preview */}
                <div className="bg-green-950 rounded-lg p-4">
                  <p className="text-green-200 font-semibold mb-2">Traits hérités:</p>
                  {babyPreview.traits.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {getTraitsByIds(babyPreview.traits).map(trait => (
                        <span key={trait.id} className="px-3 py-1 text-sm rounded bg-purple-700 text-white">
                          {trait.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-green-400 italic">Aucun trait hérité</p>
                  )}
                  <p className="text-yellow-300 text-sm mt-2">⚡ 20% de chance de mutation surprise!</p>
                </div>

                {/* Reproduce Button */}
                <button
                  onClick={handleReproduce}
                  disabled={!parent1 || !parent2 || !validCreatureType}
                  className="w-full bg-gradient-to-r from-pink-700 to-pink-600 hover:from-pink-600 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-600 text-white rounded-lg p-4 text-xl font-bold shadow-lg transition-all duration-200"
                >
                  🧬 REPRODUIRE
                </button>
              </div>
            ) : (
              <div className="text-center p-8 bg-green-950 rounded-lg border-2 border-dashed border-green-600">
                <p className="text-green-400">Calcul en cours...</p>
              </div>
            )}
          </div>
        )}

        {/* Empty state for baby preview */}
        {(!parent1 || !parent2 || parent1.id === parent2.id) && (
          <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-lg p-6 border border-green-700">
            <h2 className="text-2xl font-bold text-green-100 mb-4">🐣 Prévision du bébé</h2>
            <div className="text-center p-8 bg-green-950 rounded-lg">
              <p className="text-green-400">
                {!parent1 || !parent2
                  ? "Sélectionnez deux parents différents pour voir les prévisions"
                  : "Les parents doivent être du même type"}
              </p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {breedingSuccess && (
          <div className="fixed top-4 right-4 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg p-6 shadow-xl border-2 border-green-400 z-50">
            <h3 className="text-2xl font-bold mb-2">🎉 Succès!</h3>
            <p className="text-lg">Nouveau bébé ajouté à votre collection!</p>
          </div>
        )}

        {/* Confirm Dialog */}
        {showConfirmDialog && babyPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-xl p-6 max-w-lg w-full mx-4 border-2 border-green-600">
              <h2 className="text-2xl font-bold text-green-100 mb-4">🔮 Confirmer la reproduction</h2>

              <div className="bg-green-950 rounded-lg p-4 mb-4">
                <p className="text-green-200 font-semibold mb-2">Bébé prévu:</p>
                <div className="space-y-2">
                  <p className="text-green-100">Type: <strong>{getCreatureName(validCreatureType!)}</strong></p>
                  <div className="flex gap-2 text-sm">
                    <span>HP: <strong>{babyPreview.stats.hp}</strong></span>
                    <span>ATK: <strong>{babyPreview.stats.attack}</strong></span>
                    <span>DEF: <strong>{babyPreview.stats.defense}</strong></span>
                    <span>SPD: <strong>{babyPreview.stats.speed}</strong></span>
                    <span>CRIT: <strong>{babyPreview.stats.crit}%</strong></span>
                  </div>
                  <p className="text-green-100">
                    Rang: <span className={`font-bold ${getRankBadgeColor(babyPreview.rank)} text-white px-2 py-1 rounded-full`}>
                      {babyPreview.rank}
                    </span>
                  </p>
                  {babyPreview.traits.length > 0 && (
                    <p className="text-green-100">
                      Traits: {getTraitsByIds(babyPreview.traits).map(t => t.name).join(", ")}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-yellow-900 bg-opacity-30 rounded-lg p-3 mb-4 border border-yellow-600">
                <p className="text-yellow-200 text-sm">
                  ⚠️ Ces valeurs sont des prévisions et peuvent varier légèrement!
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleConfirmReproduce}
                  className="flex-1 bg-gradient-to-r from-pink-700 to-pink-600 hover:from-pink-600 hover:to-pink-500 text-white rounded-lg p-3 font-bold"
                >
                  ✅ Confirmer
                </button>
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white rounded-lg p-3 font-bold"
                >
                  ❌ Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
