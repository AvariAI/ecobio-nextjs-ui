"use client";

import { useState } from "react";
import { CREATURES, Rank, RANKS } from "@/lib/database";
import {
  BattleCreature,
  calculateFinalStats,
  executeAttack,
  useSkill,
  tickCooldownsAndBuffs,
  BattleLogEntry,
} from "@/lib/battle";
import Link from "next/link";

function getCreatureImage(creatureId: string, rank: Rank): string {
  if (creatureId === "housefly") {
    const rankSuffix = rank === "S+" ? "S+" : rank;
    return `creatures/fly-rank-${rankSuffix}.png`;
  }
  if (creatureId === "ant") {
    const rankSuffix = rank === "S+" ? "S+" : rank;
    return `creatures/ant_rank_${rankSuffix}.png`;
  }
  return "images/giant_fly.png";
}

type BattlePhase = "setup" | "battle" | "complete";

function formatBuffChange(
  buffType: string,
  oldValue: number,
  newValue: number
): string {
  const diffNumeric = (newValue - oldValue) * 100;
  const sign = diffNumeric > 0 ? "+" : "";
  return `${buffType} ${sign}${diffNumeric.toFixed(0)}%`;
}

export default function BattlePage() {
  const [playerCreatureId, setPlayerCreatureId] = useState("ant");
  const [playerLevel, setPlayerLevel] = useState(10);
  const [playerRank, setPlayerRank] = useState<Rank>("E");
  const [enemyCreatureId, setEnemyCreatureId] = useState("housefly");
  const [enemyLevel, setEnemyLevel] = useState(10);
  const [enemyRank, setEnemyRank] = useState<Rank>("E");

  const [phase, setPhase] = useState<BattlePhase>("setup");
  const [player, setPlayer] = useState<BattleCreature | null>(null);
  const [enemy, setEnemy] = useState<BattleCreature | null>(null);
  const [log, setLog] = useState<BattleLogEntry[]>([]);
  const [turn, setTurn] = useState<"player" | "enemy">("player");
  const [round, setRound] = useState(1);

  const playerCreature = CREATURES[playerCreatureId];
  const enemyCreature = CREATURES[enemyCreatureId];

  const playerPreviewStats = calculateFinalStats(playerCreature, playerLevel, playerRank);
  const enemyPreviewStats = calculateFinalStats(enemyCreature, enemyLevel, enemyRank);

  const startBattle = () => {
    const pStats = playerPreviewStats;
    const eStats = enemyPreviewStats;

    const p: BattleCreature = {
      creature: playerCreature,
      stats: pStats,
      currentHP: pStats.hp,
      skillCooldowns: {},
      buffs: {
        defenseBuff: 0,
        dodgeBuff: 0,
        defenseBuffTurns: 0,
        dodgeBuffTurns: 0,
      },
      name: `${playerCreature.name} (R${playerRank} L${playerLevel})`,
    };

    const e: BattleCreature = {
      creature: enemyCreature,
      stats: eStats,
      currentHP: eStats.hp,
      skillCooldowns: {},
      buffs: {
        defenseBuff: 0,
        dodgeBuff: 0,
        defenseBuffTurns: 0,
        dodgeBuffTurns: 0,
      },
      name: `${enemyCreature.name} (R${enemyRank} L${enemyLevel})`,
    };

    setPlayer(p);
    setEnemy(e);
    setLog([
      { text: `⚔️ BATTLE START!`, type: "info" },
      { text: `—`.repeat(40), type: "info" },
      { text: `${p.name}`, type: "info" },
      { text: `HP: ${p.currentHP} | ATK: ${p.stats.attack} | DEF: ${p.stats.defense} | SPD: ${p.stats.speed} | CRIT: ${p.stats.crit}`, type: "info" },
      { text: `${e.name}`, type: "info" },
      { text: `HP: ${e.currentHP} | ATK: ${e.stats.attack} | DEF: ${e.stats.defense} | SPD: ${e.stats.speed} | CRIT: ${e.stats.crit}`, type: "info" },
      { text: `—`.repeat(40), type: "info" },
    ]);
    setPhase("battle");
    setTurn("player");
    setRound(1);
  };

  const handleAttack = () => {
    if (!player || !enemy || phase !== "battle" || turn !== "player") return;

    const logCopy = [...log];
    logCopy.push({ text: `--- Round ${round}: Player Turn ---`, type: "info" });

    const oldDefenseBuff = player.buffs.defenseBuff;
    const oldDodgeBuff = player.buffs.dodgeBuff;
    tickCooldownsAndBuffs(player);

    if (oldDefenseBuff !== player.buffs.defenseBuff) {
      logCopy.push({ text: `✨ ${player.name}: ${formatBuffChange("DEF buff", oldDefenseBuff, player.buffs.defenseBuff)}`, type: "info" });
    }
    if (oldDodgeBuff !== player.buffs.dodgeBuff) {
      logCopy.push({ text: `${player.name}: ${formatBuffChange("Dodge buff", oldDodgeBuff, player.buffs.dodgeBuff)}`, type: "info" });
    }

    const damage = executeAttack(player, enemy, logCopy);
    setLog(logCopy);
    setEnemy({ ...enemy });

    if (damage === 0) {
      setTimeout(() => enemyTurn(logCopy), 1500);
    } else if (enemy.currentHP <= 0) {
      logCopy.push({ text: `🏆 VICTORY!`, type: "victory" });
      setLog(logCopy);
      setPhase("complete");
    } else {
      setTimeout(() => enemyTurn(logCopy), 1500);
    }
  };

  const handleSkill = () => {
    if (!player || !player.creature.skill || phase !== "battle" || turn !== "player") return;

    const skill = player.creature.skill;
    const logCopy = [...log];
    logCopy.push({ text: `--- Round ${round}: Player Turn (Skill) ---`, type: "info" });

    const oldDefenseBuff = player.buffs.defenseBuff;
    const oldDodgeBuff = player.buffs.dodgeBuff;
    tickCooldownsAndBuffs(player);

    if (oldDefenseBuff !== player.buffs.defenseBuff) {
      logCopy.push({ text: `✨ ${player.name}: ${formatBuffChange("DEF buff", oldDefenseBuff, player.buffs.defenseBuff)}`, type: "info" });
    }
    if (oldDodgeBuff !== player.buffs.dodgeBuff) {
      logCopy.push({ text: `${player.name}: ${formatBuffChange("Dodge buff", oldDodgeBuff, player.buffs.dodgeBuff)}`, type: "info" });
    }

    const success = useSkill(player, logCopy);

    if (!success) {
      setLog(logCopy);
      setTimeout(() => enemyTurn(logCopy), 1500);
      return;
    }

    const buffType = skill.effect === "defense" ? "DEF" : "Dodge";
    const newBuff = skill.effect === "defense" ? player.buffs.defenseBuff : player.buffs.dodgeBuff;
    logCopy.push({ text: `✨ ${player.name}: ${buffType} buff actif!`, type: "skill" });

    if (skill.effect === "defense") {
      const newDEF = Math.floor(player.stats.defense * (1 + newBuff));
      logCopy.push({ text: `💪 DEF: ${player.stats.defense} → ${newDEF} (+${Math.floor(newBuff * 100)}%)`, type: "info" });
    } else {
      if (!enemy) {
        logCopy.push({ text: `💨 Dodge: Buff activé (+${Math.floor(newBuff * 100)}%)`, type: "info" });
      } else {
        const baseDodge = Math.log10(Math.abs(player.stats.speed - enemy.stats.speed) + 1) * 0.1;
        const newDodge = Math.min(0.75, baseDodge + newBuff);
        logCopy.push({ text: `💨 Dodge: ${(baseDodge * 100).toFixed(1)}% → ${(newDodge * 100).toFixed(1)}%`, type: "info" });
      }
    }

    setLog(logCopy);
    setPlayer({ ...player });
    setTimeout(() => enemyTurn(logCopy), 1500);
  };

  const enemyTurn = (currentLog: BattleLogEntry[] = log) => {
    if (!player || !enemy) return;

    if (player.currentHP <= 0) {
      currentLog.push({ text: `💀 DEFEAT!`, type: "defeat" });
      setLog(currentLog);
      setPhase("complete");
      return;
    }
    if (enemy.currentHP <= 0) {
      currentLog.push({ text: `🏆 VICTORY!`, type: "victory" });
      setLog(currentLog);
      setPhase("complete");
      return;
    }

    const logCopy = [...currentLog];

    const oldDefenseBuff = enemy.buffs.defenseBuff;
    const oldDodgeBuff = enemy.buffs.dodgeBuff;
    tickCooldownsAndBuffs(enemy);

    if (oldDefenseBuff !== enemy.buffs.defenseBuff) {
      logCopy.push({ text: `${enemy.name}: ${formatBuffChange("DEF buff", oldDefenseBuff, enemy.buffs.defenseBuff)}`, type: "info" });
    }
    if (oldDodgeBuff !== enemy.buffs.dodgeBuff) {
      logCopy.push({ text: `${enemy.name}: ${formatBuffChange("Dodge buff", oldDodgeBuff, enemy.buffs.dodgeBuff)}`, type: "info" });
    }

    logCopy.push({ text: `--- Round ${round}: Enemy Turn ---`, type: "info" });
    const damage = executeAttack(enemy, player, logCopy);
    setPlayer({ ...player });

    if (damage === 0) {
      logCopy.push({ text: `Enemy attack esquivé!`, type: "dodge" });
      setLog(logCopy);
    } else if (player.currentHP <= 0) {
      logCopy.push({ text: `💀 DEFEAT!`, type: "defeat" });
      setLog(logCopy);
      setPhase("complete");
    } else {
      logCopy.push({ text: `--- Fin round ${round} ---`, type: "info" });
      setLog(logCopy);
      setRound((prev) => prev + 1);
      setTurn("player");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <Link href="/" className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 rounded-lg shadow-md hover:shadow-lg transition-all mb-4 border border-red-200 dark:border-red-800 font-semibold">
            <span className="mr-2">←</span> Back
          </Link>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent mb-4">
            ⚔️ Battle Arena
          </h1>
        </header>

        {phase === "setup" && (
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <CreatureSelector
              label="🔵 Your Creature"
              creature={playerCreature}
              creatureId={playerCreatureId}
              onCreatureChange={setPlayerCreatureId}
              level={playerLevel}
              onLevelChange={setPlayerLevel}
              rank={playerRank}
              onRankChange={setPlayerRank}
              previewStats={playerPreviewStats}
              accent="blue"
            />

            <CreatureSelector
              label="🔴 Enemy Creature"
              creature={enemyCreature}
              creatureId={enemyCreatureId}
              onCreatureChange={setEnemyCreatureId}
              level={enemyLevel}
              onLevelChange={setEnemyLevel}
              rank={enemyRank}
              onRankChange={setEnemyRank}
              previewStats={enemyPreviewStats}
              accent="red"
            />
          </div>
        )}

        {phase === "setup" && (
          <div className="text-center mb-8">
            <button
              onClick={startBattle}
              className="px-12 py-4 bg-gradient-to-r from-red-600 to-purple-600 text-white text-2xl font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all"
            >
              ⚔️ START BATTLE!
            </button>
          </div>
        )}

        {phase === "battle" && (
          <div className="grid md:grid-cols-3 gap-8">
            {player && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-blue-400">
                <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4">
                  🎮 {turn === "player" ? "YOUR TURN" : "WAITING"}
                </h2>
                <BattleCreatureDisplay creature={player} isPlayer={true} />
              </div>
            )}

            {turn === "player" && (
              <div className="flex flex-col gap-4 justify-center">
                <button
                  onClick={handleAttack}
                  className="px-8 py-6 bg-gradient-to-r from-green-500 to-green-600 text-white text-xl font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  🗡️ ATTACK
                </button>
                {player?.creature.skill && (
                  <button
                    onClick={() => {
                      const skill = player.creature.skill;
                      if (!skill) return;
                      const cooldownKey = skill.name;
                      const currentCooldown = player.skillCooldowns[cooldownKey] || 0;
                      if (currentCooldown > 0 || phase !== "battle" || turn !== "player") return;
                      handleSkill();
                    }}
                    disabled={
                      !player ||
                      !player.creature.skill ||
                      (player.skillCooldowns[player.creature.skill.name] || 0) > 0
                    }
                    className={`px-8 py-6 bg-gradient-to-r text-white text-xl font-bold rounded-xl shadow-lg transition-all ${
                      (player.skillCooldowns[player.creature.skill.name] || 0) > 0
                        ? "from-gray-400 to-gray-500 cursor-not-allowed opacity-50"
                        : "from-purple-500 to-purple-600 hover:shadow-xl transform hover:scale-105"
                    }`}
                  >
                    ✨ SKILL: {player.creature.skill.name}
                  </button>
                )}
              </div>
            )}

            {enemy && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-red-400">
                <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
                  ⚔️ ENEMY
                </h2>
                <BattleCreatureDisplay creature={enemy} isPlayer={false} />
              </div>
            )}
          </div>
        )}

        {phase === "battle" && (
          <div className="mt-8">
            <BattleLogDisplay log={log} />
          </div>
        )}

        {phase === "complete" && (
          <BattleCompleteDisplay
            player={player}
            enemy={enemy}
            log={log}
            onReset={() => {
              setPhase("setup");
              setLog([]);
              setRound(1);
              setTurn("player");
            }}
          />
        )}
      </div>
    </main>
  );
}

