// Personality Buff System - Active buff skills
// Each personality has a unique buff that boosts its corresponding stat(s)

export type PersonalityType =
  | "agressif"
  | "protecteur"
  | "rapide"
  | "stratège"
  | "précis"
  | "mystérieux";

export interface PersonalityBuff {
  id: string;
  name: string;
  personality: PersonalityType;
  duration: number; // Turns
  cooldown: number; // Turns
  onApply: (creature: any) => void;
  onRemove: (creature: any) => void;
}

// soin_leurre specific damage tracking
export interface SoinLeurreState {
  damageTakenDuringBuff: number;
}

// Personality Buffs definitions
const PERSONALITY_BUFFS: Record<PersonalityType, PersonalityBuff> = {
  // Agressif: +50% ATK for 2 turns
  agressif: {
    id: "buff_frenesie",
    name: "Frénésie",
    personality: "agressif",
    duration: 2,
    cooldown: 3,
    onApply: (creature) => {
      creature.tempStats.atk = Math.floor(creature.tempStats.atk * 1.5);
    },
    onRemove: (creature) => {
      creature.tempStats.atk = Math.floor(creature.tempStats.atk / 1.5);
    },
  },

  // Protecteur: +50% DEF for 2 turns
  protecteur: {
    id: "buff_cuirasse",
    name: "Cuirasse",
    personality: "protecteur",
    duration: 2,
    cooldown: 3,
    onApply: (creature) => {
      creature.tempStats.def = Math.floor(creature.tempStats.def * 1.5);
    },
    onRemove: (creature) => {
      creature.tempStats.def = Math.floor(creature.tempStats.def / 1.5);
    },
  },

  // Rapide: +50% SPEED for 2 turns
  rapide: {
    id: "buff_acceleration",
    name: "Accélération",
    personality: "rapide",
    duration: 2,
    cooldown: 3,
    onApply: (creature) => {
      creature.tempStats.speed = Math.floor(creature.tempStats.speed * 1.5);
    },
    onRemove: (creature) => {
      creature.tempStats.speed = Math.floor(creature.tempStats.speed / 1.5);
    },
  },

  // Stratège: +50% MAX HP during buff, damage taken reduced by 50% retroactively on removal
  stratège: {
    id: "buff_bouclier_temporel",
    name: "Bouclier Temporel",
    personality: "stratège",
    duration: 2,
    cooldown: 3,
    onApply: (creature) => {
      // Store original max HP
      if (!creature.originalMaxHP) {
        creature.originalMaxHP = creature.tempStats.maxHP;
      }
      // Apply +50% max HP
      creature.tempStats.maxHP = Math.floor(creature.originalMaxHP * 1.5);
      // Initialize damage tracking
      if (!creature.soinLeurreState) {
        creature.soinLeurreState = {
          damageTakenDuringBuff: 0,
        };
      } else {
        // Reset for new buff application
        creature.soinLeurreState.damageTakenDuringBuff = 0;
      }
    },
    onRemove: (creature) => {
      if (!creature.originalMaxHP || !creature.soinLeurreState) return;

      // Reduce damage taken during buff by 50%
      const damageReduction = Math.floor(creature.soinLeurreState.damageTakenDuringBuff * 0.5);
      // Apply the reduction as HP recovery
      creature.currentHP = Math.min(
        creature.tempStats.maxHP,
        creature.currentHP + damageReduction
      );

      // Restore original max HP
      creature.tempStats.maxHP = creature.originalMaxHP;

      // Cap HP at new max
      if (creature.currentHP > creature.tempStats.maxHP) {
        creature.currentHP = creature.tempStats.maxHP;
      }
    },
  },

  // Précis: +50% CRIT for 2 turns
  précis: {
    id: "buff_visee_laser",
    name: "Visée Laser",
    personality: "précis",
    duration: 2,
    cooldown: 3,
    onApply: (creature) => {
      creature.tempStats.crit = Math.floor(creature.tempStats.crit * 1.5);
    },
    onRemove: (creature) => {
      creature.tempStats.crit = Math.floor(creature.tempStats.crit / 1.5);
    },
  },

  // Mystérieux: +50% to ONE random stat for 2 turns
  mystérieux: {
    id: "buff_surprise",
    name: "Surprise",
    personality: "mystérieux",
    duration: 2,
    cooldown: 3,
    onApply: (creature) => {
      // Pick a random stat
      const stats = ["atk", "def", "speed", "crit"];
      const randomStat = stats[Math.floor(Math.random() * stats.length)];

      // Store which stat was boosted for removal
      if (!creature.mystérieuxBoostedStat) {
        creature.mystérieuxBoostedStat = null as "atk" | "def" | "speed" | "crit" | null;
      }
      creature.mystérieuxBoostedStat = randomStat as "atk" | "def" | "speed" | "crit";

      // Apply +50% to that stat
      creature.tempStats[randomStat] = Math.floor(creature.tempStats[randomStat] * 1.5);
    },
    onRemove: (creature) => {
      if (!creature.mystérieuxBoostedStat) return;

      // Remove +50% from the boosted stat
      creature.tempStats[creature.mystérieuxBoostedStat] = Math.floor(
        creature.tempStats[creature.mystérieuxBoostedStat] / 1.5
      );

      creature.mystérieuxBoostedStat = null;
    },
  },
};

export function getPersonalityBuff(personality: PersonalityType): PersonalityBuff | null {
  return PERSONALITY_BUFFS[personality] || null;
}

export function trackDamageForSoinLeurre(creature: any, damage: number) {
  if (creature.activeBuffs?.some((b: any) => b.id === "buff_bouclier_temporel")) {
    if (!creature.soinLeurreState) {
      creature.soinLeurreState = { damageTakenDuringBuff: 0 };
    }
    creature.soinLeurreState.damageTakenDuringBuff += damage;
  }
}
