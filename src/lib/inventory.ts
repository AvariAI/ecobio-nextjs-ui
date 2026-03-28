export interface InventoryItem {
  id: string;
  type: "plant";
  plantId: string;
  plantName: string;
  rarity: "E" | "D" | "C" | "B" | "A" | "S" | "S+";
  count: number; // Number of this plant owned
  lastUpdated: number;
}

export interface Inventory {
  items: InventoryItem[];
  totalLootObtained: number; // Total count across all items
}

// Plant definitions with rarity groups
export const PLANT_DEFINITIONS: Record<string, {
  id: string;
  name: string;
  rarity: "E" | "D" | "C" | "B" | "A" | "S" | "S+";
  description: string;
  icon: string;
}> = {
  // Common (E)
  "herbe_commune": {
    id: "herbe_commune",
    name: "Herbe Commune",
    rarity: "E",
    description: "Plante commune trouvée dans les prés",
    icon: "🌿"
  },

  // D
  "herbe_houleuse": {
    id: "herbe_houleuse",
    name: "Herbe Houleuse",
    rarity: "D",
    description: "Herbe résistante aux tempêtes et au vent",
    icon: "🌿"
  },

  // C
  "herbe_prairie": {
    id: "herbe_prairie",
    name: "Herbe de Prairie",
    rarity: "C",
    description: "Herbe qui pousse dans les prairies vastes",
    icon: "🌿"
  },

  // B (Uncommon)
  "fleur_rouge": {
    id: "fleur_rouge",
    name: "Fleur Rouge",
    rarity: "B",
    description: "Fleur aux pétales vibrants et puissants",
    icon: "🌸"
  },

  // A (Rare)
  "fleur_bleue": {
    id: "fleur_bleue",
    name: "Fleur Bleue",
    rarity: "A",
    description: "Fleur rare aux propriétés magiques subtiles",
    icon: "💙"
  },

  // S (Epic)
  "tige_mystique": {
    id: "tige_mystique",
    name: "Tige Mystique",
    rarity: "S",
    description: "Tige chargée d'énergie ancienne",
    icon: "✨"
  },

  // S+ (Legendary)
  "lotus_ancien": {
    id: "lotus_ancien",
    name: "Lotus Ancien",
    rarity: "S+",
    description: "Plante légendaire utilisée pour le breeding avancé",
    icon: "🌺"
  }
};

// Rarity colors (same as creature ranks)
export const RARITY_COLORS: Record<string, string> = {
  "E": "text-gray-500 bg-gray-200",
  "D": "text-green-600 bg-green-200",
  "C": "text-blue-600 bg-blue-200",
  "B": "text-yellow-600 bg-yellow-200",
  "A": "text-orange-600 bg-orange-200",
  "S": "text-red-600 bg-red-200",
  "S+": "text-purple-600 bg-purple-200"
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
    if (grouped[item.plantId]) {
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
        plantId,
        plantName: plantDef.name,
        rarity: plantDef.rarity,
        count,
        lastUpdated: Date.now()
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
 * Add loot items to inventory from exploration (accepts old PlantResource format)
 */
export function addExplorationLoot(loot: Array<{ id: string; name: string; rarity: "common" | "uncommon" | "rare" | "epic" }>): {
  updated: Inventory;
  addedCount: number;
} {
  // Map old plant IDs and rarities to new system
  const mappedPlantIds = loot.map(plant => {
    const mappedId = mapPlantId(plant.id, plant.rarity);
    return mappedId;
  });

  return addToInventory(mappedPlantIds);
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
      return JSON.parse(savedInventory);
    } catch (e) {
      console.error("Failed to load inventory", e);
    }
  }
  return {
    items: [],
    totalLootObtained: 0
  };
}
