"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CREATURES, Rank } from "@/lib/database";
import { spawnEasyModeEnemy } from "@/lib/easy-mode";

/**
 * Simple 5v5 Battle Engine (no XP)
 */

interface HuntedCreature {
  id: string;
  name: string;
  rank?: Rank;
  customStats?: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    crit: number;
    level: number;
  };
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    crit: number;
  };
  traits?: string[];
  stars?: number;
  statusEffects: any[];
}

interface BattleCreature {
  id: string;
  name: string;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    crit: number;
    rank: Rank;
  };
  currentHP: number;
  team: "player" | "enemy";
  position: number;
  isDead: boolean;
}

type BattlePhase = "setup" | "battle" | "complete";

function BattlePageContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "home"; // home | training | battle

  // Setup state
  const [collection, setCollection] = useState<HuntedCreature[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Battle state
  const [phase, setPhase] = useState<BattlePhase>("setup");
  const [playerTeam, setPlayerTeam] = useState<BattleCreature[] | null>(null);
  const [enemyTeam, setEnemyTeam] = useState<BattleCreature[] | null>(null);
  const [log, setLog] = useState<{ text: string; type?: string }[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [turnOrder, setTurnOrder] = useState<BattleCreature[]>([]);
  const [winner, setWinner] = useState<"player" | "enemy" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load collection
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("ecobio-collection");
    if (saved) {
      try {
        setCollection(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load collection", e);
      }
    }
  }, []);

  const handleToggleCreature = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(selectedId => selectedId !== id);
      } else if (prev.length < 5) {
        return [...prev, id];
      }
      return prev;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const startBattle = () => {
    const selectedCreatures = collection.filter(c => selectedIds.includes(c.id));

    // Generate enemy team
    const enemyTemplates = [];
    for (let i = 0; i < 5; i++) {
      enemyTemplates.push(spawnEasyModeEnemy());
    }

    // Create player creatures
    const playerCreatures: BattleCreature[] = selectedCreatures.map((creature, i) => {
      const template = CREATURES[creature.id];
      const hp = creature.customStats?.hp || creature.baseStats.hp;
      const attack = creature.customStats?.attack || creature.baseStats.attack;
      const defense = creature.customStats?.defense || creature.baseStats.defense;
      const speed = creature.customStats?.speed || creature.baseStats.speed;
      const crit = creature.customStats?.crit || creature.baseStats.crit;

      return {
        id: `player-${i}`,
        name: creature.name,
        stats: {
          hp: hp,
          attack,
          defense,
          speed,
          crit,
          rank: creature.rank || "E",
        },
        currentHP: hp,
        team: "player",
        position: i,
        isDead: false,
      };
    });

    // Create enemy creatures
    const enemyCreatures: BattleCreature[] = enemyTemplates.map((template, i) => {
      const bc: BattleCreature = {
        id: `enemy-${i}`,
        name: template.name,
        stats: {
          hp: template.stats.hp,
          attack: template.stats.attack,
          defense: template.stats.defense,
          speed: template.stats.speed,
          crit: template.stats.crit,
          rank: template.stats.rank,
        },
        currentHP: template.stats.hp,
        team: "enemy",
        position: i,
        isDead: false,
      };
      return bc;
    });

    // Create turn order sorted by speed
    const allCreatures = [...playerCreatures, ...enemyCreatures];
    allCreatures.sort((a, b) => b.stats.speed - a.stats.speed);

    setPlayerTeam(playerCreatures);
    setEnemyTeam(enemyCreatures);
    setTurnOrder(allCreatures);
    setCurrentTurnIndex(0);
    setPhase("battle");

    setLog([
      { text: `⚔️ 5v5 Battle commence!`, type: "info" },
      { text: `—`.repeat(40), type: "info" },
      { text: `Tour order (par vitesse):`, type: "info" },
      ...allCreatures.map((el, i) => ({
        text: `  ${i + 1}. ${el.name} (${el.team === "player" ? "Joueur" : "Ennemi"}) - ${el.stats.speed} VIT`,
        type: "info" as const,
      })),
    ]);
  };

  const getCurrentCreature = () => {
    if (!turnOrder.length) return null;
    return turnOrder[currentTurnIndex];
  };

  const isPlayerTurn = () => {
    const creature = getCurrentCreature();
    return creature?.team === "player";
  };

  const calculateDamage = (attacker: BattleCreature, defender: BattleCreature): { damage: number; isCrit: boolean } => {
    const critRoll = Math.random() * 100;
    const isCrit = critRoll < attacker.stats.crit;
    const critMultiplier = isCrit ? 2 : 1;

    const baseDamage = attacker.stats.attack * critMultiplier;
    const damage = Math.max(1, Math.floor(baseDamage - defender.stats.defense * 0.5));

    return { damage, isCrit };
  };

  const performAttack = (targetIndex: number) => {
    const attacker = getCurrentCreature();
    if (!attacker || !playerTeam || !enemyTeam || isProcessing || winner) return;

    setIsProcessing(true);

    // Get target team
    const targetTeam = attacker.team === "player" ? enemyTeam : playerTeam;
    const target = targetTeam[targetIndex];
    if (!target || target.isDead) {
      setIsProcessing(false);
      return;
    }

    // Calculate damage
    const { damage, isCrit } = calculateDamage(attacker, target);

    // Apply damage
    target.currentHP = Math.max(0, target.currentHP - damage);
    if (target.currentHP === 0) {
      target.isDead = true;
    }

    // Update teams
    if (attacker.team === "player") {
      setEnemyTeam([...enemyTeam]);
    } else {
      setPlayerTeam([...playerTeam]);
    }

    // Log attack
    setLog(prev => [
      ...prev,
      {
        text: `💥 ${attacker.name} (${attacker.team}) attaque ${target.name} (${target.team})!`,
        type: "info",
      },
      {
        text: `   ${isCrit ? "💥 CRIT!" : ""} -${damage} HP (${target.currentHP}/${target.stats.hp})`,
        type: isCrit ? "crit" : "info",
      },
    ]);

    // Check win condition
    const playersAlive = playerTeam.some(c => !c.isDead);
    const enemiesAlive = enemyTeam.some(c => !c.isDead);

    if (!playersAlive) {
      setWinner("enemy");
      setLog(prev => [
        ...prev,
        { text: `💀 Défaite! Toutes tes créatures sont tombées.`, type: "defeat" },
      ]);
      setPhase("complete");
    } else if (!enemiesAlive) {
      setWinner("player");
      setLog(prev => [
        ...prev,
        { text: `🏆 Victoire! Tu élimines toutes les créatures ennemies!`, type: "victory" },
      ]);
      setPhase("complete");
    } else {
      // Next turn
      advanceTurn();
    }

    setIsProcessing(false);
  };

  const advanceTurn = () => {
    let newIndex = currentTurnIndex;
    const maxAttempts = turnOrder.length * 2; // Prevent infinite loop
    let attempts = 0;

    do {
      newIndex = (newIndex + 1) % turnOrder.length;
      attempts++;
      if (attempts > maxAttempts) {
        console.error("Infinite turn loop detected!");
        return;
      }
    } while (turnOrder[newIndex]?.isDead && attempts < maxAttempts);

    setCurrentTurnIndex(newIndex);
  };

  const selectedCreatures = collection.filter(c => selectedIds.includes(c.id));

  // HOME PAGE - Mode selector
  if (mode === "home") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link href="/" className="inline-block px-4 py-2 mb-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
              ← Retour
            </Link>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🕸️ Battle Arena
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Sélectionne un mode de combat
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/battle?mode=training" className="block">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all hover:scale-105 border-2 border-transparent hover:border-cyan-500 cursor-pointer">
                <div className="text-6xl mb-4">🎮</div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                  Entraînement
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Combats 5v5 contre Rank E (Niveau 1)
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Sélectionne 5 créatures de ta collection</li>
                  <li>• Simple battle engine</li>
                </ul>
              </div>
            </Link>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border-2 border-gray-200 dark:border-gray-700 opacity-50">
              <div className="text-6xl mb-4">⚔️</div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                PvP Matchmaking
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Combat contre d'autres joueurs (bientôt)
              </p>
              <div className="mt-4 px-4 py-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg text-center">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-bold">
                  🚧 Bientôt disponible
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TRAINING SETUP PHASE
  if (mode === "training" && phase === "setup") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link href="/battle" className="inline-block px-4 py-2 mb-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
              ← Retour
            </Link>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🎮 Entraînement
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Sélectionne 5 créatures de ta collection • Affronte 5 créatures Rank E (Niveau 1)
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-blue-400 hover:shadow-2xl transition-all">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">🔵 Ton Équipe ({selectedIds.length}/5)</h2>
                {selectedIds.length > 0 && (
                  <button
                    onClick={handleClearSelection}
                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                  >
                    Effacer
                  </button>
                )}
              </div>

              {selectedCreatures.length > 0 && (
                <div className="mb-4 grid grid-cols-5 gap-2">
                  {selectedCreatures.map(creature => (
                    <div key={creature.id} className="bg-blue-50 dark:bg-blue-900 rounded-lg p-2 text-center border-2 border-blue-300 dark:border-blue-700">
                      <div className="text-2xl mb-1">🪲</div>
                      <p className="text-xs font-bold truncate">{creature.name}</p>
                      <p className="text-xs text-gray-500">N{creature.customStats?.level || 1}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="max-h-96 overflow-y-auto space-y-2">
                {collection.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    Aucune créature dans ta collection. Commence par faire du hunting!
                  </p>
                ) : (
                  collection.map(creature => (
                    <button
                      key={creature.id}
                      onClick={() => handleToggleCreature(creature.id)}
                      disabled={!selectedIds.includes(creature.id) && selectedIds.length >= 5}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        selectedIds.includes(creature.id)
                          ? "bg-blue-100 dark:bg-blue-900 border-blue-500 dark:border-blue-500"
                          : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700"
                      } ${!selectedIds.includes(creature.id) && selectedIds.length >= 5 ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🪲</span>
                          <div>
                            <p className="font-bold">{creature.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              R{creature.rank || "E"} • N{creature.customStats?.level || 1} • HP: {creature.customStats?.hp || creature.baseStats.hp}
                            </p>
                            <div className="flex gap-1">
                              {creature.traits?.slice(0, 3).map((trait, i) => (
                                <span key={i} className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                                  {trait}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {selectedIds.includes(creature.id) && <span className="text-2xl">✅</span>}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-red-400 hover:shadow-2xl transition-all">
              <h2 className="text-2xl font-bold mb-4">⚔️ Ennemis (5 × Rank E, Niveau 1)</h2>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border-2 border-gray-300 dark:border-gray-600">
                <div className="mt-4 space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-red-50 dark:bg-red-900 rounded-lg p-3 border-2 border-red-300 dark:border-red-700 opacity-50">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🪲</span>
                          <div>
                            <p className="font-bold">Créature #{i}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Rank E • Niveau 1</p>
                          </div>
                        </div>
                        <span className="text-xl">🎯</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                disabled={selectedIds.length !== 5}
                className={`w-full mt-6 p-8 text-white text-xl font-bold rounded-xl shadow-lg transition-all ${
                  selectedIds.length === 5
                    ? "bg-gradient-to-r from-green-500 to-green-600 hover:shadow-xl transform hover:scale-105"
                    : "from-gray-400 to-gray-500 cursor-not-allowed opacity-50"
                }`}
                onClick={startBattle}
              >
                🗡️ DÉMARRER LE COMBAT
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // BATTLE PHASE
  if (phase === "battle" || phase === "complete") {
    const currentCreature = getCurrentCreature();
    const playerTurn = currentCreature?.team === "player";

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 flex justify-between items-center">
            <Link href="/battle" className="inline-block px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm">
              ← Retour
            </Link>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ⚔️ {phase === "complete" ? "Battle Terminé" : "En cours"}
            </h1>
          </div>

          {phase === "complete" && winner && (
            <div className={`p-4 rounded-lg mb-4 text-center ${winner === "player" ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}>
              <p className="text-2xl font-bold">
                {winner === "player" ? "🏆 VICTOIRE!" : "💀 DÉFAITE"}
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* Player Team */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 border-2 border-blue-400">
              <h2 className="text-xl font-bold mb-3">🔵 Ton Équipe</h2>
              <div className="space-y-2">
                {playerTeam?.map((creature, i) => (
                  <div key={creature.id} className={`p-3 rounded-lg ${creature.isDead ? "bg-gray-100 dark:bg-gray-900 opacity-50" : "bg-blue-50 dark:bg-blue-900"}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">🪲 {creature.name}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        HP: {creature.currentHP}/{creature.stats.hp}
                      </span>
                    </div>
                    {currentCreature?.id === creature.id && (
                      <div className="mt-1 text-xs text-blue-700 dark:text-blue-300 font-bold">
                        ← Tour actif
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Enemy Team */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 border-2 border-red-400">
              <h2 className="text-xl font-bold mb-3">⚔️ Ennemis</h2>
              <div className="space-y-2">
                {enemyTeam?.map((creature, i) => (
                  <button
                    key={creature.id}
                    disabled={!playerTurn || phase === "complete" || creature.isDead || currentCreature?.team !== "player"}
                    onClick={() => performAttack(i)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${creature.isDead || !playerTurn || phase === "complete" || currentCreature?.team !== "player" ? "bg-gray-100 dark:bg-gray-900 opacity-50 cursor-not-allowed" : "bg-red-50 dark:bg-red-900 hover:border-red-500 border-2 border-red-300 dark:border-red-700 cursor-pointer"}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold">🪲 {creature.name}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        HP: {creature.currentHP}/{creature.stats.hp}
                      </span>
                    </div>
                    {currentCreature?.id === creature.id && (
                      <div className="mt-1 text-xs text-red-700 dark:text-red-300 font-bold">
                        ← Tour actif
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Turn Indicator */}
          {phase === "battle" && currentCreature && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 mb-4 border-2 border-gray-300 dark:border-gray-600">
              <p className="text-lg font-bold text-center">
                Tour de: <span className={`${currentCreature.team === "player" ? "text-blue-700 dark:text-blue-300" : "text-red-700 dark:text-red-300"}`}>{currentCreature.name}</span>
                {currentCreature.team === "player" ? " (Joueur)" : " (Ennemi)"}
              </p>
              {playerTurn && (
                <p className="text-center text-sm text-gray-600 dark:text-gray-300 mt-2">
                  Sélectionne un ennemi pour attaquer
                </p>
              )}
            </div>
          )}

          {/* Battle Log */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 border-2 border-gray-300 dark:border-gray-600">
            <h2 className="text-xl font-bold mb-3">📜 Journal de Combat</h2>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
              {log.map((entry, i) => (
                <p key={i} className={`mb-1 ${entry.type === "crit" ? "text-yellow-600 dark:text-yellow-400 font-bold" : entry.type === "victory" ? "text-green-600 dark:text-green-400 font-bold" : entry.type === "defeat" ? "text-red-600 dark:text-red-400 font-bold" : "text-gray-600 dark:text-gray-300"}`}>
                  {entry.text}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <div>Mode inconnu</div>;
}

export default function BattlePage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <BattlePageContent />
    </Suspense>
  );
}
