/**
 * ÉcoBio Genetic Types System
 * 8 post-apocalyptic genetic mutation pathways
 *
 * Type interactions removed: No +20%/-20% matrix
 * Combat based on individual type skills and player strategy
 */

export type GeneticType =
  | "resilient"
  | "scribeur"
  | "symbiote"
  | "radiant"
  | "chimere"
  | "pathogene"
  | "synchroniseur"
  | "ombre";

export interface GeneticTypeData {
  id: GeneticType;
  name: string;
  emoji: string;
  description: string;
  origin: string;
  biome: string[];
  characteristic: string;
  activeSkill?: {
    name: string;
    description: string;
    cooldown: number;
  };
  passive?: {
    name: string;
    description: string;
  };
  weight?: number; // Spawning weight (uniform 100 = 12.5% each, total 800)
}

/**
 * The 8 Genetic Types
 */
export const GENETIC_TYPES: Record<GeneticType, GeneticTypeData> = {
  resilient: {
    id: "resilient",
    name: "Résilient",
    emoji: "🔬",
    description: "Survivants d'environnements hostiles, adaptation carapacée",
    origin: "Survivors of harsh environments, radiation-adapted carapaces",
    biome: ["Ruines urbaines", "Zones contaminées"],
    characteristic: "Persistence — Protection & Reflect",
    weight: 100,
  },

  scribeur: {
    id: "scribeur",
    name: "Scribeur",
    emoji: "🔬",
    description: "Adaptation cognitive massive, systèmes nerveux hyper-réflexifs",
    origin: "Massive cognitive adaptation, hyper-reflexive nervous systems",
    biome: ["Laboratoires abandonnés", "Zones technologiques"],
    characteristic: "Radar — Knowledge & Copy",
    weight: 100,
  },

  symbiote: {
    id: "symbiote",
    name: "Symbiote",
    emoji: "🔬",
    description: "Fusion organique-synthétique, intégration bio-tech",
    origin: "Organic-synthetic fusion, bio-tech integration",
    biome: ["Zones de convergence", "Décharges électroniques"],
    characteristic: "Link — Sacrifice & Protection",
    weight: 100,
  },

  radiant: {
    id: "radiant",
    name: "Radiant",
    emoji: "🔬",
    description: "Absorption sélective de radiation, mutants irradiés",
    origin: "Selective radiation absorption, irradiated mutants",
    biome: ["Zones radiatives", "Centrales abandonnées"],
    characteristic: "Energy drain — Sustain & Drain",
    weight: 100,
  },

  chimere: {
    id: "chimere",
    name: "Chimère",
    emoji: "🔬",
    description: "Hybridation forcée inter-espèces, biologie chaotique",
    origin: "Forced cross-species hybridization, chaotic biology",
    biome: ["Laboratoires de recherche", "Zones expérimentales"],
    characteristic: "Mutation — Controlled Chaos",
    weight: 100,
  },

  pathogene: {
    id: "pathogene",
    name: "Pathogène",
    emoji: "🔬",
    description: "Evolution toxique/biologique guerre, immunité fortifiée",
    origin: "Biological warfare, toxin-based evolution, immune resistance",
    biome: ["Zones contaminées", "Décharges chimiques"],
    characteristic: "Spread — Poison & Weaken",
    weight: 100,
  },

  synchroniseur: {
    id: "synchroniseur",
    name: "Synchroniseur",
    emoji: "🔬",
    description: "Manipulation bio-quantique, entités éthérées",
    origin: "Bio-quantum manipulation, ethereal entities",
    biome: ["Anomalies temporelles", "Zones entre-deux"],
    characteristic: "Swap — Order & Delay",
    weight: 100,
  },

  ombre: {
    id: "ombre",
    name: "Ombre",
    emoji: "🔬",
    description: "Adaptation ombre, optical mastery, surprise attack evolution",
    origin: "Shadow adaptation, optical mastery, surprise attack evolution",
    biome: ["Zones sombres", "Couverts forestiers", "Cavernes"],
    characteristic: "Surprise — Dodge & Timing",
    activeSkill: {
      name: "Phase d'Ombre",
      description: "Intangible: ne subis aucun damage pendant ce tour + ignore DEF sur ton attaque",
      cooldown: 3,
    },
    passive: {
      name: "Cible Arrière",
      description: "Attaque la dernière cible vivante en priorité (si la 5 meurt, attaque la 4, etc.)",
    },
    weight: 100,
  },
};

/**
 * Get genetic type by ID
 */
export function getGeneticType(typeId: GeneticType): GeneticTypeData | undefined {
  return GENETIC_TYPES[typeId];
}

/**
 * Roll random genetic type for a creature
 * Weighted by biome affinity (for future AnyMaps integration)
 * For now: uniform random (weight 100 each = 12.5% probability)
 */
export function rollRandomGeneticType(): GeneticType {
  const types = Object.values(GENETIC_TYPES);
  const totalWeight = types.reduce((sum, type) => sum + (type.weight || 1), 0);

  let randomWeight = Math.random() * totalWeight;

  for (const type of types) {
    randomWeight -= (type.weight || 1);
    if (randomWeight <= 0) {
      return type.id;
    }
  }

  // Fallback (should not happen)
  return types[0].id;
}
