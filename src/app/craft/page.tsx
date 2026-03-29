"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  calculateAverageRank,
  craftPlantEssence,
  craftBreedingBuffer,
  craftUpgrade,
  addCraftedItemToInventory,
  RANK_COLORS,
  getNextRank,
  type RecipeType
} from "@/lib/craft";
import { loadInventory, removeFromInventory, type Inventory, type InventoryItem } from "@/lib/inventory";
import { Rank } from "@/lib/database";

export default function CraftPage() {
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeType>("plantEssence");
  const [mainInventory, setMainInventory] = useState<Inventory>({ items: [], totalLootObtained: 0 });
  const [isCrafting, setIsCrafting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  // Load data
  useEffect(() => {
    loadInventoryData();
  }, [selectedRecipe]);

  // Listen for updates
  useEffect(() => {
    const handleUpdate = () => {
      loadInventoryData();
    };

    window.addEventListener("inventory-updated", handleUpdate);
    return () => {
      window.removeEventListener("inventory-updated", handleUpdate);
    };
  }, [selectedRecipe]);

  const loadInventoryData = useCallback(() => {
    const loadedInventory = loadInventory();
    setMainInventory(loadedInventory);
  }, [selectedRecipe]);

  // Get craftable items based on recipe type
  const getCraftableItems = useCallback(() => {
    if (selectedRecipe === "plantEssence") {
      // Group plants by (name, rank) and count them
      const plantGroups = new Map<string, { name: string; rank: Rank; count: number }>();
      
      mainInventory.items.filter(i => i.type === "plant").forEach(plant => {
        const key = `${plant.plantName}-${plant.rank}`;
        const existing = plantGroups.get(key);
        if (existing) {
          existing.count += plant.count;
        } else {
          plantGroups.set(key, {
            name: plant.plantName!,
            rank: plant.rank,
            count: plant.count
          });
        }
      });

      return Array.from(plantGroups.values()).map(g => ({
        id: `plant-${g.name}-${g.rank}`,
        icon: "🌿",
        name: g.name,
        displayName: `Essence de ${g.name}`,
        rank: g.rank,
        count: g.count,
        canCraft: g.count >= 2,
        craftType: "plantEssence" as const
      }));
    } else if (selectedRecipe === "breedingBuffer") {
      // Check which ranks have both insect essence and plant essence available
      const rankGroups = new Map<Rank, { insectEssence: number; plantEssence: number }>();

      mainInventory.items.forEach(item => {
        if (item.type === "insectEssence" || item.type === "plantEssence") {
          const existing = rankGroups.get(item.rank);
          if (existing) {
            if (item.type === "insectEssence") {
              existing.insectEssence += item.count;
            } else {
              existing.plantEssence += item.count;
            }
          } else {
            rankGroups.set(item.rank, {
              insectEssence: item.type === "insectEssence" ? item.count : 0,
              plantEssence: item.type === "plantEssence" ? item.count : 0
            });
          }
        }
      });

      return Array.from(rankGroups.entries()).map(([rank, counts]) => ({
        id: `buffer-${rank}`,
        icon: "🧬",
        name: "Buffer Breeding",
        displayName: `Buffer Breeding`,
        rank: rank,
        count: Math.min(counts.insectEssence, counts.plantEssence),
        canCraft: counts.insectEssence >= 1 && counts.plantEssence >= 1,
        craftType: "breedingBuffer" as const,
        details: { insectEssence: counts.insectEssence, plantEssence: counts.plantEssence }
      }));
    } else if (selectedRecipe === "upgrade") {
      // Group upgradeable items by (type, rank)
      const upgradeGroups = new Map<string, { type: string; rank: Rank; count: number; displayName: string }>();

      mainInventory.items.filter(i =>
        ["insectEssence", "plantEssence", "breedingBuffer"].includes(i.type)
      ).forEach(item => {
        const key = `${item.type}-${item.rank}`;
        const displayName = item.type === "insectEssence" ? "Essence Insecte" :
                          item.type === "plantEssence" ? "Essence Plante" :
                          "Buffer Breeding";
        
        const existing = upgradeGroups.get(key);
        if (existing) {
          existing.count += item.count;
        } else {
          upgradeGroups.set(key, {
            type: item.type,
            rank: item.rank,
            count: item.count,
            displayName
          });
        }
      });

      return Array.from(upgradeGroups.values()).map(g => {
        const nextRank = getNextRank(g.rank);
        return {
          id: `upgrade-${g.type}-${g.rank}`,
          icon: g.type === "insectEssence" ? "🐛" :
               g.type === "plantEssence" ? "🌿" : "🧬",
          name: g.displayName,
          displayName: `${g.displayName} → ${nextRank || "?"}`,
          rank: g.rank,
          nextRank: nextRank,
          count: g.count,
          canCraft: g.count >= 2 && nextRank !== null,
          craftType: "upgrade" as const,
          itemType: g.type
        };
      });
    }
    return [];
  }, [selectedRecipe, mainInventory]);

  const craftableItems = getCraftableItems();

  // Handle craft click
  const handleCraftItem = async (item: any) => {
    if (!item.canCraft || isCrafting) return;

    setIsCrafting(true);
    setMessage(null);

    try {
      if (item.craftType === "plantEssence") {
        // Find 2 plants of this type and rank, consume them
        const plants = mainInventory.items.filter(
          i => i.type === "plant" && i.plantName === item.name && i.rank === item.rank
        ).slice(0, 2);

        if (plants.length >= 2) {
          const { resultRank } = craftPlantEssence(plants[0].id, plants[1].id, plants[0].rank, plants[1].rank);
          addCraftedItemToInventory("plantEssence", resultRank, 1);
          removeFromInventory(plants[0].id, 1);
          removeFromInventory(plants[1].id, 1);
          
          setMessage({
            type: "success",
            text: `Essence de ${item.name} (${resultRank}) créée!`
          });
        }
      } else if (item.craftType === "breedingBuffer") {
        // Find 1 insect essence and 1 plant essence of this rank
        const insectEssence = mainInventory.items.find(
          i => i.type === "insectEssence" && i.rank === item.rank
        );
        const plantEssence = mainInventory.items.find(
          i => i.type === "plantEssence" && i.rank === item.rank
        );

        if (insectEssence && plantEssence) {
          const { resultRank } = craftBreedingBuffer(insectEssence.rank, plantEssence.rank);
          addCraftedItemToInventory("breedingBuffer", resultRank, 1);
          removeFromInventory(insectEssence.id, 1);
          removeFromInventory(plantEssence.id, 1);
          
          setMessage({
            type: "success",
            text: `Buffer Breeding (${resultRank}) créé!`
          });
        }
      } else if (item.craftType === "upgrade") {
        // Find 2 items of this type and rank
        const items = mainInventory.items.filter(
          i => i.type === item.itemType && i.rank === item.rank
        ).slice(0, 2);

        if (items.length >= 2 && item.nextRank) {
          const itemType = item.itemType as "insectEssence" | "plantEssence" | "breedingBuffer";
          const { resultRank } = craftUpgrade(itemType, item.rank);
          
          if (resultRank) {
            addCraftedItemToInventory(itemType, resultRank, 1);
            removeFromInventory(items[0].id, 1);
            removeFromInventory(items[1].id, 1);
            
            setMessage({
              type: "success",
              text: `${item.name} amélioré en rang ${resultRank}!`
            });
          }
        }
      }

      // Trigger inventory update
      window.dispatchEvent(new CustomEvent("inventory-updated"));
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: "error",
        text: "Erreur lors du craft"
      });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsCrafting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-4">
            🧪 Atelier de Craft
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Cliquez sur un item pour craft instantanément
          </p>
        </header>

        {/* Message Toast */}
        {message && (
          <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 ${
            message.type === "success" 
              ? "bg-green-500 text-white" 
              : "bg-red-500 text-white"
          }`}>
            {message.text}
          </div>
        )}

        {/* Recipe Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-amber-800 dark:text-amber-200 mb-4">
            Sélectionner Recette
          </h2>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { id: "plantEssence", label: "Essence de Plante", icon: "🌿", desc: "2 plantes même rang → Essence" },
              { id: "breedingBuffer", label: "Buffer Breeding", icon: "🧬", desc: "Essence Insecte + Essence Plante → Buffer" },
              { id: "upgrade", label: "Amélioration", icon: "⬆️", desc: "2 items identiques → Rang supérieur" }
            ].map(recipe => (
              <button
                key={recipe.id}
                className={`p-4 rounded-xl border-4 transition-all ${
                  selectedRecipe === recipe.id
                    ? "bg-amber-600 text-white border-amber-700"
                    : "bg-white dark:bg-gray-700 border-amber-600 hover:bg-amber-100 dark:hover:bg-gray-600"
                }`}
                onClick={() => setSelectedRecipe(recipe.id as RecipeType)}
              >
                <div className="text-4xl mb-2">{recipe.icon}</div>
                <h3 className="text-xl font-bold mb-1">{recipe.label}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{recipe.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Craftable Items Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-amber-800 dark:text-amber-200 mb-4">
            Items disponibles
          </h2>

          {craftableItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p className="text-xl">Aucun item disponible pour cette recette</p>
              <p className="text-sm mt-2">Allez collecter des ressources! 🌱</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {craftableItems.map((item) => (
                <button
                  key={item.id}
                  disabled={!item.canCraft || isCrafting}
                  onClick={() => handleCraftItem(item)}
                  className={`
                    p-4 rounded-xl border-2 transition-all text-left
                    ${item.canCraft
                      ? "border-amber-300 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer"
                      : "border-gray-300 dark:border-gray-600 opacity-50 cursor-not-allowed"
                    }
                  `}
                >
                  {/* Icon */}
                  <div className="text-4xl mb-2">{item.icon}</div>
                  
                  {/* Name */}
                  <h3 className="font-bold text-lg mb-1 text-gray-800 dark:text-gray-200">
                    {item.displayName}
                  </h3>
                  
                  {/* Rank Badge */}
                  <div className="mb-2">
                    <span className={`px-2 py-1 rounded-full text-sm font-semibold ${RANK_COLORS[item.rank as Rank]}`}>
                      {item.rank}
                    </span>
                    {item.craftType === "upgrade" && item.nextRank && (
                      <span className="ml-2 text-gray-500">→ {item.nextRank}</span>
                    )}
                  </div>
                  
                  {/* Count */}
                  <div className="text-sm">
                    {item.canCraft ? (
                      <span className={`font-semibold ${item.count >= 2 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                        Disponible ×{item.count}
                      </span>
                    ) : (
                      <span className="text-red-500 dark:text-red-400 font-semibold">
                        Besoin de 2 (×{item.count})
                      </span>
                    )}
                  </div>

                  {/* Extra details for breeding buffer */}
                  {item.craftType === "breedingBuffer" && item.details && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <div>🐛 Essence Insecte: ×{item.details.insectEssence}</div>
                      <div>🌿 Essence Plante: ×{item.details.plantEssence}</div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

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
