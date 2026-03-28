import { Rank } from "./database";
import { createItemInInventory } from "./inventory";

// Craft item types
export type CraftItemType = "insectEssence" | "plantEssence" | "breedingBuffer";
export type CraftRecipeType = "insectEssence" | "plantEssence" | "breedingBuffer";

// Recipe types
export type RecipeType = "insectEssence" | "plantEssence" | "breedingBuffer";

// Craft items (produced by crafting)
export interface CraftItem {
  id: string;
  type: "insectEssence" | "plantEssence" | "breedingBuffer";
  rank: Rank; // E-S+
  count: number;
}

// Craft inventory separate from plants
export interface CraftInventory {
  items: CraftItem[];
}

// Rank to number for averaging
export const RANK_TO_NUMBER: Record<Rank, number> = {
  "E": 1,
  "D": 2,
  "C": 3,
  "B": 4,
  "A": 5,
  "S": 6,
  "S+": 7
};

export const NUMBER_TO_RANK: Record<number, Rank> = {
  1: "E",
  1.5: "D",
  2: "D",
  2.5: "C",
  3: "C",
  3.5: "B",
  4: "B",
  4.5: "A",
  5: "A",
  5.5: "S",
  6: "S",
  6.5: "S+",
  7: "S+"
};

// Rank colors (same as creature ranks)
export const RANK_COLORS: Record<Rank, string> = {
  "E": "bg-gray-600 text-white",
  "D": "bg-green-600 text-white",
  "C": "bg-blue-600 text-white",
  "B": "bg-yellow-600 text-white",
  "A": "bg-orange-600 text-white",
  "S": "bg-red-600 text-white",
  "S+": "bg-purple-600 text-white"
};

/**
 * Calculate average rank from two ranks
 * E=1, D=2, C=3, B=4, A=5, S=6, S+=7
 */
export function calculateAverageRank(rank1: Rank, rank2: Rank): Rank {
  const num1 = RANK_TO_NUMBER[rank1];
  const num2 = RANK_TO_NUMBER[rank2];
  const avg = (num1 + num2) / 2;

  // Round to nearest 0.5 increment
  const rounded = Math.round(avg * 2) / 2;

  return NUMBER_TO_RANK[rounded] || "E";
}

/**
 * Craft insect essence from two creatures
 */
export function craftInsectEssence(
  creature1Id: string,
  creature2Id: string,
  rank1: Rank,
  rank2: Rank
): {
  resultRank: Rank;
  resultItem: CraftItem | null;
  error?: string;
} {
  const avgRank = calculateAverageRank(rank1, rank2);

  const resultItem: CraftItem = {
    id: `essence-insect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: "insectEssence",
    rank: avgRank,
    count: 1
  };

  return { resultRank: avgRank, resultItem };
}

/**
 * Craft plant essence from two plants
 */
export function craftPlantEssence(
  plantId1: string,
  plantId2: string,
  rank1: Rank,
  rank2: Rank
): {
  resultRank: Rank;
  resultItem: CraftItem | null;
  error?: string;
} {
  const avgRank = calculateAverageRank(rank1, rank2);

  const resultItem: CraftItem = {
    id: `essence-plant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: "plantEssence",
    rank: avgRank,
    count: 1
  };

  return { resultRank: avgRank, resultItem };
}

/**
 * Craft breeding buffer from essence + essence
 */
export function craftBreedingBuffer(
  essenceRank1: Rank,
  essenceRank2: Rank
): {
  resultRank: Rank;
  resultItem: CraftItem | null;
  error?: string;
} {
  const avgRank = calculateAverageRank(essenceRank1, essenceRank2);

  const resultItem: CraftItem = {
    id: `buffer-breeding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: "breedingBuffer",
    rank: avgRank,
    count: 1
  };

  return { resultRank: avgRank, resultItem };
}

/**
 * Load craft inventory from localStorage
 */
export function loadCraftInventory(): CraftInventory {
  if (typeof window === "undefined") {
    return { items: [] };
  }

  const saved = localStorage.getItem("ecobio-craft-inventory");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load craft inventory", e);
    }
  }
  return { items: [] };
}

/**
 * Save craft inventory to localStorage
 */
export function saveCraftInventory(inventory: CraftInventory): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem("ecobio-craft-inventory", JSON.stringify(inventory));
  // Trigger update event
  window.dispatchEvent(new CustomEvent("craft-inventory-updated"));
}

/**
 * Add item to craft inventory
 */
export function addToCraftInventory(item: CraftItem): CraftInventory {
  const inventory = loadCraftInventory();

  // Check if same item exists
  const existing = inventory.items.find(i =>
    i.type === item.type && i.rank === item.rank
  );

  if (existing) {
    existing.count += item.count;
  } else {
    inventory.items.push(item);
  }

  saveCraftInventory(inventory);
  return inventory;
}

/**
 * Remove items from craft inventory
 */
export function removeFromCraftInventory(item: CraftItem): CraftInventory {
  const inventory = loadCraftInventory();
  inventory.items = inventory.items.filter(i => i.id !== item.id);
  saveCraftInventory(inventory);
  return inventory;
}

/**
 * Transform a creature into essence (creature → essence)
 * Returns essence with the same rank as the creature
 */
export function transformCreatureToEssence(creatureRank: Rank): {
  essenceItem: CraftItem;
  craftInventory: CraftInventory;
} {
  const essenceItem: CraftItem = {
    id: `essence-insect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: "insectEssence",
    rank: creatureRank,
    count: 1
  };
  
  const inventory = loadCraftInventory();
  inventory.items.push(essenceItem);
  saveCraftInventory(inventory);
  
  return { essenceItem, craftInventory: inventory };
}

/**
 * Add crafted essence/buffer to main inventory (replaces old craft inventory)
 */
export function addCraftedItemToInventory(
  type: ItemType,
  rank: Rank,
  count: number = 1
): void {
  createItemInInventory(type, rank, count);
}

// Craft types for TypeScript
export type CraftItemType = "insectEssence" | "plantEssence" | "breedingBuffer";
export type CraftRecipeType = "insectEssence" | "plantEssence" | "breedingBuffer";
