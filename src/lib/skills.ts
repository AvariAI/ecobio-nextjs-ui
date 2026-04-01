import { PersonalityType } from "./database";

export type SkillType = "offensive" | "defensive" | "utility" | "heal" | "special" | "debuff";

export type SkillSource = "personality" | "specimen";

export interface Skill {
  id: string;
  name: string;
  description: string;
  archetype?: PersonalityType;
  creatureId?: string;  // For specimen skills
  source: SkillSource;  // Where this skill comes from
  type: SkillType;
  level: number;  // 1-5, scales effects

  // Original battle.ts fields (for compatibility)
  effect: "defense" | "dodge" | "speed" | "attack" | "heal" | "debuff" | "special" | "aoe_damage";
  value: number;
  duration: number;
  cooldown: number;
  target?: "front" | "back" | "all" | "random" | "self" | "ally";

  // New fields for advanced skill system
  effects: {
    offenseMultiplier?: number;
    dodgeChance?: number;
    speedBonus?: number;  // NEW for speed buffs
    damageReduction?: number;
    defenseRedirect?: number;
    healPercent?: number;
    selfSacrificePercent?: number;  // Sacrifice % of own HP for ally heal
    poisonPercent?: number;  // Poison DOT damage
    poisonSelfDamage?: number;
    allyBoostSelf?: boolean;
    critDamageBonus?: number;
    ignoreDefPercent?: number;
    selfBoostPercent?: number;
    enemyDebuffPercent?: number;
    recoilPercent?: number;
    redirectionDamageReduction?: number;
    effectDuration?: number;
    taunt?: boolean;  // Forces enemies to target this creature
    ignoreDodge?: boolean;  // Switch to attack: guaranteed hit, bypasses normal dodge checks
    cascade?: boolean;  // Multi-attack cascade style attacks (Esquive Aérienne)
    cascadeChances?: number[];  // Probabilities for each attack in cascade [1.0, 0.70, 0.50, 0.25]
  };
}

// Skills defined per personality (archetype)
export const BASE_SKILLS: Record<PersonalityType, Skill> = {
  agressive: {
    id: "agressive_base",
    name: "Frénésie",
    description: "Buff actif: +50% ATK pendant 2 tours (cooldown: 3 tours)",
    archetype: "agressive",
    source: "personality",
    type: "offensive",
    effect: "attack",
    value: 0.50,  // 50% ATK boost
    duration: 2,  // 2 turns
    cooldown: 3,
    target: "self",
    level: 1,
    effects: {
      effectDuration: 2,
    }
  },

  protective: {
    id: "protective_base",
    name: "Cuirasse",
    description: "Buff actif: +50% DEF pendant 2 tours (cooldown: 3 tours)",
    archetype: "protective",
    source: "personality",
    type: "defensive",
    effect: "defense",
    value: 0.50,  // 50% DEF boost
    duration: 2,
    cooldown: 3,
    target: "self",
    level: 1,
    effects: {
      defenseRedirect: 0.50,
      effectDuration: 2,
    }
  },

  rapide: {
    id: "rapide_base",
    name: "Accélération",
    description: "Buff actif: +50% VITESSE pendant 2 tours (cooldown: 3 tours)",
    archetype: "rapide",
    source: "personality",
    type: "offensive",
    effect: "speed",  // Speed buff
    value: 0.50,  // 50% speed boost
    duration: 2,
    cooldown: 3,
    target: "self",
    level: 1,
    effects: {
      speedBonus: 0.50,
      effectDuration: 2,
    }
  },

  soin_leurre: {
    id: "soin_leurre_base",
    name: "Bouclier Temporel",
    description: "Buff actif: +50% MAX HP pendant 2 tours + rétro-réduction 50% des dégâts reçus à l'expiration (cooldown: 3 tours)",
    archetype: "soin_leurre",
    source: "personality",
    type: "special",
    effect: "defense",
    value: 0.50,  // 50% max HP boost
    duration: 2,
    cooldown: 3,
    target: "self",
    level: 1,
    effects: {
      effectDuration: 2,
    }
  },

  précise: {
    id: "precise_base",
    name: "Visée Laser",
    description: "Buff actif: +50% CRITIQUE pendant 2 tours (cooldown: 3 tours)",
    archetype: "précise",
    source: "personality",
    type: "offensive",
    effect: "attack",
    value: 0.50,  // 50% crit boost
    duration: 2,
    cooldown: 3,
    target: "self",
    level: 1,
    effects: {
      effectDuration: 2,
    }
  },

  balancee: {
    id: "balancee_base",
    name: "Équilibre",
    description: "Buff actif: +25% TOUS les stats (ATK/DEF/VIT/CRIT) pendant 2 tours (cooldown: 3 tours)",
    archetype: "balancee",
    source: "personality",
    type: "special",
    effect: "special",
    value: 0.25,  // 25% all stats
    duration: 2,
    cooldown: 3,
    target: "self",
    level: 1,
    effects: {
      effectDuration: 2,
    }
  },

  mysterieuse: {
    id: "mysterieuse_base",
    name: "Surprise",
    description: "Buff actif: +50% à UNE stat random (ATK/DEF/VIT/CRIT) pendant 2 tours (cooldown: 3 tours)",
    archetype: "mysterieuse",
    source: "personality",
    type: "special",
    effect: "special",
    value: 0.50,  // 50% to one random stat
    duration: 2,
    cooldown: 3,
    target: "self",
    level: 1,
    effects: {
      effectDuration: 2,
    }
  },
};

