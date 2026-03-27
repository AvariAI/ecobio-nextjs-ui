"use client"

import { useState, useEffect } from "react";
import { CREATURES, Rank, Creature } from "@/lib/database";
import { getVarianceRange, BattleStats } from "@/lib/battle";
import Link from "next/link";

type HuntingPhase = "ready" | "spawned" | "viewing";

type RarityRank = "E" | "D" | "C" | "B" | "A" | "S" | "S+";

type SortBy = "name" | "rank" | "hp" | "attack" | "defense" | "speed" | "crit";
type SortOrder = "asc" | "desc";

interface HuntedCreature extends Creature {
  id: string;
  finalStats: BattleStats;
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
  const creaturePool = ["ant", "housefly", "honeybee"];
  const creatureId = creaturePool[Math.floor(Math.random() * creaturePool.length)];
  const creature: Creature = CREATURES[creatureId];

  // RNG buffer pour l'Abeille (50-50 ATK/DEF)
  let skillOverride: any = null;
  if (creatureId === "honeybee") {
    const hasATKSkill = Math.random() > 0.5;
    skillOverride = {
      name: "Essaim Stimulant",
      description: hasATKSkill
        ? "Buff +40% ATK sur un allié pendant 2 tours"
        : "Buff +40% DEF sur un allié pendant 2 tours",
      effect: hasATKSkill ? "attack" : "defense",
      value: 0.40,
      duration: 2,
      cooldown: 3,
    };
  }
  const rank: Rank = rollRarity();
  const [minVar, maxVar] = getVarianceRange(rank);

  const hpVariance = minVar + Math.random() * (maxVar - minVar);
  const atkVariance = minVar + Math.random() * (maxVar - minVar);
  const defVariance = minVar + Math.random() * (maxVar - minVar);
  const spdVariance = minVar + Math.random() * (maxVar - minVar);
  const critVariance = minVar + Math.random() * (maxVar - minVar);

  const finalStats: BattleStats = {
    hp: Math.max(1, Math.floor(creature.baseStats.hp * hpVariance)),
    attack: Math.max(1, Math.floor(creature.baseStats.attack * atkVariance)),
    defense: Math.max(1, Math.floor(creature.baseStats.defense * defVariance)),
    speed: Math.max(1, Math.floor(creature.baseStats.speed * spdVariance)),
    crit: Math.max(1, Math.floor(creature.baseStats.crit * critVariance)),
    rank,
  };

  const creatureWithSkill = skillOverride ? { ...creature, skill: skillOverride } : creature;

