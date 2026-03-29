"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ExplorationMission,
  createExplorationMission,
  isMissionComplete,
  simulateExplorationMission,
  calculateExplorationXP,
  getUnlockedDurations,
  getMaxConcurrentMissions,
  DURATION_UNLOCK_THRESHOLDS,
  DURATION_LEVEL_REQUIREMENTS
} from "@/lib/exploration";
import { PlantResource } from "@/lib/resources";
import { RARITY_COLORS, RANK_BORDER_COLORS } from "@/lib/inventory";
import { Rank, CREATURES } from "@/lib/database";
import { addExplorationLoot } from "@/lib/inventory";

type DurationOption = "15min" | "30min" | "1h" | "2h" | "4h" | "8h";

interface HuntedCreature {
  id: string;
  name: string;
  creatureId: string;
  level: number;
  finalStats: {
    rank: Rank;
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    crit: number;
  };
  explorationXP: number;
  explorationLevel: number;
  explorationXPToNext: number;
  isOnMission: boolean;
  isFavorite: boolean;
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

const RANK_BADGE_COLORS: Record<Rank, string> = {
  E: "bg-gray-600",
  D: "bg-blue-600",
  C: "bg-green-600",
  B: "bg-orange-600",
  A: "bg-red-600",
  S: "bg-yellow-600",
  "S+": "bg-purple-600",
};

export default function ExplorationPage() {
  const [collection, setCollection] = useState<HuntedCreature[]>([]);
  const [missions, setMissions] = useState<ExplorationMission[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>("15min");
  const [selectedMission, setSelectedMission] = useState<ExplorationMission | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showCreatureSelector, setShowCreatureSelector] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  // Load collection and missions
  useEffect(() => {
    const savedCollection = localStorage.getItem("ecobio-collection");
    if (savedCollection) {
      try {
        const parsed = JSON.parse(savedCollection);
        // Ensure exploration fields exist (handle backward compatibility)
        const enrichedCollection = parsed.map((c: HuntedCreature) => ({
          ...c,
          explorationXP: c.explorationXP || 0,
          explorationLevel: c.explorationLevel || 0,
          explorationXPToNext: c.explorationXPToNext || 100,
          isOnMission: c.isOnMission || false,
        }));
        setCollection(enrichedCollection);
      } catch (e) {
        console.error("Failed load collection", e);
      }
    }

    const savedMissions = localStorage.getItem("ecobio-exploration-missions");
    if (savedMissions) {
      try {
        const parsed = JSON.parse(savedMissions);
        setMissions(parsed);
      } catch (e) {
        console.error("Failed load missions", e);
      }
    }
  }, []);

  // Check for completed missions every 30 seconds
  useEffect(() => {
    const checkMissions = () => {
      const completedMissions = missions.filter(m => m.status === "active" && isMissionComplete(m));

      if (completedMissions.length > 0) {
        // Simulate results for completed missions
        const updatedMissions = missions.map(mission => {
          if (mission.status === "active" && isMissionComplete(mission) && !mission.results) {
            const teamCreatures = collection.filter(c => mission.team.includes(c.id));
            const results = simulateExplorationMission(mission, teamCreatures);

            return {
              ...mission,
              status: results.survivors.length > 0 ? ("completed" as const) : ("failed" as const),
              results: {
                loot: results.loot,
                totalLoot: results.loot.length,
                casualties: results.casualties,
                casualtyIds: results.casualtyIds,
                casualtiesData: results.casualtiesData,
                survivors: results.survivors,
                missionSuccess: results.survivors.length > 0,
                lootReduction: results.lootReduction
              }
            };
          }
          return mission;
        }) as ExplorationMission[];
        setMissions(updatedMissions);
      }
    };

    // Initial check
    checkMissions();

    // Periodic check every 30 seconds
    const interval = setInterval(checkMissions, 30000);

    // Listen for collection updates from other pages
    const handleCollectionUpdate = () => {
      const savedCollection = localStorage.getItem("ecobio-collection");
      if (savedCollection) {
        try {
          const parsed = JSON.parse(savedCollection);
          const enrichedCollection = parsed.map((c: HuntedCreature) => ({
            ...c,
            explorationXP: c.explorationXP || 0,
            explorationLevel: c.explorationLevel || 0,
            explorationXPToNext: c.explorationXPToNext || 100,
            isOnMission: c.isOnMission || false,
          }));
          setCollection(enrichedCollection);
        } catch (e) {
          console.error("Failed load collection", e);
        }
      }
    };

    window.addEventListener("collection-updated", handleCollectionUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("collection-updated", handleCollectionUpdate);
    };
  }, [missions, collection]);

  // Save missions when updated
  useEffect(() => {
    if (missions.length > 0) {
      localStorage.setItem("ecobio-exploration-missions", JSON.stringify(missions));
    } else {
      localStorage.removeItem("ecobio-exploration-missions");
    }
  }, [missions]);

  // End mission immediately (instant completion, no cost for now)
  const handleEndMissionNow = (mission: ExplorationMission) => {
    const teamCreatures = collection.filter(c => mission.team.includes(c.id));
    const results = simulateExplorationMission(mission, teamCreatures);

    const updatedMissions = missions.map(m => {
      if (m.id === mission.id) {
        return {
          ...m,
          endTime: Date.now(), // Set to now
          status: (results.survivors.length > 0 ? "completed" : "failed") as "completed" | "failed",
          results: {
            loot: results.loot,
            totalLoot: results.loot.length,
            casualties: results.casualties,
            casualtyIds: results.casualtyIds,
            casualtiesData: results.casualtiesData,
            survivors: results.survivors,
            missionSuccess: results.survivors.length > 0,
            lootReduction: results.lootReduction,
            instant: true // Flag to indicate instant completion
          }
        };
      }
      return m;
    });

    setMissions(updatedMissions);
  };

  // Start new mission
  const handleStartMission = () => {
    if (selectedTeam.length === 0) return;

    const teamCreatures = collection.filter(c => selectedTeam.includes(c.id));
    const creatureLevels = teamCreatures.map(c => c.level || 1);

    // Check max concurrent missions
    const avgExplorationLevel = teamCreatures.reduce((sum, c) => sum + (c.explorationLevel || 0), 0) / teamCreatures.length;
    const maxConcurrent = getMaxConcurrentMissions(Math.floor(avgExplorationLevel));
    const activeMissions = missions.filter(m => m.status === "active").length;

    if (activeMissions >= maxConcurrent) {
      alert(`Maximum ${maxConcurrent} mission(s) allowed. Level up exploration level to unlock more.`);
      return;
    }

    // Check duration is unlocked by exploration LEVEL (not XP anymore)
    const durationLevelRequirement = DURATION_LEVEL_REQUIREMENTS[selectedDuration] || 1;

    // All team members must meet or exceed the duration level requirement
    const insufficientLevelCreatures = teamCreatures.filter(c => (c.explorationLevel || 0) < durationLevelRequirement);

    if (insufficientLevelCreatures.length > 0) {
      const creatureNames = insufficientLevelCreatures.map(c => c.name).join(", ");
      alert(`Exploration Level ${durationLevelRequirement} requis pour ${selectedDuration === "8h" ? "8 heures" : selectedDuration}. ${insufficientLevelCreatures.length > 1 ? 'Les spécimens suivants' : 'Le spécimen suivant'} (${creatureNames}) n'${insufficientLevelCreatures.length > 1 ? 'ont' : 'a'} pas le niveau requis.`);
      return;
    }

    const mission = createExplorationMission(selectedTeam, selectedDuration, teamCreatures, Math.floor(avgExplorationLevel));

    // Set creatures on mission status
    const updatedCollection = collection.map(creature => {
      if (selectedTeam.includes(creature.id)) {
        return { ...creature, isOnMission: true };
      }
      return creature;
    });
    localStorage.setItem("ecobio-collection", JSON.stringify(updatedCollection));
    window.dispatchEvent(new Event("collection-updated"));

    setMissions([...missions, mission]);
    setSelectedTeam([]);
  };

  // Collect mission results
  const handleCollectResults = (mission: ExplorationMission) => {
    if (!mission.results) return;

    // Add loot to inventory if mission was successful
    if (mission.results.missionSuccess && mission.results.loot.length > 0) {
      const { addedCount } = addExplorationLoot(mission.results.loot);
      console.log(`Added ${addedCount} plants to inventory`);

      // Dispatch inventory update event
      window.dispatchEvent(new Event("inventory-updated"));

      // Show notification
      alert(`${addedCount} plante(s) ajoutée(s) à ton inventaire!`);
    }

    // Apply exploration XP to survivors and clear mission status
    const xpGained = calculateExplorationXP(mission.duration);
    const updatedCollection = collection.map(creature => {
      if (mission.results!.survivors.includes(creature.id)) {
        const currentXP = creature.explorationXP || 0;
        const newXPTotal = currentXP + xpGained;
        const newExplorationLevel = Math.floor(newXPTotal / 100);

        return {
          ...creature,
          explorationXP: newXPTotal,
          explorationLevel: newExplorationLevel,
          explorationXPToNext: ((newExplorationLevel + 1) * 100) - newXPTotal,
          isOnMission: false
        };
      }

      // Dead creatures are removed from collection
      if (mission.results!.casualties > 0 && mission.team.includes(creature.id) && !mission.results!.survivors.includes(creature.id)) {
        return null;
      }

      return creature;
    }).filter(Boolean) as HuntedCreature[];

    setCollection(updatedCollection);
    localStorage.setItem("ecobio-collection", JSON.stringify(updatedCollection));
    window.dispatchEvent(new Event("collection-updated"));

    // Remove completed mission
    const updatedMissions = missions.filter(m => m.id !== mission.id);
    setMissions(updatedMissions);
    setSelectedMission(null);
    setShowResults(false);

    if (mission.results && mission.results.casualties > 0) {
      alert(`${mission.results.casualties} créature(s) sont mortes pendant la mission.`);
    }
  };

  // Remove creature from team
  const handleRemoveFromTeam = (creatureId: string) => {
    setSelectedTeam(selectedTeam.filter(id => id !== creatureId));
  };

  // Select creature slot
  const handleSelectCreatureSlot = (index: number) => {
    setSelectedSlotIndex(index);
    setShowCreatureSelector(true);
  };

  // Select creature for slot
  const handleSelectCreature = (creature: HuntedCreature) => {
    if (selectedSlotIndex === null || selectedSlotIndex >= 5) return;

    const newTeam = [...selectedTeam];
    newTeam[selectedSlotIndex] = creature.id;
    setSelectedTeam(newTeam);
    setShowCreatureSelector(false);
    setSelectedSlotIndex(null);
  };

  // Get available creatures for selection
  const getAvailableCreatures = () => {
    return collection.filter(c =>
      !c.isOnMission &&
      !selectedTeam.includes(c.id)
    );
  };

  // Get average exploration level of selected team
  const getSelectedTeamAvgLevel = (): number => {
    if (selectedTeam.length === 0) return 0;
    const teamCreatures = collection.filter(c => selectedTeam.includes(c.id));
    const totalLevel = teamCreatures.reduce((sum, c) => sum + (c.explorationLevel || 0), 0);
    return totalLevel / teamCreatures.length;
  };

  // Format time remaining
  const formatTimeRemaining = (endTime: number): string => {
    const remaining = endTime - Date.now();
    if (remaining <= 0) return "Prêt";

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    return `${minutes}m ${seconds}s`;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="text-amber-700 dark:text-amber-300 mb-6 inline-block">← Retour</Link>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">🗺️ Exploration</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">Envoie tes créatures en mission pour récolter des ressources rares!</p>

        {/* Mission Creation Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8">
          <h2 className="text-3xl font-bold text-amber-800 dark:text-amber-200 mb-6">Créer une Mission</h2>

          {/* Duration Selection */}
          <div className="mb-6">
            <label className="block text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Durée de la mission</label>
            <div className="flex flex-wrap gap-3">
              {(["15min", "30min", "1h", "2h", "4h", "8h"] as DurationOption[]).map(duration => {
                const requiredLevel = DURATION_LEVEL_REQUIREMENTS[duration];
                const avgLevel = getSelectedTeamAvgLevel();
                const meetsRequirement = avgLevel >= requiredLevel;

                return (
                  <button
                    key={duration}
                    onClick={() => setSelectedDuration(duration)}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                      selectedDuration === duration
                        ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg"
                        : meetsRequirement || selectedTeam.length === 0
                          ? "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
                    }`}
                    title={selectedTeam.length > 0 && !meetsRequirement ? `Exploration Level ${requiredLevel} requis` : ""}
                  >
                    <div>
                      {duration === "15min" ? "15 min" :
                       duration === "30min" ? "30 min" :
                       duration === "1h" ? "1 heure" :
                       duration === "2h" ? "2 heures" :
                       duration === "4h" ? "4 heures" : "8 heures"}
                    </div>
                    {requiredLevel > 1 && (
                      <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                        Lvl {requiredLevel}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Team Selection */}
          <div className="mb-6">
            <label className="block text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Équipe (1-5 créatures)</label>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {[0, 1, 2, 3, 4].map(index => (
                <div
                  key={index}
                  onClick={() => handleSelectCreatureSlot(index)}
                  className="h-48 border-4 border-dashed border-amber-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-gray-700 transition-all"
                >
                  {selectedTeam[index] ? (
                    (() => {
                      const creature = collection.find(c => c.id === selectedTeam[index]);
                      return creature ? (
                        <>
                          <img
                            src={getCreatureImage(creature.creatureId, creature.finalStats.rank)}
                            alt={creature.name}
                            className="w-20 h-20 object-cover rounded-lg mb-2"
                          />
                          <p className="font-bold text-center">{creature.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm">Lvl {creature.level}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${RANK_BADGE_COLORS[creature.finalStats.rank]} text-white`}>
                              {creature.finalStats.rank}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFromTeam(creature.id);
                            }}
                            className="mt-2 text-red-600 hover:text-red-800 text-sm font-semibold"
                          >
                            Retirer
                          </button>
                        </>
                      ) : null;
                    })()
                  ) : (
                    <>
                      <span className="text-4xl mb-2">👤</span>
                      <p className="text-amber-700 dark:text-amber-300">Emplacement {index + 1}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Start Mission Button */}
          <button
            onClick={handleStartMission}
            disabled={selectedTeam.length === 0}
            className={`w-full py-4 text-xl font-bold rounded-xl transition-all ${
              selectedTeam.length === 0
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg"
            }`}
          >
            🚀 Démarrer la Mission
          </button>
        </div>

        {/* Active Missions Section */}
        {missions.filter(m => m.status === "active").length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8">
            <h2 className="text-3xl font-bold text-amber-800 dark:text-amber-200 mb-6">Missions en Cours</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {missions.filter(m => m.status === "active").map(mission => (
                <div key={mission.id} className="bg-gradient-to-br from-amber-100 to-orange-100 dark:from-gray-700 dark:to-gray-600 rounded-xl p-6 border-2 border-amber-400">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-bold text-lg text-amber-800 dark:text-amber-200">
                        {mission.duration === "15min" ? "15 min" :
                         mission.duration === "30min" ? "30 min" :
                         mission.duration === "1h" ? "1 heure" :
                         mission.duration === "2h" ? "2 heures" :
                         mission.duration === "4h" ? "4 heures" : "8 heures"}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{mission.team.length} créature(s)</p>
                    </div>
                    <button
                      onClick={() => handleEndMissionNow(mission)}
                      className="text-sm px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Terminer
                    </button>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Temps restant</p>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                      {formatTimeRemaining(mission.endTime)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Équipe</p>
                    <div className="flex -space-x-2">
                      {mission.team.slice(0, 3).map((creatureId, idx) => {
                        const creature = collection.find(c => c.id === creatureId);
                        return creature ? (
                          <div
                            key={idx}
                            className="relative"
                            title={creature.name}
                          >
                            <img
                              src={getCreatureImage(creature.creatureId, creature.finalStats.rank)}
                              alt={creature.name}
                              className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-600 object-cover"
                            />
                            <span className={`absolute -bottom-1 -right-1 text-[8px] px-1 rounded-full text-white ${RANK_BADGE_COLORS[creature.finalStats.rank]}`}>
                              {creature.finalStats.rank}
                            </span>
                          </div>
                        ) : null;
                      })}
                      {mission.team.length > 3 && (
                        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-300 border-2 border-white dark:border-gray-600">
                          +{mission.team.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Missions Section */}
        {missions.filter(m => m.status === "completed" || m.status === "failed").length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8">
            <h2 className="text-3xl font-bold text-amber-800 dark:text-amber-200 mb-6">Missions Terminées</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {missions.filter(m => m.status === "completed" || m.status === "failed").map(mission => (
                <div
                  key={mission.id}
                  onClick={() => {
                    setSelectedMission(mission);
                    setShowResults(true);
                  }}
                  className={`bg-gradient-to-br rounded-xl p-6 border-2 cursor-pointer transition-all ${
                    mission.status === "completed"
                      ? "from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 border-green-400 hover:from-green-100 hover:to-emerald-100"
                      : "from-red-100 to-rose-100 dark:from-red-900 dark:to-rose-900 border-red-400 hover:from-red-100 hover:to-rose-100"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-bold text-lg">
                        {mission.duration === "15min" ? "15 min" :
                         mission.duration === "30min" ? "30 min" :
                         mission.duration === "1h" ? "1 heure" :
                         mission.duration === "2h" ? "2 heures" :
                         mission.duration === "4h" ? "4 heures" : "8 heures"}
                      </p>
                      <p className={`text-sm ${mission.status === "completed" ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                        {mission.status === "completed" ? "✅ Réussie" : "❌ Échouée"}
                      </p>
                    </div>
                    {mission.status === "completed" && (
                      <span className="text-3xl">🎉</span>
                    )}
                  </div>

                  {mission.results && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {mission.results.casualties} mort(s) • {mission.results.totalLoot} loot
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Creature Selector Modal */}
        {showCreatureSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                  Sélectionner une créature
                </h3>
                <button
                  onClick={() => {
                    setShowCreatureSelector(false);
                    setSelectedSlotIndex(null);
                  }}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getAvailableCreatures().map(creature => (
                  <div
                    key={creature.id}
                    onClick={() => handleSelectCreature(creature)}
                    className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 border-2 border-green-600 hover:border-green-500 cursor-pointer transition-all"
                  >
                    <img
                      src={getCreatureImage(creature.creatureId, creature.finalStats.rank)}
                      alt={creature.name}
                      className="w-20 h-20 object-cover rounded-lg mx-auto mb-3"
                    />
                    <p className="font-bold text-center text-gray-800 dark:text-gray-200">{creature.name}</p>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Lvl {creature.level}</span>
                      <span className={`text-xs px-2 py-0.5 rounded text-white ${RANK_BADGE_COLORS[creature.finalStats.rank]}`}>
                        {creature.finalStats.rank}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-3 text-xs">
                      <div className="text-amber-700 dark:text-amber-300">
                        ⭐ XP: {creature.explorationXP || 0}
                      </div>
                      <div className="text-amber-700 dark:text-amber-300">
                        Lvl {creature.explorationLevel || 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {getAvailableCreatures().length === 0 && (
                <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                  Aucune créature disponible. Elles sont peut-être toutes en mission!
                </p>
              )}
            </div>
          </div>
        )}

        {/* Mission Results Modal */}
        {showResults && selectedMission && selectedMission.results && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                  {selectedMission.results.missionSuccess ? "🎉 Mission Réussie!" : "❌ Mission Échouée"}
                </h3>
                <button
                  onClick={() => {
                    setShowResults(false);
                    setSelectedMission(null);
                  }}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Loot Section */}
              {selectedMission.results.loot.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-2xl font-bold mb-4 text-green-700">🌿 Loot Obtenu</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedMission.results.loot.map((plant, idx) => (
                      <div
                        key={idx}
                        className={`border-2 rounded-xl p-4 ${RANK_BORDER_COLORS[plant.rarity] || "border-gray-600 bg-gray-50"}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-bold text-lg">{plant.name}</p>
                          <span className={`text-xs px-2 py-1 rounded ${RARITY_COLORS[plant.rarity] || "text-gray-600 bg-gray-200"}`}>
                            Rank {plant.rarity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{plant.description}</p>
                        <p className="text-2xl mt-2">{plant.icon}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Casualties */}
              {selectedMission.results.casualties > 0 && (
                <div>
                  <h3 className="text-2xl font-bold mb-4 text-red-600">💀 Pertes</h3>
                  <p className="text-lg mb-4">{selectedMission.results.casualties} créature(s) est/sont morte(s)</p>

                  {/* Display deceased creatures */}
                  {selectedMission.results.casualtiesData && selectedMission.results.casualtiesData.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4 mb-4">
                      {selectedMission.results.casualtiesData.map((creature: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 mb-3 last:mb-0">
                          <img
                            src={getCreatureImage(creature.creatureId || creature.creatureType, creature.finalStats.rank)}
                            alt={creature.name}
                            className="w-12 h-12 object-cover rounded border border-red-600 filter grayscale opacity-50"
                          />
                          <div className="flex-1">
                            <p className="font-bold text-red-700 dark:text-red-300">{creature.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Lvl {creature.level}</span>
                              <span className={`text-xs px-2 py-1 rounded ${RANK_BADGE_COLORS[creature.finalStats.rank as Rank]} text-white`}>
                                {creature.finalStats.rank}
                              </span>
                            </div>
                          </div>
                          <span className="text-2xl opacity-50">💀</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-gray-600 dark:text-gray-400">
                    Les créatures mortes seront retirées de ta collection.
                  </p>
                </div>
              )}

              {/* Survivors XP */}
              {selectedMission.results.survivors.length > 0 && (
                <div>
                  <h3 className="text-2xl font-bold mb-4 text-amber-600">⭐ XP d'Exploration</h3>
                  <p className="text-lg">
                    Chaque créature a gagné <span className="font-bold text-amber-700">{calculateExplorationXP(selectedMission.duration)} XP</span>
                  </p>
                  <p className="text-md text-gray-600 dark:text-gray-400">
                    {selectedMission.results.survivors.length} survivant(s)
                  </p>
                </div>
              )}

              {/* Collect Button */}
              <button
                className="w-full bg-amber-600 hover:bg-amber-700 text-white text-2xl font-bold py-4 rounded-xl transition-all"
                onClick={() => handleCollectResults(selectedMission)}
              >
                Récupérer Équipe et Loot
              </button>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Link href="/">
            <button className="bg-gray-600 hover:bg-gray-700 text-white text-xl font-bold py-3 px-8 rounded-xl transition-all">
              ← Retour à l'Accueil
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}
