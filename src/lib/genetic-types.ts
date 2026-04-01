/**
 * ÉcoBio Genetic Types System
 * 8 post-apocalyptic genetic mutation pathways
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
  counters: GeneticType[]; // Types this counters (advantage)
  weakAgainst: GeneticType[]; // Types this is weak against
  weight?: number; // Spawning weight (uniform 100 = 12.5% each, total 800)
}

/**
 * Type Interaction Matrix - CYCLE DE 8 (1 force / 1 faiblesse par type)
 *
 * 📊 CHAQUE TYPE: 1 avantage / 1 faiblesse / 6 neutres
 *
 *                                     Dollars - l'ordre du cycle
 *                Résilient  Scribeur  Symbiote  Radiant  Chimère  Pathogène  Ombre  Sync
 *   ─────────────────────────────────────────────────────────────────────────────────────────────
 *   Résilient         —        perd     neutre    neutre    neutre    gagne   neutre  perd
 *   Scribeur       gaine        —      gagne     neutre    neutre    neutre  neutre  perd
 *   Symbiote       neutre     perd       —      gagne     neutre    neutre  neutre  perd
 *   Radiant        neutre    neutre    perd       —      gagne     neutre  neutre  perd
 *   Chimère        neutre    neutre    neutre    perd       —      neutre  neutre  gagne
 *   Pathogène      perd     gaine     neutre   neutre    neutre      —     neutre  neutre
 *   Ombre          gagne    neutre    neutre   neutre    neutre    neutre      —     perd
 *   Sync           gaine     gaine     gaine     gaine     perd     neutre    gaine    —
 *
 *   LÉGENDE:
 *   - gagne = +20% dégâts infligés (avantage)
 *   - perd = -20% dégâts infligés (faiblesse)
 *   - neutre = 0% (matchup neutre)
 *   - — = matchup vs soi-même (neutre)
 *
 *   CYCLE DE 8 (ordre de transmission):
 *   1. Résilient → counters Pathogènes
 *   2. Pathogènes → counters Scribeur
 *   3. Scribeur → counters Symbiote
 *   4. Symbiote → counters Radiant
 *   5. Radiant → counters Chimère
 *   6. Chimère → counters Synchroniseur
 *   7. Synchroniseur → counters Ombre
 *   8. Ombre → counters Résilient
 *
 *   LORE:
 *   - Résilient → Pathogènes: Enhanced immunity resists toxins
 *   - Pathogènes → Scribeur: Toxic fog impairs cognitive function
 *   - Scribeur → Symbiote: Precision attacks dismantle hybrid structures
 *   - Symbiote → Radiant: Tech absorbs and dissipates radiation
 *   - Radiant → Chimère: High energy disintegrates chaotic biology
 *   - Chimère → Synchroniseur: Wild variance breaks quantum coherence
 *   - Synchroniseur → Ombre: Reality-warping "exposes" stealth creatures
 *   - Ombre → Résilient: Surprise neutralizes persistence
 */

