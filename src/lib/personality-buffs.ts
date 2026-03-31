// Personality Buff System - Active buff skills
// Each personality has a unique buff that boosts its corresponding stat(s)

export type PersonalityType =
  | "agressive"
  | "protective"
  | "rapide"
  | "soin_leurre"
  | "précise"
  | "balancee"
  | "mysterieuse";

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

const PERSONALITY_BUFFS: Record<PersonalityType, PersonalityBuff> = {
  // Agressive: +50% ATK for 2 turns
  agressive: {
    id: "buff_frenesie",
    name: "Frénésie",
    personality: "agressive",
    duration: 2,
    cooldown: 3,
    onApply: (creature) => {
      creature.tempStats.atk = Math.floor(creature.tempStats.atk * 1.5);
    },
    onRemove: (creature) => {
      creature.tempStats.atk = Math.floor(creature.tempStats.atk / 1.5);
    },
  },

  // Protective: +50% DEF for 2 turns
  protective: {
    id: "buff_cuirasse",
    name: "Cuirasse",
    personality: "protective",
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

  // Soin-Leurre: +50% MAX HP during buff, damage taken reduced by 50% retroactively on removal
  soin_leurre: {
    id: "buff_bouclier_temporel",
    name: "Bouclier Temporel",
    personality: "soin_leurre",
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

  // Précise: +50% CRIT for 2 turns
  précise: {
    id: "buff_visee_laser",
    name: "Visée Laser",
    personality: "précise",
    duration: 2,
    cooldown: 3,
    onApply: (creature) => {
      creature.tempStats.crit = Math.floor(creature.tempStats.crit * 1.5);
    },
    onRemove: (creature) => {
      creature.tempStats.crit = Math.floor(creature.tempStats.crit / 1.5);
    },
  },

  // Balancee: +25% ALL stats for 2 turns
  balancee: {
    id: "buff_equilibre",
    name: "Équilibre",
    personality: "balancee",
    duration: 2,
    cooldown: 3,
    onApply: (creature) => {
      creature.tempStats.atk = Math.floor(creature.tempStats.atk * 1.25);
      creature.tempStats.def = Math.floor(creature.tempStats.def * 1.25);
      creature.tempStats.speed = Math.floor(creature.tempStats.speed * 1.25);
      creature.tempStats.crit = Math.floor(creature.tempStats.crit * 1.25);
    },
    onRemove: (creature) => {
      creature.tempStats.atk = Math.floor(creature.tempStats.atk / 1.25);
      creature.tempStats.def = Math.floor(creature.tempStats.def / 1.25);
      creature.tempStats.speed = Math.floor(creature.tempStats.speed / 1.25);
      creature.tempStats.crit = Math.floor(creature.tempStats.crit / 1.25);
    },
  },

  // Mysterieuse: +50% to ONE random stat for 2 turns
  mysterieuse: {
    id: "buff_surprise",
    name: "Surprise",
    personality: "mysterieuse",
    duration: 2,
    cooldown: 3,
    onApply: (creature) => {
      // Pick a random stat
      const stats = ["atk", "def", "speed", "crit"];
      const randomStat = stats[Math.floor(Math.random() * stats.length)];

      // Store which stat was boosted for removal
      if (!creature.mysterieuseBoostedStat) {
        creature.mysterieuseBoostedStat = null as "atk" | "def" | "speed" | "crit" | null;
      }
      creature.mysterieuseBoostedStat = randomStat as "atk" | "def" | "speed" | "crit";

      // Apply +50% to that stat
      creature.tempStats[randomStat] = Math.floor(creature.tempStats[randomStat] * 1.5);
    },
    onRemove: (creature) => {
      if (!creature.mysterieuseBoostedStat) return;

      // Remove +50% from the boosted stat
      creature.tempStats[creature.mysterieuseBoostedStat] = Math.floor(
        creature.tempStats[creature.mysterieuseBoostedStat] / 1.5
      );

      creature.mysterieuseBoostedStat = null;
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
