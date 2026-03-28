// =============================================================================
// Multi-Creature Battle Display Components for 3v3 and 5v5
// =============================================================================

import { BattleCreature, BattleElement } from "@/lib/battle";
import { BattleTeam, TeamSize, countAliveCreatures } from "@/lib/battle-multi";

// Define locally to avoid import issues
export interface BattleLogEntry {
  text: string;
  type?: "info" | "critical" | "damage" | "victory" | "defeat" | "skill" | "dodge" | "miss";
}

export function BattleLogDisplay({ log }: { log: BattleLogEntry[] }) {
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

interface MultiCreatureBattleDisplayProps {
  playerTeam: BattleTeam | null;
  enemyTeam: BattleTeam | null;
  currentActingCreature: BattleCreature | null;
  turn: "player" | "enemy";
  round: number;
  turnOrder: BattleElement[];
  onAttack: () => void;
  onSkill: () => void;
}

export function MultiCreatureBattleDisplay({
  playerTeam,
  enemyTeam,
  currentActingCreature,
  turn,
  round,
  turnOrder,
  onAttack,
  onSkill,
}: MultiCreatureBattleDisplayProps) {
  const isPlayerTurn = turn === "player";
  const currentCreature = currentActingCreature;
  const canUseSkill = currentCreature && currentCreature.creature.skill;

  return (
    <div className="space-y-6">
      {/* Turn Info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Round {round}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {isPlayerTurn ? "🎮 Tour du Joueur" : "⚔️ Tour de l'Ennemi"}
            </p>
          </div>
          {currentCreature && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Créature actif</p>
              <p className="font-bold text-lg">
                {currentCreature.name}
                {currentCreature.currentHP <= 0 && " 💀"}
              </p>
            </div>
          )}
        </div>

        {/* Turn Order Display */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
          <p className="text-sm font-semibold mb-2">Ordre de tour (vitesse):</p>
          <div className="flex flex-wrap gap-2">
            {turnOrder.map((el, i) => {
              const isCurrent = el.creature === currentActingCreature;
              const isDead = el.creature.currentHP <= 0;
              return (
                <div
                  key={i}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                    isDead
                      ? "bg-gray-300 dark:bg-gray-700 text-gray-500 line-through"
                      : isCurrent
                      ? "bg-yellow-500 text-white animate-pulse"
                      : el.team === "player"
                      ? "bg-blue-500 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {i + 1}. {el.name}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Teams Display */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Player Team */}
        {playerTeam && (
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">
              🎮 Équipe Joueur ({countAliveCreatures(playerTeam)}/{turnOrder.filter(el => el.team === "player").length})
            </h3>
            {playerTeam.creatures.map((creature, i) => (
              <div
                key={i}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border-2 transition-all ${
                  creature === currentActingCreature
                    ? "border-yellow-400 ring-2 ring-yellow-400"
                    : "border-gray-200 dark:border-gray-700"
                } ${creature.currentHP <= 0 ? "opacity-50" : ""}`}
              >
                <CompactCreatureDisplay creature={creature} />
              </div>
            ))}
          </div>
        )}

        {/* Enemy Team */}
        {enemyTeam && (
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400">
              ⚔️ Équipe Ennemi ({countAliveCreatures(enemyTeam)}/{turnOrder.filter(el => el.team === "enemy").length})
            </h3>
            {enemyTeam.creatures.map((creature, i) => (
              <div
                key={i}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border-2 transition-all ${
                  creature === currentActingCreature
                    ? "border-yellow-400 ring-2 ring-yellow-400"
                    : "border-gray-200 dark:border-gray-700"
                } ${creature.currentHP <= 0 ? "opacity-50" : ""}`}
              >
                <CompactCreatureDisplay creature={creature} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons (only on player turn) */}
      {isPlayerTurn && currentCreature && currentCreature.currentHP > 0 && (
        <div className="flex justify-center gap-4">
          <button
            onClick={onAttack}
            className="px-12 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white text-xl font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            🗡️ ATTAQUER
          </button>
          {canUseSkill && (
            <button
              onClick={onSkill}
              disabled={
                !currentCreature.creature.skill ||
                (currentCreature.skillCooldowns[currentCreature.creature.skill.name] || 0) > 0
              }
              className={`px-12 py-4 text-white text-xl font-bold rounded-xl shadow-lg transition-all ${
                (currentCreature.skillCooldowns[currentCreature.creature.skill.name] || 0) > 0
                  ? "from-gray-400 to-gray-500 cursor-not-allowed opacity-50"
                  : "from-purple-500 to-purple-600 hover:shadow-xl transform hover:scale-105 bg-gradient-to-r"
              }`}
            >
              ✨ SKILL: {currentCreature.creature.skill.name}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface CompactCreatureDisplayProps {
  creature: BattleCreature;
}

function CompactCreatureDisplay({ creature }: CompactCreatureDisplayProps) {
  const hpPercent = (creature.currentHP / creature.stats.hp) * 100;
  const isDead = creature.currentHP <= 0;

  // Status effect indicators
  const hasStun = creature.statusEffects.some(e => e.type === "stun");
  const hasPoison = creature.statusEffects.some(e => e.type === "poison");
  const hasSlow = creature.statusEffects.some(e => e.type === "slow");

  const skillOnCooldown = creature.creature.skill
    ? Object.entries(creature.skillCooldowns).some(([k, v]) => k.startsWith(creature.creature.skill!.name) && v > 0)
    : false;

  return (
    <div className={isDead ? "grayscale" : ""}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-bold text-lg">{creature.name}</h4>
        <div className="flex gap-1">
          {hasStun && <span className="px-2 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs rounded-full">💫</span>}
          {hasPoison && <span className="px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs rounded-full">☠️</span>}
          {hasSlow && <span className="px-2 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded-full">🐌</span>}
        </div>
      </div>

      {/* HP Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span>HP</span>
          <span className="font-bold">{creature.currentHP} / {creature.stats.hp}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={`h-full rounded-full transition-all ${
              isDead
                ? "bg-gray-400"
                : hpPercent > 50
                ? "bg-gradient-to-r from-green-400 to-green-600"
                : hpPercent > 25
                ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
                : "bg-gradient-to-r from-red-400 to-red-600"
            }`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1 text-xs text-center">
        <div className="bg-gray-100 dark:bg-gray-700 rounded p-1">
          <p className="text-gray-500">ATK</p>
          <p className="font-bold">{creature.stats.attack}</p>
        </div>
        <div className="bg-gray-100 dark:bg-gray-700 rounded p-1">
          <p className="text-gray-500">DEF</p>
          <p className="font-bold">{creature.stats.defense}</p>
        </div>
        <div className="bg-gray-100 dark:bg-gray-700 rounded p-1">
          <p className="text-gray-500">SPD</p>
          <p className="font-bold">{creature.stats.speed}</p>
        </div>
        <div className="bg-gray-100 dark:bg-gray-700 rounded p-1">
          <p className="text-gray-500">CRIT</p>
          <p className="font-bold">{creature.stats.crit}</p>
        </div>
      </div>

      {/* Skill Info */}
      {creature.creature.skill && (
        <div className="mt-2 pt-2 border-t text-xs">
          <div className="flex justify-between items-center">
            <span>✨ {creature.creature.skill.name}</span>
            {skillOnCooldown ? (
              <span className="text-red-500 font-semibold">
                CD: {Object.entries(creature.skillCooldowns)
                  .filter(([k, v]) => k.startsWith(creature.creature.skill!.name) && v > 0)
                  .map(([, v]) => v)
                  .join(',')}t
              </span>
            ) : (
              <span className="text-green-500">✓ Ready</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface MultiCreatureBattleCompleteDisplayProps {
  playerTeam: BattleTeam | null;
  enemyTeam: BattleTeam | null;
  log: BattleLogEntry[];
  teamSize: TeamSize;
  onReset: () => void;
}

export function MultiCreatureBattleCompleteDisplay({
  playerTeam,
  enemyTeam,
  log,
  teamSize,
  onReset,
}: MultiCreatureBattleCompleteDisplayProps) {
  const playerAlive = playerTeam ? countAliveCreatures(playerTeam) : 0;
  const enemyAlive = enemyTeam ? countAliveCreatures(enemyTeam) : 0;
  const winner = playerAlive > 0 ? "player" : "enemy";

  return (
    <div className={`bg-gradient-to-br ${winner === "player" ? "from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900" : "from-red-50 to-orange-50 dark:from-red-900 dark:to-orange-900"} rounded-2xl shadow-xl p-8`}>
      <div className="text-center mb-6">
        <h2 className="text-4xl font-bold mb-4">
          {winner === "player" ? "🏆 VICTORY!" : "💀 DEFEAT"}
        </h2>
        <p className="text-lg">
          {playerAlive}/{teamSize} créatures du joueur restent • {enemyAlive}/{teamSize} créatures ennemies restent
        </p>
      </div>

      {/* Final Team States */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {playerTeam && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
            <h3 className="font-bold mb-3 text-blue-600 dark:text-blue-400">Équipe Joueur (Finaux)</h3>
            <div className="space-y-2">
              {playerTeam.creatures.map((creature, i) => (
                <div key={i} className="flex justify-between items-center text-sm border-b pb-1 last:border-0">
                  <span>{creature.name}</span>
                  <span className={creature.currentHP > 0 ? "text-green-600 font-bold" : "text-gray-500"}>
                    {creature.currentHP} / {creature.stats.hp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {enemyTeam && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
            <h3 className="font-bold mb-3 text-red-600 dark:text-red-400">Équipe Ennemi (Finaux)</h3>
            <div className="space-y-2">
              {enemyTeam.creatures.map((creature, i) => (
                <div key={i} className="flex justify-between items-center text-sm border-b pb-1 last:border-0">
                  <span>{creature.name}</span>
                  <span className={creature.currentHP > 0 ? "text-green-600 font-bold" : "text-gray-500"}>
                    {creature.currentHP} / {creature.stats.hp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Battle Log */}
      <div className="mb-6">
        <BattleLogDisplay log={log} />
      </div>

      {/* Reset Button */}
      <div className="text-center">
        <button
          onClick={onReset}
          className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-xl font-bold rounded-xl shadow-lg hover:shadow-xl"
        >
          🔄 COMBAT NOUVEAU
        </button>
      </div>
    </div>
  );
}
