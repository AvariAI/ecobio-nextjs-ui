"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  calculateAverageRank,
  craftPlantEssence,
  craftBreedingBuffer,
  addCraftedItemToInventory,
  RANK_COLORS,
  type RecipeType
} from "@/lib/craft";
import { loadInventory, removeFromInventory, type Inventory, type InventoryItem } from "@/lib/inventory";
import { Rank } from "@/lib/database";

export default function CraftPage() {
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeType>("plantEssence");
  const [ingredient1, setIngredient1] = useState<string>("");
  const [ingredient2, setIngredient2] = useState<string>("");
  const [preview, setPreview] = useState<{
    resultRank: string | null;
    canCraft: boolean;
  }>({ resultRank: null, canCraft: false });
  const [filteredCraftItems, setFilteredCraftItems] = useState<InventoryItem[]>([]);
  const [mainInventory, setMainInventory] = useState<Inventory>({ items: [], totalLootObtained: 0 });

  // Load data
  useEffect(() => {
    const loadedInventory = loadInventory();
    setMainInventory(loadedInventory);

    // Filter craft items based on selected recipe type
    updateFilteredCraftItems();
  }, [selectedRecipe]);

  // Listen for updates
  useEffect(() => {
    const handleUpdate = () => {
      const inventory = loadInventory();
      setMainInventory(inventory);

      // Update filtered items
      updateFilteredCraftItems();
    };

    window.addEventListener("inventory-updated", handleUpdate);
    return () => {
      window.removeEventListener("inventory-updated", handleUpdate);
    };
  }, [selectedRecipe]);

  // Update filtered craft items helper
  const updateFilteredCraftItems = () => {
    const inventory = loadInventory();

    if (selectedRecipe === "plantEssence") {
      // For plant essence craft, we need plants
      setFilteredCraftItems(inventory.items.filter(item => item.type === "plant"));
    } else if (selectedRecipe === "breedingBuffer") {
      // For breeding buffer craft, we need essences (both insect and plant)
      setFilteredCraftItems(inventory.items.filter(item =>
        item.type === "insectEssence" || item.type === "plantEssence"
      ));
    }
  };

  // Sync ingredient2 rank with ingredient1 for plant essence craft
  useEffect(() => {
    if (selectedRecipe === "plantEssence" && ingredient1) {
      const plant1 = mainInventory.items.find(p => p.id === ingredient1);
      if (plant1 && ingredient2) {
        const plant2 = mainInventory.items.find(p => p.id === ingredient2);
        if (plant2 && plant2.rank !== plant1.rank) {
          // Reset ingredient2 if ranks don't match
          setIngredient2("");
        }
      }
    }
  }, [selectedRecipe, ingredient1, ingredient2, mainInventory]);

  // Sync ingredient1 rank with ingredient2 for plant essence craft
  useEffect(() => {
    if (selectedRecipe === "plantEssence" && ingredient2) {
      const plant2 = mainInventory.items.find(p => p.id === ingredient2);
      if (plant2 && ingredient1) {
        const plant1 = mainInventory.items.find(p => p.id === ingredient1);
        if (plant1 && plant1.rank !== plant2.rank) {
          // Reset ingredient1 if ranks don't match
          setIngredient1("");
        }
      }
    }
  }, [selectedRecipe, ingredient1, ingredient2, mainInventory]);

  // Update preview
  useEffect(() => {
    if (!ingredient1 || !ingredient2) {
      setPreview({ resultRank: null, canCraft: false });
      return;
    }

    if (selectedRecipe === "plantEssence") {
      const plant1 = mainInventory.items.find(p => p.id === ingredient1);
      const plant2 = mainInventory.items.find(p => p.id === ingredient2);

      if (plant1 && plant2) {
        const avgRank = calculateAverageRank(plant1.rank, plant2.rank);
        setPreview({
          resultRank: avgRank,
          canCraft: plant1.id !== plant2.id
        });
      } else {
        setPreview({ resultRank: null, canCraft: false });
      }
    } else if (selectedRecipe === "breedingBuffer") {
      const essence1 = mainInventory.items.find(i => i.id === ingredient1 && i.type === "insectEssence");
      const essence2 = mainInventory.items.find(i => i.id === ingredient2 && i.type === "plantEssence");

      if (essence1 && essence2) {
        const avgRank = calculateAverageRank(essence1.rank, essence2.rank);
        setPreview({
          resultRank: avgRank,
          canCraft: essence1.id !== essence2.id && essence1.count > 0 && essence2.count > 0
        });
      } else {
        setPreview({ resultRank: null, canCraft: false });
      }
    }
  }, [selectedRecipe, ingredient1, ingredient2, mainInventory]);

  // Handle craft
  const handleCraft = () => {
    if (!preview.canCraft || !preview.resultRank) return;

    if (selectedRecipe === "plantEssence") {
      const plant1 = mainInventory.items.find(p => p.id === ingredient1);
      const plant2 = mainInventory.items.find(p => p.id === ingredient2);

      if (plant1 && plant2 && plant1.count > 0 && plant2.count > 0) {
        const { resultRank } = craftPlantEssence(plant1.id, plant2.id, plant1.rank, plant2.rank);

        // Add crafted essence to main inventory
        addCraftedItemToInventory("plantEssence", resultRank, 1);

        // Remove plants from inventory (consume ingredients)
        removeFromInventory(plant1.id, 1);
        removeFromInventory(plant2.id, 1);

        // Reset form
        setIngredient1("");
        setIngredient2("");
        setPreview({ resultRank: null, canCraft: false });
      }
    } else if (selectedRecipe === "breedingBuffer") {
      const essence1 = mainInventory.items.find(i => i.id === ingredient1 && i.type === "insectEssence");
      const essence2 = mainInventory.items.find(i => i.id === ingredient2 && i.type === "plantEssence");

      if (essence1 && essence2 && essence1.count > 0 && essence2.count > 0) {
        const { resultRank } = craftBreedingBuffer(essence1.rank, essence2.rank);

        // Add crafted buffer to main inventory
        addCraftedItemToInventory("breedingBuffer", resultRank, 1);

        // Remove essences from inventory (consume)
        removeFromInventory(essence1.id, 1);
        removeFromInventory(essence2.id, 1);

        // Reset form
        setIngredient1("");
        setIngredient2("");
        setPreview({ resultRank: null, canCraft: false });
      }
    }
  };

  // Get available ingredients for selected recipe
  const getAvailableIngredients = () => {
    if (selectedRecipe === "plantEssence") {
      return mainInventory.items.filter(p => p.type === "plant" && p.count > 0);
    } else if (selectedRecipe === "breedingBuffer") {
      return mainInventory.items.filter(i =>
        (i.type === "insectEssence" || i.type === "plantEssence") && i.count > 0
      );
    }
    return [];
  };

  const getIngredientName = (id: string) => {
    const item = mainInventory.items.find(item => item.id === id);
    if (!item) return "";

    if (item.type === "plant") {
      return `${item.plantName} (${item.rank}) ${item.count}×`;
    } else if (item.type === "insectEssence") {
      return `Essence Insecte (${item.rank}) ${item.count}×`;
    } else if (item.type === "plantEssence") {
      return `Essence Plante (${item.rank}) ${item.count}×`;
    }
    return "";
  };

  const getPlaceholderForSlot = (slot: number) => {
    if (selectedRecipe === "plantEssence") {
      return slot === 1 ? "Sélectionner plante 1..." : "Sélectionner plante 2...";
    } else if (selectedRecipe === "breedingBuffer") {
      return slot === 1 ? "Essence Insecte..." : "Essence Plante...";
    }
    return "Sélectionner...";
  };

  const filterIngredientsForSlot = (items: InventoryItem[], slot: number) => {
    if (selectedRecipe === "plantEssence") {
      // For plant essence, filter out the other plant selection AND enforce same rank
      const otherSlotId = slot === 1 ? ingredient2 : ingredient1;
      let filtered = items.filter(item => item.id !== otherSlotId);

      // If the other slot has an ingredient, only show items with the same rank
      if (otherSlotId) {
        const otherItem = mainInventory.items.find(i => i.id === otherSlotId);
        if (otherItem) {
          filtered = filtered.filter(item => item.rank === otherItem.rank);
        }
      }

      return filtered;
    } else if (selectedRecipe === "breedingBuffer") {
      // For breeding buffer:
      // Slot 1: only insectEssence
      // Slot 2: only plantEssence
      if (slot === 1) {
        return items.filter(item => item.type === "insectEssence");
      } else {
        return items.filter(item => item.type === "plantEssence");
      }
    }
    return items;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-4">
            🧪 Atelier de Craft
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Crée des ressources et des boosters pour breeding
          </p>
        </header>

        {/* Recipe Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-amber-800 dark:text-amber-200 mb-4">
            Sélectionner Recette
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              { id: "plantEssence", label: "Essence de Plante", icon: "🌿", desc: "Plante + Plante → Essence" },
              { id: "breedingBuffer", label: "Buffer Breeding", icon: "🧬", desc: "Essence Insecte + Essence Plante → Buffer" }
            ].map(recipe => (
              <button
                key={recipe.id}
                className={`p-4 rounded-xl border-4 transition-all ${selectedRecipe === recipe.id
                  ? "bg-amber-600 text-white border-amber-700"
                  : "bg-white dark:bg-gray-700 border-amber-600 hover:bg-amber-100 dark:hover:bg-gray-600"
                }`}
                onClick={() => {
                  setSelectedRecipe(recipe.id as RecipeType);
                  setIngredient1("");
                  setIngredient2("");
                  setPreview({ resultRank: null, canCraft: false });
                }}
              >
                <div className="text-4xl mb-2">{recipe.icon}</div>
                <h3 className="text-xl font-bold mb-1">{recipe.label}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{recipe.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Ingredients Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-amber-800 dark:text-amber-200 mb-4">
            Ingrédients
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                {selectedRecipe === "plantEssence" ? "Plante 1" :
                 selectedRecipe === "breedingBuffer" ? "Essence Insecte" :
                 "Ingrédient 1"}
              </label>
              <select
                value={ingredient1}
                onChange={(e) => setIngredient1(e.target.value)}
                className="w-full p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              >
                <option value="">{getPlaceholderForSlot(1)}</option>
                {filterIngredientsForSlot(getAvailableIngredients(), 1).map(item => (
                  <option key={item.id} value={item.id}>
                    {getIngredientName(item.id) || `Item ${item.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                {selectedRecipe === "plantEssence" ? "Plante 2" :
                 selectedRecipe === "breedingBuffer" ? "Essence Plante" :
                 "Ingrédient 2"}
              </label>
              <select
                value={ingredient2}
                onChange={(e) => setIngredient2(e.target.value)}
                className="w-full p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              >
                <option value="">{getPlaceholderForSlot(2)}</option>
                {filterIngredientsForSlot(getAvailableIngredients(), 2).map(item => (
                  <option key={item.id} value={item.id}>
                    {getIngredientName(item.id) || `Item ${item.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-xl">
            <h3 className="font-bold mb-2">Prévision</h3>
            {preview.resultRank ? (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Résultat:</span>
                <span className={`px-3 py-1 rounded-full ${RANK_COLORS[preview.resultRank as Rank]}`}>
                  {preview.resultRank}
                </span>
                <span className="text-sm text-gray-500">
                  {selectedRecipe === "plantEssence" ? "Essence Plante" : "Buffer Breeding"}
                </span>
              </div>
            ) : (
              <p className="text-gray-500">Sélectionnez deux ingrédients pour voir la prévision</p>
            )}
          </div>

          {/* Craft Button */}
          <button
            className={`w-full mt-4 py-4 text-xl font-bold rounded-xl transition-all ${
              !preview.canCraft
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-amber-600 hover:bg-amber-700 text-white"
            }`}
            disabled={!preview.canCraft}
            onClick={handleCraft}
          >
            🧪 CRAFT
          </button>
        </div>

        {/* Craft Inventory (filtered from main inventory) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-amber-800 dark:text-amber-200 mb-4">
            Inventaire Craft
          </h2>

          {filteredCraftItems.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {selectedRecipe === "plantEssence"
                ? "Ton inventaire plante est vide. Explore pour obtenir des plantes!"
                : "Ton inventaire essence est vide. Craft des essences d'abord!"}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredCraftItems.map(item => (
                <div
                  key={item.id}
                  className={`flex justify-between items-center p-3 rounded-xl ${RANK_COLORS[item.rank]}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {item.type === "insectEssence" ? "🐛" : item.type === "plantEssence" ? "🌿" : item.type === "plant" ? "🌱" : "🧬"}
                    </span>
                    <div>
                      <h4 className="font-bold">{item.name}</h4>
                      <p className="text-sm opacity-80">{item.rank}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{item.count}×</span>
                    <button
                      className="text-red-600 hover:text-red-800 text-sm"
                      onClick={() => {
                        removeFromInventory(item.id, item.count);
                        window.dispatchEvent(new CustomEvent("inventory-updated"));
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
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
