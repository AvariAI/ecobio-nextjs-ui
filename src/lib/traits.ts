/**
 * ÉcoBio Trait System
 * Passive and conditional traits for creatures
 */

import { Rank } from "./database";

export enum TraitType {
  PASSIVE = "passive",    // Always active
  CONDITIONAL = "conditional",  // Active only under specific conditions
}

export enum TraitCategory {
  OFFENSE = "offense",
  DEFENSE = "defense",
  UTILITY = "utility",
  HYBRID = "hybrid",  // Mixed effects (e.g., +atk but -def)
}

export interface TraitEffect {
  stat: "hp" | "attack" | "defense" | "speed" | "crit" | "damageDealt" | "damageReceived" | "critRate" | "critMult" | "dodge" | "regen";
  value: number;  // Percentage multipler (e.g., 0.15 = +15%)
  // For hybrid traits with both positive and negative effects
  isNegative?: boolean;
}

export interface Trait {
  id: string;
  name: string;
  description: string;
  type: TraitType;
  category: TraitCategory;
  rarity: Rank[];  // Which ranks can spawn with this trait
  effects: TraitEffect[];
  // For conditional traits only
  condition?: string;  // Human-readable condition description
  conditionFn?: (hpPercent: number, stats: any) => boolean;  // Runtime check
}

/**
 * Trait slots per rank (with RNG variance)
 * E: 0-1 (50% chance)
 * D: 1
 * C: 1-2 (50% chance)
 * B: 2
 * A: 2-3 (50% chance)
 * S: 3
 * S+: 3-4 (50% chance)
 */
export const RANK_TRAIT_SLOTS: Record<Rank, { min: number; max: number }> = {
  E: { min: 0, max: 1 },
  D: { min: 1, max: 1 },
  C: { min: 1, max: 2 },
  B: { min: 2, max: 2 },
  A: { min: 2, max: 3 },
  S: { min: 3, max: 3 },
  "S+": { min: 3, max: 4 },
};

/**
 * Calculate number of trait slots for a given rank (with RNG)
 */
export function getTraitSlotCount(rank: Rank): number {
  const slots = RANK_TRAIT_SLOTS[rank];
  if (slots.min === slots.max) {
    return slots.min;
  }

  // Random choice between min and max
  const roll = Math.random();
  return roll < 0.5 ? slots.min : slots.max;
}

/**
 * Roll random traits for a creature
 * @param rank Creature's rank
 * @param excludeTraits Trait IDs to exclude (for deduplication)
 * @returns Array of trait IDs
 */
export function rollRandomTraits(rank: Rank, excludeTraits: string[] = []): string[] {
  const numSlots = getTraitSlotCount(rank);
  const availableTraits = getAllTraitsForRank(rank);

  // Filter out excluded traits and dedupe during selection
  const selectedTraits: string[] = [];
  const usedTraits = new Set(excludeTraits);

  for (let i = 0; i < numSlots; i++) {
    const available = availableTraits.filter(t => !usedTraits.has(t.id));

    if (available.length === 0) {
      break;  // No more unique traits available
    }

    const randomTrait = available[Math.floor(Math.random() * available.length)];
    selectedTraits.push(randomTrait.id);
    usedTraits.add(randomTrait.id);
  }

  return selectedTraits;
}

/**
 * Get all traits that can spawn for a given rank
 */
export function getAllTraitsForRank(rank: Rank): Trait[] {
  return Object.values(TRAITS).filter(trait =>
    trait.rarity.includes(rank)
  );
}

/**
 * Trait definitions - ~20 passive traits across categories
 * PHASE 1: Simple multipliers and effects
 * PHASE 2: Status effects (stun, poison, counters) - TODO
 */