  // Générer un ID unique pour chaque créature spawnée
  const uniqueId = `cre_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    ...creatureWithSkill,
    id: uniqueId,  // ID unique pour cette créature spécifique
    finalStats,
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
  let totalGained = 0;
  let remainingXP = foodXP;
  
  while (remainingXP > 0 && currentCreature.xpToNextLevel > 0) {
    if (remainingXP >= currentCreature.xpToNextLevel) {
      // Level up!
      remainingXP -= currentCreature.xpToNextLevel;
      totalGained += currentCreature.xpToNextLevel;
      
      const oldLevel = currentCreature.level;
      const oldStats = { ...currentCreature.finalStats };
      
      currentCreature = {
        ...currentCreature,
        level: oldLevel + 1,
        currentXP: 0,
        xpToNextLevel: calculateXPToNextLevel(oldLevel + 1),
        finalStats: {
          ...currentCreature.finalStats,
          hp: Math.floor(currentCreature.baseStats.hp * getLevelScale(oldLevel + 1, "hp")),
          attack: Math.floor(currentCreature.baseStats.attack * getLevelScale(oldLevel + 1, "other")),
          defense: Math.floor(currentCreature.baseStats.defense * getLevelScale(oldLevel + 1, "other")),
          speed: Math.floor(currentCreature.baseStats.speed * getLevelScale(oldLevel + 1, "other")),
          crit: Math.floor(currentCreature.baseStats.crit * getLevelScale(oldLevel + 1, "other")),
        },
      };
      
      levelUps++;
    } else {
      // Juste XP, pas de level up
      totalGained += remainingXP;
      remainingXP = 0;
    }
  }
  
  currentCreature.currentXP += totalGained;
  
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

export default function HuntingPage() {
  const [phase, setPhase] = useState<HuntingPhase>("ready");
  const [huntedCreature, setHuntedCreature] = useState<HuntedCreature | null>(null);
  const [collection, setCollection] = useState<HuntedCreature[]>([]);
  const [selectedCreature, setSelectedCreature] = useState<HuntedCreature | null>(null);
  const [feedChoice, setFeedChoice] = useState<"hp" | "atk" | "def" | "spd" | "crit" | null>(null);
  const [feedMode, setFeedMode] = useState(false);
  const [selectedFoodIds, setSelectedFoodIds] = useState<Set<string>>(new Set());
  const [previewMode, setPreviewMode] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("rank");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [confirmReleaseAll, setConfirmReleaseAll] = useState(false);
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("ecobio-collection");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCollection(parsed);
      } catch (e) {
        console.error("Failed load collection", e);
      }
    }
  }, []);

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
      const updated = collection.filter(c => c.id !== selectedCreature.id);
      setCollection(updated);
      setSelectedCreature(null);
      setPhase("ready");
    }
  };

  const handleReleaseAll = () => {
    if (confirmReleaseAll) {
      setCollection([]);
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
    setPreviewMode(false);
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
              
              {!feedMode ? (
                <>
                  <button 
                    onClick={() => setFeedMode(true)}
                    className="w-full bg-gradient-to-r from-yellow-700 to-yellow-600 hover:from-yellow-600 hover:to-yellow-500 text-white rounded-lg p-3 font-bold mb-4"
                  >
                    🌱 Nourrir avec d'autres créatures
                  </button>
                  
                  <div className="text-center text-green-300 mb-4">OU</div>
                  
                  {!feedChoice ? (
                    <div className="grid grid-cols-5 gap-2 mb-4">
                      {(["hp", "atk", "def", "spd", "crit"] as const).map(stat => (
                        <button key={stat} onClick={() => handleFeedSelect(stat)} className="bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 text-white rounded-lg p-2 font-bold">{stat.toUpperCase()}</button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 mb-4">
                      <p className="text-green-200">Nourrir <strong>{feedChoice.toUpperCase()}</strong> (+10%)?</p>
                      <button onClick={handleFeedOldSystem} className="bg-gradient-to-r from-yellow-700 to-yellow-600 hover:from-yellow-600 hover:to-yellow-500 text-white rounded-lg px-4 py-2 font-bold">✅ OK</button>
                      <button onClick={() => setFeedChoice(null)} className="bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white rounded-lg px-4 py-2 font-bold">❌ Annuler</button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <button onClick={() => setFeedMode(false)} className="bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white rounded-lg px-3 py-2">← Annuler</button>
                    <div className="flex-1 text-center">
                      <p className="text-green-200 font-semibold">
                        {selectedFoodIds.size} créature{selectedFoodIds.size > 1 ? 's' : ''} sélectionnée{selectedFoodIds.size > 1 ? 's' : ''}
                      </p>
                    </div>
                    {!previewMode && (
                      <>
                        <button 
                          onClick={() => setPreviewMode(true)}
                          disabled={selectedFoodIds.size === 0}
                          className="bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white rounded-lg px-4 py-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          👁️ Afficher
                        </button>
                        <button 
                          onClick={handleFeedNewSystem}
                          disabled={selectedFoodIds.size === 0}
                          className="bg-gradient-to-r from-yellow-700 to-yellow-600 hover:from-yellow-600 hover:to-yellow-500 text-white rounded-lg px-4 py-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ✅ Nourrir
                        </button>
                      </>
                    )}
                    {previewMode && (
                      <button onClick={() => setPreviewMode(false)} className="bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white rounded-lg px-4 py-2 font-bold">✏️ Modifier</button>
                    )}
                  </div>
                  
                  {previewMode && selectedCreature && (
                    <div className="bg-blue-900 bg-opacity-50 rounded-lg p-4 mb-4 border-2 border-blue-600">
                      <h4 className="text-blue-200 font-bold mb-2">🔮 Prévision</h4>
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
                    {collection.filter(c => c.id !== selectedCreature?.id).map(creature => (
                      <div 
                        key={creature.id}
                        onClick={() => !previewMode && toggleFoodCreature(creature.id)}
                        className={`flex items-center gap-3 p-2 rounded-lg mb-2 cursor-pointer transition-colors ${
                          selectedFoodIds.has(creature.id) ? 'bg-yellow-700 bg-opacity-50' : 'hover:bg-green-700 bg-opacity-30'
                        } ${previewMode ? 'cursor-not-allowed' : ''}`}
                      >
                        <input 
                          type="checkbox"
                          checked={selectedFoodIds.has(creature.id)}
                          onChange={() => !previewMode && toggleFoodCreature(creature.id)}
                          disabled={previewMode}
                          className="w-5 h-5"
                        />
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
                        <div className="text-right">
                          <p className="text-yellow-300 font-bold">+{calculateRankXP(creature.finalStats.rank, creature.level, creature.finalStats)}</p>
                          <p className="text-green-400 text-xs">XP</p>
                        </div>
                      </div>
                    ))}
                    {collection.filter(c => c.id !== selectedCreature?.id).length === 0 && (
                      <p className="text-center text-green-400 py-4">Aucune autre créature disponible pour nourrir</p>
                    )}
                  </div>
                </>
              )}
              <button onClick={handleReleaseCreature} className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white rounded-lg p-3 mt-4 font-bold shadow-lg">❌ Relâcher</button>
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
                    <button onClick={() => { setCollection([]); setConfirmReleaseAll(false); }} className="bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-white rounded px-3 py-1 text-sm font-bold">OUI</button>
                    <button onClick={() => setConfirmReleaseAll(false)} className="bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white rounded px-3 py-1 text-sm font-bold">Annuler</button>
                  </div>
                )}
              </div>
            </div>

            <h2 className="text-2xl font-bold text-green-100 mb-4">📦 Collection ({collection.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedCollection.map(c => (
                <div key={c.id} onClick={() => handleViewCreature(c)} className="bg-gradient-to-br from-green-800 to-green-900 rounded-lg p-4 border border-green-700 hover:border-green-600 cursor-pointer hover:scale-105 transition-all duration-200 relative">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-16 h-16 flex-shrink-0">
                      <img
                        src={getCreatureImage(c.creatureId, c.finalStats.rank)}
                        alt={c.name}
                        className="w-full h-full object-cover rounded border border-green-700"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-green-100">{c.name}</h3>
                        <span className={`font-bold ${getRankBadgeColor(c.finalStats.rank)} text-white px-2 py-1 rounded-full text-sm`}>{c.finalStats.rank}</span>
                      </div>
                    </div>
                  </div>
                  {c.feedCount > 0 && <p className="text-yellow-300 text-sm mt-1">Nourri {c.feedCount}x</p>}
                  <div className="grid grid-cols-5 gap-1 mt-3 text-center text-xs pointer-events-none">
                    <div className="bg-green-950 rounded p-1"><p className="text-green-200">HP</p><p className="text-green-100 font-bold">{c.finalStats.hp}</p></div>
                    <div className="bg-green-950 rounded p-1"><p className="text-green-200">ATK</p><p className="text-green-100 font-bold">{c.finalStats.attack}</p></div>
                    <div className="bg-green-950 rounded p-1"><p className="text-green-200">DEF</p><p className="text-green-100 font-bold">{c.finalStats.defense}</p></div>
                    <div className="bg-green-950 rounded p-1"><p className="text-green-200">SPD</p><p className="text-green-100 font-bold">{c.finalStats.speed}</p></div>
                    <div className="bg-green-950 rounded p-1"><p className="text-green-200">CRIT</p><p className="text-green-100 font-bold">{c.finalStats.crit}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
