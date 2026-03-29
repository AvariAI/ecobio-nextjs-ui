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

// Rank order for sorting: E on left, S+ on right
const RANK_ORDER: Rank[] = ["E", "D", "C", "B", "A", "S", "S+"];

export default function CraftPage() {
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeType>("plantEssence");
  const [mainInventory, setMainInventory] = useState<Inventory>({ items: [], totalLootObtained: 0 });
  const [isCrafting, setIsCrafting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

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
        plantName: g.name,
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
        // Check if we can craft upgrade (either count >= 2 overall OR any item has count >= 2)
        const itemsWithThisTypeAndRank = mainInventory.items.filter(
          i => i.type === g.type && i.rank === g.rank
        );
        const anyItemHasCount2 = itemsWithThisTypeAndRank.some(i => i.count >= 2);
        const canCraft = (g.count >= 2 || anyItemHasCount2) && nextRank !== null;

        return {
          id: `upgrade-${g.type}-${g.rank}`,
          icon: g.type === "insectEssence" ? "🐛" :
               g.type === "plantEssence" ? "🌿" : "🧬",
          name: g.displayName,
          displayName: `${g.displayName} → ${nextRank || "?"}`,
          rank: g.rank,
          nextRank: nextRank,
          count: g.count,
          canCraft: canCraft,
          craftType: "upgrade" as const,
          itemType: g.type
        };
      });
    }
    return [];
  }, [selectedRecipe, mainInventory]);

  // Sort craftable items by rank (E on left, S+ on right)
  const craftableItems = [...getCraftableItems()].sort((a, b) => {
    const rankA = RANK_ORDER.indexOf(a.rank);
    const rankB = RANK_ORDER.indexOf(b.rank);
    return rankA - rankB;
  });

  // Handle item selection (only selects, doesn't craft)
  const handleSelectItem = (item: any) => {
    console.log("=== ITEM SELECTED ===");
    console.log("Item:", item);
    console.log("Item canCraft:", item.canCraft);
    console.log("Item craftType:", item.craftType);

    if (!item.canCraft) {
      console.log("Selection blocked: item cannot be crafted");
      return;
    }

    setSelectedItem(item);
    console.log("Item selected for crafting:", item.name);
  };

  // Handle actual crafting (triggered by CRAFTER button)
  const handleCraftActual = async () => {
    if (!selectedItem || !selectedItem.canCraft || isCrafting) {
      console.log("Craft blocked: selectedItem =", selectedItem, ", isCrafting =", isCrafting);
      return;
    }

    console.log("=== CRAFTING ITEM NOW ===");
    console.log("SelectedItem:", selectedItem);

    setIsCrafting(true);
    setMessage(null);

    try {
      // Reload fresh inventory to ensure we have latest state
      const freshInventory = loadInventory();
      console.log("Fresh inventory loaded:", freshInventory);

      if (selectedItem.craftType === "plantEssence") {
        console.log("--- Processing Plant Essence Recipe ---");
        console.log("Searching for plants...");
        console.log("All plants in inventory:");
        freshInventory.items.filter(i => i.type === "plant").forEach(p => {
          console.log(`  - ${p.plantName} (${p.rank}), count: ${p.count}, id: ${p.id}`);
        });

        // Find 2 plants of this type and rank, consume them
        // Use plantName (not displayName) for matching
        const searchName = selectedItem.plantName || selectedItem.name;
        console.log("Searching for plant with name:", searchName);

        const plants = freshInventory.items
          .filter(i => i.type === "plant" && i.rank === selectedItem.rank)
          .filter(i => {
            const plantName = i.plantName || i.name;
            const searchName = selectedItem.plantName || selectedItem.name;
            const matches = plantName && plantName.toLowerCase() === searchName.toLowerCase();
            console.log(`Checking plant: ${plantName || i.name} (${i.rank}) vs search: ${searchName} (${selectedItem.rank}) → matches: ${matches}`);
            return matches;
          })
          .slice(0, 2);

        console.log(`Filtered plants for "${selectedItem.plantName || selectedItem.name}" (rank ${selectedItem.rank}):`, plants);
        console.log("Plants found:", plants.length);
        if (plants.length >= 1) {
          console.log("Plant count check:", plants[0].count, "(needs 2)");
        }

        // For plant essence, we only need 1 plant item with count >= 2
        if (plants.length >= 1 && plants[0] && plants[0].count >= 2) {
          const plantId = plants[0].id;
          console.log("Using plant ID (twice):", plantId, "with count:", plants[0].count);
          const { resultRank } = craftPlantEssence(plantId, plantId, plants[0].rank, plants[0].rank);
          console.log("Craft result rank:", resultRank);

          addCraftedItemToInventory("plantEssence", resultRank, 1);
          console.log("Added plant essence to inventory");

          // Remove 2 from the SAME plantID (not 2 different plants)
          removeFromInventory(plantId, 2);
          console.log("Removed 2 from plant:", plantId);

          setMessage({
            type: "success",
            text: `Essence de ${selectedItem.name} (${resultRank}) créée!`
          });
        } else {
          console.log("ERROR: Not enough plants found for plant essence recipe");
        }
      } else if (selectedItem.craftType === "breedingBuffer") {
        console.log("--- Processing Breeding Buffer Recipe ---");
        // Find 1 insect essence and 1 plant essence of this rank
        const insectEssence = freshInventory.items.find(
          i => i.type === "insectEssence" && i.rank === selectedItem.rank
        );
        const plantEssence = freshInventory.items.find(
          i => i.type === "plantEssence" && i.rank === selectedItem.rank
        );

        console.log("Found insect essence:", insectEssence);
        console.log("Found plant essence:", plantEssence);

        if (insectEssence && plantEssence) {
          const { resultRank } = craftBreedingBuffer(insectEssence.rank, plantEssence.rank);
          console.log("Craft result rank:", resultRank);

          addCraftedItemToInventory("breedingBuffer", resultRank, 1);
          console.log("Added breeding buffer to inventory");

          removeFromInventory(insectEssence.id, 1);
          console.log("Removed insect essence:", insectEssence.id);
          removeFromInventory(plantEssence.id, 1);
          console.log("Removed plant essence:", plantEssence.id);

          setMessage({
            type: "success",
            text: `Buffer Breeding (${resultRank}) créé!`
          });
        } else {
          console.log("ERROR: Missing essences for breeding buffer recipe");
          console.log("  insectEssence:", insectEssence ? "found" : "NOT found");
          console.log("  plantEssence:", plantEssence ? "found" : "NOT found");
        }
      } else if (selectedItem.craftType === "upgrade") {
        console.log("--- Processing Upgrade Recipe ---");
        // Find all items of this type and rank
        const items = freshInventory.items.filter(
          i => i.type === selectedItem.itemType && i.rank === selectedItem.rank
        );

        console.log("Found upgrade items:", items);
        console.log("Items count:", items.length);

        if (selectedItem.nextRank) {
          // Check if we have enough (either 1 item with count >= 2, or 2 items with count >= 1)
          let enoughItems = false;
          let item1Id: string | null = null;
          let item2Id: string | null = null;
          let count1 = 1;
          let count2 = 1;

          // Case 1: Single item with count >= 2 (grouped items)
          const singleItem = items.find(i => i.count >= 2);
          if (singleItem) {
            enoughItems = true;
            item1Id = singleItem.id;
            item2Id = singleItem.id;  // Same item, use count 2 from it
            count1 = 2;
            count2 = 0;
            console.log("Using single item with count >= 2:", singleItem.id, "count:", singleItem.count);
          }

          // Case 2: Two different items (each with count >= 1)
          const twoItems = items.filter(i => i.count >= 1).slice(0, 2);
          if (!enoughItems && twoItems.length >= 2) {
            enoughItems = true;
            item1Id = twoItems[0].id;
            item2Id = twoItems[1].id;
            console.log("Using two different items:", twoItems[0].id, "and", twoItems[1].id);
          }

          console.log("Enough items for upgrade:", enoughItems);
          console.log("Next rank:", selectedItem.nextRank);

          if (enoughItems && item1Id) {
            const itemType = selectedItem.itemType as "insectEssence" | "plantEssence" | "breedingBuffer";
            const { resultRank } = craftUpgrade(itemType, selectedItem.rank);
            console.log("Craft result rank:", resultRank);

            if (resultRank) {
              addCraftedItemToInventory(itemType, resultRank, 1);
              console.log("Added upgraded item to inventory");

              // Remove items based on case
              removeFromInventory(item1Id, count1);
              console.log(`Removed ${count1} from item:`, item1Id);
              if (item2Id && count2 > 0) {
                removeFromInventory(item2Id, count2);
                console.log(`Removed ${count2} from item:`, item2Id);
              }

              setMessage({
                type: "success",
                text: `${selectedItem.name} amélioré en rang ${resultRank}!`
              });
            }
          } else {
            console.log("ERROR: Not enough items for upgrade recipe");
            console.log("  items length:", items.length);
            console.log("  single item with count >= 2:", !!singleItem);
            console.log("  two items available:", twoItems.length >= 2);
          }
        } else {
          console.log("ERROR: No next rank for upgrade recipe");
          console.log("  current rank:", selectedItem.rank);
        }
      }

      // Reload inventory state immediately after successful craft
      loadInventoryData();
      console.log("Inventory reloaded after craft");

      // Clear selection after successful craft
      setSelectedItem(null);

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error during craft:", error);
      setMessage({
        type: "error",
        text: "Erreur lors du craft"
      });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsCrafting(false);
      console.log("=== CRAFT COMPLETED ===");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="text-amber-700 dark:text-amber-300 mb-6 inline-block">← Retour</Link>
        <header className="text-center mb-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-4">
            🧪 Atelier de Craft
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Sélectionnez un item, puis cliquez sur 🧪 CRAFTER
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
              {craftableItems.map((item) => {
                const isSelected = selectedItem && selectedItem.id === item.id;

                return (
                  <button
                    key={item.id}
                    disabled={!item.canCraft || isCrafting}
                    onClick={() => handleSelectItem(item)}
                    className={`
                      p-4 rounded-xl border-2 transition-all text-left
                      ${isSelected
                        ? "border-amber-500 bg-amber-100 dark:bg-amber-900/30 ring-2 ring-amber-500 ring-offset-2"
                        : item.canCraft
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
                );
              })}
            </div>
          )}
        </div>

        {/* CRAFTER Button */}
        {selectedItem !== null && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Item sélectionné: <span className="font-bold text-amber-800 dark:text-amber-200">{selectedItem.displayName}</span>
                </p>
                {selectedItem.craftType === "upgrade" && selectedItem.nextRank && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Amélioration: {selectedItem.rank} → {selectedItem.nextRank}
                  </p>
                )}
                {selectedItem.craftType === "breedingBuffer" && selectedItem.details && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    🐛 ×{selectedItem.details.insectEssence} + 🌿 ×{selectedItem.details.plantEssence}
                  </p>
                )}
              </div>

              <button
                disabled={!selectedItem.canCraft || isCrafting}
                onClick={handleCraftActual}
                className={`
                  text-4xl font-bold py-6 px-12 rounded-2xl transition-all shadow-lg
                  ${selectedItem.canCraft && !isCrafting
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white cursor-pointer transform hover:scale-105"
                    : "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                  }
                `}
              >
                🧪 CRAFTER
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