export const TRAITS: Record<string, Trait> = {
  // OFFENSE TRAITS ===========================

  critBoost: {
    id: "critBoost",
    name: "Frappe Critique",
    description: "+15% taux de critique",
    type: TraitType.PASSIVE,
    category: TraitCategory.OFFENSE,
    rarity: ["D", "C", "B", "A", "S", "S+"],
    effects: [
      { stat: "critRate", value: 0.15 },
    ],
  },

  heavyHitter: {
    id: "heavyHitter",
    name: "Frappe Lourde",
    description: "+20% multiplicateur de critique",
    type: TraitType.PASSIVE,
    category: TraitCategory.OFFENSE,
    rarity: ["B", "A", "S", "S+"],
    effects: [
      { stat: "critMult", value: 0.20 },
    ],
  },

  berserker: {
    id: "berserker",
    name: "Berserker",
    description: "+15% dégâts infligés",
    type: TraitType.PASSIVE,
    category: TraitCategory.OFFENSE,
    rarity: ["C", "B", "A", "S", "S+"],
    effects: [
      { stat: "damageDealt", value: 0.15 },
    ],
  },

  assassin: {
    id: "assassin",
    name: "Assassin",
    description: "+25% dégâts infligés si cible HP < 50% (ne s'applique que quand bonus actif)",
    type: TraitType.CONDITIONAL,
    category: TraitCategory.OFFENSE,
    rarity: ["A", "S", "S+"],
    effects: [
      { stat: "damageDealt", value: 0.25 },
    ],
    condition: "cible HP < 50%",
    conditionFn: (_hpPercent: number, stats: any) => stats.targetHpPercent < 0.5,
  },

  swiftStrike: {
    id: "swiftStrike",
    name: "Frappe Éclair",
    description: "+10% vitesse",
    type: TraitType.PASSIVE,
    category: TraitCategory.OFFENSE,
    rarity: ["D", "C", "B", "A", "S", "S+"],
    effects: [
      { stat: "speed", value: 0.10 },
    ],
  },

  sniper: {
    id: "sniper",
    name: "Sniper",
    description: "+10% taux de critique supplémentaire (cumule avec Frappe Critique, cap 40%)",
    type: TraitType.PASSIVE,
    category: TraitCategory.OFFENSE,
    rarity: ["B", "A", "S", "S+"],
    effects: [
      { stat: "critRate", value: 0.10 },
    ],
  },

  // DEFENSE TRAITS ===========================

  thickSkin: {
    id: "thickSkin",
    name: "Peau Épaisse",
    description: "-10% dégâts reçus",
    type: TraitType.PASSIVE,
    category: TraitCategory.DEFENSE,
    rarity: ["E", "D", "C", "B", "A", "S", "S+"],
    effects: [
      { stat: "damageReceived", value: -0.10 },
    ],
  },

  ironWill: {
    id: "ironWill",
    name: "Volonté de Fer",
    description: "-15% dégâts reçus",
    type: TraitType.PASSIVE,
    category: TraitCategory.DEFENSE,
    rarity: ["B", "A", "S", "S+"],
    effects: [
      { stat: "damageReceived", value: -0.15 },
    ],
  },

  tanky: {
    id: "tanky",
    name: "Tank",
    description: "+20% HP",
    type: TraitType.PASSIVE,
    category: TraitCategory.DEFENSE,
    rarity: ["B", "A", "S", "S+"],
    effects: [
      { stat: "hp", value: 0.20 },
    ],
  },

  evasion: {
    id: "evasion",
    name: "Esquive",
    description: "+15% esquive",
    type: TraitType.PASSIVE,
    category: TraitCategory.DEFENSE,
    rarity: ["B", "A", "S", "S+"],
    effects: [
      { stat: "dodge", value: 0.15 },
    ],
  },

  secondWind: {
    id: "secondWind",
    name: "Second Souffle",
    description: "-25% dégâts reçus quand HP < 30% (ne s'applique que quand bonus actif)",
    type: TraitType.CONDITIONAL,
    category: TraitCategory.DEFENSE,
    rarity: ["A", "S", "S+"],
    effects: [
      { stat: "damageReceived", value: -0.25 },
    ],
    condition: "HP < 30%",
    conditionFn: (hpPercent: number) => hpPercent < 0.3,
  },

  // UTILITY TRAITS ===========================

  regenLite: {
    id: "regenLite",
    name: "Régénération Légère",
    description: "Récupère 2% HP par tour",
    type: TraitType.PASSIVE,
    category: TraitCategory.UTILITY,
    rarity: ["C", "B", "A", "S", "S+"],
    effects: [
      { stat: "regen", value: 0.02 },
    ],
  },

  regenStrong: {
    id: "regenStrong",
    name: "Régénération Puissante",
    description: "Récupère 5% HP par tour",
    type: TraitType.PASSIVE,
    category: TraitCategory.UTILITY,
    rarity: ["S", "S+"],
    effects: [
      { stat: "regen", value: 0.05 },
    ],
  },

  sturdy: {
    id: "sturdy",
    name: "Solide",
    description: "+10% HP et +5% défense",
    type: TraitType.PASSIVE,
    category: TraitCategory.UTILITY,
    rarity: ["C", "B", "A", "S", "S+"],
    effects: [
      { stat: "hp", value: 0.10 },
      { stat: "defense", value: 0.05 },
    ],
  },

  adrenaline: {
    id: "adrenaline",
    name: "Adrénaline",
    description: "+15% vitesse et +10% critique quand HP < 25%",
    type: TraitType.CONDITIONAL,
    category: TraitCategory.UTILITY,
    rarity: ["A", "S", "S+"],
    effects: [
      { stat: "speed", value: 0.15 },
      { stat: "critRate", value: 0.10 },
    ],
    condition: "HP < 25%",
    conditionFn: (hpPercent: number) => hpPercent < 0.25,
  },

  // HYBRID TRAITS (bonus + malus) =========

  glassCannon: {
    id: "glassCannon",
    name: "Canon de Verre",
    description: "+25% dégâts infligés, mais +20% dégâts reçus",
    type: TraitType.PASSIVE,
    category: TraitCategory.HYBRID,
    rarity: ["B", "A", "S", "S+"],
    effects: [
      { stat: "damageDealt", value: 0.25 },
      { stat: "damageReceived", value: 0.20, isNegative: true },
    ],
  },

  reckless: {
    id: "reckless",
    name: "Téméraire",
    description: "+20% attaque et +15% défense, mais -10% vitesse",
    type: TraitType.PASSIVE,
    category: TraitCategory.HYBRID,
    rarity: ["C", "B", "A", "S", "S+"],
    effects: [
      { stat: "attack", value: 0.20 },
      { stat: "defense", value: 0.15 },
      { stat: "speed", value: -0.10, isNegative: true },
    ],
  },

  fragileStriker: {
    id: "fragileStriker",
    name: "Frappeur Fragile",
    description: "+35% dégâts infligés, mais -15% HP",
    type: TraitType.PASSIVE,
    category: TraitCategory.HYBRID,
    rarity: ["A", "S", "S+"],
    effects: [
      { stat: "damageDealt", value: 0.35 },
      { stat: "hp", value: -0.15, isNegative: true },
    ],
  },

  berserkMode: {
    id: "berserkMode",
    name: "Mode Berserk",
    description: "+40% dégâts infligés quand HP < 20%, mais +10% dégâts reçus",
    type: TraitType.CONDITIONAL,
    category: TraitCategory.HYBRID,
    rarity: ["S", "S+"],
    effects: [
      { stat: "damageDealt", value: 0.40 },
      { stat: "damageReceived", value: 0.10, isNegative: true },
    ],
    condition: "HP < 20%",
    conditionFn: (hpPercent: number) => hpPercent < 0.2,
  },

  slowButStrong: {
    id: "slowButStrong",
    name: "Lent mais Puissant",
    description: "+25% attaque et +20% défense, mais -20% vitesse",
    type: TraitType.PASSIVE,
    category: TraitCategory.HYBRID,
    rarity: ["B", "A", "S", "S+"],
    effects: [
      { stat: "attack", value: 0.25 },
      { stat: "defense", value: 0.20 },
      { stat: "speed", value: -0.20, isNegative: true },
    ],
  },

  // STATUS EFFECT TRAITS =====================
  // PHASE 2: Traits that apply status effects

  epines: {
    id: "epines",
    name: "Épines",
    description: "Renvoie 20% des dégâts reçus à l'attaquant",
    type: TraitType.PASSIVE,
    category: TraitCategory.DEFENSE,
    rarity: ["B", "A", "S", "S+"],
    effects: [],
  },

  slowTrait: {
    id: "slowTrait",
    name: "Lenteur",
    description: "Tous les 3 attaques, ralentit la cible de 15% pendant 2 tours",
    type: TraitType.PASSIVE,
    category: TraitCategory.UTILITY,
    rarity: ["C", "B", "A", "S", "S+"],
    effects: [],
  },

  coupBas: {
    id: "coupBas",
    name: "Coup Bas",
    description: "Quand HP < 20%, 25% de chance d'étourdir la cible (saut de tour)",
    type: TraitType.CONDITIONAL,
    category: TraitCategory.OFFENSE,
    rarity: ["A", "S", "S+"],
    effects: [],
    condition: "HP < 20%",
    conditionFn: (hpPercent: number) => hpPercent < 0.2,
  },

  venom: {
    id: "venom",
    name: "Venin",
    description: "30% de chance d'empoisonner la cible (6% dégâts par tour, 3 tours)",
    type: TraitType.PASSIVE,
    category: TraitCategory.OFFENSE,
    rarity: ["B", "A", "S", "S+"],
    effects: [],
  },
};

