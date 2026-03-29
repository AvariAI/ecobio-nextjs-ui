"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { loadInventory, removeFromInventory, PLANT_DEFINITIONS, ESSENCE_DEFINITIONS, BUFFER_DEFINITIONS, RARITY_COLORS, REMEDY_DEFINITIONS, Inventory } from "@/lib/inventory";
import { PLANTS, getMedicalPlantsByRank } from "@/lib/resources";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<Inventory>({ items: [], totalLootObtained: 0 });
  const [filterType, setFilterType] = useState<"all" | "plant" | "insectEssence" | "plantEssence" | "breedingBuffer" | "object">("all");
  const [filterRank, setFilterRank] = useState<"all" | "S+" | "S" | "A" | "B" | "C" | "D" | "E">("all");

  // Load inventory
  useEffect(() => {
    try {
      const loaded = loadInventory();
      setInventory(loaded);
    } catch (e) {
      console.error("Failed to load inventory:", e);
    }
  }, []);

  // Listen for inventory updates
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const loaded = loadInventory();
        setInventory(loaded);
      } catch (e) {
        console.error("Failed to reload inventory:", e);
      }
    };

    window.addEventListener("inventory-updated", handleUpdate);
    return () => window.removeEventListener("inventory-updated", handleUpdate);
  }, []);

  // Delete item
  const handleDelete = (itemId: string) => {
    try {
      const updated = removeFromInventory(itemId, Infinity);
      setInventory(updated);
    } catch (e) {
      console.error("Failed to delete item:", e);
    }
  };

  // Helper function to determine if an item is an "object" (not essence or buffer)
  const isObject = (item: any): boolean => {
    return !["plant", "insectEssence", "plantEssence", "breedingBuffer", "remedy"].includes(item.type);
  };

  // Helper function to check if a plant is medicinal
  const isMedicalPlant = (item: any): boolean => {
    if (item.type !== "plant") return false;
    const plant = PLANTS.find(p => p.name === (item.plantName || item.name) && p.rarity === item.rank);
    return plant?.isMedical || false;
  };

  const filteredItems = inventory.items
    .filter(item => item.count > 0)
    .filter(item => {
      if (filterType === "all") return true;
      if (filterType === "object") return isObject(item);
      return item.type === filterType;
    })
    .filter(item => {
      if (filterRank === "all") return true;
      return item.rank === filterRank;
    });

  // Group by rarity (S+ first, E last for display order)
  const groupedByRarity: Record<string, typeof inventory.items> = {
    "S+": [],
    "S": [],
    "A": [],
    "B": [],
    "C": [],
    "D": [],
    "E": []
  };

  filteredItems.forEach(item => {
    if (!groupedByRarity[item.rank]) {
      groupedByRarity[item.rank] = [];
    }
    groupedByRarity[item.rank].push(item);
  });

  const getRankBorderColor = (rank: string) => {
    const colors: Record<string, string> = {
      "E": "border-gray-400",
      "D": "border-green-400",
      "C": "border-blue-400",
      "B": "border-yellow-400",
      "A": "border-orange-400",
      "S": "border-red-400",
      "S+": "border-purple-400"
    };
    return colors[rank] || "border-gray-400";
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="text-emerald-700 dark:text-emerald-300 mb-6 inline-block">← Retour</Link>
        <header className="text-center mb-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent mb-4">
            📦 Inventaire
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Gère tes ressources de looting d'exploration
          </p>
        </header>

        {/* Filter controls - Type */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-4">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Filtrer par Type:</p>
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-3 py-1 rounded-lg text-sm ${filterType === "all" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
              onClick={() => setFilterType("all")}
            >
              Tous
            </button>
            <button
              className={`px-3 py-1 rounded-lg text-sm ${filterType === "plant" ? "bg-green-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
              onClick={() => setFilterType("plant")}
            >
              🌿 Plantes
            </button>
            <button
              className={`px-3 py-1 rounded-lg text-sm ${filterType === "insectEssence" ? "bg-amber-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
              onClick={() => setFilterType("insectEssence")}
            >
              🐛 Essences Insecte
            </button>
            <button
              className={`px-3 py-1 rounded-lg text-sm ${filterType === "plantEssence" ? "bg-teal-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
              onClick={() => setFilterType("plantEssence")}
            >
              🌸 Essences Plante
            </button>
            <button
              className={`px-3 py-1 rounded-lg text-sm ${filterType === "breedingBuffer" ? "bg-purple-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
              onClick={() => setFilterType("breedingBuffer")}
            >
              ⚗️ Buffer Breeding
            </button>
            <button
              className={`px-3 py-1 rounded-lg text-sm ${filterType === "object" ? "bg-orange-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
              onClick={() => setFilterType("object")}
            >
              📦 Objets
            </button>
          </div>
        </div>

        {/* Filter controls - Rank */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-4">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Filtrer par Rang:</p>
          <div className="flex flex-wrap gap-2">
            {["all", "S+", "S", "A", "B", "C", "D", "E"].map(rank => (
              <button
                key={rank}
                className={`px-3 py-1 rounded-lg text-sm font-bold ${
                  filterRank === rank
                    ? rank === "all"
                      ? "bg-gray-600 text-white"
                      : rank === "S+"
                      ? "bg-purple-500 text-white"
                      : rank === "S"
                      ? "bg-red-500 text-white"
                      : rank === "A"
                      ? "bg-orange-500 text-white"
                      : rank === "B"
                      ? "bg-yellow-500 text-white"
                      : rank === "C"
                      ? "bg-blue-500 text-white"
                      : rank === "D"
                      ? "bg-green-500 text-white"
                      : "bg-gray-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
                onClick={() => setFilterRank(rank as any)}
              >
                {rank === "all" ? "Tous" : rank}
              </button>
            ))}
          </div>
        </div>

        {/* Items grouped by rarity */}
        <div className="space-y-8">
          {filteredItems.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
              <p className="text-4xl mb-4">🔍</p>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Aucun item ne correspond à tes filtres
              </p>
            </div>
          )}
          {["S+", "S", "A", "B", "C", "D", "E"].map(rarity => {
            const itemsInRarity = groupedByRarity[rarity];
            if (itemsInRarity.length === 0) return null;

            const colorClass = RARITY_COLORS[rarity as keyof typeof RARITY_COLORS] || "bg-gray-600 text-white";

            return (
              <div key={rarity} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                <h3 className="text-3xl font-bold mb-4 flex items-center gap-2">
                  <span className={colorClass + " px-3 py-1 rounded-full text-xl"}>{rarity}</span>
                  <span className="text-gray-500">({itemsInRarity.length} types)</span>
                </h3>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {itemsInRarity.map(item => {
                    // Get definition based on item type
                    let itemDef = null;
                    
                    if (item.type === "plant") {
                      itemDef = PLANT_DEFINITIONS[item.plantId || ""];
                    } else if (item.type === "insectEssence" || item.type === "plantEssence") {
                      itemDef = ESSENCE_DEFINITIONS[`essence_${item.type === "insectEssence" ? "insect" : "plant"}_${item.rank}`];
                    } else if (item.type === "breedingBuffer") {
                      itemDef = BUFFER_DEFINITIONS[`buffer_${item.rank}`];
                    }
                    
                    if (!itemDef) {
                      return (
                        <div 
                          key={item.id}
                          className="bg-gray-100 border-4 border-red-300 rounded-xl p-4"
                        >
                          <p className="text-red-600 font-bold">⚠️ Item non trouvé: {item.type} {item.rank}</p>
                          <p className="text-xs text-gray-600">Qty: {item.count}</p>
                        </div>
                      );
                    }
                    
                    const displayName = itemDef.name;
                    const displayDesc = itemDef.description;
                    const displayIcon = itemDef.icon;
                    const isMedical = item.type === "plant" && isMedicalPlant(item);

                    return (
                      <div
                        key={item.id}
                        className={`border-4 rounded-xl p-4 ${getRankBorderColor(item.rank)}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-3xl">{displayIcon}</span>
                            <div>
                              <h4 className="font-bold text-lg">{displayName}</h4>
                              <p className="text-xs text-gray-600 dark:text-gray-400">{displayDesc}</p>
                              {isMedical && (
                                <span className="inline-block mt-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-bold rounded-full">
                                  🌿 Médical
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-2xl font-bold">{item.count}×</span>
                          
                          <button
                            className="text-red-600 hover:text-red-800 text-sm"
                            onClick={() => handleDelete(item.id)}
                          >
                            🗑️ Supprimer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {inventory.items.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-4">📦</p>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Ton inventaire est vide
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Envoie des créatures en exploration pour récolter des plantes!
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
