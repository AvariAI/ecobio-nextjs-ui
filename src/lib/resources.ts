import { Rank } from "./database";

// Plant definition interface
export interface PlantResource {
  id: string;
  name: string;
  rarity: Rank;
  description: string;
  icon: string;
  isMedical?: boolean; // NEW: medicinal plants for healing
  healPercent?: number; // NEW: heal % for medicinal remedies
}

// Exploration loot interface
export interface ExplorationLoot {
  plants: PlantResource[];
  totalLootCount: number;
  plantCounts: Record<string, number>;
}

// Plant definitions with ranks (E-S+)
// Medical plants integrated as normal plants with isMedical flag
export const PLANTS: PlantResource[] = [
  // === Médical Plants (Healing) ===
  {
    id: "aloe_vera",
    name: "Aloe Vera",
    rarity: "E",
    description: "Plante soignante pour petites blessures",
    icon: "🌱",
    isMedical: true,
    healPercent: 10
  },

  {
    id: "menthe",
    name: "Menthe",
    rarity: "D",
    description: "Menthe fraîche avec propriétés apaisantes",
    icon: "🍃",
    isMedical: true,
    healPercent: 15
  },

  {
    id: "camomille",
    name: "Camomille",
    rarity: "C",
    description: "Fleur apaisante qui guérit bien",
    icon: "🌸",
    isMedical: true,
    healPercent: 20
  },

  {
    id: "ginseng",
    name: "Ginseng",
    rarity: "B",
    description: "Herbe médicale puissante",
    icon: "🌿",
    isMedical: true,
    healPercent: 25
  },

  {
    id: "ginseng_royal",
    name: "Ginseng Royale",
    rarity: "A",
    description: "Ginseng sacré très puissant",
    icon: "👑",
    isMedical: true,
    healPercent: 30
  },

  {
    id: "nephenta",
    name: "Néphenta",
    rarity: "S",
    description: "Plante ancienne aux vertus curatives",
    icon: "💚",
    isMedical: true,
    healPercent: 40
  },

  {
    id: "nephenta_ichor",
    name: "Néphenta Ichor",
    rarity: "S+",
    description: "Essence planétaire légendaire",
    icon: "✨",
    isMedical: true,
    healPercent: 50
  },

  // === Regular Plants (for crafting) ===
  {
    id: "herbe_commune",
    name: "Herbe Commune",
    rarity: "E",
    description: "Plante commune trouvée dans les prés",
    icon: "🌿"
  },

  {
    id: "pissenlit",
    name: "Pissenlit",
    rarity: "D",
    description: "Petite fleur jaune très commune",
    icon: "🌼"
  },

  {
    id: "herbe_prairie",
    name: "Herbe de Prairie",
    rarity: "C",
    description: "Herbe qui pousse dans les prairies vastes",
    icon: "🌿"
  },

  {
    id: "fleur_rouge",
    name: "Fleur Rouge",
    rarity: "B",
    description: "Fleur vibrante aux pétales rouges",
    icon: "🌸"
  },

  {
    id: "fleur_bleue",
    name: "Fleur Bleue",
    rarity: "A",
    description: "Fleur rare aux propriétés magiques",
    icon: "💙"
  },

  {
    id: "tige_mystique",
    name: "Tige Mystique",
    rarity: "S",
    description: "Tige chargée d'énergie ancienne",
    icon: "✨"
  },

  {
    id: "lotus_ancien",
    name: "Lotus Ancien",
    rarity: "S+",
    description: "Plante légendaire utilisée pour le breeding avancé",
    icon: "🌺"
  }
];

// Plant rarity spawn chances by mission duration
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

// Helper to get medicinal plants by rank
export function getMedicalPlantsByRank(rank: Rank): PlantResource[] {
  return PLANTS.filter(plant => plant.isMedical && plant.rarity === rank);
}

// Helper to get remedy from medical plants
export function craftRemedy(medicalPlant: PlantResource): {
  name: string;
  icon: string;
  healPercent: number;
  rank: Rank;
} | null {
  if (!medicalPlant.isMedical || !medicalPlant.healPercent) {
    return null;
  }

  return {
    name: `Remède ${medicalPlant.rarity}`,
    icon: medicalPlant.icon,
    healPercent: medicalPlant.healPercent,
    rank: medicalPlant.rarity
  };
}
