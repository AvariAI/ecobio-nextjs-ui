"use client";

import { useEffect, useState } from "react";
import { GENETIC_TYPES, GeneticType } from "@/lib/genetic-types";
import { CREATURES, Rank } from "@/lib/database";

const RANKS: Rank[] = ["E", "D", "C", "B", "A", "S", "S+"];

function getRankBadgeColor(rank: Rank): string {
  if (rank === "S+") return "bg-purple-600";
  if (rank === "S") return "bg-yellow-600";
  if (rank === "A") return "bg-red-600";
  if (rank === "B") return "bg-orange-600";
  if (rank === "C") return "bg-blue-600";
  if (rank === "D") return "bg-green-600";
  return "bg-gray-600";
}

function getCardImage(geneticType: GeneticType, rank: Rank, creatureId?: string): string {
  const normalizedType = geneticType.toLowerCase().replace("é", "e").replace("è", "e");
  // If creature is Polyops, use Polyops image
  if (creatureId === "polyops") {
    return "/ecobio-nextjs-ui/images/creatures/polyops.png";
  }
  // If creature is Gravécaille, use Gravécaille image
  if (creatureId === "gravaille") {
    return "/ecobio-nextjs-ui/images/creatures/gravaille.png";
  }
  // If creature is Maworm, use Maworm image
  if (creatureId === "maworm") {
    return "/ecobio-nextjs-ui/images/creatures/maworm.png";
  }
  // If creature is Cornegrive, use Cornegrive image
  if (creatureId === "cornegrive") {
    return "/ecobio-nextjs-ui/images/creatures/cornegrive.png";
  }
  // If creature is Oxydrabe, use Oxydrabe image
  if (creatureId === "oxydrabe") {
    return "/ecobio-nextjs-ui/images/creatures/oxydrabe.png";
  }
  // If creature is Verdogre, use Verdogre image
  if (creatureId === "verdogre") {
    return "/ecobio-nextjs-ui/images/creatures/polyops.png"; // Placeholder for now
  }
  // For Ravaryn, use the creatures/ directory (not images/creatures/)
  return `/ecobio-nextjs-ui/creatures/ravaryn_${normalizedType}_e.png`;
}

// Check if user has discovered this type rank (permanent unlock)
function hasDiscovered(geneticType: GeneticType, rank: Rank, creatureId?: string): boolean {
  try {
    // Check permanent pokedex unlocks first
    const unlocks = JSON.parse(localStorage.getItem("ecobio-pokedex-unlocks") || "[]");
    const isUnlocked = unlocks.some((unlock: any) =>
      unlock.geneticType === geneticType &&
      unlock.rank === rank &&
      (!creatureId || unlock.creatureId === creatureId)
    );
    if (isUnlocked) return true;

    // If not in unlocks, check current collection (for first-time detection)
    const collection = JSON.parse(localStorage.getItem("ecobio-collection") || "[]");
    const matches = collection.filter((creature: any) =>
      creature.geneticType === geneticType &&
      creature.finalStats.rank === rank &&
      (!creatureId || creature.creatureId === creatureId)
    );

    // First discovery! Add to permanent unlocks
    if (matches.length > 0 && !isUnlocked) {
      unlocks.push({ geneticType, rank, discoveredAt: Date.now(), creatureId });
      localStorage.setItem("ecobio-pokedex-unlocks", JSON.stringify(unlocks));
    }

    return matches.length > 0;
  } catch (error) {
    return false;
  }
}

// Check if user has at least one captured creature of this type rank for a specific creature
function hasCaptured(geneticType: GeneticType, rank: Rank, creatureId?: string): boolean {
  try {
    const collection = JSON.parse(localStorage.getItem("ecobio-collection") || "[]");
    const matches = collection.filter((creature: any) =>
      creature.geneticType === geneticType &&
      creature.finalStats.rank === rank &&
      (!creatureId || creature.creatureId === creatureId)
    );
    return matches.length > 0;
  } catch (error) {
    console.error("Error checking captures:", error);
    return false;
  }
}

// Get capture count for this type rank for a specific creature
function getCaptureCount(geneticType: GeneticType, rank: Rank, creatureId?: string): number {
  try {
    const collection = JSON.parse(localStorage.getItem("ecobio-collection") || "[]");
    return collection.filter((creature: any) =>
      creature.geneticType === geneticType &&
      creature.finalStats.rank === rank &&
      (!creatureId || creature.creatureId === creatureId)
    ).length;
  } catch {
    return 0;
  }
}