// Skills defined per specimen (creature species)
// MVP: 1 basic skill per creature - captures the essence of the species, not archetype balance
export const SPECIMEN_SKILLS: Record<string, Skill> = {
  ant: {
    id: "ant_mandibles",
    name: "Morsure de Mandibules",
    description: "Attaque la rangée avant ennemie avec la force combinée des mandibules (dégâts à tous les ennemis avant)",
    creatureId: "ant",
    source: "specimen",
    type: "offensive",
    effect: "aoe_damage",  // Changed from "attack" to "aoe_damage"
    value: 0.75,  // 75% of base ATK damage to each front row target (was 0.5)
    duration: 0,  // Instant
    cooldown: 4,
    target: "front",  // Front row (1-2 targets depending on team size)
    level: 1,
    effects: {
      offenseMultiplier: 0.75,  // Was 0.5
      effectDuration: 0,
    }
  },

  housefly: {
    id: "fly_infiltration",
    name: "Attaque Sournoise",
    description: "Infiltre et contourne les tanks de la rangée avant: frappe une cible de l'arrière pour des dégâts normaux (casse leur protection)",
    creatureId: "housefly",
    source: "specimen",
    type: "offensive",
    effect: "aoe_damage",  // Changed to aoe_damage
    value: 1.0,  // Normal damage to back row target
    duration: 0,
    cooldown: 3,
    target: "back",  // Attack back row directly, bypassing front row protection
    level: 1,
    effects: {
      effectDuration: 0,
    }
  },

  honeybee: {
    id: "honeybee_sting",
    name: "Pollisation Soignante",
    description: "Soigne 10% du PV maximum de TOUS les alliés instantanément (soin biologique basé sur GFP)",
    creatureId: "honeybee",
    source: "specimen",
    type: "heal",
    effect: "heal",
    value: 0.10,  // 10% heal
    duration: 0,  // Instant
    cooldown: 4,
    target: "all",  // ALL allies
    level: 1,
    effects: {
      healPercent: 0.10,
      effectDuration: 0,
    }
  },

  spider_mutant: {
    id: "spider_mutant_web",
    name: "Toile Mutante",
    description: "Lance une toile étrange: Ralentit toute l'équipe ennemie (réduction de 15% VIT, 2 tours)",
    creatureId: "spider_mutant",
    source: "specimen",
    type: "debuff",
    effect: "debuff",
    value: 0.15,  // 15% slow
    duration: 2,
    cooldown: 4,
    target: "all",
    level: 1,
    effects: {
      enemyDebuffPercent: -0.15,
      effectDuration: 2,
    }
  },

  // Legacy "fly" entry for backward compatibility (maps to housefly)
  fly: {
    id: "fly_infiltration",
    name: "Attaque Sournoise",
    description: "Infiltre et contourne les tanks de la rangée avant: frappe une cible de l'arrière pour des dégâts normaux (casse leur protection)",
    creatureId: "housefly",
    source: "specimen",
    type: "offensive",
    effect: "aoe_damage",
    value: 1.0,
    duration: 0,
    cooldown: 3,
    target: "back",
    level: 1,
    effects: {
      effectDuration: 0,
    }
  },
};

// Get specimen skill by creature ID
export function getSpecimenSkill(creatureId: string): Skill | undefined {
  return SPECIMEN_SKILLS[creatureId];
}

// Calculate skill effects based on level (1-5)
export function getSkillAtLevel(skill: Skill, level: number): Skill {
  return {
    ...skill,
    level,
    description: getSkillDescription(skill, level),
    effects: scaleSkillEffects(skill, level)
  };
}

