import { Rank } from "./database";

export type ItemType = "plant" | "insectEssence" | "plantEssence" | "breedingBuffer";

export interface InventoryItem {
  id: string;
  type: ItemType;
  name: string;
  rank: Rank;
  description: string;
  icon: string;
  count: number;
  lastUpdated: number;
  // Legacy fields pour compatibilité avec plant items existants
  plantId?: string;
  plantName?: string;
}

export interface Inventory {
  items: InventoryItem[];
  totalLootObtained: number; // Total count across all items
}

// Plant definitions with rank groups (E-S+)
export const PLANT_DEFINITIONS: Record<string, {
  id: string;
  name: string;
  rank: Rank;
  description: string;
  icon: string;
}> = {
  // E
  "herbe_commune": {
    id: "herbe_commune",
    name: "Herbe Commune",
    rank: "E",
    description: "Plante commune trouvée dans les prés",
    icon: "🌿"
  },

  // D
  "herbe_houleuse": {
    id: "herbe_houleuse",
    name: "Herbe Houleuse",
    rank: "D",
    description: "Herbe résistante aux tempêtes et au vent",
    icon: "🌿"
  },
  "pissenlit": {
    id: "pissenlit",
    name: "Pissenlit",
    rank: "D",
    description: "Petite fleur jaune très commune",
    icon: "🌼"
  },

  // C
  "herbe_prairie": {
    id: "herbe_prairie",
    name: "Herbe de Prairie",
    rank: "C",
    description: "Herbe qui pousse dans les prairies vastes",
    icon: "🌿"
  },

  // B
  "fleur_rouge": {
    id: "fleur_rouge",
    name: "Fleur Rouge",
    rank: "B",
    description: "Fleur vibrante aux pétales rouges",
    icon: "🌸"
  },

  // A
  "fleur_bleue": {
    id: "fleur_bleue",
    name: "Fleur Bleue",
    rank: "A",
    description: "Fleur rare aux propriétés magiques",
    icon: "💙"
  },

  // S
  "tige_mystique": {
    id: "tige_mystique",
    name: "Tige Mystique",
    rank: "S",
    description: "Tige chargée d'énergie ancienne",
    icon: "✨"
  },

  // S+
  "lotus_ancien": {
    id: "lotus_ancien",
    name: "Lotus Ancien",
    rank: "S+",
    description: "Plante légendaire utilisée pour le breeding avancé",
    icon: "🌺"
  }
};

// Essence definitions (for insect & plant essences)
export const ESSENCE_DEFINITIONS: Record<string, {
  id: string;
  name: string;
  type: "insectEssence" | "plantEssence";
  rank: Rank;
  description: string;
  icon: string;
}> = {
  "essence_insect_E": { id: "essence_insect_E", name: "Essence Insecte", type: "insectEssence", rank: "E", description: "Essence d'insecte de rang E", icon: "🐛" },
  "essence_insect_D": { id: "essence_insect_D", name: "Essence Insecte", type: "insectEssence", rank: "D", description: "Essence d'insecte de rang D", icon: "🐛" },
  "essence_insect_C": { id: "essence_insect_C", name: "Essence Insecte", type: "insectEssence", rank: "C", description: "Essence d'insecte de rang C", icon: "🐛" },
  "essence_insect_B": { id: "essence_insect_B", name: "Essence Insecte", type: "insectEssence", rank: "B", description: "Essence d'insecte de rang B", icon: "🐛" },
  "essence_insect_A": { id: "essence_insect_A", name: "Essence Insecte", type: "insectEssence", rank: "A", description: "Essence d'insecte de rang A", icon: "🐛" },
  "essence_insect_S": { id: "essence_insect_S", name: "Essence Insecte", type: "insectEssence", rank: "S", description: "Essence d'insecte de rang S", icon: "🐛" },
  "essence_insect_S+": { id: "essence_insect_S+", name: "Essence Insecte", type: "insectEssence", rank: "S+", description: "Essence d'insecte de rang S+", icon: "🐛" },
  "essence_plant_E": { id: "essence_plant_E", name: "Essence Plante", type: "plantEssence", rank: "E", description: "Essence de plante de rang E", icon: "🌿" },
  "essence_plant_D": { id: "essence_plant_D", name: "Essence Plante", type: "plantEssence", rank: "D", description: "Essence de plante de rang D", icon: "🌿" },
  "essence_plant_C": { id: "essence_plant_C", name: "Essence Plante", type: "plantEssence", rank: "C", description: "Essence de plante de rang C", icon: "🌿" },
  "essence_plant_B": { id: "essence_plant_B", name: "Essence Plante", type: "plantEssence", rank: "B", description: "Essence de plante de rang B", icon: "🌿" },
  "essence_plant_A": { id: "essence_plant_A", name: "Essence Plante", type: "plantEssence", rank: "A", description: "Essence de plante de rang A", icon: "🌿" },
  "essence_plant_S": { id: "essence_plant_S", name: "Essence Plante", type: "plantEssence", rank: "S", description: "Essence de plante de rang S", icon: "🌿" },
  "essence_plant_S+": { id: "essence_plant_S+", name: "Essence Plante", type: "plantEssence", rank: "S+", description: "Essence de plante de rang S+", icon: "🌿" }
};

