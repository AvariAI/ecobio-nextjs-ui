"use client"

import { useState, useEffect } from "react";
import { CREATURES, Rank, Creature, generateRandomPersonality, PERSONALITIES, PersonalityType, applyPersonalityStats, BaseStats } from "@/lib/database";
import { getVarianceRange, BattleStats } from "@/lib/battle";
import { rollRandomTraits, getTraitsByIds } from "@/lib/traits";
import { transformCreatureToEssence } from "@/lib/craft";
import { loadBreedingEggs, getEggRemainingTime } from "@/lib/breeding";
import { getExplorationBonus } from "@/lib/exploration";
import { DURATION_LEVEL_REQUIREMENTS } from "@/lib/exploration";
import { applyHealthRegenerationToCollection } from "@/lib/health-regen";
import { loadInventory, removeFromInventory } from "@/lib/inventory";
import Link from "next/link";

type HuntingPhase = "ready" | "spawned" | "viewing";

type RarityRank = "E" | "D" | "C" | "B" | "A" | "S" | "S+";

type SortBy = "name" | "rank" | "hp" | "attack" | "defense" | "speed" | "crit";
type SortOrder = "asc" | "desc";

interface HuntedCreature extends Creature {
  id: string;
  finalStats: BattleStats;
  customStats: BattleStats;
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  varianceBreakdown: {
    hp: { base: number; variance: number; final: number };
    atk: { base: number; variance: number; final: number };
    def: { base: number; variance: number; final: number };
    spd: { base: number; variance: number; final: number };
    crit: { base: number; variance: number; final: number };
  };
  feedCount: number;
  feedStat: "hp" | "atk" | "def" | "spd" | "crit" | null;
  createdAt: number;
  creatureId: string;
  traits: string[];  // Trait IDs
  isFavorite: boolean;  // Protection contre la nutrition et le relâchement

  // Star progression (NEW)
  stars: number; // 0-5 (visual progression only, no unlocks)
  combatXP: number; // Current combat XP
  combatXPToNextStar: number; // XP needed for next star
  battlesWon: number; // Track battle wins for stats
  battlesTotal: number; // Total battles fought

  // Exploration system (NEW)
  explorationXP: number; // Exploration experience points
  explorationLevel: number; // Current exploration level
  explorationXPToNext: number; // XP needed for next exploration level
  isOnMission: boolean; // True if creature is currently on exploration mission

  // Health system (NEW)
  currentHP: number; // Current HP (0 to maxHP)
  lastHealTime: number; // Last time auto-regeneration ran
  maxHP: number; // Maximum HP based on stats and level

  // Personality system (NEW)
  personality: "agressive" | "protective" | "rapide" | "soin_leurre" | "precise" | "balancee" | "mysterieuse";
}

function rollRarity(): RarityRank {
  const dist: { rank: RarityRank; weight: number }[] = [
    { rank: "E", weight: 8175 },
    { rank: "D", weight: 1000 },
    { rank: "C", weight: 600 },
    { rank: "B", weight: 150 },
    { rank: "A", weight: 50 },
    { rank: "S", weight: 20 },
    { rank: "S+", weight: 5 },
  ];
  const totalWeight = dist.reduce((sum, item) => sum + item.weight, 0);
  const roll = Math.random() * totalWeight;
  let cum = 0;
  for (const item of dist) {
    cum += item.weight;
    if (roll < cum) return item.rank;
  }
  return "E";
}