function getSkillDescription(baseSkill: Skill, level: number): string {
  const levelBonus = `Lvl ${level}: `;
  switch (baseSkill.archetype) {
    case "agressive":
      return `${baseSkill.description}${level > 1 ? " Lvl5: 175% damage, 15% recoil" : ""}`;
    case "protective":
      return `${baseSkill.description}${level > 1 ? " Lvl5: 60% redirect, -30% reduced damage" : ""}`;
    case "rapide":
      return `${baseSkill.description}${level > 1 ? " Lvl5: +50%, 2 allies, dodge crit heals 10% maxHP" : ""}`;
    case "soin_leurre":
      return `${baseSkill.description}${level > 1 ? " Lvl5: 20% heal, 12% poison, 5% self poison damage" : ""}`;
    case "précise":
      return `${baseSkill.description}${level > 1 ? " Lvl5: +200% damage, ignore 30% DEF" : ""}`;
    case "balancee":
      return `${baseSkill.description}${level > 1 ? " Lvl5: Steal extra buff on swap" : ""}`;
    case "mysterieuse":
      return `${baseSkill.description}${level > 1 ? " Lvl5: Strategic choice (most cooldowns)" : ""}`;
    default:
      return baseSkill.description;
  }
}

function scaleSkillEffects(baseSkill: Skill, level: number): Skill["effects"] {
  const levelFactor = 1 + (level - 1) * 0.05;  // 1.0 at lvl1, 1.2 at lvl5 (20% boost)
  const effects = { ...baseSkill.effects };
  
  // Scale offensive skills
  if (effects.offenseMultiplier) {
    effects.offenseMultiplier = baseSkill.effects.offenseMultiplier! * levelFactor;
  }
  if (effects.critDamageBonus) {
    effects.critDamageBonus = baseSkill.effects.critDamageBonus! * levelFactor;
  }
  if (effects.ignoreDefPercent) {
    effects.ignoreDefPercent = 0.30 * levelFactor;  // Lvl1: 0%, Lvl5: 36% (capped for balance)
  }
  
  // Scale defensive/utility skills
  if (effects.dodgeChance) {
    effects.dodgeChance = 0.40 + (level - 1) * 0.025;  // Lvl1: 40%, Lvl5: 50%
    if (level === 5) {
      effects.allyBoostSelf = true;  // Lvl5: 2 allies for rapide
    }
  }
  if (effects.damageReduction) {
    effects.damageReduction = 0.50 + (level - 1) * 0.02;  // Lvl5: 58%
  }
  
  // Scale dodge/heal bonus for rapide level 5
  if (baseSkill.archetype === "rapide" && level === 5) {
    effects.healPercent = 0.10;  // 10% maxHP heal on dodge crit
  }
  
  // Scale redirection skill
  if (effects.defenseRedirect) {
    effects.defenseRedirect = 0.50 + (level - 1) * 0.02;  // Lvl5: 58%
    if (level === 5) {
      effects.redirectionDamageReduction = 0.30;  // Lvl5: -30% damage taken
    }
  }
  
  // Scale heal
  if (effects.healPercent && baseSkill.archetype === "soin_leurre") {
    effects.healPercent = 0.15 + (level - 1) * 0.0125;  // Lvl5: 20%
  }
  
  // Scale poison
  if (effects.poisonPercent) {
    effects.poisonPercent = 0.10 + (level - 1) * 0.005;  // Lvl5: 12%
    if (level === 5) {
      effects.poisonSelfDamage = 0.05;  // Lvl5: 5% self damage
    }
  }
  
  // Scale special skills
  if (effects.selfBoostPercent) {
    effects.selfBoostPercent = 0.10 + (level - 1) * 0.005;  // Lvl5: 12%
  }
  if (effects.enemyDebuffPercent) {
    effects.enemyDebuffPercent = -0.10 - (level - 1) * 0.005;  // Lvl5: -12%
  }
  if (level === 5 && (effects.selfBoostPercent || effects.enemyDebuffPercent)) {
    effects.effectDuration = 2;  // Lvl5: 2 turns
  }

  // Scale recoil damage
  if (effects.recoilPercent) {
    effects.recoilPercent = 0.20 - (level - 1) * 0.0125;  // Lvl5: 15%
  }

  // Scale multipliers
  if (effects.offenseMultiplier) {
    effects.offenseMultiplier = 1.5 + (level - 1) * 0.05;  // Lvl5: 1.75 (175%)
  }
  if (effects.critDamageBonus) {
    effects.critDamageBonus = 1.5 + (level - 1) * 0.1;  // Lvl5: 2.0 (200%)
  }

  return effects;
}

// Get base skill for a personality
export function getBaseSkill(personality: PersonalityType): Skill {
  return BASE_SKILLS[personality];
}

export const SKILL_ICONS: Record<PersonalityType, string> = {
  agressive: "⚔️",
  protective: "🛡️",
  rapide: "💨",
  soin_leurre: "💉",
  précise: "🎯",
  balancee: "⚖️",
  mysterieuse: "🎰",
};