/**
 * Get trait by ID
 */
export function getTraitById(traitId: string): Trait | undefined {
  return TRAITS[traitId];
}

/**
 * Get multiple traits by IDs
 */
export function getTraitsByIds(traitIds: string[]): Trait[] {
  return traitIds
    .map(id => getTraitById(id))
    .filter((trait): trait is Trait => trait !== undefined);
}

/**
 * Apply trait stat modifiers to base stats for battle setup
 * Returns modified stats and breakdown of bonuses/maluses
 * @param baseStats Base stats from spawn
 * @param traitIds Trait IDs to apply
 * @returns { modifiedStats, breakdown } where breakdown shows trait contributions
 */
export function applyTraitStatModifiers(
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    crit: number;
  },
  traitIds: string[]
): {
  modifiedStats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    crit: number;
  };
  breakdown: {
    hpBonus: number;
    attackBonus: number;
    defenseBonus: number;
    speedBonus: number;
    critBonus: number;
  };
} {
  const traits = getTraitsByIds(traitIds);

  let hpMult = 1.0;
  let attackMult = 1.0;
  let defenseMult = 1.0;
  let speedMult = 1.0;
  let critMult = 1.0;

  for (const trait of traits) {
    for (const effect of trait.effects) {
      if (effect.stat === "hp") {
        hpMult += effect.value;
      } else if (effect.stat === "attack") {
        attackMult += effect.value;
      } else if (effect.stat === "defense") {
        defenseMult += effect.value;
      } else if (effect.stat === "speed") {
        speedMult += effect.value;
      } else if (effect.stat === "crit") {
        critMult += effect.value;
      }
    }
  }

  return {
    modifiedStats: {
      hp: Math.max(1, Math.floor(baseStats.hp * hpMult)),
      attack: Math.max(1, Math.floor(baseStats.attack * attackMult)),
      defense: Math.max(1, Math.floor(baseStats.defense * defenseMult)),
      speed: Math.max(1, Math.floor(baseStats.speed * speedMult)),
      crit: Math.max(1, Math.floor(baseStats.crit * critMult)),
    },
    breakdown: {
      hpBonus: (hpMult - 1) * 100,
      attackBonus: (attackMult - 1) * 100,
      defenseBonus: (defenseMult - 1) * 100,
      speedBonus: (speedMult - 1) * 100,
      critBonus: (critMult - 1) * 100,
    },
  };
}