export const TYPE_INTERACTIONS: Record<GeneticType, { counters: GeneticType[]; weak: GeneticType[] }> = {
  resilient: {
    counters: ["pathogene"],
    weak: ["ombre"],
  },
  scribeur: {
    counters: ["symbiote"],
    weak: ["pathogene"],
  },
  symbiote: {
    counters: ["radiant"],
    weak: ["scribeur"],
  },
  radiant: {
    counters: ["chimere"],
    weak: ["symbiote"],
  },
  chimere: {
    counters: ["synchroniseur"],
    weak: ["radiant"],
  },
  pathogene: {
    counters: ["scribeur"],
    weak: ["resilient"],
  },
  synchroniseur: {
    counters: ["ombre"],
    weak: ["chimere"],
  },
  ombre: {
    counters: ["resilient"],
    weak: ["synchroniseur"],
  },
};

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
    characteristic: "Persistence — Reinforce all ongoing effects (buffs/debuffs duration extension)",
    counters: ["pathogene"],
    weakAgainst: ["ombre"],
    weight: 100,
  },

  scribeur: {
    id: "scribeur",
    name: "Scribeur",
    emoji: "🔬",
    description: "Adaptation cognitive massive, systèmes nerveux hyper-réflexifs",
    origin: "Massive cognitive adaptation, hyper-reflexive nervous systems",
    biome: ["Laboratoires abandonnés", "Zones technologiques"],
    characteristic: "Radar — Preview enemy intent, dodge anticipation, predict-and-react",
    counters: ["symbiote"],
    weakAgainst: ["pathogene"],
    weight: 100,
  },

  symbiote: {
    id: "symbiote",
    name: "Symbiote",
    emoji: "🔬",
    description: "Fusion organique-synthétique, intégration bio-tech",
    origin: "Organic-synthetic fusion, bio-tech integration",
    biome: ["Zones de convergence", "Décharges électroniques"],
    characteristic: "Link — Share buffs, split damage with ally, mutual buff transfer",
    counters: ["radiant"],
    weakAgainst: ["scribeur"],
    weight: 100,
  },

  radiant: {
    id: "radiant",
    name: "Radiant",
    emoji: "🔬",
    description: "Absorption sélective de radiation, mutants irradiés",
    origin: "Selective radiation absorption, irradiated mutants",
    biome: ["Zones radiatives", "Centrales abandonnées"],
    characteristic: "Energy drain — Absorb enemy HP when hitting, self-sustain via damage",
    counters: ["chimere"],
    weakAgainst: ["symbiote"],
    weight: 100,
  },

  chimere: {
    id: "chimere",
    name: "Chimère",
    emoji: "🔬",
    description: "Hybridation forcée inter-espèces, biologie chaotique",
    origin: "Forced cross-species hybridization, chaotic biology",
    biome: ["Laboratoires de recherche", "Zones expérimentales"],
    characteristic: "Mutation — Random stat boost per turn, volatile but potentially game-changing",
    counters: ["synchroniseur"],
    weakAgainst: ["radiant"],
    weight: 100,
  },

  pathogene: {
    id: "pathogene",
    name: "Pathogène",
    emoji: "🔬",
    description: "Evolution toxique/biologique guerre, immunité fortifiée",
    origin: "Biological warfare, toxin-based evolution, immune resistance",
    biome: ["Zones contaminées", "Décharges chimiques"],
    characteristic: "Spread — Poison stacks, spreads to nearby allies, reduces enemy healing",
    counters: ["scribeur"],
    weakAgainst: ["resilient"],
    weight: 100,
  },

  synchroniseur: {
    id: "synchroniseur",
    name: "Synchroniseur",
    emoji: "🔬",
    description: "Manipulation bio-quantique, entités éthérées",
    origin: "Bio-quantum manipulation, ethereal entities",
    biome: ["Anomalies temporelles", "Zones entre-deux"],
    characteristic: "Swap — Move allies/enemies, reposition, time warps, battlefield manipulation",
    counters: ["ombre"],
    weakAgainst: ["chimere"],
    weight: 100,
  },

  ombre: {
    id: "ombre",
    name: "Ombre",
    emoji: "🔬",
    description: "Adaptation ombre, optical mastery, surprise attack evolution",
    origin: "Shadow adaptation, optical mastery, surprise attack evolution",
    biome: ["Zones sombres", "Couverts forestiers", "Cavernes"],
    characteristic: "Surprise — Crit bonus first turn, evasion opener, shadow form with enhanced offense",
    counters: ["resilient"],
    weakAgainst: ["synchroniseur"],
    weight: 100,
  },
};

/**
 * Get type advantage multiplier
 * Returns multiplier for damage received based on type interaction
 * @param attackerType Type of the attacker
 * @param defenderType Type of the defender
 * @returns Damage multiplier (1.0 = neutral, >1.0 = more, <1.0 = less)
 */
export function getTypeAdvantageMultiplier(
  attackerType: GeneticType,
  defenderType: GeneticType
): number {
  const attackerData = TYPE_INTERACTIONS[attackerType];

  // If attacker counters defender
  if (attackerData.counters.includes(defenderType)) {
    return 1.2; // +20% damage
  }

  // If attacker is weak against defender
  if (attackerData.weak.includes(defenderType)) {
    return 0.8; // -20% damage
  }

  return 1.0; // Neutral
}

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