function BattleCreatureDisplay({
  creature,
  isPlayer,
}: {
  creature: BattleCreature;
  isPlayer: boolean;
}) {
  const maxHP = creature.stats.hp;
  const hpPercent = (creature.currentHP / maxHP) * 100;
  const defenseBuffActive = creature.buffs.defenseBuff > 0;
  const dodgeBuffActive = creature.buffs.dodgeBuff > 0;

  const skillOnCooldown = creature.creature.skill
    ? Object.entries(creature.skillCooldowns).some(([k, v]) => k === creature.creature.skill?.name && v > 0)
    : false;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-bold">HP</span>
          <span className="font-bold">{creature.currentHP} / {maxHP}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
          <div
            className="bg-gradient-to-r from-red-400 to-red-600 h-full rounded-full transition-all"
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>ATK</span>
          <span>{creature.stats.attack}</span>
        </div>
        {defenseBuffActive ? (
          <div className="flex justify-between">
            <span>DEF</span>
            <div>
              <span className="text-purple-600 font-bold">{Math.floor(creature.stats.defense * (1 + creature.buffs.defenseBuff))}</span>
              <span className="text-xs ml-1">(+{Math.floor(creature.buffs.defenseBuff * 100)}%)</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-between">
            <span>DEF</span>
            <span>{creature.stats.defense}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>SPD</span>
          <span>{creature.stats.speed}</span>
        </div>
      </div>

      {creature.creature.skill && (
        <div className="pt-2 border-t">
          <div className="text-xs mb-1">Skill: {creature.creature.skill.name}</div>
          <div className="text-xs">
            {skillOnCooldown ? (
              <div className="text-red-500 font-semibold">
                ❌ CD: {Object.entries(creature.skillCooldowns)
                  .filter(([k, v]) => v > 0)
                  .map(([k, v]) => `${v}t`)
                  .join(", ")}
              </div>
            ) : (
              <div className="text-green-500">✅ Ready</div>
            )}
          </div>
        </div>
      )}

      {(defenseBuffActive || dodgeBuffActive) && (
        <div className="pt-2 border-t">
          <div className="text-xs">
            {defenseBuffActive && <div>✨ DEF +{Math.floor(creature.buffs.defenseBuff * 100)}% ({creature.buffs.defenseBuffTurns}t)</div>}
            {dodgeBuffActive && <div>💨 Dodge +{Math.floor(creature.buffs.dodgeBuff * 100)}% ({creature.buffs.dodgeBuffTurns}t)</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function BattleLogDisplay({ log }: { log: BattleLogEntry[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
      <h2 className="text-2xl font-bold mb-4">📜 Battle Log</h2>
      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 max-h-96 overflow-y-auto">
        <div className="space-y-1 text-sm font-mono">
          {log.map((entry, idx) => (
            <div
              key={idx}
              className={
                entry.type === "critical"
                  ? "text-red-600 font-bold"
                  : entry.type === "dodge"
                  ? "text-green-600 italic"
                  : entry.type === "skill"
                  ? "text-purple-600"
                  : entry.type === "victory"
                  ? "text-amber-600 font-bold text-lg"
                  : entry.type === "defeat"
                  ? "text-gray-600"
                  : "text-gray-600 dark:text-gray-300"
              }
            >
              {entry.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BattleCompleteDisplay({
  player,
  enemy,
  log,
  onReset,
}: {
  player: BattleCreature | null;
  enemy: BattleCreature | null;
  log: BattleLogEntry[];
  onReset: () => void;
}) {
  const winner = player && enemy && player.currentHP > 0 ? "player" : "enemy";

  return (
    <div className={`bg-gradient-to-br ${winner === "player" ? "from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900" : "from-red-50 to-orange-50 dark:from-red-900 dark:to-orange-900"} rounded-2xl shadow-xl p-8`}>
      <div className="text-center mb-6">
        <h2 className="text-4xl font-bold mb-4">
          {winner === "player" ? "🏆 VICTORY!" : "💀 DEFEAT"}
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {player && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <h3 className="font-bold mb-2">Final HP</h3>
            <p className="text-3xl font-bold">{player.currentHP} / {player.stats.hp}</p>
          </div>
        )}
        {enemy && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <h3 className="font-bold mb-2">Enemy HP</h3>
            <p className="text-3xl font-bold">{enemy.currentHP} / {enemy.stats.hp}</p>
          </div>
        )}
      </div>

      <div className="mb-6">
        <BattleLogDisplay log={log} />
      </div>

      <div className="text-center">
        <button
          onClick={onReset}
          className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-xl font-bold rounded-xl shadow-lg hover:shadow-xl"
        >
          🔄 NEW BATTLE
        </button>
      </div>
    </div>
  );
}

function CreatureSelector({
  label,
  creature,
  creatureId,
  onCreatureChange,
  level,
  onLevelChange,
  rank,
  onRankChange,
  previewStats,
  accent,
}: {
  label: string;
  creature: typeof CREATURES[keyof typeof CREATURES];
  creatureId: string;
  onCreatureChange: (id: string) => void;
  level: number;
  onLevelChange: (level: number) => void;
  rank: Rank;
  onRankChange: (rank: Rank) => void;
  previewStats: { hp: number; attack: number; defense: number; speed: number; crit: number };
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
      <h2 className="text-3xl font-bold mb-4">{label}</h2>

      <div className={`bg-gradient-to-br ${accentBg[accent]} rounded-xl p-6 mb-4`}>
        <img
          src={getCreatureImage(creatureId, rank)}
          alt={`${creature.name} Rank ${rank}`}
          className="w-full max-h-48 object-contain mx-auto rounded-lg"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">Creature</label>
        <select
          value={creatureId}
          onChange={(e) => onCreatureChange(e.target.value)}
          className="w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700"
        >
          {Object.values(CREATURES).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">Level: {level}</label>
        <input
          type="range"
          min="1"
          max="50"
          value={level}
          onChange={(e) => onLevelChange(parseInt(e.target.value))}
          className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">Rank:</label>
        <div className="flex flex-wrap gap-2">
          {RANKS.map((r) => (
            <button
              key={r}
              onClick={() => onRankChange(r as Rank)}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                rank === r
                  ? `bg-${accent === "blue" ? "blue" : "red"}-600 text-white`
                  : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="font-bold mb-2">Stats (Base)</h3>
        <div className="text-sm space-y-1">
          <div>HP: {creature.baseStats.hp}</div>
          <div>ATK: {creature.baseStats.attack}</div>
          <div>DEF: {creature.baseStats.defense}</div>
          <div>SPD: {creature.baseStats.speed}</div>
          <div>CRIT: {creature.baseStats.crit}</div>
        </div>
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
        <h3 className="font-bold mb-2 text-blue-900 dark:text-blue-100">Stats (Final)</h3>
        <div className="text-sm space-y-1">
          <div><span className="font-bold">HP:</span> {previewStats.hp}</div>
          <div><span className="font-bold">ATK:</span> {previewStats.attack}</div>
          <div><span className="font-bold">DEF:</span> {previewStats.defense}</div>
          <div><span className="font-bold">SPD:</span> {previewStats.speed}</div>
          <div><span className="font-bold">CRIT:</span> {previewStats.crit}</div>
        </div>
      </div>

      {creature.skill && (
        <div className="mt-4 pt-2 border-t">
          <h4 className="font-bold mb-1">Skill</h4>
          <div className="text-sm">
            <div className="font-semibold">{creature.skill.name}</div>
            <div className="text-xs">{creature.skill.description}</div>
            <div className="text-xs mt-1">Cooldown: {creature.skill.cooldown} tours</div>
          </div>
        </div>
      )}
    </div>
  );
}