// Buffer breeding definitions
export const BUFFER_DEFINITIONS: Record<string, {
  id: string;
  name: string;
  type: "breedingBuffer";
  rank: Rank;
  description: string;
  icon: string;
}> = {
  "buffer_E": { id: "buffer_E", name: "Buffer Breeding", type: "breedingBuffer", rank: "E", description: "Buffer de rang E", icon: "⚗️" },
  "buffer_D": { id: "buffer_D", name: "Buffer Breeding", type: "breedingBuffer", rank: "D", description: "Buffer de rang D", icon: "⚗️" },
  "buffer_C": { id: "buffer_C", name: "Buffer Breeding", type: "breedingBuffer", rank: "C", description: "Buffer de rang C", icon: "⚗️" },
  "buffer_B": { id: "buffer_B", name: "Buffer Breeding", type: "breedingBuffer", rank: "B", description: "Buffer de rang B", icon: "⚗️" },
  "buffer_A": { id: "buffer_A", name: "Buffer Breeding", type: "breedingBuffer", rank: "A", description: "Buffer de rang A", icon: "⚗️" },
  "buffer_S": { id: "buffer_S", name: "Buffer Breeding", type: "breedingBuffer", rank: "S", description: "Buffer de rang S", icon: "⚗️" },
  "buffer_S+": { id: "buffer_S+", name: "Buffer Breeding", type: "breedingBuffer", rank: "S+", description: "Buffer de rang S+", icon: "⚗️" }
};

// Rank colors (same as creature ranks)
export const RARITY_COLORS: Record<Rank, string> = {
  "E": "text-gray-500 bg-gray-200",
  "D": "text-green-600 bg-green-200",
  "C": "text-blue-600 bg-blue-200",
  "B": "text-yellow-600 bg-yellow-200",
  "A": "text-orange-600 bg-orange-200",
  "S": "text-red-600 bg-red-200",
  "S+": "text-purple-600 bg-purple-200"
};

// Rank border colors for loot display
export const RANK_BORDER_COLORS: Record<Rank, string> = {
  "E": "border-green-600 bg-green-50 dark:bg-green-900",
  "D": "text-green-600 bg-green-200",
  "C": "border-blue-600 bg-blue-50 dark:bg-blue-900",
  "B": "border-yellow-600 bg-yellow-50 dark:bg-yellow-900",
  "A": "border-orange-600 bg-orange-50 dark:bg-orange-900",
  "S": "border-red-600 bg-red-50 dark:bg-red-900",
  "S+": "border-purple-600 bg-purple-50 dark:bg-purple-900"
};

/**
 * Map old rarity system to new rarity system
 */
function mapOldRarityToNew(oldRarity: "common" | "uncommon" | "rare" | "epic"): "E" | "D" | "C" | "B" | "A" | "S" | "S+" {
  const mapping: Record<string, "E" | "D" | "C" | "B" | "A" | "S" | "S+"> = {
    "common": "E",
    "uncommon": "B",
    "rare": "A",
    "epic": "S"
  };
  return mapping[oldRarity] || "E";
}

/**
 * Map plant ID from old system to new system
 */
