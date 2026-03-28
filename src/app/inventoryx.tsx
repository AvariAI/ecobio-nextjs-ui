"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { loadInventory, removeFromInventory, PLANT_DEFINITIONS, RARITY_COLORS, Inventory } from "@/lib/inventory";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<Inventory>({ items: [], totalLootObtained: 0 });
  const [sortBy, setSortBy] = useState<"rarity" | "count" | "name">("rarity");

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

  // Sort items
  const sortedItems = [...inventory.items].sort((a, b) => {
    if (sortBy === "rarity") {
      const rarityOrder = ["E", "D", "C", "B", "A", "S", "S+"];
      return rarityOrder.indexOf(a.rank) - rarityOrder.indexOf(b.rank);
    } else if (sortBy === "count") {
      return b.count - a.count;
    } else {
      return a.plantName.localeCompare(b.plantName);
    }
  });

  // Group by rarity
  const groupedByRarity: Record<string, typeof inventory.items> = {
    "E": [],
    "D": [],
    "C": [],
    "B": [],
    "A": [],
    "S": [],
    "S+": []
  };
  
  sortedItems.forEach(item => {
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
        <header className="text-center mb-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent mb-4">
            📦 Inventaire
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Gère tes ressources de looting d'exploration
          </p>
        </header>

        {/* Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-4xl font-bold text-emerald-600">{inventory.totalLootObtained}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Loot Obtenu</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-cyan-600">{inventory.items.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Types de Plantes</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-purple-600">{sortedItems.reduce((sum, item) => sum + item.count, 0)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Plantes Possédées</p>
            </div>
          </div>
        </div>

        {/* Sort controls */}
        <div className="mb-4 flex gap-4 flex-wrap">
          <button
            className={`px-4 py-2 rounded-lg ${sortBy === "rarity" ? "bg-emerald-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
            onClick={() => setSortBy("rarity")}
          >
            Trier par Rareté
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${sortBy === "count" ? "bg-emerald-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
            onClick={() => setSortBy("count")}
          >
            Trier par Quantité
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${sortBy === "name" ? "bg-emerald-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
            onClick={() => setSortBy("name")}
          >
            Trier par Nom
          </button>
        </div>

        {/* Items grouped by rarity */}
        <div className="space-y-8">
          {["E", "D", "C", "B", "A", "S", "S+"].map(rarity => {
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
                    const plantDef = PLANT_DEFINITIONS[item.plantId];
                    
                    if (!plantDef) {
                      return (
                        <div 
                          key={item.id}
                          className="bg-gray-100 border-4 border-red-300 rounded-xl p-4"
                        >
                          <p className="text-red-600 font-bold">⚠️ Plant ID manquant: {item.plantId}</p>
                          <p className="text-xs text-gray-600">Qty: {item.count}</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div
                        key={item.id}
                        className={`border-4 rounded-xl p-4 ${getRankBorderColor(item.rank)}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-3xl">{plantDef.icon}</span>
                            <div>
                              <h4 className="font-bold text-lg">{plantDef.name}</h4>
                              <p className="text-xs text-gray-600 dark:text-gray-400">{plantDef.description}</p>
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

        {/* Back button */}
        <div className="mt-8 text-center">
          <Link href="/">
            <button className="bg-gray-600 hover:bg-gray-700 text-white text-xl font-bold py-3 px-8 rounded-xl transition-all">
              ← Retour à l'Accueil
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}
