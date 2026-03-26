"use client";

import { useState } from "react";
import { CREATURES, DAMAGE_TYPES, Creature, DamageType } from "@/lib/database";
import { simulateBattle, BattleResult } from "@/lib/battle";
import Link from "next/link";

export default function BattlePage() {
  const [playerCreatureId, setPlayerCreatureId] = useState("mantis");
  const [playerLevel, setPlayerLevel] = useState(10);
  const [playerQuality, setPlayerQuality] = useState(85);
  const [enemyCreatureId, setEnemyCreatureId] = useState("wolf_spider");
  const [enemyLevel, setEnemyLevel] = useState(10);
  const [enemyQuality, setEnemyQuality] = useState(85);
  const [damageType, setDamageType] = useState<DamageType>("normal");
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);

  const playerCreature = CREATURES[playerCreatureId];
  const enemyCreature = CREATURES[enemyCreatureId];

  const handleBattle = () => {
    const result = simulateBattle(
      playerCreature,
      enemyCreature,
      playerLevel,
      playerQuality,
      enemyLevel,
      enemyQuality,
      damageType
    );
    setBattleResult(result);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <Link href="/" className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 rounded-lg shadow-md hover:shadow-lg hover:bg-gradient-to-r hover:from-red-50 hover:to-purple-50 dark:hover:from-gray-700 dark:hover:to-gray-700 transition-all duration-200 mb-4 border border-red-200 dark:border-red-800 font-semibold">
            <span className="mr-2">←</span> Back to Home
          </Link>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent mb-4">
            ⚔️ Battle Arena
          </h1>
        </header>

        {/* Damage Type Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Damage Type
          </label>
          <div className="flex flex-wrap gap-3">
            {DAMAGE_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setDamageType(type)}
                className={`px-6 py-3 rounded-full font-bold text-lg transition-all ${
                  damageType === type
                    ? "bg-blue-600 text-white shadow-lg transform scale-105"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Creatures Selection */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <CreatureSelector
            label="🔵 Your Creature"
            creature={playerCreature}
            creatureId={playerCreatureId}
            onCreatureChange={setPlayerCreatureId}
            level={playerLevel}
            onLevelChange={setPlayerLevel}
            quality={playerQuality}
            onQualityChange={setPlayerQuality}
            accent="blue"
          />

          <CreatureSelector
            label="🔴 Enemy Creature"
            creature={enemyCreature}
            creatureId={enemyCreatureId}
            onCreatureChange={setEnemyCreatureId}
            level={enemyLevel}
            onLevelChange={setEnemyLevel}
            quality={enemyQuality}
            onQualityChange={setEnemyQuality}
            accent="red"
          />
        </div>

        {/* Battle Button */}
        <div className="text-center mb-8">
          <button
            onClick={handleBattle}
            className="px-12 py-4 bg-gradient-to-r from-red-600 to-purple-600 text-white text-2xl font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all"
          >
            ⚔️ START BATTLE!
          </button>
        </div>

        {/* Battle Result */}
        {battleResult && <BattleResultDisplay result={battleResult} />}
      </div>
    </main>
  );
}

function CreatureSelector({
  label,
  creature,
  creatureId,
  onCreatureChange,
  level,
  onLevelChange,
  quality,
  onQualityChange,
  accent,
}: {
  label: string;
  creature: Creature;
  creatureId: string;
  onCreatureChange: (id: string) => void;
  level: number;
  onLevelChange: (level: number) => void;
  quality: number;
  onQualityChange: (quality: number) => void;
  accent: "blue" | "red";
}) {
  const accentColors = {
    blue: "border-blue-400 hover:border-blue-600",
    red: "border-red-400 hover:border-red-600",
  };
  const accentBg = {
    blue: "from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900",
    red: "from-red-100 to-orange-100 dark:from-red-900 dark:to-orange-900",
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 ${accentColors[accent]} hover:shadow-2xl transition-all`}>
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">{label}</h2>

      {/* Creature Image */}
      <div className={`bg-gradient-to-br ${accentBg[accent]} rounded-xl p-6 mb-4`}>
        <img
          src={creature.image}
          alt={creature.name}
          className="w-full max-h-48 object-contain mx-auto rounded-lg"
        />
      </div>

      {/* Creature Selector */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Select Creature
        </label>
        <select
          value={creatureId}
          onChange={(e) => onCreatureChange(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          {Object.values(CREATURES).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.type})
            </option>
          ))}
        </select>
      </div>

      {/* Level Slider */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Level: {level}
        </label>
        <input
          type="range"
          min="1"
          max="30"
          value={level}
          onChange={(e) => onLevelChange(parseInt(e.target.value))}
          className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>1</span>
          <span>15</span>
          <span>30</span>
        </div>
      </div>

      {/* Quality Slider */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Photo Quality: {quality}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={quality}
          onChange={(e) => onQualityChange(parseInt(e.target.value))}
          className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

function BattleResultDisplay({ result }: { result: BattleResult }) {
  const winnerColors = {
    player: "from-green-500 to-emerald-600",
    enemy: "from-red-500 to-orange-600",
    draw: "from-yellow-500 to-amber-600",
    timeout: "from-gray-500 to-slate-600",
  };

  const winnerText = {
    player: "🏆 VICTORY!",
    enemy: "💀 DEFEAT!",
    draw: "🤝 DRAW!",
    timeout: "⏱️ TIMEOUT!",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mb-8 border-2 border-gray-300 dark:border-gray-600">
      <div className={`bg-gradient-to-r ${winnerColors[result.winner]} text-white text-3xl font-bold py-4 px-8 rounded-xl mb-6 text-center`}>
        {winnerText[result.winner]}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">{result.rounds}</div>
          <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Rounds</div>
        </div>
        <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">{result.playerHP}</div>
          <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Final HP (You)</div>
        </div>
        <div className="bg-red-100 dark:bg-red-900 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-800 dark:text-red-200">{result.enemyHP}</div>
          <div className="text-sm font-medium text-red-700 dark:text-red-300">Final HP (Enemy)</div>
        </div>
      </div>

      {/* Battle Log */}
      <div className="bg-gray-900 text-gray-100 rounded-lg p-6 font-mono text-sm max-h-96 overflow-y-auto">
        {result.log.map((entry, index) => (
          <div
            key={index}
            className={`mb-1 ${
              entry.type === "critical"
                ? "text-yellow-400 font-bold"
                : entry.type === "damage"
                ? "text-red-300"
                : entry.type === "victory"
                ? "text-green-400 font-bold"
                : entry.type === "defeat"
                ? "text-red-400 font-bold"
                : "text-gray-300"
            }`}
          >
            {entry.text}
          </div>
        ))}
      </div>
    </div>
  );
}