function mapPlantId(oldId: string, oldRarity: "common" | "uncommon" | "rare" | "epic"): string {
  // If the plant already exists in new definitions, use it
  if (PLANT_DEFINITIONS[oldId]) {
    return oldId;
  }

  // Map old plants to new plants by rarity
  const plantsByRarity: Record<string, string[]> = {
    "common": ["herbe_commune", "herbe_houleuse", "herbe_prairie"],
    "uncommon": ["fleur_rouge"],
    "rare": ["fleur_bleue"],
    "epic": ["tige_mystique", "lotus_ancien"]
  };

  const candidates = plantsByRarity[oldRarity] || plantsByRarity["common"];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Add loot items to inventory
 */
export function addToInventory(plantIds: string[]): {
  updated: Inventory;
  addedCount: number;
} {
  const savedInventory = localStorage.getItem("ecobio-inventory");
  const current: Inventory = savedInventory ? JSON.parse(savedInventory) : {
    items: [],
    totalLootObtained: 0
  };

  let addedCount = 0;

  // Group plant IDs by type
  const grouped = plantIds.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Update inventory
  current.items.forEach(item => {
    if (item.plantId && grouped[item.plantId]) {
      item.count += grouped[item.plantId];
      addedCount += grouped[item.plantId];
      delete grouped[item.plantId];
      item.lastUpdated = Date.now();
    }
  });

  // Add new items
  for (const [plantId, count] of Object.entries(grouped)) {
    const plantDef = PLANT_DEFINITIONS[plantId];
    if (plantDef) {
      current.items.push({
        id: `inventory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "plant",
        name: plantDef.name,
        rank: plantDef.rank,
        description: plantDef.description,
        icon: plantDef.icon,
        count,
        lastUpdated: Date.now(),
        plantId,
        plantName: plantDef.name
      });
      addedCount += count;
    }
  }

  current.totalLootObtained += addedCount;

  // Save to localStorage
  localStorage.setItem("ecobio-inventory", JSON.stringify(current));

  return {
    updated: current,
    addedCount
  };
}

/**
 * Add loot items to inventory from exploration (accepts PlantResource with native Rank)
 */
export function addExplorationLoot(loot: Array<{ id: string; name: string; rarity: Rank }>): {
  updated: Inventory;
  addedCount: number;
} {
  // PlantResource already uses native Rank system
  const plantIds = loot.map(plant => plant.id);
  return addToInventory(plantIds);
}

/**
 * Remove items from inventory
 */
export function removeFromInventory(itemId: string, count: number): Inventory {
  const savedInventory = localStorage.getItem("ecobio-inventory");
  const current: Inventory = savedInventory ? JSON.parse(savedInventory) : {
    items: [],
    totalLootObtained: 0
  };

  const item = current.items.find(i => i.id === itemId);
  if (item) {
    const removedCount = Math.min(item.count, count);
    item.count = Math.max(0, item.count - count);
    item.lastUpdated = Date.now();

    // Update total (for tracking)
    current.totalLootObtained = Math.max(0, current.totalLootObtained - removedCount);
    localStorage.setItem("ecobio-inventory", JSON.stringify(current));
  }

  return current;
}

/**
 * Load inventory from localStorage
 */
export function loadInventory(): Inventory {
  const savedInventory = localStorage.getItem("ecobio-inventory");
  if (savedInventory) {
    try {
      const inventory: Inventory = JSON.parse(savedInventory);
      
      // Migration: Add rank field to items without it (legacy data)
      let needsSave = false;
      inventory.items.forEach(item => {
        if (!item.rank && item.plantId) {
          const plantDef = PLANT_DEFINITIONS[item.plantId];
          if (plantDef) {
            item.rank = plantDef.rank;
            needsSave = true;
          } else {
            // Fallback to E rank if plant definition not found
            item.rank = "E";
            needsSave = true;
          }
        }
      });
      
      // Save migrated data if any items were updated
      if (needsSave) {
        localStorage.setItem("ecobio-inventory", JSON.stringify(inventory));
      }
      
      return inventory;
    } catch (e) {
      console.error("Failed to load inventory", e);
    }
  }
  return {
    items: [],
    totalLootObtained: 0
  };
}

/**
 * Create essence or buffer item and add to inventory (for craft system)
 */
export function createItemInInventory(
  type: ItemType,
  rank: Rank,
  count: number = 1
): Inventory {
  const inventory = loadInventory();
  
  let itemId: string;
  let itemName: string;
  let itemDesc: string;
  let itemIcon: string;
  
  if (type === "insectEssence") {
    const def = ESSENCE_DEFINITIONS[`essence_insect_${rank}`];
    itemId = def.id;
    itemName = def.name;
    itemDesc = def.description;
    itemIcon = def.icon;
  } else if (type === "plantEssence") {
    const def = ESSENCE_DEFINITIONS[`essence_plant_${rank}`];
    itemId = def.id;
    itemName = def.name;
    itemDesc = def.description;
    itemIcon = def.icon;
  } else if (type === "breedingBuffer") {
    const def = BUFFER_DEFINITIONS[`buffer_${rank}`];
    itemId = def.id;
    itemName = def.name;
    itemDesc = def.description;
    itemIcon = def.icon;
  } else {
    // plant type - not supported here, use addToInventory instead
    return inventory;
  }
  
  // Check if item already exists
  const existing = inventory.items.find(item =>
    item.type === type && item.rank === rank
  );
  
  if (existing) {
    existing.count += count;
    existing.lastUpdated = Date.now();
  } else {
    inventory.items.push({
      id: `inventory-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      name: itemName,
      rank,
      description: itemDesc,
      icon: itemIcon,
      count,
      lastUpdated: Date.now()
    });
  }
  
  localStorage.setItem("ecobio-inventory", JSON.stringify(inventory));
  window.dispatchEvent(new CustomEvent("inventory-updated"));
  
  return inventory;
}
