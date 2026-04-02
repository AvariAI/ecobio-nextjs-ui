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
  baseStats: { hp: number; attack: number; defense: number; speed: number; crit: number; };
  traits?: string[];
  stars?: number;
}

interface SlotCreature {
  id: string;
  name: string;
  stats: { hp: number; attack: number; defense: number; speed: number; crit: number; rank: Rank };
  currentHP: number;
  team: "player" | "enemy";
  isDead: boolean;
}

type Phase = "setup" | "battle" | "complete";
type TurnEntity = { team: "player" | "enemy"; slot: number };

function BattlePageContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "home";
  const [collection, setCollection] = useState<HuntedCreature[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("setup");
  const [playerSlots, setPlayerSlots] = useState<(SlotCreature | null)[]>([null, null, null, null, null]);
  const [enemySlots, setEnemySlots] = useState<(SlotCreature | null)[]>([null, null, null, null, null]);
  const [log, setLog] = useState<{ text: string; type?: string }[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [winner, setWinner] = useState<"player" | "enemy" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [turnCount, setTurnCount] = useState(0);

  // Turn array: p1, e1, p2, e2... p5, e5
  const getTurnEntity = (): TurnEntity | null => {
    if (turnIndex >= 10) return null;
    const team = turnIndex % 2 === 0 ? "player" : "enemy";
    const slot = Math.floor(turnIndex / 2);
    return { team, slot };
  };

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

    const playerCreatures: SlotCreature[] = selectedCreatures.map((c, i) => {
      const hp = c.customStats?.hp || c.baseStats.hp;
      return {
        id: `player-${i}`,
        name: c.name,
        stats: {
          hp,
          attack: c.customStats?.attack || c.baseStats.attack,
          defense: c.customStats?.defense || c.baseStats.defense,
          speed: c.customStats?.speed || c.baseStats.speed,
          crit: c.customStats?.crit || c.baseStats.crit,
          rank: c.rank || "E",
        },
        currentHP: hp,
        team: "player",
        isDead: false,
      };
    });

    const enemyCreatures: SlotCreature[] = enemyTemplates.map((t, i) => ({
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
      isDead: false,
    }));

    setPlayerSlots(playerCreatures);
    setEnemySlots(enemyCreatures);
    setTurnIndex(0);
    setTurnCount(1);
    setPhase("battle");
    setWinner(null);
    setLog([
      { text: `⚔️ Battle 5v5 commence! Ordre: p1→e1→p2→e2...p5→e5`, type: "info" },
    ]);
  };

  const calculateDamage = (attacker: SlotCreature, defender: SlotCreature): { damage: number; isCrit: boolean } => {
    const isCrit = Math.random() * 100 < attacker.stats.crit;
    const damage = Math.max(1, Math.floor(attacker.stats.attack * (isCrit ? 2 : 1) - defender.stats.defense * 0.3));
    return { damage, isCrit };
  };

  const performAttack = (targetSlot: number) => {
    if (isProcessing || winner) return;

    const turnEntity = getTurnEntity();
    if (!turnEntity || turnEntity.team !== "player") return;

    const attacker = playerSlots[turnEntity.slot];
    if (!attacker || attacker.isDead) return;

    const target = enemySlots[targetSlot];
    if (!target || target.isDead) return;

    setIsProcessing(true);

    const { damage, isCrit } = calculateDamage(attacker, target);
    target.currentHP = Math.max(0, target.currentHP - damage);
    if (target.currentHP === 0) target.isDead = true;

    const newEnemySlots = [...enemySlots];
    newEnemySlots[targetSlot] = target;
    setEnemySlots(newEnemySlots);

    setLog(prev => [
      ...prev,
      { text: `💥 Slot ${turnEntity.slot + 1} => Slot ${targetSlot + 1}`, type: "info" },
      { text: `${isCrit ? "💥 CRIT! " : ""}-${damage} HP (${target.currentHP}/${target.stats.hp})`, type: isCrit ? "crit" : "info" },
    ]);

    // Check win/loss
    const playersAlive = playerSlots.some(c => c && !c.isDead);
    const enemiesAlive = enemySlots.some(c => c && !c.isDead);

    if (!playersAlive) {
      setWinner("enemy");
      setPhase("complete");
      setLog(prev => [...prev, { text: `💀 Défaite!`, type: "defeat" }]);
    } else if (!enemiesAlive) {
      setWinner("player");
      setPhase("complete");
      setLog(prev => [...prev, { text: `🏆 Victoire!`, type: "victory" }]);
    }

    advanceTurn();
    setIsProcessing(false);
  };

  const advanceTurn = () => {
    let nextIdx = (turnIndex + 1) % 10;
    let attempts = 0;

    // Skip dead slots
    while (attempts < 11) {
      const turnEntity = nextIdx % 2 === 0 ? "player" : "enemy";
      const slot = Math.floor(nextIdx / 2);
      const slots = turnEntity === "player" ? playerSlots : enemySlots;
      const creature = slots[slot];

      if (creature && !creature.isDead) {
        setTurnIndex(nextIdx);
        const newTurnCount = nextIdx < turnIndex ? turnCount + 1 : turnCount;
        setTurnCount(newTurnCount);

        setLog(prev => [
          ...prev,
          { text: `🎯 Tour ${newTurnCount}: Slot ${slot + 1} (${turnEntity === "player" ? "Player" : "Enemy"})`, type: "info" },
        ]);

        // Auto enemy attack
        if (turnEntity === "enemy") {
          setTimeout(() => executeEnemyAttack(slot), 500);
        }

        return;
      }

      nextIdx = (nextIdx + 1) % 10;
      attempts++;
    }

    // All dead
    if (playerSlots.every(c => !c)) {
      setWinner("enemy");
      setPhase("complete");
    } else {
      setWinner("player");
      setPhase("complete");
    }
  };

  const executeEnemyAttack = (enemySlot: number) => {
    if (isProcessing || winner) return;

    const enemy = enemySlots[enemySlot];
    if (!enemy || enemy.isDead) return;

    // Find lowest HP player
    const lowestPlayer = playerSlots.reduce((prev, curr) => {
      if (!curr || curr.isDead) return prev;
      if (!prev || prev.isDead) return curr;
      if (curr.currentHP < prev.currentHP) return curr;
      return prev;
    });
    if (!lowestPlayer || lowestPlayer.isDead) return;

    const targetSlot = playerSlots.indexOf(lowestPlayer);
    if (targetSlot === -1) return;

    const { damage, isCrit } = calculateDamage(enemy, lowestPlayer);
    lowestPlayer.currentHP = Math.max(0, lowestPlayer.currentHP - damage);
    if (lowestPlayer.currentHP === 0) lowestPlayer.isDead = true;

    setPlayerSlots([...playerSlots]);
    setLog(prev => [
      ...prev,
      { text: `🤖 Slot ${enemySlot + 1} (E) => Slot ${targetSlot + 1} (P)`, type: "info" },
      { text: `${isCrit ? "💥 CRIT! " : ""}-${damage} HP (${lowestPlayer.currentHP}/${lowestPlayer.stats.hp})`, type: isCrit ? "crit" : "info" },
    ]);

    // Check win
    const playersAlive = playerSlots.some(c => c && !c.isDead);
    const enemiesAlive = enemySlots.some(c => c && !c.isDead);

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
  const currentTurnEntity = getTurnEntity();
  const isPlayerTurn = currentTurnEntity?.team === "player";
  const currentCreature = isPlayerTurn ? playerSlots[currentTurnEntity.slot] : enemySlots[currentTurnEntity?.slot];

  if (mode === "home") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link href="/" className="inline-block px-4 py-2 mb-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg">← Retour</Link>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">🕸️ Battle Arena</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Sélectionne un mode</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/battle?mode=training" className="block">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all hover:scale-105 border-2 border-transparent hover:border-cyan-500 cursor-pointer">
                <div className="text-6xl mb-4">🎮</div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Entraînement</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">5v5 vs Rank E • Slot-based turns</p>
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
            <Link href="/battle" className="inline-block px-4 py-2 mb-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg">← Retour</Link>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">🎮 Entraînement</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Sélectionne 5 créatures • Slot-based battle-system</p>
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
                    </div>
                  ))}
                </div>
              )}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {collection.length === 0 ? <p className="text-center text-gray-500 py-8">Aucune créature.</p> : collection.map(c => (
                  <button key={c.id} onClick={() => handleToggleCreature(c.id)} disabled={!selectedIds.includes(c.id) && selectedIds.length >= 5} className={`w-full text-left p-3 rounded-lg border-2 transition-all ${selectedIds.includes(c.id) ? "bg-blue-100 border-blue-500" : "bg-gray-50 border-gray-200"} ${!selectedIds.includes(c.id) && selectedIds.length >= 5 ? "opacity-40 cursor-not-allowed" : ""}`}>
                    <p className="font-bold">{c.name}</p>
                    <p className="text-sm text-gray-600">R{c.rank || "E"} • N{c.customStats?.level || 1}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-red-400">
              <h2 className="text-2xl font-bold mb-4">⚔️ Ennemis (Rank E)</h2>
              {[1,2,3,4,5].map(i => (
                <div key={i} className="bg-red-50 dark:bg-red-900 rounded-lg p-3 border-2 border-red-300 opacity-50">
                  <p className="font-bold">Créature #{i}</p>
                </div>
              ))}
              <button disabled={selectedIds.length !== 5} className={`w-full mt-6 p-8 text-white text-xl font-bold rounded-xl ${selectedIds.length === 5 ? "bg-gradient-to-r from-green-500 to-green-600" : "from-gray-400 to-gray-500 cursor-not-allowed opacity-50"}`} onClick={startBattle}>
                🗡️ START
              </button>
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

          {phase === "battle" && currentTurnEntity && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 mb-4 border-2 border-gray-300">
              <div className="text-center">
                <p className="text-2xl font-bold mb-2">🎯 Tour {turnCount}</p>
                <p className="text-lg font-bold">
                  Tour: Slot {currentTurnEntity.slot + 1} ({currentTurnEntity.team === "player" ? "🔵 Player" : "⚔️ Enemy"})
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {currentCreature?.name} • {currentCreature?.team === "player" ? "→ Clique slot enemy" : "...attaque slot 1 (plus faible HP)"}
                </p>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 border-2 border-blue-400">
              <h2 className="text-xl font-bold mb-3">🔵 Player Slots (1-5)</h2>
              <div className="space-y-2">
                {playerSlots.map((c, slot) => (
                  <div key={slot} className={`p-3 rounded-lg ${!c || c.isDead ? "bg-gray-100 opacity-50" : currentTurnEntity?.team === "player" && currentTurnEntity.slot === slot ? "bg-blue-400 ring-2 ring-blue-600" : "bg-blue-50"}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">Slot {slot + 1}: {c?.name || "Empty"}</span>
                      <span className="text-sm text-gray-600">{c ? `HP ${c.currentHP}/${c.stats.hp}` : "-"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 border-2 border-red-400">
              <h2 className="text-xl font-bold mb-3">⚔️ Enemy Slots (1-5)</h2>
              <div className="space-y-2">
                {enemySlots.map((c, slot) => (
                  <button key={slot} disabled={isPlayerTurn || phase === "complete" || !c || c.isDead} onClick={() => performAttack(slot)} className={`w-full p-3 rounded-lg text-left transition-all ${!isPlayerTurn || phase === "complete" || !c || c.isDead ? "bg-gray-100 opacity-50 cursor-not-allowed" : currentTurnEntity?.team === "player" && currentTurnEntity.slot === slot ? "bg-yellow-100 border-2 border-yellow-400" : "bg-red-50 hover:border-red-500 border-2 border-red-300 cursor-pointer"}`}>
                    <p className="font-bold">Slot {slot + 1}: {c?.name || "Empty"}</p>
                    <p className="text-sm text-gray-600">{c ? `HP ${c.currentHP}/${c.stats.hp}` : "-"}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 border-2 border-gray-300">
            <h2 className="text-xl font-bold mb-3">📜 Journal</h2>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
              {log.map((entry, i) => (
                <p key={i} className={`mb-1 ${entry.type === "crit" ? "text-yellow-600 font-bold" : entry.type === "victory" ? "text-green-600 font-bold" : entry.type === "defeat" ? "text-red-600 font-bold" : "text-gray-600"}`}>
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
