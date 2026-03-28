"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  calculateAverageRank,
  craftInsectEssence,
  craftPlantEssence,
  craftBreedingBuffer,
  loadCraftInventory,
  addToCraftInventory,
  saveCraftInventory,
  RANK_COLORS,
  type CraftItem,
  type RecipeType,
  type CraftInventory
} from "@/lib/craft";
import { loadInventory, type Inventory } from "@/lib/inventory";
import { Rank } from "@/lib/database";

interface HuntedCreature {
  id: string;
  name: string;
  rank: Rank;
  isOnMission: boolean;
}

export default function CraftPage() {
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeType>("insectEssence");
  const [ingredient1, setIngredient1] = useState<string>("");
  const [ingredient2, setIngredient2] = useState<string>("");
  const [preview, setPreview] = useState<{
    resultRank: string | null;
    canCraft: boolean;
  }>({ resultRank: null, canCraft: false });
  const [craftInventory, setCraftInventory] = useState<CraftInventory>({ items: [] });
  const [collection, setCollection] = useState<HuntedCreature[]>([]);
  const [plantInventory, setPlantInventory] = useState<Inventory>({ items: [], totalLootObtained: 0 });

  // Load data
  useEffect(() => {
    const loadedCraft = loadCraftInventory();
    setCraftInventory(loadedCraft);

    const savedCollection = localStorage.getItem("ecobio-collection");
    if (savedCollection) {
      try {
        setCollection(JSON.parse(savedCollection));
      } catch (e) {}
    }

    const loadedPlants = loadInventory();
    setPlantInventory(loadedPlants);
  }, []);

  // Listen for updates
  useEffect(() => {
    const handleUpdate = () => {
      const updatedCraft = loadCraftInventory();
      setCraftInventory(updatedCraft);

      // Reload other inventories
      const savedCollection = localStorage.getItem("ecobio-collection");
      if (savedCollection) {
        try {
          setCollection(JSON.parse(savedCollection));
        } catch (e) {}
      }

      const loadedPlants = loadInventory();
      setPlantInventory(loadedPlants);
    };

    window.addEventListener("craft-inventory-updated", handleUpdate);
    window.addEventListener("inventory-updated", handleUpdate);
    window.addEventListener("collection-updated", handleUpdate);
    return () => {
      window.removeEventListener("craft-inventory-updated", handleUpdate);
      window.removeEventListener("inventory-updated", handleUpdate);
      window.removeEventListener("collection-updated", handleUpdate);
    };
  }, []);

  // Update preview
  useEffect(() => {
    if (!ingredient1 || !ingredient2) {
      setPreview({ resultRank: null, canCraft: false });
      return;
    }

    if (selectedRecipe === "insectEssence") {
      const creature1 = collection.find(c => c.id === ingredient1);
      const creature2 = collection.find(c => c.id === ingredient2);

      if (creature1 && creature2) {
        const avgRank = calculateAverageRank(creature1.rank, creature2.rank);
        setPreview({
          resultRank: avgRank,
          canCraft: creature1.id !== creature2.id
        });
      } else {
        setPreview({ resultRank: null, canCraft: false });
      }
    } else if (selectedRecipe === "plantEssence") {
      const plant1 = plantInventory.items.find(p => p.id === ingredient1);
      const plant2 = plantInventory.items.find(p => p.id === ingredient2);

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
      const essence1 = craftInventory.items.find(i => i.id === ingredient1 && i.type === "insectEssence");
      const essence2 = craftInventory.items.find(i => i.id === ingredient2 && i.type === "plantEssence");

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
  }, [selectedRecipe, ingredient1, ingredient2, collection, plantInventory, craftInventory]);

  // Handle craft
  const handleCraft = () => {
    if (!preview.canCraft || !preview.resultRank) return;

    if (selectedRecipe === "insectEssence") {
      const creature1 = collection.find(c => c.id === ingredient1);
      const creature2 = collection.find(c => c.id === ingredient2);

      if (creature1 && creature2) {
        const { resultItem } = craftInsectEssence(creature1.id, creature2.id, creature1.rank, creature2.rank);

        if (resultItem) {
          addToCraftInventory(resultItem);

          // Remove creatures from collection (consume ingredients)
          const updatedCollection = collection.filter(c => c.id !== creature1.id && c.id !== creature2.id);
          localStorage.setItem("ecobio-collection", JSON.stringify(updatedCollection));
          setCollection(updatedCollection);
          window.dispatchEvent(new CustomEvent("collection-updated"));

          // Reset form
          setIngredient1("");
          setIngredient2("");
          setPreview({ resultRank: null, canCraft: false });
        }
      }
    } else if (selectedRecipe === "plantEssence") {
      const plant1 = plantInventory.items.find(p => p.id === ingredient1);
      const plant2 = plantInventory.items.find(p => p.id === ingredient2);

      if (plant1 && plant2 && plant1.count > 0 && plant2.count > 0) {
        const { resultItem } = craftPlantEssence(plant1.id, plant2.id, plant1.rank, plant2.rank);

        if (resultItem) {
          addToCraftInventory(resultItem);

          // Remove plants from inventory (consume ingredients)
          plant1.count--;
          plant2.count--;

          if (plant1.count <= 0) {
            plantInventory.items = plantInventory.items.filter(i => i.id !== plant1.id);
          }

          if (plant2.count <= 0) {
            plantInventory.items = plantInventory.items.filter(i => i.id !== plant2.id);
          }

          localStorage.setItem("ecobio-inventory", JSON.stringify(plantInventory));
          setPlantInventory({ ...plantInventory });
          window.dispatchEvent(new CustomEvent("inventory-updated"));

          // Reset form
          setIngredient1("");
          setIngredient2("");
          setPreview({ resultRank: null, canCraft: false });
        }
      }
    } else if (selectedRecipe === "breedingBuffer") {
      const essence1 = craftInventory.items.find(i => i.id === ingredient1 && i.type === "insectEssence");
      const essence2 = craftInventory.items.find(i => i.id === ingredient2 && i.type === "plantEssence");

      if (essence1 && essence2 && essence1.count > 0 && essence2.count > 0) {
        const { resultItem } = craftBreedingBuffer(essence1.rank, essence2.rank);

        if (resultItem) {
          addToCraftInventory(resultItem);

          // Remove essences (consume)
          essence1.count--;
          essence2.count--;

          const updatedCraftInventory = { ...craftInventory };
          if (essence1.count <= 0) {
            updatedCraftInventory.items = updatedCraftInventory.items.filter(i => i.id !== essence1.id);
          }

          if (essence2.count <= 0) {
            updatedCraftInventory.items = updatedCraftInventory.items.filter(i => i.id !== essence2.id);
          }

          saveCraftInventory(updatedCraftInventory);
          setCraftInventory(loadCraftInventory());

          // Reset form
          setIngredient1("");
          setIngredient2("");
          setPreview({ resultRank: null, canCraft: false });
        }
      }
    }
  };

  // Get available ingredients for selected recipe
  const getAvailableIngredients = () => {
    if (selectedRecipe === "insectEssence") {
      return collection.filter(c => !c.isOnMission); // Excluding mission creatures
    } else if (selectedRecipe === "plantEssence") {
      return plantInventory.items.filter(p => p.count > 0);
    } else if (selectedRecipe === "breedingBuffer") {
      return craftInventory.items.filter(i => i.count > 0);
    }
    return [];
  };

  const getIngredientName = (id: string) => {
    if (selectedRecipe === "insectEssence") {
      const c = collection.find(creature => creature.id === id);
      return c ? `${c.name} (${c.rank})` : "";
    } else if (selectedRecipe === "plantEssence") {
      const p = plantInventory.items.find(item => item.id === id);
      return p ? `${p.plantName} (${p.rank}) ${p.count}×` : "";
    } else if (selectedRecipe === "breedingBuffer") {
      const e = craftInventory.items.find(item => item.id === id);
      const typeName = e?.type === "insectEssence" ? "Essence Insecte" : e?.type === "plantEssence" ? "Essence Plante" : "";
      return e ? `${typeName} (${e.rank}) ${e.count}×` : "";
    }
    return "";
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

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { id: "insectEssence", label: "Essence d'Insecte", icon: "🐛", desc: "Insecte + Insecte" },
              { id: "plantEssence", label: "Essence de Plante", icon: "🌿", desc: "Plante + Plante" },
              { id: "breedingBuffer", label: "Buffer Breeding", icon: "🧬", desc: "Essences combinées" }
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
              <label className="block text-sm font-semibold mb-2">Ingrédient 1</label>
              <select
                value={ingredient1}
                onChange={(e) => setIngredient1(e.target.value)}
                className="w-full p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              >
                <option value="">Sélectionner...</option>
                {getAvailableIngredients().map(item => (
                  <option key={item.id} value={item.id}>
                    {getIngredientName(item.id) || `Item ${item.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Ingrédient 2</label>
              <select
                value={ingredient2}
                onChange={(e) => setIngredient2(e.target.value)}
                className="w-full p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              >
                <option value="">Sélectionner...</option>
                {getAvailableIngredients().filter(item => item.id !== ingredient1).map(item => (
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
                <span className="text-sm text-gray-500">Essence {selectedRecipe === "insectEssence" ? "Insecte" : selectedRecipe === "plantEssence" ? "Plante" : "Buffer"}</span>
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

        {/* Craft Inventory */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-amber-800 dark:text-amber-200 mb-4">
            Inventaire Craft
          </h2>

          {craftInventory.items.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Ton inventaire craft est vide. Craft des essences et buffers!
            </p>
          ) : (
            <div className="space-y-4">
              {craftInventory.items.map(item => (
                <div
                  key={item.id}
                  className={`flex justify-between items-center p-3 rounded-xl ${RANK_COLORS[item.rank]}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {item.type === "insectEssence" ? "🐛" : item.type === "plantEssence" ? "🌿" : "🧬"}
                    </span>
                    <div>
                      <h4 className="font-bold">{item.type === "insectEssence" ? "Essence Insecte" : item.type === "plantEssence" ? "Essence Plante" : "Buffer Breeding"}</h4>
                      <p className="text-sm opacity-80">{item.rank}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{item.count}×</span>
                    <button
                      className="text-red-600 hover:text-red-800 text-sm"
                      onClick={() => {
                        const updated = craftInventory.items.filter(i => i.id !== item.id);
                        localStorage.setItem("ecobio-craft-inventory", JSON.stringify({ items: updated }));
                        setCraftInventory({ items: updated });
                        window.dispatchEvent(new CustomEvent("craft-inventory-updated"));
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