export default function PokedexPage() {
  // Available creatures for pokedex selection
  const availableCreatures = Object.keys(CREATURES);
  const [selectedCreature, setSelectedCreature] = useState<string>("ravaryn");

  const [geneticTypes] = useState<GeneticType[]>([
    "resilient",
    "scribeur",
    "symbiote",
    "radiant",
    "chimere",
    "pathogene",
    "synchroniseur",
    "ombre",
  ]);

  const [discovered, setDiscovered] = useState<Set<string>>(new Set());

  // Load discovered status from localStorage for selected creature
  useEffect(() => {
    const discoveredSet = new Set<string>();
    geneticTypes.forEach(type => {
      RANKS.forEach(rank => {
        if (hasDiscovered(type, rank, selectedCreature)) {
          discoveredSet.add(`${type}-${rank}`);
        }
      });
    });
    setDiscovered(discoveredSet);
  }, [geneticTypes, selectedCreature]);

  // Load global discovered status for all creatures
  useEffect(() => {
    const globalDiscoveredSet = new Set<string>();
    availableCreatures.forEach(creatureId => {
      geneticTypes.forEach(type => {
        RANKS.forEach(rank => {
          if (hasDiscovered(type, rank, creatureId)) {
            globalDiscoveredSet.add(`${creatureId}-${type}-${rank}`);
          }
        });
      });
    });
    setGlobalDiscovered(globalDiscoveredSet);
  }, [availableCreatures, geneticTypes]);

  // Listen for collection updates
  useEffect(() => {
    const handleStorageUpdate = () => {
      const discoveredSet = new Set<string>();
      geneticTypes.forEach(type => {
        RANKS.forEach(rank => {
          if (hasDiscovered(type, rank, selectedCreature)) {
            discoveredSet.add(`${type}-${rank}`);
          }
        });
      });
      setDiscovered(discoveredSet);
      
      // Update global counter too
      const globalDiscoveredSet = new Set<string>();
      availableCreatures.forEach(creatureId => {
        geneticTypes.forEach(type => {
          RANKS.forEach(rank => {
            if (hasDiscovered(type, rank, creatureId)) {
              globalDiscoveredSet.add(`${creatureId}-${type}-${rank}`);
            }
          });
        });
      });
      setGlobalDiscovered(globalDiscoveredSet);
    };

    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener("inventory-updated", handleStorageUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener("inventory-updated", handleStorageUpdate);
    };
  }, [geneticTypes]);

  const getTotalCaptured = () => discovered.size;
  const getTotalSlots = () => geneticTypes.length * RANKS.length; // 8 × 7 = 56 par créature
  
  // Global counters (all creatures combined)
  const [globalDiscovered, setGlobalDiscovered] = useState<Set<string>>(new Set());
  const getGlobalTotalCaptured = () => globalDiscovered.size;
  const getGlobalTotalSlots = () => availableCreatures.length * geneticTypes.length * RANKS.length; // N créatures × 8 types × 7 rangs = N × 56

  const handleResetPokedex = () => {
    if (confirm("Êtes-vous sûr de vouloir réinitialiser votre progression Pokédex ? Toutes les cartes seront verrouillées.")) {
      localStorage.removeItem("ecobio-pokedex-unlocks");
      setDiscovered(new Set());
      // Trigger UI update
      window.dispatchEvent(new Event("storage"));
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        <a 
          href="/ecobio-nextjs-ui/" 
          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 mb-4 inline-block font-semibold cursor-pointer"
          style={{ display: 'inline-block', textDecoration: 'none' }}
        >
          ← Retour
        </a>

        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          📚 Pokédex
        </h1>

        {/* Creature selection */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Sélectionner une créature</h2>
          <div className="flex gap-4 flex-wrap">
            {availableCreatures.map(creatureId => {
              const creature = CREATURES[creatureId];
              return (
                <button
                  key={creatureId}
                  onClick={() => setSelectedCreature(creatureId)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    selectedCreature === creatureId
                      ? "bg-green-600 text-white shadow-lg scale-105"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {creature.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-8 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-lg text-gray-700 dark:text-gray-300">
                <span className="font-bold text-blue-600 dark:text-blue-400">Global:</span> <span className="font-bold text-green-600 dark:text-green-400">{getGlobalTotalCaptured()}</span> / {getGlobalTotalSlots()} cartes
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total toutes créatures confondues
              </p>
              <p className="text-lg text-gray-700 dark:text-gray-300 mt-1">
                Collection {CREATURES[selectedCreature].name}: <span className="font-bold text-green-600 dark:text-green-400">{getTotalCaptured()}</span> / {getTotalSlots()} cartes
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Capturez des {CREATURES[selectedCreature].name} de chaque type et rang pour compléter le Pokédex
              </p>
            </div>
            <button
              onClick={handleResetPokedex}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-colors"
            >
              🔄 Reset Progression
            </button>
          </div>
        </div>

        {/* Type rows + Rank columns */}
        <div className="space-y-6">
          {geneticTypes.map((type, typeIndex) => {
            const typeData = GENETIC_TYPES[type];
            return (
              <div key={type} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={selectedCreature === "polyops"
                      ? "/ecobio-nextjs-ui/images/creatures/polyops.png"
                      : selectedCreature === "gravaille"
                      ? "/ecobio-nextjs-ui/images/creatures/gravaille.png"
                      : selectedCreature === "maworm"
                      ? "/ecobio-nextjs-ui/images/creatures/maworm.png"
                      : selectedCreature === "cornegrive"
                      ? "/ecobio-nextjs-ui/images/creatures/cornegrive.png"
                      : selectedCreature === "oxydrabe"
                      ? "/ecobio-nextjs-ui/images/creatures/oxydrabe.png"
                      : selectedCreature === "verdogre"
                      ? "/ecobio-nextjs-ui/images/creatures/polyops.png"
                      : `/ecobio-nextjs-ui/images/creatures/${selectedCreature}_${type.toLowerCase().replace("é", "e").replace("è", "e")}_e.png`
                    }
                    alt={typeData.name}
                    className="w-16 h-16 rounded-lg border-2 border-gray-300 dark:border-gray-600"
                  />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {typeData.emoji} {typeData.name}
                  </h2>
                </div>

                {/* Rank cards row */}
                <div className="grid grid-cols-7 gap-3">
                  {RANKS.map((rank) => {
                    const cardKey = `${type}-${rank}`;
                    const isDiscovered = discovered.has(cardKey);
                    const hasInCollection = hasCaptured(type, rank, selectedCreature);
                    const captureCount = getCaptureCount(type, rank, selectedCreature);
                    const isRowOdd = typeIndex % 2 === 0;

                    return (
                      <div
                        key={rank}
                        className={`
                          relative aspect-[2/3] rounded-lg overflow-hidden
                          transition-all hover:scale-105 cursor-pointer
                          ${isDiscovered ? "shadow-md" : "shadow-inner"}
                          ${isRowOdd ? "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600" : "bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-600 dark:to-gray-700"}
                        `}
                        title={isDiscovered ? `${typeData.name} ${rank} (${hasInCollection ? captureCount + " en collection" : "Découvert mais pas en collection"})` : "Non découvert - Capturez ce type"}
                      >
                        {/* Rank badge */}
                        <div className={`absolute top-2 right-2 ${getRankBadgeColor(rank)} text-white text-xs font-bold px-2 py-1 rounded-full z-10`}>
                          {rank}
                        </div>

                        {/* Card content */}
                        <img
                          src={getCardImage(type, rank, selectedCreature)}
                          alt={`${typeData.name} ${rank}`}
                          className={`w-full h-full object-cover ${
                            isDiscovered ? "" : "opacity-0"
                          }`}
                          onError={(e) => {
                            console.error(`Failed to load: ${getCardImage(type, rank, selectedCreature)}`);
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />

                        {/* Card back - Noir (undiscovered only) */}
                        {!isDiscovered && (
                          <div className="absolute inset-0 bg-gray-900 dark:bg-black rounded-lg border-2 border-gray-400 dark:border-gray-600 flex items-center justify-center">
                            <span className="text-4xl text-gray-400 dark:text-gray-500">?</span>
                          </div>
                        )}

                        {/* Capture count - only shown when in collection and has more than 1 */}
                        {isDiscovered && hasInCollection && captureCount > 1 && (
                          <div className="absolute bottom-2 left-2 bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full z-10">
                            ×{captureCount}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}