function spawnCreature(): HuntedCreature {
  const creaturePool = ["ant", "housefly", "honeybee", "spider_mutant"];
  const creatureId = creaturePool[Math.floor(Math.random() * creaturePool.length)];
  const creature: Creature = CREATURES[creatureId];

  const rank: Rank = rollRarity();
  const [minVar, maxVar] = getVarianceRange(rank);

  // Roll random traits based on rank
  const traits = rollRandomTraits(rank);

  const hpVariance = minVar + Math.random() * (maxVar - minVar);
  const atkVariance = minVar + Math.random() * (maxVar - minVar);
  const defVariance = minVar + Math.random() * (maxVar - minVar);
  const spdVariance = minVar + Math.random() * (maxVar - minVar);
  const critVariance = minVar + Math.random() * (maxVar - minVar);

  // Stats POST-variance
  var varianceStats: BattleStats = {
    hp: Math.max(1, Math.floor(creature.baseStats.hp * hpVariance)),
    attack: Math.max(1, Math.floor(creature.baseStats.attack * atkVariance)),
    defense: Math.max(1, Math.floor(creature.baseStats.defense * defVariance)),
    speed: Math.max(1, Math.floor(creature.baseStats.speed * spdVariance)),
    crit: Math.max(1, Math.floor(creature.baseStats.crit * critVariance)),
    rank, // Add rank field
  };

  // Generate random personality (RNG!)
  const personality = generateRandomPersonality();

  // Apply personality stat modifiers to BaseStats (not BattleStats)
  const personalityDef = PERSONALITIES[personality];
  
  const baseStatsWithPersonality: BaseStats = {
    hp: Math.floor(varianceStats.hp * personalityDef.statModifiers.hp),
    attack: Math.floor(varianceStats.attack * personalityDef.statModifiers.attack),
    defense: Math.floor(varianceStats.defense * personalityDef.statModifiers.defense),
    speed: Math.floor(varianceStats.speed * personalityDef.statModifiers.speed),
    crit: Math.floor(varianceStats.crit * personalityDef.statModifiers.crit)
  };

  // Create final Stats as BattleStats
  const finalStats: BattleStats = {
    hp: baseStatsWithPersonality.hp,
    attack: baseStatsWithPersonality.attack,
    defense: baseStatsWithPersonality.defense,
    speed: baseStatsWithPersonality.speed,
    crit: baseStatsWithPersonality.crit,
    rank,  // Preserve rank
  };

  // Générer un ID unique pour chaque créature spawnée
  const uniqueId = `cre_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    ...creature,
    id: uniqueId,  // ID unique pour cette créature spécifique
    finalStats,
    customStats: finalStats,  // Stats POST-variance + personality deviennent la base de cette créature
    level: 1, // Start at level 1
    currentXP: 0,
    xpToNextLevel: calculateXPToNextLevel(1),
    varianceBreakdown: {
      hp: { base: creature.baseStats.hp, variance: (hpVariance - 1) * 100, final: finalStats.hp },
      atk: { base: creature.baseStats.attack, variance: (atkVariance - 1) * 100, final: finalStats.attack },
      def: { base: creature.baseStats.defense, variance: (defVariance - 1) * 100, final: finalStats.defense },
      spd: { base: creature.baseStats.speed, variance: (spdVariance - 1) * 100, final: finalStats.speed },
      crit: { base: creature.baseStats.crit, variance: (critVariance - 1) * 100, final: finalStats.crit },
    },
    feedCount: 0,
    feedStat: null,
    createdAt: Date.now(),
    creatureId,
    traits,  // Random traits based on rank
    isFavorite: false,  // Pas favori par défaut

    // Star progression initialization
    stars: 0, // 0 stars on spawn (stars are visual only)
    combatXP: 0,
    combatXPToNextStar: 100,
    battlesWon: 0,
    battlesTotal: 0,

    // Exploration system initialization
    explorationXP: 0,
    explorationLevel: 0, // Start at level 0 (all creatures can do 15min missions regardless of level)
    explorationXPToNext: 100,
    isOnMission: false,

    // Health system initialization
    currentHP: finalStats.hp,
    lastHealTime: Date.now(),
    maxHP: finalStats.hp,

    // Personality system (NEW)
    personality: personality
  };
}

const RANK_VALUE: Record<Rank, number> = { E: 1, D: 2, C: 3, B: 4, A: 5, S: 6, "S+": 7 };

// XP donné par rang (en tant que nourriture)
const RANK_XP: Record<Rank, number> = { 
  E: 50, 
  D: 100, 
  C: 200, 
  B: 400, 
  A: 800, 
  S: 1600, 
  "S+": 3200 
};

// XP requis pour level up (exponential)
function calculateXPToNextLevel(level: number): number {
  return Math.floor(100 * level * Math.pow(1.1, level - 1));
}

// Calculer XP que donne une créature comme nourriture
function calculateRankXP(rank: Rank, level: number, baseStats: BattleStats): number {
  const rankXP = RANK_XP[rank];
  // Bonus XP pour higher level
  const levelBonus = 1 + (level - 1) * 0.1;
  return Math.floor(rankXP * levelBonus);
}

// Level scaling pour stats
function getLevelScale(level: number, stat: "hp" | "other"): number {
  if (level === 1) return 1.0;
  const normalizedLevel = (level - 1) / 49;
  if (stat === "hp") {
    return 1.0 + normalizedLevel * 14.7;
  } else {
    return 1.0 + Math.sqrt(normalizedLevel) * 7.4;
  }
}

// Nourrir une créature et calculer XP/level up
function feedCreature(creature: HuntedCreature, foodXP: number): { creature: HuntedCreature; levelUps: number; totalGained: number } {
  let currentCreature = { ...creature };
  let levelUps = 0;
  let totalGained = foodXP;

  // XP restant = XP actuel + XP de la nourriture
  let remainingXP = currentCreature.currentXP + foodXP;

  while (remainingXP >= currentCreature.xpToNextLevel && currentCreature.xpToNextLevel > 0) {
    // Level up!
    remainingXP -= currentCreature.xpToNextLevel;

    const oldLevel = currentCreature.level;

    currentCreature = {
      ...currentCreature,
      level: oldLevel + 1,
      currentXP: 0,
      xpToNextLevel: calculateXPToNextLevel(oldLevel + 1),
      finalStats: {
        ...currentCreature.finalStats,
        hp: Math.floor(currentCreature.customStats.hp * getLevelScale(oldLevel + 1, "hp")),
        attack: Math.floor(currentCreature.customStats.attack * getLevelScale(oldLevel + 1, "other")),
        defense: Math.floor(currentCreature.customStats.defense * getLevelScale(oldLevel + 1, "other")),
        speed: Math.floor(currentCreature.customStats.speed * getLevelScale(oldLevel + 1, "other")),
        crit: Math.floor(currentCreature.customStats.crit * getLevelScale(oldLevel + 1, "other")),
      },
    };

    levelUps++;
  }

  // L'XP restant devient le currentXP
  currentCreature.currentXP = remainingXP;

  return { creature: currentCreature, levelUps, totalGained };
}


function getCreatureImage(creatureId: string, rank: Rank): string {
  if (creatureId === "housefly") {
    const rankSuffix = rank === "S+" ? "S+" : rank;
    return `/ecobio-nextjs-ui/creatures/fly-rank-${rankSuffix}.png`;
  }
  if (creatureId === "ant") {
    const rankSuffix = rank === "S+" ? "S+" : rank;
    return `/ecobio-nextjs-ui/creatures/ant_rank_${rankSuffix}.png`;
  }
  if (creatureId === "honeybee") {
    const rankSuffix = rank === "S+" ? "S+" : rank;
    return `/ecobio-nextjs-ui/creatures/bee-rank-${rankSuffix}.png`;
  }
  if (creatureId === "spider_mutant") {
    return "/ecobio-nextjs-ui/images/creatures/spider_mutant_e.png";
  }
  return "/ecobio-nextjs-ui/images/giant_fly.png";
}

// Fallback image exists checker
function imageExists(imagePath: string): boolean {
  try {
    // This won't work in browser without a fetch, so we'll just return true
    // In production, use a list of known images or an API check
    return true;
  } catch {
    return false;
  }
}

// Render star rating
const renderStars = (stars: number) => {
  return Array(5).fill(0).map((_, i) => (
    <span key={i} className={i < stars ? "text-yellow-400" : "text-gray-600"}>
      ★
    </span>
  ));
};

// Render exploration progress
const renderExplorationProgress = (creature: HuntedCreature, onViewBonuses: (e?: React.MouseEvent) => void) => {
  const totalXP = creature.explorationXP || 0;
  const currentLevel = creature.explorationLevel || 0;
  const xpRequiredPerLevel = 100;
  const xpInCurrentLevel = totalXP - (currentLevel * xpRequiredPerLevel);
  const progressPercent = Math.min(100, (xpInCurrentLevel / xpRequiredPerLevel) * 100);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewBonuses(e);
  };

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer hover:opacity-80 transition-opacity"
      title="Cliquez pour voir les bonus d'exploration"
    >
      <div className="flex items-center gap-1 mb-1">
        <span className="text-amber-500">🗺️</span>
        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
          Expl. Lvl {currentLevel}
        </span>
        <span className="text-xs text-gray-700 dark:text-gray-200 font-medium">
          ({xpInCurrentLevel}/{xpRequiredPerLevel} XP)
        </span>
        <span className="text-xs text-blue-500">ℹ️</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className="bg-amber-500 h-2 rounded-full transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};

export default function HuntingPage() {
  const [phase, setPhase] = useState<HuntingPhase>("ready");
  const [huntedCreature, setHuntedCreature] = useState<HuntedCreature | null>(null);
  const [collection, setCollection] = useState<HuntedCreature[]>([]);
  const [selectedCreature, setSelectedCreature] = useState<HuntedCreature | null>(null);
  const [feedChoice, setFeedChoice] = useState<"hp" | "atk" | "def" | "spd" | "crit" | null>(null);
  const [feedMode, setFeedMode] = useState(false);
  const [selectedFoodIds, setSelectedFoodIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortBy>("rank");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [confirmReleaseAll, setConfirmReleaseAll] = useState(false);
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null);
  const [peekingCreature, setPeekingCreature] = useState<HuntedCreature | null>(null);
  const [feedRankFilter, setFeedRankFilter] = useState<Rank | null>(null);
  const [breedingEggs, setBreedingEggs] = useState<any[]>([]);
  const [showExplorationBonuses, setShowExplorationBonuses] = useState<HuntedCreature | null>(null);
  const [showRemedySelector, setShowRemedySelector] = useState<HuntedCreature | null>(null); // NEW: Remedy selector modal

  useEffect(() => {
    const saved = localStorage.getItem("ecobio-collection");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate existing creatures to have star progression + exploration + health system fields
        const migrated = parsed.map((c: any) => {
          const migrated: any = {
            ...c,
            stars: c.stars ?? 0,
            combatXP: c.combatXP ?? 0,
            combatXPToNextStar: c.combatXPToNextStar ?? 100,
            battlesWon: c.battlesWon ?? 0,
            battlesTotal: c.battlesTotal ?? 0,

            // Exploration system migration
            explorationXP: c.explorationXP ?? 0,
            explorationLevel: c.explorationLevel ?? 0,
            explorationXPToNext: c.explorationXPToNext ?? 100,
            isOnMission: c.isOnMission ?? false,
          };

          // Health system migration (NEW) - migrate existing creatures
          if (!migrated.currentHP || !migrated.lastHealTime || !migrated.maxHP) {
            // Use finalStats.hp as base, calculate maxHP with level scaling
            const baseHP = c.finalStats?.hp || c.customStats?.hp || c.maxHP || 100;
            const level = c.level || 1;

            // Level scaling formula (same as battle.ts)
            const levelScale = 1 + (level - 1) * 0.2;

            migrated.maxHP = Math.floor(baseHP * levelScale);
            migrated.currentHP = migrated.currentHP ?? migrated.maxHP; // Default to full HP
            migrated.lastHealTime = migrated.lastHealTime ?? Date.now(); // Default to now
          }

          return migrated;
        });

        // Apply health regeneration to all creatures
        const regenerated = applyHealthRegenerationToCollection(migrated);
        setCollection(regenerated as HuntedCreature[]);

        // Save regenerated HP if any changed (compare migrated vs regenerated)
        const hpChanged = regenerated.some((c, i) =>
          c.currentHP !== migrated[i].currentHP ||
          c.lastHealTime !== migrated[i].lastHealTime
        );
        if (hpChanged) {
          localStorage.setItem("ecobio-collection", JSON.stringify(regenerated));
          console.log("Health regeneration applied and saved");
        }
      } catch (e) {
        console.error("Failed load collection", e);
      }
    }

    // Load breeding eggs
    const eggs = loadBreedingEggs();
    setBreedingEggs(eggs);
  }, []);

  // Listen for breeding eggs updates
  useEffect(() => {
    const handleEggsUpdate = () => {
      const eggs = loadBreedingEggs();
      setBreedingEggs(eggs);
    };

    window.addEventListener("breeding-eggs-updated", handleEggsUpdate);
    return () => window.removeEventListener("breeding-eggs-updated", handleEggsUpdate);
  }, []);

  // Check if creature is on breeding cooldown
  const isCreatureOnBreedingCooldown = (creatureId: string): boolean => {
    for (const egg of breedingEggs) {
      if (!egg.isHatched && (egg.parent1Id === creatureId || egg.parent2Id === creatureId)) {
        return getEggRemainingTime(egg) > 0;
      }
    }
    return false;
  };

  useEffect(() => {
    if (collection.length > 0) {
      localStorage.setItem("ecobio-collection", JSON.stringify(collection));
    } else {
      localStorage.removeItem("ecobio-collection");
    }
  }, [collection]);

  const sortedCollection = [...collection].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "name": comparison = a.name.localeCompare(b.name); break;
      case "rank": comparison = RANK_VALUE[a.finalStats.rank] - RANK_VALUE[b.finalStats.rank]; break;
      case "hp": comparison = a.finalStats.hp - b.finalStats.hp; break;
      case "attack": comparison = a.finalStats.attack - b.finalStats.attack; break;
      case "defense": comparison = a.finalStats.defense - b.finalStats.defense; break;
      case "speed": comparison = a.finalStats.speed - b.finalStats.speed; break;
      case "crit": comparison = a.finalStats.crit - b.finalStats.crit; break;
    }
    if (sortOrder === "desc") comparison *= -1;
    if (sortBy === "rank" && comparison === 0) return a.name.localeCompare(b.name);
    return comparison;
  });

  const handleAutoSort = () => { setSortBy("rank"); setSortOrder("desc"); };

  // Food collection with rank filter and auto-sort by rank then level
  const RankOrder: Record<Rank, number> = {
    "S+": 7,
    "S": 6,
    "A": 5,
    "B": 4,
    "C": 3,
    "D": 2,
    "E": 1,
  };

  const filteredFoodCollection = [...collection]
    .filter(c => c.id !== selectedCreature?.id && !c.isFavorite && !c.isOnMission)
    .filter(c => feedRankFilter ? c.finalStats.rank === feedRankFilter : true)
    .sort((a, b) => {
      const rankDiff = RankOrder[b.finalStats.rank] - RankOrder[a.finalStats.rank];
      if (rankDiff !== 0) return rankDiff;
      return b.level - a.level;
    });

  // Auto-select functions for feeding
  const autoSelectAll = () => {
    const allIds = new Set(filteredFoodCollection.map(c => c.id));
    setSelectedFoodIds(allIds);
  };

  const autoSelectNone = () => {
    setSelectedFoodIds(new Set());
  };

  const handleSpawn = () => {
    const spawned = spawnCreature();
    setHuntedCreature(spawned);
    setPhase("spawned");
    setFeedChoice(null);
  };

  const handleKeep = () => {
    if (huntedCreature) {
      const kept = { ...huntedCreature };
      setCollection([...collection, kept]);
      setHuntedCreature(null);
      setPhase("ready");
    }
  };

  const handleReleaseSpawn = () => { setHuntedCreature(null); setPhase("ready"); };

  const handleViewCreature = (creature: HuntedCreature) => {
    setSelectedCreature(creature);
    setSelectedRank(creature.finalStats.rank);
    setPhase("viewing");
    setFeedChoice(null);
  };

  const handleReleaseCreature = () => {
    if (selectedCreature) {
      if (selectedCreature.isFavorite) {
        alert("Cette créature est en favori et ne peut pas être relâchée !");
        return;
      }
      const updated = collection.filter(c => c.id !== selectedCreature.id);
      setCollection(updated);
      setSelectedCreature(null);
      setPhase("ready");
    }
  };
  
  const handleTransformToEssence = () => {
    if (!selectedCreature) return;
    if (selectedCreature.isFavorite) {
      alert("Cette créature est en favori et ne peut pas être transformée !");
      return;
    }
    
    if (!confirm(`Transformer ${selectedCreature.name} (${selectedCreature.finalStats.rank}) en Essence Insecte ?`)) return;
    
    // Transform creature to essence
    const { essenceItem } = transformCreatureToEssence(selectedCreature.finalStats.rank);
    
    // Remove creature from collection
    const updated = collection.filter(c => c.id !== selectedCreature.id);
    setCollection(updated);
    
    // Dispatch craft inventory update event
    window.dispatchEvent(new CustomEvent("craft-inventory-updated"));
    
    setSelectedCreature(null);
    setPhase("ready");
    
    alert(`✅ Essence créée: Insecte ${essenceItem.rank} !`);
  };

  const toggleFavorite = (creatureId: string) => {
    const updated = collection.map(c => {
      if (c.id === creatureId) {
        return { ...c, isFavorite: !c.isFavorite };
      }
      return c;
    });
    setCollection(updated);
    if (selectedCreature?.id === creatureId) {
      setSelectedCreature({ ...selectedCreature, isFavorite: !selectedCreature.isFavorite });
    }
  };

  // NEW: Heal creature with remedy
  const handleHealCreature = (creatureId: string) => {
    const creature = collection.find(c => c.id === creatureId);
    if (!creature) {
      alert("Créature introuvable!");
      return;
    }

    const maxHP = creature.maxHP || creature.finalStats.hp;
    const currentHP = creature.currentHP || maxHP;

    if (currentHP >= maxHP) {
      alert(`${creature.name} est déjà pleine vie!`);
      return;
    }

    // Display remedy selector modal
    setShowRemedySelector(creature);
  };

  // NEW: Apply healing with specific remedy
  const handleApplyRemedy = (creature: HuntedCreature, remedy: any) => {
    const maxHP = creature.maxHP || creature.finalStats.hp;
    const currentHP = creature.currentHP || maxHP;
    const healPercent = remedy.healPercent || 50;

    // Calculate healing
    const healAmount = Math.floor(maxHP * (healPercent / 100));
    const newHP = Math.min(maxHP, currentHP + healAmount);

    // Update creature HP
    const updatedCollection = collection.map(c => {
      if (c.id === creature.id) {
        return {
          ...c,
          currentHP: newHP,
          lastHealTime: Date.now()
        };
      }
      return c;
    });

    // Remove remedy from inventory
    removeFromInventory(remedy.id, 1);

    // Save updates
    setCollection(updatedCollection);
    localStorage.setItem("ecobio-collection", JSON.stringify(updatedCollection));

    // Dispatch inventory update event
    window.dispatchEvent(new Event("inventory-updated"));

    // Close selector
    setShowRemedySelector(null);

    alert(`💊 ${creature.name} soignée!\n+${healPercent}% HP: +${healAmount} HP (${currentHP} → ${newHP})`);
  };

  const handleReleaseAll = () => {
    if (confirmReleaseAll) {
      // Ne relâche que les créatures qui ne sont pas favorites (garde les favorites)
      const favoritesOnly = collection.filter(c => c.isFavorite);
      setCollection(favoritesOnly);
      setConfirmReleaseAll(false);
    } else {
      setConfirmReleaseAll(true);
    }
  };

  const handleRankChange = (newRank: Rank) => {
    setSelectedRank(newRank);
  };

  const handleFeedSelect = (stat: "hp" | "atk" | "def" | "spd" | "crit") => { setFeedChoice(stat); };

  // Toggle selection de créature comme nourriture
  const toggleFoodCreature = (creatureId: string) => {
    const creature = collection.find(c => c.id === creatureId);
    if (creature?.isFavorite) {
      alert("Cette créature est en favori et ne peut pas être utilisée comme nourriture !");
      return;
    }
    const newSelection = new Set(selectedFoodIds);
    if (newSelection.has(creatureId)) {
      newSelection.delete(creatureId);
    } else {
      newSelection.add(creatureId);
    }
    setSelectedFoodIds(newSelection);
  };

  // Calculer XP total des créatures sélectionnées
  const calculateTotalXP = () => {
    let total = 0;
    selectedFoodIds.forEach(id => {
      const creature = collection.find(c => c.id === id);
      if (creature) {
        total += calculateRankXP(creature.finalStats.rank, creature.level, creature.finalStats);
      }
    });
    return total;
  };

  // Simuler what would happen on feeding
  const simulateFeeding = () => {
    if (!selectedCreature) return null;
    const totalXP = calculateTotalXP();
    const result = feedCreature(selectedCreature, totalXP);
    return result;
  };

  // Mode sans preview: ancien système de nourrissage par stat
  const handleFeedOldSystem = () => {
    if (selectedCreature && feedChoice) {
      const statKey: "hp" | "attack" | "defense" | "speed" | "crit" = 
        feedChoice === "atk" ? "attack" : feedChoice === "def" ? "defense" : feedChoice === "spd" ? "speed" : "crit";
      const boosted = { ...selectedCreature };
      boosted.feedCount += 1;
      boosted.feedStat = feedChoice;
      boosted.finalStats[statKey] = Math.floor(boosted.finalStats[statKey] * 1.10);
      const updated = collection.map(c => c.id === boosted.id ? boosted : c);
      setCollection(updated);
      setSelectedCreature(boosted);
      setFeedChoice(null);
    }
  };

  const handleFeedNewSystem = () => {
    if (!selectedCreature || selectedFoodIds.size === 0) return;
    
    const totalXP = calculateTotalXP();
    const result = feedCreature(selectedCreature, totalXP);
    
    // Retirer les créatures mangées de la collection
    const otherCreatures = collection.filter(c => !selectedFoodIds.has(c.id));
    
    // Mettre à jour la créature nourrie
    const updated = otherCreatures.map(c => c.id === selectedCreature.id ? result.creature : c);
    setCollection(updated);
    setSelectedCreature(result.creature);
    
    // Reset
    setSelectedFoodIds(new Set());
    setFeedMode(false);
  };

  const formatVariance = (variance: number) => { const sign = variance >= 0 ? "+" : ""; return `${sign}${variance.toFixed(1)}%`; };

  const getVarianceColor = (variance: number) => {
    if (variance >= 20) return "text-yellow-400 font-bold";
    if (variance >= 10) return "text-yellow-300";
    if (variance >= 0) return "text-green-400";
    if (variance >= -10) return "text-yellow-300";
    return "text-red-400";
  };

  const getRankBadgeColor = (rank: Rank) => {
    if (rank === "S+") return "bg-purple-600";
    if (rank === "S") return "bg-yellow-600";
    if (rank === "A") return "bg-red-600";
    if (rank === "B") return "bg-orange-600";
    if (rank === "C") return "bg-green-600";
    if (rank === "D") return "bg-blue-600";
    return "bg-gray-600";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-950 p-6">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-green-300 hover:text-green-200 mb-6 inline-block">← Retour</Link>
        <h1 className="text-4xl font-bold text-green-100 mb-2">🏹 Chasse Créatures</h1>
        <p className="text-green-200 mb-8">Spawn RNG et build ta collection!</p>

        {phase === "ready" && <button onClick={handleSpawn} className="w-full bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 text-white rounded-lg p-4 text-xl font-bold shadow-lg transition-all duration-200">🎯 Spawn</button>}

        {phase === "spawned" && huntedCreature && (
          <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-xl p-6 shadow-xl border border-green-700">
            <div className="flex items-start gap-6 mb-6">
              <div className="w-48 h-48 flex-shrink-0">
                <img
                  src={getCreatureImage(huntedCreature.creatureId, huntedCreature.finalStats.rank)}
                  alt={huntedCreature.name}
                  className="w-full h-full object-cover rounded-lg border-2 border-green-600"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-green-100">{huntedCreature.name}</h2>
                  <span className={`text-2xl font-bold ${getRankBadgeColor(huntedCreature.finalStats.rank)} text-white px-3 py-1 rounded-full`}>{huntedCreature.finalStats.rank}</span>
                </div>
                <p className="text-green-200 mb-4">{huntedCreature.desc}</p>
                {huntedCreature.skill && (
                  <div className="bg-green-700 bg-opacity-50 rounded-lg p-3 mb-4">
                    <h3 className="font-bold text-green-100">🎯 Compétence</h3>
                    <div className="text-sm text-green-200">
                      <p><strong>{huntedCreature.skill.name}</strong>: {huntedCreature.skill.description}</p>
                      <p className="text-xs text-green-300 mt-1">CD: {huntedCreature.skill.cooldown}t | Durée: {huntedCreature.skill.duration}t</p>
                    </div>
                  </div>
                )}
                {huntedCreature.traits && huntedCreature.traits.length > 0 && (
                  <div className="bg-purple-700 bg-opacity-50 rounded-lg p-3 mb-4">
                    <h3 className="font-bold text-purple-100">✨ Traits ({huntedCreature.traits.length})</h3>
                    <div className="mt-2 space-y-2">
                      {getTraitsByIds(huntedCreature.traits).map(trait => (
                        <div key={trait.id} className="bg-purple-900 bg-opacity-50 rounded p-2">
                          <p className="text-sm font-bold text-purple-100">{trait.name}</p>
                          <p className="text-xs text-purple-200">{trait.description}</p>
                          {trait.condition && (
                            <p className="text-xs text-yellow-300 mt-1">Condition: {trait.condition}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <h3 className="text-xl font-bold text-green-100 mb-4">📊 Stats RNG</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {Object.entries(huntedCreature.varianceBreakdown).map(([statName, data]) => {
                const labelMap: Record<string, string> = { hp: "HP", atk: "ATK", def: "DEF", spd: "SPD", crit: "CRIT" };
                return (
                  <div key={statName} className="bg-green-950 rounded-lg p-3 flex justify-between items-center">
                    <div><p className="text-green-200 font-semibold">{labelMap[statName]}</p><p className="text-xs text-green-400">Base: {data.base}</p></div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getVarianceColor(data.variance)}`}>{data.final}</p>
                      <p className={`text-sm ${getVarianceColor(data.variance)}`}>{formatVariance(data.variance)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={handleKeep} className="flex-1 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white rounded-lg p-3 font-bold shadow-lg">♻️ Ajouter</button>
              <button onClick={handleReleaseSpawn} className="flex-1 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white rounded-lg p-3 font-bold shadow-lg">❌ Relâcher</button>
            </div>
          </div>
        )}

        {phase === "viewing" && selectedCreature && (
          <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-xl p-6 shadow-xl border border-green-700">
            <button onClick={() => { setPhase("ready"); setSelectedRank(null); }} className="text-green-300 hover:text-green-200 mb-4 inline-block font-semibold">← Retour</button>
            <div className="flex items-start gap-6 mb-6">
              <div className="w-48 h-48 flex-shrink-0">
                <img
                  src={getCreatureImage(selectedCreature.creatureId, selectedRank || selectedCreature.finalStats.rank)}
                  alt={selectedCreature.name}
                  className="w-full h-full object-cover rounded-lg border-2 border-green-600"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-green-100">{selectedCreature.name}</h2>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(selectedCreature.id); }}
                    className="text-2xl hover:scale-125 transition-transform"
                    title={selectedCreature.isFavorite ? "Retirer des favoris" : "Mettre en favori"}
                  >
                    {selectedCreature.isFavorite ? "❤️" : "🤍"}
                  </button>
                  <span className={`text-2xl font-bold ${getRankBadgeColor(selectedCreature.finalStats.rank)} text-white px-3 py-1 rounded-full`}>{selectedCreature.finalStats.rank}</span>
                </div>
                <p className="text-green-200 mb-4">{selectedCreature.desc}</p>
                <div className="mb-4">
                  <p className="text-green-200 font-semibold mb-2">🎭 Voir par rang:</p>
                  <div className="flex flex-wrap gap-2">
                    {(["E", "D", "C", "B", "A", "S", "S+"] as Rank[]).map(rank => (
                      <button
                        key={rank}
                        onClick={() => handleRankChange(rank)}
                        className={`px-3 py-1 rounded-full font-bold text-sm ${
                          selectedRank === rank
                            ? `${getRankBadgeColor(rank)} ring-2 ring-white`
                            : `${getRankBadgeColor(rank)} opacity-60 hover:opacity-100`
                        }`}
                      >
                        {rank}
                      </button>
                    ))}
                  </div>
                  {selectedRank && selectedRank !== selectedCreature.finalStats.rank && (
                    <p className="text-yellow-300 text-sm mt-2">Affichage: rang {selectedRank} (créature rang {selectedCreature.finalStats.rank})</p>
                  )}
                </div>
                {selectedCreature.skill && (
                  <div className="bg-green-700 bg-opacity-50 rounded-lg p-3 mb-4">
                    <h3 className="font-bold text-green-100">🎯 Compétence</h3>
                    <div className="text-sm text-green-200">
                      <p><strong>{selectedCreature.skill.name}</strong>: {selectedCreature.skill.description}</p>
                      <p className="text-xs text-green-300 mt-1">CD: {selectedCreature.skill.cooldown}t | Durée: {selectedCreature.skill.duration}t</p>
                    </div>
                  </div>
                )}
                <div className="bg-purple-600 bg-opacity-50 rounded-lg p-3 mb-4">
                  <p className="text-purple-100 font-bold">⬆️ Level {selectedCreature.level} | XP: {selectedCreature.currentXP}/{selectedCreature.xpToNextLevel}</p>
                  <div className="w-full bg-purple-950 rounded-full h-2 mt-2">
                    <div
                      className="bg-purple-400 h-2 rounded-full"
                      style={{ width: `${(selectedCreature.currentXP / selectedCreature.xpToNextLevel) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="bg-yellow-600 bg-opacity-50 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    {renderStars(selectedCreature.stars || 0)}
                  </div>
                  <p className="text-yellow-100 font-bold">⭐ Star {selectedCreature.stars || 0} | Combat XP: {selectedCreature.combatXP || 0}/{selectedCreature.combatXPToNextStar || "MAX"}</p>
                  {selectedCreature.stars !== undefined && selectedCreature.stars < 5 && selectedCreature.combatXPToNextStar > 0 && (
                    <div className="w-full bg-yellow-950 rounded-full h-2 mt-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full"
                        style={{ width: `${Math.min(100, ((selectedCreature.combatXP || 0) / Math.max(1, selectedCreature.combatXPToNextStar)) * 100)}%` }}
                      />
                    </div>
                  )}
                  <div className="text-xs text-yellow-200 mt-2">
                    Victoires: {selectedCreature.battlesWon || 0} | Batailles: {selectedCreature.battlesTotal || 0}
                  </div>
                </div>

                {/* NEW: Add exploration progress bar */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-bold text-amber-700 dark:text-amber-400 mb-3">
                    Progression d'Exploration
                  </h3>
                  {renderExplorationProgress(selectedCreature, (e) => {
                    if (e) e.stopPropagation();
                    setShowExplorationBonuses(selectedCreature);
                  })}
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    Envoyez cette créature en mission pour gagner de l'XP et débloquer des durées de mission plus longues.
                  </p>
                </div>

                {selectedCreature.traits && selectedCreature.traits.length > 0 && (
                  <div className="bg-purple-700 bg-opacity-50 rounded-lg p-3 mb-4">
                    <h3 className="font-bold text-purple-100">✨ Traits ({selectedCreature.traits.length})</h3>
                    <div className="mt-2 space-y-2">
                      {getTraitsByIds(selectedCreature.traits).map(trait => (
                        <div key={trait.id} className="bg-purple-900 bg-opacity-50 rounded p-2">
                          <p className="text-sm font-bold text-purple-100">{trait.name}</p>
                          <p className="text-xs text-purple-200">{trait.description}</p>
                          {trait.condition && (
                            <p className="text-xs text-yellow-300 mt-1">Condition: {trait.condition}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <h3 className="text-xl font-bold text-green-100 mb-4">📊 Stats</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {(["hp", "attack", "defense", "speed", "crit"] as const).map(stat => (
                <div key={stat} className="bg-green-950 rounded-lg p-3">
                  <p className="text-green-200 font-semibold">{stat.toUpperCase()}</p>
                  <p className="text-2xl font-bold text-green-100">{selectedCreature.finalStats[stat]}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-green-700 pt-6">
              <h3 className="text-xl font-bold text-green-100 mb-4">🍎 Nourrir</h3>

              {feedMode && (
                <div className="mb-4 p-3 bg-green-900 bg-opacity-50 rounded-lg border border-green-600">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-green-200 font-semibold">Filtre rang:</span>
                    <button
                      onClick={() => setFeedRankFilter(null)}
                      className={`px-3 py-1 rounded-full font-bold text-sm ${feedRankFilter === null ? "ring-2 ring-white bg-gray-600" : "bg-gray-600 opacity-60 hover:opacity-100"}`}
                    >
                      Tout
                    </button>
                    {(["E", "D", "C", "B", "A", "S", "S+"] as Rank[]).map(rank => (
                      <button
                        key={rank}
                        onClick={() => setFeedRankFilter(feedRankFilter === rank ? null : rank)}
                        className={`px-3 py-1 rounded-full font-bold text-sm ${
                          feedRankFilter === rank
                            ? `${getRankBadgeColor(rank)} ring-2 ring-white`
                            : `${getRankBadgeColor(rank)} opacity-60 hover:opacity-100`
                        }`}
                      >
                        {rank}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="text-green-200 font-semibold">Sélection:</span>
                    <button
                      onClick={autoSelectAll}
                      className="bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 text-white rounded px-3 py-1 text-sm font-bold"
                    >
                      ✅ Tout sélectionner
                    </button>
                    <button
                      onClick={autoSelectNone}
                      className="bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white rounded px-3 py-1 text-sm font-bold"
                    >
                      ❌ Tout désélectionner
                    </button>
                  </div>
                </div>
              )}

              {!feedMode ? (
                <button
                  onClick={() => setFeedMode(true)}
                  className={`w-full bg-gradient-to-r from-yellow-700 to-yellow-600 hover:from-yellow-600 hover:to-yellow-500 text-white rounded-lg p-3 font-bold mb-4 ${
                    selectedCreature.isOnMission ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  disabled={selectedCreature.isOnMission}
                >
                  {selectedCreature.isOnMission ? ".🌱 Créature en mission d'exploration" : "🌱 Nourrir avec d'autres créatures"}
                </button>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <button onClick={() => setFeedMode(false)} className="bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white rounded-lg px-3 py-2">← Annuler</button>
                    <div className="flex-1 text-center">
                      <p className="text-green-200 font-semibold">
                        {selectedFoodIds.size} créature{selectedFoodIds.size > 1 ? 's' : ''} sélectionnée{selectedFoodIds.size > 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      onClick={handleFeedNewSystem}
                      disabled={selectedFoodIds.size === 0}
                      className="bg-gradient-to-r from-yellow-700 to-yellow-600 hover:from-yellow-600 hover:to-yellow-500 text-white rounded-lg px-4 py-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ✅ Nourrir
                    </button>
                  </div>

                  {selectedFoodIds.size > 0 && (
                    <div className="bg-blue-900 bg-opacity-50 rounded-lg p-4 mb-4 border-2 border-blue-600">
                      <h4 className="text-blue-200 font-bold mb-2">🔮 Prévision de nutrition</h4>
                      <p className="text-blue-100">Total XP: <strong>{calculateTotalXP()}</strong></p>
                      {(() => {
                        const sim = simulateFeeding();
                        if (sim && sim.levelUps > 0) {
                          return (
                            <div className="mt-2">
                              <p className="text-yellow-300 font-semibold">⬆️ Level up! {selectedCreature.level} → {sim.creature.level}</p>
                              <p className="text-blue-200 text-sm">{sim.levelUps} level up{sim.levelUps > 1 ? 's' : ''}</p>
                            </div>
                          );
                        }
                        return <p className="text-blue-200 text-sm">Pas de level up ({selectedCreature.level} → {selectedCreature.level})</p>;
                      })()}
                    </div>
                  )}

                  <div className="max-h-64 overflow-y-auto border-2 border-green-700 rounded-lg p-2">
                    {filteredFoodCollection.map(creature => (
                      <div
                        key={creature.id}
                        onClick={() => toggleFoodCreature(creature.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg mb-2 cursor-pointer transition-colors ${
                          selectedFoodIds.has(creature.id) ? 'bg-yellow-700 bg-opacity-50' : 'hover:bg-green-700 bg-opacity-30'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFoodIds.has(creature.id)}
                          onChange={() => toggleFoodCreature(creature.id)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={creature.isFavorite}
                          className="w-5 h-5"
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(creature.id); }}
                          className="text-lg hover:scale-125 transition-transform"
                          title={creature.isFavorite ? "Retirer des favoris" : "Mettre en favori"}
                        >
                          {creature.isFavorite ? "❤️" : "🤍"}
                        </button>
                        <img
                          src={getCreatureImage(creature.creatureId, creature.finalStats.rank)}
                          alt={creature.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="text-green-100 font-semibold text-sm">{creature.name}</p>
                          <p className="text-green-300 text-xs">
                            Level {creature.level} | Rang {creature.finalStats.rank}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className="text-yellow-300 font-bold">+{calculateRankXP(creature.finalStats.rank, creature.level, creature.finalStats)}</p>
                            <p className="text-green-400 text-xs">XP</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setPeekingCreature(creature); }}
                            className="text-lg hover:scale-125 transition-transform"
                            title="Voir les détails"
                          >
                            👁️
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredFoodCollection.length === 0 && (
                      <p className="text-center text-green-400 py-4">
                        Aucune créature disponible pour nourrir (vérifie le filtre de rang)
                      </p>
                    )}
                  </div>
                </>
              )}
              <button onClick={handleReleaseCreature} className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white rounded-lg p-3 mt-4 font-bold shadow-lg">❌ Relâcher</button>
              <button onClick={handleTransformToEssence} className="w-full bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white rounded-lg p-3 mt-3 font-bold shadow-lg">✨ Transformer en Essence</button>
              <button onClick={() => handleHealCreature(selectedCreature.id)} className="w-full bg-gradient-to-r from-pink-700 to-pink-600 hover:from-pink-600 hover:to-pink-500 text-white rounded-lg p-3 mt-3 font-bold shadow-lg">💊 Soigner</button>
            </div>
          </div>
        )}

        {phase === "ready" && collection.length > 0 && (
          <div className="mt-8">
            {/* TRI FILTERS */}
            <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-lg p-4 mb-4 border border-green-700">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="sortBy" className="text-green-200 font-semibold">Trier:</label>
                  <select id="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className="bg-green-950 text-green-100 rounded px-3 py-2 border border-green-600 focus:outline-none focus:border-green-500">
                    <option value="name">Alpha</option>
                    <option value="rank">Rang</option>
                    <option value="hp">HP</option>
                    <option value="attack">ATK</option>
                    <option value="defense">DEF</option>
                    <option value="speed">VIT</option>
                    <option value="crit">CRIT</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="sortOrder" className="text-green-200 font-semibold">Ordre:</label>
                  <select id="sortOrder" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as SortOrder)} className="bg-green-950 text-green-100 rounded px-3 py-2 border border-green-600 focus:outline-none focus:border-green-500">
                    <option value="asc">↑</option>
                    <option value="desc">↓</option>
                  </select>
                </div>
                <button onClick={handleAutoSort} className="bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 text-white rounded px-4 py-2 font-bold">⚡ Auto (Top-Rank + Alpha)</button>
                <button onClick={handleReleaseAll} className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white rounded px-4 py-2 font-bold">🗑️ Tout relâcher</button>
                {confirmReleaseAll && (
                  <div className="flex items-center gap-2">
                    <p className="text-yellow-200 text-sm">Confirmer tout relâcher? C'est l'irréversible!</p>
                    <button onClick={() => { setCollection(collection.filter(c => c.isFavorite)); setConfirmReleaseAll(false); }} className="bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-white rounded px-3 py-1 text-sm font-bold">OUI</button>
                    <button onClick={() => setConfirmReleaseAll(false)} className="bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white rounded px-3 py-1 text-sm font-bold">Annuler</button>
                  </div>
                )}
              </div>
            </div>

            <h2 className="text-2xl font-bold text-green-100 mb-4">📦 Collection ({collection.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedCollection.map(c => {
                const onBreedingCooldown = isCreatureOnBreedingCooldown(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => handleViewCreature(c)}
                    className="bg-gradient-to-br from-green-800 to-green-900 rounded-lg p-4 pt-12 border border-green-700 hover:border-green-600 cursor-pointer hover:scale-105 transition-all duration-200 relative"
                  >
                    {/* Exploration level badge - top left, compact */}
                    <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-lg font-semibold">
                      🗺️{c.explorationLevel || 0}
                    </div>

                    {/* Exploration mission indicator - below exploration level */}
                    {c.isOnMission && (
                      <div className="absolute top-8 left-2 bg-orange-600 text-white text-xs px-1.5 py-0.5 rounded-lg" title="En mission d'exploration">
                        🗺️
                      </div>
                    )}

                    {/* Favorite button - top right */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(c.id); }}
                      className="absolute top-2 right-2 text-xl hover:scale-125 transition-transform z-10"
                      title={c.isFavorite ? "Retirer des favoris" : "Mettre en favori"}
                    >
                      {c.isFavorite ? "❤️" : "🤍"}
                    </button>

                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-16 h-16 flex-shrink-0">
                        <img
                          src={getCreatureImage(c.creatureId, c.finalStats.rank)}
                          alt={c.name}
                          className="w-full h-full object-cover rounded border border-green-700"
                        />
                      </div>
                      <div className="flex-1 pr-8">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-green-100">{c.name}</h3>
                          <span className={`font-bold ${getRankBadgeColor(c.finalStats.rank)} text-white px-2 py-1 rounded-full text-sm`}>{c.finalStats.rank}</span>
                        </div>
                        <p className="text-yellow-300 text-sm mt-1">Level {c.level}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {renderStars(c.stars || 0)}
                        </div>
                        <div className="text-xs text-gray-300 mt-1">
                          Combat XP: {c.combatXP || 0}/{c.combatXPToNextStar || "MAX"}
                        </div>
                      {c.stars !== undefined && c.stars < 5 && c.combatXPToNextStar > 0 && (
                        <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                          <div
                            className="bg-yellow-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(100, ((c.combatXP || 0) / Math.max(1, c.combatXPToNextStar)) * 100)}%` }}
                          />
                        </div>
                      )}
                      {c.traits && c.traits.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {getTraitsByIds(c.traits).slice(0, 2).map(trait => (
                            <span key={trait.id} className="px-1 py-0.5 text-xs rounded bg-purple-700 text-white">
                              {trait.name}
                            </span>
                          ))}
                          {c.traits.length > 2 && (
                            <span className="px-1 py-0.5 text-xs rounded bg-purple-900 text-purple-200">
                              +{c.traits.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {c.feedCount > 0 && <p className="text-yellow-300 text-sm mt-1">Nourri {c.feedCount}x</p>}
                  {onBreedingCooldown && <p className="text-purple-300 text-sm mt-1">🥚 Incubation</p>}
                  <div className="grid grid-cols-5 gap-1 mt-3 text-center text-xs pointer-events-none">
                    {/* HP with current/max display and color indicator */}
                    {(() => {
                      const currentHP = Math.floor(c.currentHP || c.maxHP || c.finalStats.hp);
                      const maxHP = Math.floor(c.maxHP || c.finalStats.hp);
                      const hpPercent = Math.min(100, Math.max(0, (currentHP / maxHP) * 100));
                      const hpColor = hpPercent > 50 ? "text-green-100" : hpPercent > 25 ? "text-yellow-100" : "text-red-100";
                      return (
                        <div className="bg-green-950 rounded p-1">
                          <p className="text-green-200">HP</p>
                          <p className={`${hpColor} font-bold`}>{currentHP}/{maxHP}</p>
                        </div>
                      );
                    })()}
                    <div className="bg-green-950 rounded p-1"><p className="text-green-200">ATK</p><p className="text-green-100 font-bold">{c.finalStats.attack}</p></div>
                    <div className="bg-green-950 rounded p-1"><p className="text-green-200">DEF</p><p className="text-green-100 font-bold">{c.finalStats.defense}</p></div>
                    <div className="bg-green-950 rounded p-1"><p className="text-green-200">SPD</p><p className="text-green-100 font-bold">{c.finalStats.speed}</p></div>
                    <div className="bg-green-950 rounded p-1"><p className="text-green-200">CRIT</p><p className="text-green-100 font-bold">{c.finalStats.crit}</p></div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {peekingCreature && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setPeekingCreature(null)}>
            <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-xl p-6 max-w-2xl w-full mx-4 border-2 border-green-600 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold text-green-100">{peekingCreature.name}</h2>
                <button onClick={() => setPeekingCreature(null)} className="text-2xl hover:scale-110 transition-transform">❌</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <img
                    src={getCreatureImage(peekingCreature.creatureId, peekingCreature.finalStats.rank)}
                    alt={peekingCreature.name}
                    className="w-full rounded-lg border-2 border-green-600"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`text-3xl font-bold ${getRankBadgeColor(peekingCreature.finalStats.rank)} text-white px-4 py-2 rounded-full`}>{peekingCreature.finalStats.rank}</span>
                    <span className="text-2xl text-yellow-300 font-bold">L{peekingCreature.level}</span>
                    <button
                      onClick={(e) => { toggleFavorite(peekingCreature.id); setPeekingCreature({ ...peekingCreature, isFavorite: !peekingCreature.isFavorite }); }}
                      className="text-2xl hover:scale-125 transition-transform"
                    >
                      {peekingCreature.isFavorite ? "❤️" : "🤍"}
                    </button>
                  </div>

                  <div className="space-y-2 mb-4">
                    {/* HP with current/max and color indicator */}
                    {(() => {
                      const currentHP = Math.floor(peekingCreature.currentHP || peekingCreature.maxHP || peekingCreature.finalStats.hp);
                      const maxHP = Math.floor(peekingCreature.maxHP || peekingCreature.finalStats.hp);
                      const hpPercent = Math.min(100, Math.max(0, (currentHP / maxHP) * 100));
                      return (
                        <div>
                          <strong>HP:</strong> <span className={`${hpPercent > 50 ? "text-green-100" : hpPercent > 25 ? "text-yellow-100" : "text-red-100"}`}>{currentHP}/{maxHP}</span>
                          {hpPercent < 100 && ` (${hpPercent.toFixed(0)}%)`}
                        </div>
                      );
                    })()}
                    <div><strong>ATK:</strong> {peekingCreature.finalStats.attack}</div>
                    <div><strong>DEF:</strong> {peekingCreature.finalStats.defense}</div>
                    <div><strong>SPD:</strong> {peekingCreature.finalStats.speed}</div>
                    <div><strong>CRIT:</strong> {peekingCreature.finalStats.crit}%</div>
                  </div>

                  {peekingCreature.isFavorite && (
                    <div className="bg-pink-600 bg-opacity-30 rounded-lg p-3 mb-4 border border-pink-500">
                      <p className="text-pink-200 font-semibold">🔒 Protégé (favori)</p>
                    </div>
                  )}
                </div>
              </div>

              {peekingCreature.traits && peekingCreature.traits.length > 0 && (
                <div className="mt-6 bg-purple-700 bg-opacity-30 rounded-lg p-4 border border-purple-500">
                  <h3 className="text-xl font-bold text-purple-100 mb-3">✨ Traits ({peekingCreature.traits.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {getTraitsByIds(peekingCreature.traits).map(trait => (
                      <div key={trait.id} className="bg-purple-900 bg-opacity-50 rounded p-3">
                        <p className="font-bold text-purple-100">{trait.name}</p>
                        <p className="text-sm text-purple-200">{trait.description}</p>
                        {trait.condition && (
                          <p className="text-xs text-yellow-300 mt-1">Condition: {trait.condition}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <h3 className="text-xl font-bold text-green-100 mb-3">📊 Valeur XP (nourriture)</h3>
                <p className="text-2xl text-yellow-300 font-bold">+{calculateRankXP(peekingCreature.finalStats.rank, peekingCreature.level, peekingCreature.finalStats)} XP</p>
              </div>

              <button
                onClick={() => setPeekingCreature(null)}
                className="w-full mt-6 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white rounded-lg p-3 font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* Exploration Bonuses Modal */}
        {showExplorationBonuses && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-amber-900 to-orange-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">
                  📊 Bonus d'Exploration - {showExplorationBonuses.name}
                </h3>
                <button
                  onClick={() => setShowExplorationBonuses(null)}
                  className="text-gray-300 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="mb-6">
                <p className="text-lg text-amber-200 mb-2">
                  Niveau {showExplorationBonuses.explorationLevel || 0}
                </p>
                <p className="text-sm text-amber-400">
                  {showExplorationBonuses.explorationXP || 0} XP total
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-black bg-opacity-30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-green-400">💚 Réduction Mort</span>
                    <span className="text-2xl font-bold text-green-200">
                      {Math.max(-30, -(showExplorationBonuses.explorationLevel || 0)).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-amber-300">
                    Maximale: -30% au niveau 30
                  </p>
                </div>

                <div className="bg-black bg-opacity-30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-yellow-400">💰 Double Loot</span>
                    <span className="text-2xl font-bold text-yellow-200">
                      {Math.min(30, showExplorationBonuses.explorationLevel || 0).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-amber-300">
                    Maximale: +30% au niveau 30
                  </p>
                </div>

                <div className="bg-black bg-opacity-30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-blue-400">⏱️ Réduction Temps</span>
                    <span className="text-2xl font-bold text-blue-200">
                      {Math.max(-7.5, -(showExplorationBonuses.explorationLevel || 0) * 0.25).toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-sm text-amber-300">
                    Maximale: -7.5% par créature au niveau 30 (cumulé à -37.5% avec 5 créatures)
                  </p>
                </div>

                <div className="bg-black bg-opacity-30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-purple-400">✨ Bonus Rareté</span>
                    <span className="text-2xl font-bold text-purple-200">
                      {Math.min(15, (showExplorationBonuses.explorationLevel || 0) * 0.5).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-sm text-amber-300">
                    Maximale: +15% au niveau 30
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-lg font-bold text-white mb-3">🗺️ Durées Débloquées</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className={`rounded-lg p-3 text-center ${
                    (showExplorationBonuses.explorationLevel || 0) >= DURATION_LEVEL_REQUIREMENTS["15min"]
                      ? "bg-green-600 text-white"
                      : "bg-gray-600 text-gray-400"
                  }`}>
                    <div className="font-bold">15 min</div>
                    <div className="text-xs">Lvl 0</div>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${
                    (showExplorationBonuses.explorationLevel || 0) >= DURATION_LEVEL_REQUIREMENTS["30min"]
                      ? "bg-green-600 text-white"
                      : "bg-gray-600 text-gray-400"
                  }`}>
                    <div className="font-bold">30 min</div>
                    <div className="text-xs">Lvl 5</div>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${
                    (showExplorationBonuses.explorationLevel || 0) >= DURATION_LEVEL_REQUIREMENTS["1h"]
                      ? "bg-green-600 text-white"
                      : "bg-gray-600 text-gray-400"
                  }`}>
                    <div className="font-bold">1h</div>
                    <div className="text-xs">Lvl 10</div>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${
                    (showExplorationBonuses.explorationLevel || 0) >= DURATION_LEVEL_REQUIREMENTS["2h"]
                      ? "bg-green-600 text-white"
                      : "bg-gray-600 text-gray-400"
                  }`}>
                    <div className="font-bold">2h</div>
                    <div className="text-xs">Lvl 20</div>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${
                    (showExplorationBonuses.explorationLevel || 0) >= DURATION_LEVEL_REQUIREMENTS["4h"]
                      ? "bg-green-600 text-white"
                      : "bg-gray-600 text-gray-400"
                  }`}>
                    <div className="font-bold">4h</div>
                    <div className="text-xs">Lvl 25</div>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${
                    (showExplorationBonuses.explorationLevel || 0) >= DURATION_LEVEL_REQUIREMENTS["8h"]
                      ? "bg-green-600 text-white"
                      : "bg-gray-600 text-gray-400"
                  }`}>
                    <div className="font-bold">8h</div>
                    <div className="text-xs">Lvl 30</div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowExplorationBonuses(null)}
                className="w-full mt-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg p-4 font-bold text-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* Remedy Selector Modal */}
        {showRemedySelector && (() => {
          const inventory = loadInventory();
          const remedyItems = inventory.items.filter(i => i.type === "remedy");
          const maxHP = Math.floor(showRemedySelector.maxHP || showRemedySelector.finalStats.hp);
          const currentHP = Math.floor(showRemedySelector.currentHP || maxHP);
          const hpNeeded = maxHP - currentHP;

          if (remedyItems.length === 0) {
            return (
              <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowRemedySelector(null)}>
                <div className="bg-gradient-to-br from-red-900 to-pink-800 rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-white">💊 Aucun Remède</h3>
                    <button onClick={() => setShowRemedySelector(null)} className="text-gray-300 hover:text-white text-2xl">✕</button>
                  </div>
                  <p className="text-xl text-pink-200 mb-4">
                    Aucun remède disponible dans l'inventaire!
                  </p>
                  <p className="text-sm text-pink-300 mb-6">
                    Va dans l'atelier de craft pour fabriquer des remèdes avec 2 plantes médicales.
                  </p>
                  <Link href="/craft">
                    <button className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg p-3 font-bold">
                      🧪 Atelier de Craft
                    </button>
                  </Link>
                </div>
              </div>
            );
          }

          return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowRemedySelector(null)}>
              <div className="bg-gradient-to-br from-pink-900 to-rose-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-white">
                    💊 Sélectionner Remède - {showRemedySelector.name}
                  </h3>
                  <button onClick={() => setShowRemedySelector(null)} className="text-gray-300 hover:text-white text-2xl">✕</button>
                </div>

                <div className="bg-black bg-opacity-30 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-green-400">État Actuel</span>
                    <span className="text-2xl font-bold text-white">{currentHP}/{maxHP}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-red-500 to-yellow-500 h-full transition-all duration-300"
                      style={{ width: `${(currentHP / maxHP) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-pink-300 mt-2">
                    Besoin: +{hpNeeded} HP ({((hpNeeded / maxHP) * 100).toFixed(0)}%)
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-lg font-bold text-white mb-3">Remèdes Disponibles:</h4>
                  {remedyItems.map(remedy => {
                    const healPercent = remedy.healPercent || 50;
                    const healAmount = Math.floor(maxHP * (healPercent / 100));
                    const actualHeal = Math.min(hpNeeded, healAmount);
                    const isEffective = actualHeal > 0;

                    if (remedy.count <= 0) return null;

                    return (
                      <button
                        key={remedy.id}
                        onClick={() => handleApplyRemedy(showRemedySelector, remedy)}
                        disabled={!isEffective}
                        className={`w-full rounded-xl p-4 text-left transition-all ${
                          isEffective
                            ? "bg-gradient-to-r from-pink-700 to-rose-600 hover:from-pink-600 hover:to-rose-500 text-white cursor-pointer transform hover:scale-105"
                            : "bg-gray-700 text-gray-400 cursor-not-allowed opacity-60"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">💊</span>
                            <div>
                              <p className="font-bold text-lg">Remède {remedy.rank}</p>
                              <p className="text-sm text-pink-200">+{healPercent}% HP (+{healAmount} HP max)</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">{remedy.count}×</p>
                            <p className="text-xs text-pink-300">disponible</p>
                          </div>
                        </div>
                        {isEffective && (
                          <div className="mt-2 text-sm">
                            <span className="text-green-300">
                              → Après: {Math.min(maxHP, currentHP + healAmount)}/{maxHP}
                            </span>
                          </div>
                        )}
                        {!isEffective && (
                          <div className="mt-2 text-sm text-red-300">
                            → Trop puissant (gâcherais {healAmount - hpNeeded} HP)
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
