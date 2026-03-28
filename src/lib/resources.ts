export interface PlantResource {
  id: string;
  name: string;
  rarity: Rank;
  description: string;
  icon: string;
}

export interface ExplorationLoot {
  plants: PlantResource[];
  totalLootCount: number;
  plantCounts: Record<string, number>;
}

import { Rank } from "./database";

// Plant definitions with ranks (E-S+)
export const PLANTS: PlantResource[] = [
  // E
  {
    id: "herbe_commune",
    name: "Herbe Commune",
    rarity: "E",
    description: "Plante commune trouvée dans les prés",
    icon: "🌿"
  },
  
  // D
  {
    id: "pissenlit",
    name: "Pissenlit",
    rarity: "D",
    description: "Petite fleur jaune très commune",
    icon: "🌼"
  },
  
  // C
  {
    id: "herbe_prairie",
    name: "Herbe de Prairie",
    rarity: "C",
    description: "Herbe qui pousse dans les prairies vastes",
    icon: "🌿"
  },
  
  // B
  {
    id: "fleur_rouge",
    name: "Fleur Rouge",
    rarity: "B",
    description: "Fleur vibrante aux pétales rouges",
    icon: "🌸"
  },
  
  // A
  {
    id: "fleur_bleue",
    name: "Fleur Bleue",
    rarity: "A",
    description: "Fleur rare aux propriétés magiques",
    icon: "💙"
  },
  
  // S
  {
    id: "tige_mystique",
    name: "Tige Mystique",
    rarity: "S",
    description: "Tige chargée d'énergie ancienne",
    icon: "✨"
  },
  
  // S+
  {
    id: "lotus_ancien",
    name: "Lotus Ancien",
    rarity: "S+",
    description: "Plante légendaire utilisée pour le breeding avancé",
    icon: "🌺"
  }
];

// Rarity spawn chances by mission duration
export const PLANT_RARITY_CHANCES: Record<string, Record<string, number>> = {
  "15min": { "E": 0.60, "D": 0.30, "C": 0.08, "B": 0.02, "A": 0, "S": 0, "S+": 0 },
  "30min": { "E": 0.50, "D": 0.30, "C": 0.12, "B": 0.06, "A": 0.02, "S": 0, "S+": 0 },
  "1h":    { "E": 0.40, "D": 0.30, "C": 0.15, "B": 0.10, "A": 0.03, "S": 0.02, "S+": 0 },
  "2h":    { "E": 0.30, "D": 0.30, "C": 0.18, "B": 0.14, "A": 0.05, "S": 0.02, "S+": 0.01 },
  "4h":    { "E": 0.25, "D": 0.25, "C": 0.20, "B": 0.18, "A": 0.08, "S": 0.03, "S+": 0.01 },
  "8h":    { "E": 0.20, "D": 0.20, "C": 0.22, "B": 0.20, "A": 0.12, "S": 0.05, "S+": 0.01 }
};

export const MISSION_XP_VALUES: Record<string, number> = {
  "15min": 20,
  "30min": 35,
  "1h": 60,
  "2h": 100,
  "4h": 150,
  "8h": 200
};

// Helper to map legacy rarity string to Rank
export function getPlantRankFromLegacy(rarity: string): Rank {
  const map: Record<string, Rank> = {
    "common": "E" as Rank,
    "uncommon": "D" as Rank,
    "rare": "S" as Rank,
    "epic": "S+" as Rank
  };
  return map[rarity] || "E";
}
