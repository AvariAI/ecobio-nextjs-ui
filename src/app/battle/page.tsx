"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CREATURES, Rank } from "@/lib/database";
import { spawnEasyModeEnemy } from "@/lib/easy-mode";

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
  const mode = searchParams.get("mode") || "home";
  const [collection, setCollection] = useState<HuntedCreature[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<BattlePhase>("setup");
  const [playerTeam, setPlayerTeam] = useState<BattleCreature[] | null>(null);
  const [enemyTeam, setEnemyTeam] = useState<BattleCreature[] | null>(null);
  const [log, setLog] = useState<{ text: string; type?: string }[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [turnOrder, setTurnOrder] = useState<BattleCreature[]>([]);
  const [winner, setWinner] = useState<"player" | "enemy" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [turnCount, setTurnCount] = useState(0);

  // Load collection
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("ecobio-collection");
      if (saved) setCollection(JSON.parse(saved));
    } catch (e) { console.error("Failed load collection", e); }
  }, []);

  const handleToggleCreature = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  };

  const handleClearSelection = () => setSelectedIds([]);

  const startBattle = () => {
    const selectedCreatures = collection.filter(c => selectedIds.includes(c.id));
    const enemyTemplates = Array(5).fill(null).map(() => spawnEasyModeEnemy());

    const pCreatures: BattleCreature[] = selectedCreatures.map((c, i) => ({
      id: `player-${i}`,
      name: c.name,
      stats: {
        hp: c.customStats?.hp || c.baseStats.hp,
        attack: c.customStats?.attack || c.baseStats.attack,
        defense: c.customStats?.defense || c.baseStats.defense,
        speed: c.customStats?.speed || c.baseStats.speed,
        crit: c.customStats?.crit || c.baseStats.crit,
        rank: c.rank || "E",
      },
      currentHP: c.customStats?.hp || c.baseStats.hp,
      team: "player",
      position: i,
      isDead: false,
    }));

    const eCreatures: BattleCreature[] = enemyTemplates.map((t, i) => ({
      id: `enemy-${i}`,
      name: t.name,
      stats: {
        hp: t.stats.hp,
        attack: t.stats.attack,
        defense: t.stats.defense,
        speed: t.stats.speed,
        crit: t.stats.crit,
        rank: t.stats.rank,
      },
      currentHP: t.stats.hp,
      team: "enemy",
      position: i,
      isDead: false,
    }));

    const sorted = [...pCreatures, ...eCreatures].sort((a, b) => b.stats.speed - a.stats.speed);
    // FORCED: Player creatures first in turn order (regardless of speed)
    const ordered = [...pCreatures, ...eCreatures].sort((a, b) => {
      console.log(`Comparing: ${a.name} (${a.team}) vs ${b.name} (${b.team})`);
      if (a.team === "player" && b.team === "enemy") {
        console.log(`  -> Player +1 (force player-first)`);
        return -1;
      }
      if (a.team === "enemy" && b.team === "player") {
        console.log(`  -> Enemy -1 (force player-first)`);
        return 1;
      }
      const speedDiff = b.stats.speed - a.stats.speed;
      console.log(`  -> Same team: speed ${b.stats.speed} - ${a.stats.speed} = ${speedDiff}`);
      return speedDiff;
    });

    setPlayerTeam(pCreatures);
    setEnemyTeam(eCreatures);
    setTurnOrder(ordered);
    setCurrentTurnIndex(0);
    setTurnCount(0);
    setPhase("battle");
    setWinner(null);

    // DEBUG: Log turn order to verify sorting
    console.log("DEBUG: Initial turn order:", ordered.map((c, i) => `${i}: ${c.name} (${c.team})`).join(", "));

    setLog([
      { text: `⚔️ 5v5 Battle commence!`, type: "info" },
      { text: `Ordre tour (vitesse/game): ${ordered.map((e, i) => `${i + 1}.${e.name.split(" ")[0]} (${e.team === "player" ? "P" : "E"})`).join(", ")}`, type: "info" },
      { text: `🎯 Tour 1: ${ordered[0]?.name.split(" ")[0]} (${ordered[0]?.team})`, type: "info" },
    ]);
  };

  const getTurnOrder = (): BattleCreature[] => {
    if (!playerTeam || !enemyTeam) return [];
    return [...playerTeam, ...enemyTeam].filter(c => !c.isDead).sort((a, b) => b.stats.speed - a.stats.speed);
  };

  const getCurrentCreature = (): BattleCreature | null => {
    const order = getTurnOrder();
    if (order.length === 0 || currentTurnIndex >= order.length) return null;
    return order[currentTurnIndex];
  };

  const calculateDamage = (attacker: BattleCreature, defender: BattleCreature): { damage: number; isCrit: boolean } => {
    const isCrit = Math.random() * 100 < attacker.stats.crit;
    const baseDamage = Math.floor(attacker.stats.attack * (isCrit ? 2 : 1));
    const defenseReduction = Math.floor(defender.stats.defense * 0.3); // Changed from 0.5 to 0.3
    const damage = Math.max(1, baseDamage - defenseReduction);
    return { damage, isCrit };
  };

  const performAttack = (targetIndex: number) => {
    const attacker = stableCurrentCreature;
    if (!attacker || !playerTeam || !enemyTeam || isProcessing || winner) return;

    const targetTeam = attacker.team === "player" ? enemyTeam : playerTeam;
    const target = targetTeam[targetIndex];
    if (!target || target.isDead) return;

    setIsProcessing(true);

    const { damage, isCrit } = calculateDamage(attacker, target);
    target.currentHP = Math.max(0, target.currentHP - damage);
    if (target.currentHP === 0) target.isDead = true;

    if (attacker.team === "player") {
      setEnemyTeam([...enemyTeam]);
    } else {
      setPlayerTeam([...playerTeam]);
    }

    setLog(prev => [
      ...prev,
      { text: `💥 ${attacker.name} (${attacker.team}) => ${target.name} (${target.team})`, type: "info" },
      { text: `${isCrit ? "💥 CRIT! " : ""}-${damage} HP (${target.currentHP}/${target.stats.hp})`, type: isCrit ? "crit" : "info" },
    ]);

    const playersAlive = playerTeam?.some(c => !c.isDead) ?? true;
    const enemiesAlive = enemyTeam?.some(c => !c.isDead) ?? true;

    if (!playersAlive) {
      setWinner("enemy");
      setPhase("complete");
      setLog(prev => [...prev, { text: `💀 Défaite!`, type: "defeat" }]);
    } else if (!enemiesAlive) {
      setWinner("player");
      setPhase("complete");
      setLog(prev => [...prev, { text: `🏆 Victoire!`, type: "victory" }]);
    }

    setIsProcessing(false);
  };

  const advanceTurn = () => {
    const order = getTurnOrder();
    if (order.length === 0) return;

    let nextIdx = (currentTurnIndex + 1) % order.length;
    let attempts = 0;

    while (attempts < order.length + 1) {
      if (nextIdx < order.length && !order[nextIdx].isDead) {
        setCurrentTurnIndex(nextIdx);
        const nextCreature = order[nextIdx];
        const newTurnCount = turnCount + 1;
        setTurnCount(newTurnCount);

        setLog(prev => [
          ...prev,
          { text: `🎯 Tour ${newTurnCount}: ${nextCreature.name} (${nextCreature.team})`, type: "info" },
        ]);

        // No auto enemy attack - let user trigger via NEXT button
        // if (nextCreature.team === "enemy") { executeEnemyAttack(nextCreature); }

        return;
      }
      nextIdx = (nextIdx + 1) % order.length;
      attempts++;
    }

    if (order.length > 0) {
      setCurrentTurnIndex(0);
      const nextCreature = order[0];
      const newTurnCount = turnCount + 1;
      setTurnCount(newTurnCount);

      setLog(prev => [
        ...prev,
        { text: `🎯 Tour ${newTurnCount}: ${nextCreature?.name} (${nextCreature?.team}) [Rest]`, type: "info" },
      ]);

      if (nextCreature?.team === "enemy") {
        // executeEnemyAttack(nextCreature); // DISABLED to fix double-turn bug
      }
    }
  };

  const executeEnemyAttack = (enemy: BattleCreature) => {
    if (!playerTeam || enemy.team !== "enemy" || isProcessing || winner) return;

    const alivePlayers = playerTeam.filter(c => !c.isDead);
    if (alivePlayers.length === 0) return;

    const target = alivePlayers.reduce((prev, curr) => (curr.currentHP < prev.currentHP ? curr : prev));
    const { damage, isCrit } = calculateDamage(enemy, target);

    target.currentHP = Math.max(0, target.currentHP - damage);
    if (target.currentHP === 0) target.isDead = true;

    setPlayerTeam([...playerTeam]);
    setLog(prev => [
      ...prev,
      { text: `🤖 ${enemy.name} (E) => ${target.name} (${target.team})`, type: "info" },
      { text: `${isCrit ? "💥 CRIT! " : ""}-${damage} HP (${target.currentHP}/${target.stats.hp})`, type: isCrit ? "crit" : "info" },
    ]);

    const playersAlive = playerTeam.some(c => !c.isDead);
    const enemiesAlive = enemyTeam?.some(c => !c.isDead) ?? true;

    if (!playersAlive) {
      setWinner("enemy");
      setPhase("complete");
      setLog(prev => [...prev, { text: `💀 Défaite!`, type: "defeat" }]);
    } else if (!enemiesAlive) {
      setWinner("player");
      setPhase("complete");
      setLog(prev => [...prev, { text: `🏆 Victoire!`, type: "victory" }]);
    }
  };

  const selectedCreatures = collection.filter(c => selectedIds.includes(c.id));
  // Use stable turn order from state, don't recalc with getTurnOrder
  const stableCurrentCreature = turnOrder.length > 0 && currentTurnIndex < turnOrder.length ? turnOrder[currentTurnIndex] : null;
  const playerTurn = stableCurrentCreature?.team === "player";

  // HOME
  if (mode === "home") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link href="/" className="inline-block px-4 py-2 mb-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">← Retour</Link>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">🕸️ Battle Arena</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Sélectionne un mode de combat</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/battle?mode=training" className="block">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all hover:scale-105 border-2 border-transparent hover:border-cyan-500 cursor-pointer">
                <div className="text-6xl mb-4">🎮</div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Entraînement</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">Combats 5v5 contre Rank E (Niveau 1)</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // SETUP
  if (mode === "training" && phase === "setup") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link href="/battle" className="inline-block px-4 py-2 mb-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">← Retour</Link>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">🎮 Entraînement</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Sélectionne 5 créatures • Affronte 5 Rank E (Niveau 1)</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-blue-400">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">🔵 Team ({selectedIds.length}/5)</h2>
                {selectedIds.length > 0 && <button onClick={handleClearSelection} className="px-3 py-1 bg-red-500 text-white rounded-lg">Effacer</button>}
              </div>
              {selectedCreatures.length > 0 && (
                <div className="mb-4 grid grid-cols-5 gap-2">
                  {selectedCreatures.map(c => (
                    <div key={c.id} className="bg-blue-50 dark:bg-blue-900 rounded-lg p-2 text-center border-2 border-blue-300">
                      <div className="text-2xl mb-1">🪲</div>
                      <p className="text-xs font-bold truncate">{c.name}</p>
                      <p className="text-xs text-gray-500">N{c.customStats?.level || 1}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {collection.length === 0 ? <p className="text-center text-gray-500 py-8">Aucune créature dans ta collection.</p> : collection.map(c => (
                  <button key={c.id} onClick={() => handleToggleCreature(c.id)} disabled={!selectedIds.includes(c.id) && selectedIds.length >= 5} className={`w-full text-left p-3 rounded-lg border-2 transition-all ${selectedIds.includes(c.id) ? "bg-blue-100 border-blue-500" : "bg-gray-50 border-gray-200 hover:border-blue-300"} ${!selectedIds.includes(c.id) && selectedIds.length >= 5 ? "opacity-40 cursor-not-allowed" : ""}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🪲</span>
                        <div>
                          <p className="font-bold">{c.name}</p>
                          <p className="text-sm text-gray-600">R{c.rank || "E"} • N{c.customStats?.level || 1}</p>
                        </div>
                      </div>
                      {selectedIds.includes(c.id) && <span className="text-2xl">✅</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-red-400">
              <h2 className="text-2xl font-bold mb-4">⚔️ Ennemis (5 × Rank E, Niveau 1)</h2>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border-2 border-gray-300">
                <div className="mt-4 space-y-2">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="bg-red-50 dark:bg-red-900 rounded-lg p-3 border-2 border-red-300 opacity-50">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🪲</span>
                          <div><p className="font-bold">Créature #{i}</p><p className="text-sm text-gray-600">Rank E • Niveau 1</p></div>
                        </div>
                        <span className="text-xl">🎯</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button disabled={selectedIds.length !== 5} className={`w-full mt-6 p-8 text-white text-xl font-bold rounded-xl ${selectedIds.length === 5 ? "bg-gradient-to-r from-green-500 to-green-600" : "from-gray-400 to-gray-500 cursor-not-allowed opacity-50"}`} onClick={startBattle}>
                🗡️ DÉMARRER
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // BATTLE
  if ((mode === "training" && phase === "battle") || phase === "complete") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 flex justify-between items-center">
            <Link href="/battle" className="px-3 py-1 bg-gray-600 text-white rounded-lg text-sm">← Retour</Link>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ⚔️ {phase === "complete" ? "Battle Terminé" : "En cours"}
            </h1>
          </div>

          {phase === "complete" && winner && (
            <div className={`p-4 rounded-lg mb-4 text-center ${winner === "player" ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}>
              <p className="text-2xl font-bold">{winner === "player" ? "🏆 VICTOIRE!" : "💀 DÉFAITE"}</p>
            </div>
          )}

          {phase === "battle" && stableCurrentCreature && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 mb-4 border-2 border-gray-300">
              <div className="text-center">
                <p className="text-2xl font-bold mb-2">🎯 Tour {turnCount}</p>
                <p className="text-lg font-bold">
                  Tour de: <span className={stableCurrentCreature.team === "player" ? "text-blue-700 dark:text-blue-300" : "text-red-700 dark:text-red-300"}>{stableCurrentCreature.name}</span> ({stableCurrentCreature.team})
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  DEBUG: playerTurn={String(playerTurn)} | stableCreatureId={stableCurrentCreature.id}
                </p>
                <p className="text-sm text-gray-600 mt-2">{playerTurn ? "→ Sélectionne un ennemi" : "...C'est l'ennemi donc pas d'action"}</p>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 border-2 border-blue-400">
              <h2 className="text-xl font-bold mb-3">🔵 Ton Équipe</h2>
              <div className="space-y-2">
                {playerTeam?.map((c, i) => (
                  <div key={c.id} className={`p-3 rounded-lg ${c.isDead ? "bg-gray-100 opacity-50" : "bg-blue-50"}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">🪲 {c.name}</span>
                      <span className="text-sm text-gray-600">HP: {c.currentHP}/{c.stats.hp}</span>
                    </div>
                    {stableCurrentCreature?.id === c.id && <div className="mt-1 text-xs text-blue-700 font-bold">← Actif</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 border-2 border-red-400">
              <h2 className="text-xl font-bold mb-3">⚔️ Ennemis</h2>
              <div className="space-y-2">
                {enemyTeam?.map((c, i) => (
                  <button key={c.id} disabled={!playerTurn || phase === "complete" || c.isDead} onClick={() => performAttack(i)} className={`w-full p-3 rounded-lg text-left transition-all ${!playerTurn || phase === "complete" || c.isDead ? "bg-gray-100 opacity-50 cursor-not-allowed" : "bg-red-50 hover:border-red-500 border-2 border-red-300 cursor-pointer"}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">🪲 {c.name}</span>
                      <span className="text-sm text-gray-600">HP: {c.currentHP}/{c.stats.hp}</span>
                    </div>
                    {stableCurrentCreature?.id === c.id && <div className="mt-1 text-xs text-red-700 font-bold">← Actif</div>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 border-2 border-gray-300">
            <h2 className="text-xl font-bold mb-3">📜 Journal</h2>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto mb-4">
              {log.map((entry, i) => (
                <p key={i} className={`mb-1 ${entry.type === "crit" ? "text-yellow-600 font-bold" : entry.type === "victory" ? "text-green-600 font-bold" : entry.type === "defeat" ? "text-red-600 font-bold" : "text-gray-600"}`}>
                  {entry.text}
                </p>
              ))}
            </div>
            {phase === "battle" && (
              <button onClick={advanceTurn} disabled={phase === "complete" as any} className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg">
                ➡️ SUIVANT (Debug: avance si bloqué)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <div>Mode inconnu</div>;
}

export default function BattlePage() {
  return <Suspense fallback={<div>Chargement...</div>}><BattlePageContent /></Suspense>;
}
