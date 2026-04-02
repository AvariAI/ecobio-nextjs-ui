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

  const handleClearSelection = () => setSelectedIds([]);

  const startBattle = () => {
    const selectedCreatures = collection.filter(c => selectedIds.includes(c.id));
    const enemyTemplates = Array(5).fill(null).map(() => spawnEasyModeEnemy());

    const playerCreatures: BattleCreature[] = selectedCreatures.map((creature, i) => {
      const template = CREATURES[creature.id];
      const hp = creature.customStats?.hp || creature.baseStats.hp;
      return {
        id: `player-${i}`,
        name: creature.name,
        stats: { hp, attack: creature.customStats?.attack || creature.baseStats.attack, defense: creature.customStats?.defense || creature.baseStats.defense, speed: creature.customStats?.speed || creature.baseStats.speed, crit: creature.customStats?.crit || creature.baseStats.crit, rank: creature.rank || "E" },
        currentHP: hp,
        team: "player",
        position: i,
        isDead: false,
      };
    });

    const enemyCreatures: BattleCreature[] = enemyTemplates.map((template, i) => ({
      id: `enemy-${i}`,
      name: template.name,
      stats: { hp: template.stats.hp, attack: template.stats.attack, defense: template.stats.defense, speed: template.stats.speed, crit: template.stats.crit, rank: template.stats.rank },
      currentHP: template.stats.hp,
      team: "enemy",
      position: i,
      isDead: false,
    }));

    const allCreatures = [...playerCreatures, ...enemyCreatures].sort((a, b) => b.stats.speed - a.stats.speed);

    setPlayerTeam(playerCreatures);
    setEnemyTeam(enemyCreatures);
    setTurnOrder(allCreatures);
    setCurrentTurnIndex(0);
    setTurnCount(0);
    setPhase("battle");
    setWinner(null);
    setLog([
      { text: `⚔️ 5v5 Battle commence!`, type: "info" },
      { text: `Tour order: ${allCreatures.map((el, i) => `${i + 1}. ${el.name} (${el.stats.speed} VIT) ${el.team === "player" ? "J" : "E"}`).join(", ")}`, type: "info" },
      { text: `🎯 Tour 1: ${allCreatures[0]?.name} (${allCreatures[0]?.team === "player" ? "Joueur" : "Ennemi"})`, type: "info" },
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
    const damage = Math.max(1, Math.floor(attacker.stats.attack * (isCrit ? 2 : 1) - defender.stats.defense * 0.5));
    return { damage, isCrit };
  };

  const performAttack = (targetIndex: number) => {
    const attacker = getCurrentCreature();
    if (!attacker || !playerTeam || !enemyTeam || isProcessing || winner) return;

    setIsProcessing(true);

    const targetTeam = attacker.team === "player" ? enemyTeam : playerTeam;
    const target = targetTeam[targetIndex];
    if (!target || target.isDead) {
      setIsProcessing(false);
      return;
    }

    const { damage, isCrit } = calculateDamage(attacker, target);
    target.currentHP = Math.max(0, target.currentHP - damage);
    if (target.currentHP === 0) {
      target.isDead = true;
    }

    if (attacker.team === "player") {
      setEnemyTeam([...enemyTeam]);
    } else {
      setPlayerTeam([...playerTeam]);
    }

    setLog(prev => [
      ...prev,
      { text: `💥 ${attacker.name} (${attacker.team === "player" ? "J" : "E"}) attaque ${target.name} (${target.team === "player" ? "J" : "E"})!`, type: "info" },
      { text: `${isCrit ? "💥 CRIT! " : ""}-${damage} HP (${target.currentHP}/${target.stats.hp})`, type: isCrit ? "crit" : "info" },
    ]);

    // Check win/loss
    const playersAlive = playerTeam.some(c => !c.isDead);
    const enemiesAlive = enemyTeam.some(c => !c.isDead);

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

    // DO NOT call advanceTurn here - it causes recursion issues
  };

  const advanceTurn = () => {
    const order = getTurnOrder();
    if (order.length === 0) return;

    let nextIndex = (currentTurnIndex + 1) % order.length;
    let attempts = 0;

    // Skip dead and cycle
    while (attempts < order.length + 1) {
      if (nextIndex < order.length && !order[nextIndex].isDead) {
        setCurrentTurnIndex(nextIndex);
        const nextCreature = order[nextIndex];
        const newTurnCount = turnCount + 1;
        setTurnCount(newTurnCount);

        setLog(prev => [
          ...prev,
          { text: `🎯 Tour ${newTurnCount}: ${nextCreature.name} (${nextCreature.team === "player" ? "Joueur" : "Ennemi"})`, type: "info" },
        ]);

        // If enemy turn, IMMEDIATELY execute attack
        if (nextCreature.team === "enemy") {
          setTimeout(() => executeEnemyAttack(nextCreature), 500);
        }

        return;
      }
      nextIndex = (nextIndex + 1) % order.length;
      attempts++;
    }

    // Fallback
    if (order.length > 0) {
      setCurrentTurnIndex(0);
      const nextCreature = order[0];
      const newTurnCount = turnCount + 1;
      setTurnCount(newTurnCount);

      setLog(prev => [
        ...prev,
        { text: `🎯 Tour ${newTurnCount}: ${nextCreature?.name} (${nextCreature?.team === "player" ? "Joueur" : "Ennemi"}) [Rest]`, type: "info" },
      ]);

      if (nextCreature?.team === "enemy") {
        setTimeout(() => executeEnemyAttack(nextCreature), 500);
      }
    }
  };

  const executeEnemyAttack = (enemy: BattleCreature) => {
    if (!playerTeam || isProcessing || winner) return;

    const alivePlayers = playerTeam.filter(c => !c.isDead);
    if (alivePlayers.length === 0) return;

    const target = alivePlayers.reduce((prev, curr) => (curr.currentHP < prev.currentHP ? curr : prev));

    const { damage, isCrit } = calculateDamage(enemy, target);
    const beforeHP = target.currentHP;
    target.currentHP = Math.max(0, target.currentHP - damage);
    if (target.currentHP === 0) {
      target.isDead = true;
    }

    setPlayerTeam([...playerTeam]);
    setLog(prev => [
      ...prev,
      { text: `🤖 ${enemy.name} (Ennemi) attaque ${target.name}!`, type: "info" },
      { text: `${isCrit ? "💥 CRIT! " : ""}-${damage} HP (${target.currentHP}/${target.stats.hp})`, type: isCrit ? "crit" : "info" },
    ]);

    // Check win
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
  const currentCreature = getCurrentCreature();
  const playerTurn = currentCreature?.team === "player";

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
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Sélectionne 5 créatures de ta collection</li>
                  <li>• Battle engine synchrone</li>
                </ul>
              </div>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "training" && phase === "setup") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link href="/battle" className="inline-block px-4 py-2 mb-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">← Retour</Link>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">🎮 Entraînement</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Sélectionne 5 créatures de ta collection • Affronte 5 créatures Rank E (Niveau 1)</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-blue-400 hover:shadow-2xl transition-all">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">🔵 Ton Équipe ({selectedIds.length}/5)</h2>
                {selectedIds.length > 0 && <button onClick={handleClearSelection} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors">Effacer</button>}
              </div>
              {selectedCreatures.length > 0 && <div className="mb-4 grid grid-cols-5 gap-2">{selectedCreatures.map(creature => (
                <div key={creature.id} className="bg-blue-50 dark:bg-blue-900 rounded-lg p-2 text-center border-2 border-blue-300 dark:border-blue-700">
                  <div className="text-2xl mb-1">🪲</div>
                  <p className="text-xs font-bold truncate">{creature.name}</p>
                  <p className="text-xs text-gray-500">N{creature.customStats?.level || 1}</p>
                </div>
              ))}</div>}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {collection.length === 0 ? <p className="text-center text-gray-500 py-8">Aucune créature dans ta collection.</p> : collection.map(creature => (
                  <button key={creature.id} onClick={() => handleToggleCreature(creature.id)} disabled={!selectedIds.includes(creature.id) && selectedIds.length >= 5} className={`w-full text-left p-3 rounded-lg border-2 transition-all ${selectedIds.includes(creature.id) ? "bg-blue-100 dark:bg-blue-900 border-blue-500" : "bg-gray-50 dark:bg-gray-700 border-gray-200 hover:border-blue-300"} ${!selectedIds.includes(creature.id) && selectedIds.length >= 5 ? "opacity-40 cursor-not-allowed" : ""}`}>
                    <div className="flex justify-between items-center"><div className="flex items-center gap-3"><span className="text-2xl">🪲</span><div><p className="font-bold">{creature.name}</p><p className="text-sm text-gray-600 dark:text-gray-300">R{creature.rank || "E"} • N{creature.customStats?.level || 1} • HP: {creature.customStats?.hp || creature.baseStats.hp}</p></div></div><div className="text-right">{selectedIds.includes(creature.id) && <span className="text-2xl">✅</span>}</div></div>
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-red-400 hover:shadow-2xl transition-all">
              <h2 className="text-2xl font-bold mb-4">⚔️ Ennemis (5 × Rank E, Niveau 1)</h2>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border-2 border-gray-300 dark:border-gray-600">
                <div className="mt-4 space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="bg-red-50 dark:bg-red-900 rounded-lg p-3 border-2 border-red-300 dark:border-red-700 opacity-50">
                  <div className="flex justify-between items-center"><div className="flex items-center gap-3"><span className="text-2xl">🪲</span><div><p className="font-bold">Créature #{i}</p><p className="text-sm text-gray-600 dark:text-gray-300">Rank E • Niveau 1</p></div></div><span className="text-xl">🎯</span></div>
                </div>)}</div>
              </div>
              <button disabled={selectedIds.length !== 5} className={`w-full mt-6 p-8 text-white text-xl font-bold rounded-xl shadow-lg transition-all ${selectedIds.length === 5 ? "bg-gradient-to-r from-green-500 to-green-600 hover:shadow-xl transform hover:scale-105" : "from-gray-400 to-gray-500 cursor-not-allowed opacity-50"}`} onClick={startBattle}>🗡️ DÉMARRER</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "battle" || phase === "complete") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 flex justify-between items-center">
            <Link href="/battle" className="inline-block px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm">← Retour</Link>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ⚔️ {phase === "complete" ? "Battle Terminé" : "En cours"}
            </h1>
          </div>

          {phase === "complete" && winner && (
            <div className={`p-4 rounded-lg mb-4 text-center ${winner === "player" ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}>
              <p className="text-2xl font-bold">{winner === "player" ? "🏆 VICTOIRE!" : "💀 DÉFAITE"}</p>
            </div>
          )}

          {phase === "battle" && currentCreature && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 mb-4 border-2 border-gray-300 dark:border-gray-600">
              <div className="text-center">
                <p className="text-2xl font-bold mb-2">🎯 Tour {turnCount}</p>
                <p className="text-lg font-bold">Tour de: <span className={currentCreature.team === "player" ? "text-blue-700 dark:text-blue-300" : "text-red-700 dark:text-red-300"}>{currentCreature.name}</span> ({currentCreature.team === "player" ? "Joueur" : "Ennemi"})</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{playerTurn ? "→ Sélectionne un ennemi" : "...attaque en cours"}</p>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 border-2 border-blue-400">
              <h2 className="text-xl font-bold mb-3">🔵 Ton Équipe</h2>
              <div className="space-y-2">
                {playerTeam?.map((creature, i) => (
                  <div key={creature.id} className={`p-3 rounded-lg ${creature.isDead ? "bg-gray-100 dark:bg-gray-900 opacity-50" : "bg-blue-50 dark:bg-blue-900"}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">🪲 {creature.name}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">HP: {creature.currentHP}/{creature.stats.hp}</span>
                    </div>
                    {currentCreature?.id === creature.id && <div className="mt-1 text-xs text-blue-700 dark:text-blue-300 font-bold">← Tour actif</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 border-2 border-red-400">
              <h2 className="text-xl font-bold mb-3">⚔️ Ennemis</h2>
              <div className="space-y-2">
                {enemyTeam?.map((creature, i) => (
                  <button key={creature.id} disabled={!playerTurn || phase === "complete" || creature.isDead} onClick={() => performAttack(i)} className={`w-full p-3 rounded-lg text-left transition-all ${!playerTurn || phase === "complete" || creature.isDead ? "bg-gray-100 dark:bg-gray-900 opacity-50 cursor-not-allowed" : "bg-red-50 dark:bg-red-900 hover:border-red-500 border-2 border-red-300 dark:border-red-700 cursor-pointer"}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">🪲 {creature.name}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">HP: {creature.currentHP}/{creature.stats.hp}</span>
                    </div>
                    {currentCreature?.id === creature.id && <div className="mt-1 text-xs text-red-700 dark:text-red-300 font-bold">← Tour actif</div>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 border-2 border-gray-300 dark:border-gray-600">
            <h2 className="text-xl font-bold mb-3">📜 Journal</h2>
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
  return <Suspense fallback={<div>Chargement...</div>}><BattlePageContent /></Suspense>;
}
