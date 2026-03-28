export interface PlantResource {
  id: string;
  name: string;
  rarity: "common" | "uncommon" | "rare" | "epic";
  description: string;
  icon?: string;
}

export interface ExplorationLoot {
  plants: PlantResource[];
  totalLootCount: number;
  plantCounts: Record<string, number>;
}

export const PLANTS: PlantResource[] = [
  // Common plants
  {
    id: "herbe_commune",
    name: "Herbe Commune",
    rarity: "common",
    description: "Plante trouvée dans les prés, utilisée pour le breeding basique"
  },

  // Uncommon plants
  {
    id: "fleur_rouge",
    name: "Fleur Rouge",
    rarity: "uncommon",
    description: "Fleur médicinale, utilisée pour le breeding amélioré"
  },

  // Rare plants
  {
    id: "tige_mystique",
    name: "Tige Mystique",
    rarity: "rare",
    description: "Plante rare à puissantes propriétés magiques"
  },

  // Epic plants
  {
    id: "lotus_ancien",
    name: "Lotus Ancien",
    rarity: "epic",
    description: "Plante légendaire, utilisée pour le breeding avancé"
  }
];

export const PLANT_RARITY_CHANCES: Record<string, Record<string, number>> = {
  "15min": { common: 0.70, uncommon: 0.25, rare: 0.05, epic: 0 },
  "30min": { common: 0.60, uncommon: 0.30, rare: 0.08, epic: 0.02 },
  "1h": { common: 0.50, uncommon: 0.35, rare: 0.12, epic: 0.03 },
  "2h": { common: 0.40, uncommon: 0.40, rare: 0.15, epic: 0.05 },
  "4h": { common: 0.30, uncommon: 0.45, rare: 0.20, epic: 0.05 },
  "8h": { common: 0.20, uncommon: 0.45, rare: 0.25, epic: 0.10 }
};

export const MISSION_XP_VALUES: Record<string, number> = {
  "15min": 20,
  "30min": 35,
  "1h": 60,
  "2h": 100,
  "4h": 150,
  "8h": 200
};