/**
 * Apply trait effects to battle stats
 * @param stats Base stats
 * @param traitIds Trait IDs to apply
 * @param hpPercent Current HP percentage (for conditional traits)
 * @returns Modified damage multipliers
 */
export function applyTraits(
  traitIds: string[],
  hpPercent: number,
  stats: any
): {
  damageDealtMult: number;
  damageReceivedMult: number;
  critRateAdjustment: number;
  critMultAdjustment: number;
  dodgeAdjustment: number;
  regenPerTurn: number;
} {
  const traits = getTraitsByIds(traitIds);

  let damageDealtMult = 1.0;
  let damageReceivedMult = 1.0;
  let critRateAdjustment = 0;
  let critMultAdjustment = 0;
  let dodgeAdjustment = 0;
  let regenPerTurn = 0;

  for (const trait of traits) {
    // Check conditional traits
    if (trait.type === TraitType.CONDITIONAL) {
      if (!trait.conditionFn || !trait.conditionFn(hpPercent, stats)) {
        continue;  // Condition not met, skip this trait
      }
    }

    // Apply effects
    for (const effect of trait.effects) {
      switch (effect.stat) {
        case "damageDealt":
          damageDealtMult += effect.value;
          break;
        case "damageReceived":
          damageReceivedMult += effect.value;
          break;
        case "critRate":
          critRateAdjustment += effect.value;
          break;
        case "critMult":
          critMultAdjustment += effect.value;
          break;
        case "dodge":
          dodgeAdjustment += effect.value;
          break;
        case "regen":
          regenPerTurn += effect.value;
          break;
        // Direct stat modifications handled elsewhere
      }
    }
  }

  return {
    damageDealtMult,
    damageReceivedMult,
    critRateAdjustment,
    critMultAdjustment,
    dodgeAdjustment,
    regenPerTurn,
  };
}
