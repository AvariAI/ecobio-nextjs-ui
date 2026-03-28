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
  DURATION_UNLOCK_THRESHOLDS
} from "@/lib/exploration";
import { PlantResource } from "@/lib/resources";
import { Rank, CREATURES } from "@/lib/database";

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

  // Save missions when they change
  useEffect(() => {
    if (missions.length > 0) {
      localStorage.setItem("ecobio-exploration-missions", JSON.stringify(missions));
    } else {
      localStorage.removeItem("ecobio-exploration-missions");
    }
  }, [missions]);

  // Check for completed missions (run every 30 seconds while page is open)
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
                ...results,
                missionSuccess: results.survivors.length > 0
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

    // Check duration is unlocked
    const unlockedDurations = getUnlockedDurations(Math.floor(avgExplorationLevel));
    if (!unlockedDurations.includes(selectedDuration)) {
      alert(`Duration ${selectedDuration} is locked. Gain exploration level ${DURATION_UNLOCK_THRESHOLDS[selectedDuration]} XP to unlock.`);
      return;
    }

    const mission = createExplorationMission(selectedTeam, selectedDuration, creatureLevels);

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

      // Dead creatures mark as not on mission (they're back, just dead)
      if (mission.results!.casualties > 0 && mission.team.includes(creature.id) && !mission.results!.survivors.includes(creature.id)) {
        // Remove from collection - they died
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
      alert(`${mission.results.casualties} créature(s) sont morte(s) dans la mission. Elles ont été retirées de ta collection.`);
    }
  };

  // Select creature for team slot
  const handleCreatureSelect = (creatureId: string) => {
    if (selectedSlotIndex === null) return;

    const newTeam = [...selectedTeam];
    // Remove from any existing slot
    const existingIndex = newTeam.indexOf(creatureId);
    if (existingIndex !== -1) {
      newTeam[existingIndex] = "";
    }
    // Set in selected slot
    newTeam[selectedSlotIndex] = creatureId;

    setSelectedTeam(newTeam.filter(id => id !== ""));
    setShowCreatureSelector(false);
    setSelectedSlotIndex(null);
  };

  const durationOptions: DurationOption[] = ["15min", "30min", "1h", "2h", "4h", "8h"];

  // Calculate average exploration level
  const teamCreatures = collection.filter(c => selectedTeam.includes(c.id));
  const avgExplorationLevel = selectedTeam.length > 0
    ? teamCreatures.reduce((sum, c) => sum + (c.explorationLevel || 0), 0) / selectedTeam.length
    : 0;
  const unlockedDurations = getUnlockedDurations(Math.floor(avgExplorationLevel));
  const maxConcurrent = getMaxConcurrentMissions(Math.floor(avgExplorationLevel));
  const activeMissions = missions.filter(m => m.status === "active").length;
  const availableCreatures = collection.filter(c => !c.isOnMission && !c.isFavorite);

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-4">
            🗺️ Exploration
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Envois tes créatures en mission pour récolter des plantes rares
          </p>
        </header>

        {/* Exploration Level Display */}
        {selectedTeam.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
            <h3 className="text-2xl font-bold text-amber-800 dark:text-amber-200 mb-4">
              📊 Niveau d'Exploration Moyen: {Math.floor(avgExplorationLevel)}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-lg">Missions simultanées: {activeMissions}/{maxConcurrent}</p>
              </div>
              <div>
                <p className="text-lg">Durées débloquées:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {durationOptions.map(d => (
                    <span
                      key={d}
                      className={`px-3 py-1 rounded-full text-sm ${
                        unlockedDurations.includes(d)
                          ? "bg-green-600 text-white"
                          : "bg-gray-600 text-gray-400"
                      }`}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Start New Mission */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8">
          <h2 className="text-3xl font-bold text-amber-800 dark:text-amber-200 mb-6">
            🚀 Nouvelle Mission
          </h2>

          {/* Team Selection */}
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Équipe ({selectedTeam.length}/5 - {availableCreatures.length} disponibles)
            </h3>

            <div className="grid md:grid-cols-5 gap-4">
              {Array(5).fill(0).map((_, i) => (
                <div
                  key={i}
                  className={`border-4 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    selectedTeam[i]
                      ? "bg-amber-100 border-amber-500 dark:bg-amber-900 dark:border-amber-400"
                      : "bg-gray-100 border-gray-400 dark:bg-gray-800 dark:border-gray-600 hover:border-amber-300"
                  }`}
                  onClick={() => {
                    if (selectedTeam[i]) {
                      // Remove from team
                      const newTeam = selectedTeam.filter(id => id !== selectedTeam[i]);
                      setSelectedTeam(newTeam);
                    } else {
                      // Open creature selector
                      setSelectedSlotIndex(i);
                      setShowCreatureSelector(true);
                    }
                  }}
                >
                  {selectedTeam[i] ? (
                    <div>
                      { (() => {
                        const creature = collection.find(c => c.id === selectedTeam[i]);
                        if (!creature) return null;
                        return (
                          <>
                            <img
                              src={getCreatureImage(creature.creatureId, creature.finalStats.rank)}
                              alt={creature.name}
                              className="w-16 h-16 mx-auto mb-2 object-cover rounded-lg"
                            />
                            <p className="font-bold text-sm">{creature.name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded ${RANK_BADGE_COLORS[creature.finalStats.rank]} text-white`}>
                              R{creature.finalStats.rank} L{creature.level}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">Clic pour retirer</p>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div>
                      <p className="text-4xl mb-2">+</p>
                      <p className="text-gray-600 dark:text-gray-400">Ajouter</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Duration Selection */}
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Durée de Mission
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {durationOptions.map(duration => (
                <button
                  key={duration}
                  className={`p-4 rounded-xl border-4 transition-all ${
                    selectedDuration === duration
                      ? "bg-amber-600 text-white border-amber-700"
                      : unlockedDurations.includes(duration)
                      ? "bg-white dark:bg-gray-700 border-amber-600 hover:bg-amber-100 dark:hover:bg-gray-600"
                      : "bg-gray-300 border-gray-500 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700"
                  }`}
                  onClick={() => unlockedDurations.includes(duration) && setSelectedDuration(duration)}
                  disabled={!unlockedDurations.includes(duration)}
                >
                  <p className="text-2xl font-bold">{duration}</p>
                  <p className="text-sm">XP: {calculateExplorationXP(duration)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Start Mission Button */}
          <button
            className="w-full bg-amber-600 hover:bg-amber-700 text-white text-2xl font-bold py-4 rounded-xl transition-all disabled:bg-gray-500 disabled:cursor-not-allowed"
            disabled={selectedTeam.length === 0}
            onClick={handleStartMission}
          >
            🚀 Envoyer en Mission
          </button>
        </div>

        {/* Active Missions */}
        {missions.filter(m => m.status === "active").length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8">
            <h2 className="text-3xl font-bold text-amber-800 dark:text-amber-200 mb-6">
              🕐 Missions en Cours
            </h2>

            <div className="space-y-4">
              {missions
                .filter(m => m.status === "active")
                .map(mission => {
                  const missionCreatures = collection.filter(c => mission.team.includes(c.id));
                  return (
                    <div
                      key={mission.id}
                      className="border-2 border-amber-300 rounded-xl p-4 dark:border-amber-700"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-bold">
                          Équipe de {mission.team.length}: {missionCreatures.map(c => c.name).join(", ")}
                        </h3>
                        <span className="text-lg bg-amber-200 px-3 py-1 rounded-full dark:bg-amber-900">
                          {mission.duration}
                        </span>
                      </div>

                      <p className="text-gray-600 dark:text-gray-400 mb-2">
                        Reste: {Math.max(0, Math.ceil((mission.endTime - Date.now()) / (60 * 1000)))} min
                      </p>

                      <div className="flex justify-end mb-2">
                        <button
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-all"
                          onClick={() => handleEndMissionNow(mission)}
                        >
                          Terminer Maintenant (No Cost)
                        </button>
                      </div>

                      <div className="w-full bg-amber-200 rounded-full h-3 dark:bg-amber-900">
                        <div
                          className="bg-amber-600 h-3 rounded-full transition-all"
                          style={{
                            width: `${Math.max(0, Math.min(100, ((mission.endTime - Date.now()) / (mission.endTime - mission.startTime)) * 100))}%`
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Completed Missions */}
        {missions.filter(m => m.status === "completed" || m.status === "failed").length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <h2 className="text-3xl font-bold text-amber-800 dark:text-amber-200 mb-6">
              🎉 Missions Terminées
            </h2>

            <div className="space-y-4">
              {missions
                .filter(m => m.status === "completed" || m.status === "failed")
                .map(mission => {
                  const isSuccessful = mission.status === "completed";
                  return (
                    <div
                      key={mission.id}
                      className={`border-2 rounded-xl p-4 ${isSuccessful ? "border-green-500 bg-green-50 dark:bg-green-900" : "border-red-500 bg-red-50 dark:bg-red-900"}`}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">
                          Mission {mission.duration} {isSuccessful ? "Terminée!" : "Échouée!"}
                        </h3>
                        <button
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl"
                          onClick={() => {
                            setSelectedMission(mission);
                            setShowResults(true);
                          }}
                        >
                          Voir Loot
                        </button>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <p className="font-bold mb-1">🎁 Loot ({mission.results?.loot.length || 0})</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {mission.results?.loot.map(p => p.name).join(", ") || "Aucun loot"}
                          </p>
                        </div>
                        <div>
                          <p className="font-bold mb-1">💀 Pertes ({mission.results?.casualties || 0})</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {mission.results?.casualties} créature(s) morte(s)
                          </p>
                        </div>
                        <div>
                          <p className="font-bold mb-1">⭐ XP Gagné</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {calculateExplorationXP(mission.duration)} XP par survivant
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Creature Selector Modal */}
        {showCreatureSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-bold">Sélectionner une Créature</h2>
                  <button
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-3xl"
                    onClick={() => {
                      setShowCreatureSelector(false);
                      setSelectedSlotIndex(null);
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {availableCreatures.map(creature => (
                    <div
                      key={creature.id}
                      className={`border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg ${
                        selectedTeam.includes(creature.id)
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-900"
                          : "border-gray-300 hover:border-amber-400 dark:border-gray-600"
                      }`}
                      onClick={() => handleCreatureSelect(creature.id)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <img
                          src={getCreatureImage(creature.creatureId, creature.finalStats.rank)}
                          alt={creature.name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                        <div>
                          <p className="font-bold">{creature.name}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${RANK_BADGE_COLORS[creature.finalStats.rank]} text-white`}>
                              R{creature.finalStats.rank}
                            </span>
                            <span className="text-xs text-gray-500">L{creature.level}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        <p>🌟 Exp Lvl: {creature.explorationLevel}</p>
                        <p>⭐ Exp XP: {creature.explorationXP}/{creature.explorationXPToNext}</p>
                      </div>
                    </div>
                  ))}
                  {availableCreatures.length === 0 && (
                    <p className="col-span-3 text-center text-gray-500 py-4">
                      Aucune créature disponible. Favoris et missions en cours ne peuvent pas être envoyées.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Modal */}
        {showResults && selectedMission && selectedMission.results && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-bold">
                    🎉 Mission {selectedMission.duration} Terminée!
                  </h2>
                  <button
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-3xl"
                    onClick={() => setShowResults(false)}
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Loot Results */}
                  <div>
                    <h3 className="text-2xl font-bold mb-4">🎁 Loot Obtenus</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {selectedMission.results.loot.length > 0 ? (
                        selectedMission.results.loot.map((plant, i) => (
                          <div
                            key={i}
                            className={`border-2 rounded-xl p-4 ${
                              plant.rarity === "common"
                                ? "border-green-600 bg-green-50 dark:bg-green-900"
                                : plant.rarity === "uncommon"
                                ? "border-blue-600 bg-blue-50 dark:bg-blue-900"
                                : plant.rarity === "rare"
                                ? "border-purple-600 bg-purple-50 dark:bg-purple-900"
                                : "border-orange-600 bg-orange-50 dark:bg-orange-900"
                            }`}
                          >
                            <p className="font-bold text-lg">{plant.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{plant.description}</p>
                            <p className="text-sm font-semibold mt-2 uppercase">
                              {plant.rarity}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600 dark:text-gray-400 col-span-2">
                          Aucun loot obtenu (mission échouée)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Casualties */}
                  {selectedMission.results.casualties > 0 && (
                    <div>
                      <h3 className="text-2xl font-bold mb-4 text-red-600">💀 Pertes</h3>
                      <p className="text-lg">{selectedMission.results.casualties} créature(s) est/sont morte(s)</p>
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
                        {selectedMission.results.survivors.length} survivant(s) x {calculateExplorationXP(selectedMission.duration)} XP = {calculateExplorationXP(selectedMission.duration) * selectedMission.results.survivors.length} XP total
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
