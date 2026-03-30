// =============================================================================
// Multi-Creature Battle Display Components for 3v3 and 5v5
// =============================================================================

import { useMemo } from "react";
import {
  BattleCreature,
  BattleElement,
  getBuffValueByType,
  getBuffsByType,
  BuffType
} from "@/lib/battle";
import { BattleTeam, TeamSize, countAliveCreatures, isFrontRow, getFrontRowPositions, getBackRowPositions } from "@/lib/battle-multi";

/**
 * Interface for buffed stats with breakdown
 */
interface BuffedStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  crit: number;
  bonuses: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    crit: number;
  };
  activeBuffs: {
    defenseBuff: { value: number; turns: number } | null;
    attackBuff: { value: number; turns: number } | null;
    dodgeBuff: { value: number; turns: number } | null;
  };
}

/**
 * Calculate stats with active buffs applied (NEW buff system)
 * This is a pure calculation function - NO state updates
 * Used with useMemo to prevent re-renders
 */
function getBuffedStats(creature: BattleCreature): BuffedStats {
  // Use NEW buff system
  const attackBonus = getBuffValueByType(creature, BuffType.ATTACK);
  const defenseBonus = getBuffValueByType(creature, BuffType.DEFENSE);
  const dodgeBonus = getBuffValueByType(creature, BuffType.DODGE);

  // Get active buffs for display (with min turns remaining)
  const attackBuffs = getBuffsByType(creature, BuffType.ATTACK);
  const defenseBuffs = getBuffsByType(creature, BuffType.DEFENSE);
  const dodgeBuffs = getBuffsByType(creature, BuffType.DODGE);

  const getMinTurns = (buffs: any[]) => buffs.length > 0 ? Math.min(...buffs.map(b => b.turnsRemaining)) : 0;

  // Calculate effective stats with buff bonuses
  // buffs are percentages (e.g., 0.5 = +50%)
  const effectiveAttack = Math.floor(creature.stats.attack * (1 + attackBonus));
  const effectiveDefense = Math.floor(creature.stats.defense * (1 + defenseBonus));
  // Speed is affected by status effects, not buffs, so we use base
  const effectiveSpeed = creature.stats.speed;
  const effectiveCrit = creature.stats.crit;
  // HP is not affected by buffs directly
  const effectiveHP = creature.stats.hp;

  return {
    hp: effectiveHP,
    attack: effectiveAttack,
    defense: effectiveDefense,
    speed: effectiveSpeed,
    crit: effectiveCrit,
    bonuses: {
      hp: 0, // HP not buffed by skills
      attack: effectiveAttack - creature.stats.attack,
      defense: effectiveDefense - creature.stats.defense,
      speed: 0, // Speed not buffed by skills
      crit: 0, // Crit not buffed by skills
    },
    activeBuffs: {
      defenseBuff: defenseBonus > 0 ? { value: defenseBonus, turns: getMinTurns(defenseBuffs) } : null,
      attackBuff: attackBonus > 0 ? { value: attackBonus, turns: getMinTurns(attackBuffs) } : null,
      dodgeBuff: dodgeBonus > 0 ? { value: dodgeBonus, turns: getMinTurns(dodgeBuffs) } : null,
    },
  };
}

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
  teamSize: TeamSize;
  onAttack: () => void;
  onSkill: () => void;
  onSwitchPosition?: (creatureA: BattleCreature, creatureB: BattleCreature) => void;
  isActionProcessing?: boolean;
  showSwapSelector?: boolean;
  swapSourceCreature?: BattleCreature | null;
  onCloseSwapSelector?: () => void;
  onOpenSwapSelector?: (creature: BattleCreature) => void;
  onConfirmSwap?: (targetCreature: BattleCreature) => void;
}

export function MultiCreatureBattleDisplay({
  playerTeam,
  enemyTeam,
  currentActingCreature,
  turn,
  round,
  turnOrder,
  teamSize,
  onAttack,
  onSkill,
  onSwitchPosition,
  isActionProcessing = false,
  showSwapSelector = false,
  swapSourceCreature = null,
  onCloseSwapSelector,
  onOpenSwapSelector,
  onConfirmSwap,
}: MultiCreatureBattleDisplayProps) {
  const isPlayerTurn = turn === "player";
  const currentCreature = currentActingCreature;
  const canUseSkill = currentCreature && currentCreature.creature.skill !== undefined && currentCreature.creature.skill !== null;

  // Sort creatures into front/back rows
  const sortCreaturesByPosition = (creatures: BattleCreature[]) => {
    return [...creatures].sort((a, b) => (a.position || 0) - (b.position || 0));
  };

  return (
    <>
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

      {/* Teams Display with Front/Back Row separation */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Player Team */}
        {playerTeam && (
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">
              🎮 Équipe Joueur ({countAliveCreatures(playerTeam)}/{turnOrder.filter(el => el.team === "player").length})
            </h3>

            {/* Front Row */}
            <TeamRowDisplay
              team={playerTeam}
              rowType="front"
              teamSize={teamSize}
              currentActingCreature={currentActingCreature}
              canSwitch={(isPlayerTurn && currentCreature && currentCreature.currentHP > 0 && onSwitchPosition !== undefined) ?? false}
              onSwitchPosition={onSwitchPosition}
              onOpenSwapSelector={onOpenSwapSelector}
            />

            {/* Back Row */}
            <TeamRowDisplay
              team={playerTeam}
              rowType="back"
              teamSize={teamSize}
              currentActingCreature={currentActingCreature}
              canSwitch={(isPlayerTurn && currentCreature && currentCreature.currentHP > 0 && onSwitchPosition !== undefined) ?? false}
              onSwitchPosition={onSwitchPosition}
              onOpenSwapSelector={onOpenSwapSelector}
            />
          </div>
        )}

        {/* Enemy Team */}
        {enemyTeam && (
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400">
              ⚔️ Équipe Ennemi ({countAliveCreatures(enemyTeam)}/{turnOrder.filter(el => el.team === "enemy").length})
            </h3>

            {/* Front Row */}
            <TeamRowDisplay
              team={enemyTeam}
              rowType="front"
              teamSize={teamSize}
              currentActingCreature={currentActingCreature}
              canSwitch={false}
              onSwitchPosition={undefined}
              onOpenSwapSelector={undefined}
            />

            {/* Back Row */}
            <TeamRowDisplay
              team={enemyTeam}
              rowType="back"
              teamSize={teamSize}
              currentActingCreature={currentActingCreature}
              canSwitch={false}
              onSwitchPosition={undefined}
              onOpenSwapSelector={undefined}
            />
          </div>
        )}
      </div>

      {/* Action Buttons (only on player turn) */}
      {isPlayerTurn && currentCreature && currentCreature.currentHP > 0 && (
        <div className="flex justify-center gap-4">
          <button
            onClick={onAttack}
            disabled={isActionProcessing}
            className={`px-12 py-4 text-white text-xl font-bold rounded-xl shadow-lg transition-all ${
              isActionProcessing
                ? "from-gray-400 to-gray-500 cursor-not-allowed opacity-50"
                : "bg-gradient-to-r from-green-500 to-green-600 hover:shadow-xl transform hover:scale-105"
            }`}
          >
            🗡️ ATTAQUER
          </button>
          {canUseSkill && currentCreature.creature.skill && (
            <button
              onClick={onSkill}
              disabled={
                isActionProcessing ||
                (currentCreature.skillCooldowns[currentCreature.creature.skill.name] || 0) > 0
              }
              className={`px-12 py-4 text-white text-xl font-bold rounded-xl shadow-lg transition-all ${
                isActionProcessing ||
                (currentCreature.skillCooldowns[currentCreature.creature.skill.name] || 0) > 0
                  ? "from-gray-400 to-gray-500 cursor-not-allowed opacity-50"
                  : "bg-gradient-to-r from-purple-500 to-purple-600 hover:shadow-xl transform hover:scale-105"
              }`}
            >
              ✨ SKILL: {currentCreature.creature.skill.name}
            </button>
          )}
          {/* No global switch button - switch is handled per-creature */}
        </div>
      )}

      {/* Swap Target Selector Modal */}
      {showSwapSelector && swapSourceCreature && playerTeam && (
        <SwapTargetSelector
          team={playerTeam}
          sourceCreature={swapSourceCreature}
          teamSize={teamSize}
          onSelectTarget={onConfirmSwap || (() => {})}
          onClose={onCloseSwapSelector || (() => {})}
        />
      )}
      </div>
    </>
  );
}

interface TeamRowDisplayProps {
  team: BattleTeam;
  rowType: "front" | "back";
  teamSize: TeamSize;
  currentActingCreature: BattleCreature | null;
  canSwitch: boolean;
  onSwitchPosition?: (creatureA: BattleCreature, creatureB: BattleCreature) => void;
  onOpenSwapSelector?: (creature: BattleCreature) => void;
}

function TeamRowDisplay({
  team,
  rowType,
  teamSize,
  currentActingCreature,
  canSwitch,
  onSwitchPosition,
  onOpenSwapSelector,
}: TeamRowDisplayProps) {
  const isFrontRow = rowType === "front";
  const positions = isFrontRow ? getFrontRowPositions(teamSize) : getBackRowPositions(teamSize);

  // Filter creatures for this row and sort by position
  const rowCreatures = team.creatures
    .filter(c => c.position !== undefined && positions.includes(c.position))
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  if (rowCreatures.length === 0) return null;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-bold px-2 py-1 rounded ${
          isFrontRow
            ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
            : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
        }`}>
          {isFrontRow ? "🛡️ AVANT" : "⚔️ ARRIÈRE"}
        </span>
        <span className="text-xs text-gray-500">Positions {positions.map(p => p + 1).join(", ")}</span>
      </div>

      <div
        className={`flex gap-2 ${isFrontRow ? "flex-col" : "flex-col ml-8"}`}
        style={{ zIndex: isFrontRow ? 10 : 5 }}
      >
        {rowCreatures.map((creature, i) => (
          <div
            key={i}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border-2 transition-all relative ${
              creature === currentActingCreature
                ? "border-yellow-400 ring-2 ring-yellow-400"
                : "border-gray-200 dark:border-gray-700"
            } ${isFrontRow ? "" : "opacity-90"} ${creature.currentHP <= 0 ? "opacity-50" : ""}`}
          >
            <CompactCreatureDisplay creature={creature} />

            {/* Position indicator */}
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
              {(creature.position || 0) + 1}
            </div>

            {/* Switch button (only on player team) */}
            {canSwitch && team.teamId === "player" && creature.currentHP > 0 && (
              <button
                onClick={() => {
                  if (onOpenSwapSelector) {
                    onOpenSwapSelector(creature);
                  }
                }}
                className="absolute bottom-2 right-2 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-full transition-colors"
                title="Change position"
              >
                🔄
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Row separator line */}
      {isFrontRow && getBackRowPositions(teamSize).length > 0 && (
        <div className="ml-4 my-2 border-l-2 border-dashed border-gray-300 dark:border-gray-600 h-4"></div>
      )}
    </div>
  );
}

interface SwapTargetSelectorProps {
  team: BattleTeam;
  sourceCreature: BattleCreature;
  teamSize: TeamSize;
  onSelectTarget: (targetCreature: BattleCreature) => void;
  onClose: () => void;
}

function SwapTargetSelector({
  team,
  sourceCreature,
  teamSize,
  onSelectTarget,
  onClose,
}: SwapTargetSelectorProps) {
  // Get all living creatures in the same team (excluding the source creature)
  const availableSwapTargets = team.creatures.filter(
    c => c !== sourceCreature && c.currentHP > 0 && c.position !== undefined
  ).sort((a, b) => (a.position || 0) - (b.position || 0));

  // Get helper to determine row type
  const getRowType = (position: number): "front" | "back" => {
    const frontPositions = getFrontRowPositions(teamSize);
    return frontPositions.includes(position) ? "front" : "back";
  };

  if (availableSwapTargets.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
          <h2 className="text-xl font-bold mb-4">🔄 Échanger Position</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Aucune créature disponible pour l'échange.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">🔄 Échanger Position</h2>
        <p className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-300">
          Échanger avec :
        </p>
        <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
          {availableSwapTargets.map((creature) => (
            <button
              key={creature.name}
              onClick={() => onSelectTarget(creature)}
              className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors border-2 border-transparent hover:border-blue-400 dark:hover:border-blue-600"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Position indicator */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-bold px-2 py-1 rounded bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 text-emerald-700 dark:text-emerald-300">
                      Pos {(creature.position || 0) + 1}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">
                      {getRowType(creature.position || 0) === "front" ? "Avant" : "Arrière"}
                    </span>
                  </div>

                  {/* Creature info */}
                  <div className="flex-1">
                    <p className="font-bold text-lg">{creature.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      HP: {creature.currentHP} / {creature.stats.hp}
                    </p>
                  </div>
                </div>

                {/* Arrow icon */}
                <span className="text-2xl">Swap</span>
              </div>
            </button>
          ))}
        </div>

        {/* Cancel button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-semibold"
        >
          ❌ Annuler
        </button>
      </div>
    </div>
  );
}

interface CompactCreatureDisplayProps {
  creature: BattleCreature;
}

function getCreatureImagePath(creatureId: string, rank: string): string {
  // Try different naming conventions
  if (creatureId === "housefly") {
    const rankSuffix = rank === "S+" ? "S+" : rank;
    return `/creatures/fly-rank-${rankSuffix}.png`;
  }
  if (creatureId === "ant") {
    const rankSuffix = rank === "S+" ? "S+" : rank;
    return `/creatures/ant_rank_${rankSuffix}.png`;
  }
  if (creatureId === "honeybee") {
    const rankSuffix = rank === "S+" ? "S+" : rank;
    return `/creatures/bee-rank-${rankSuffix}.png`;
  }
  return "/ecobio-nextjs-ui/images/giant_fly.png"; // Fallback
}

function CompactCreatureDisplay({ creature }: CompactCreatureDisplayProps) {
  const hpPercent = (creature.currentHP / creature.stats.hp) * 100;
  const isDead = creature.currentHP <= 0;

  // Use useMemo to calculate buffed stats without triggering re-renders
  // This is the key fix to prevent infinite re-render loops
  const buffedStats = useMemo(() => getBuffedStats(creature), [creature]);

  // Get creature image path
  const creatureImage = getCreatureImagePath(creature.creature.id, creature.stats.rank);

  // Status effect indicators
  const hasStun = creature.statusEffects.some(e => e.type === "stun");
  const hasPoison = creature.statusEffects.some(e => e.type === "poison");
  const hasSlow = creature.statusEffects.some(e => e.type === "slow");

  // Buff indicators from memoized stats
  const defenseBuffActive = buffedStats.activeBuffs.defenseBuff !== null;
  const dodgeBuffActive = buffedStats.activeBuffs.dodgeBuff !== null;
  const attackBuffActive = buffedStats.activeBuffs.attackBuff !== null;

  const skillOnCooldown = creature.creature.skill
    ? Object.entries(creature.skillCooldowns).some(([k, v]) => k.startsWith(creature.creature.skill!.name) && v > 0)
    : false;

  // Get slow effect value for display
  const slowEffect = creature.statusEffects.find(e => e.type === "slow");

  return (
    <div className={isDead ? "grayscale" : ""}>
      {/* Creature Image */}
      <div className="mb-2">
        <img
          src={creatureImage}
          alt={creature.name}
          className="w-full h-16 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
        />
      </div>

      <div className="flex items-center justify-between mb-2 pr-8">
        <h4 className="font-bold text-lg">{creature.name}</h4>
        <div className="flex gap-1 flex-wrap">
          {/* Status Effects */}
          {hasStun && <span className="px-2 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs rounded-full">💫</span>}
          {hasPoison && <span className="px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs rounded-full">☠️</span>}
          {hasSlow && <span className="px-2 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded-full">🐌</span>}
          {/* Active Buffs with duration in badge */}
          {attackBuffActive && buffedStats.activeBuffs.attackBuff && (
            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 text-xs rounded-full font-semibold">
              ⚔️ ATK+{Math.floor(buffedStats.activeBuffs.attackBuff.value * 100)}% ({buffedStats.activeBuffs.attackBuff.turns}t)
            </span>
          )}
          {defenseBuffActive && buffedStats.activeBuffs.defenseBuff && (
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-xs rounded-full font-semibold">
              🛡️ DEF+{Math.floor(buffedStats.activeBuffs.defenseBuff.value * 100)}% ({buffedStats.activeBuffs.defenseBuff.turns}t)
            </span>
          )}
          {dodgeBuffActive && buffedStats.activeBuffs.dodgeBuff && (
            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 text-xs rounded-full font-semibold">
              💨 DOD+{Math.floor(buffedStats.activeBuffs.dodgeBuff.value * 100)}% ({buffedStats.activeBuffs.dodgeBuff.turns}t)
            </span>
          )}
        </div>
      </div>

      {/* Position Badge */}
      <div className="mb-1">
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 text-emerald-700 dark:text-emerald-300">
          Pos {(creature.position || 0) + 1}
        </span>
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

      {/* Stats with Buff Bonuses */}
      <div className="grid grid-cols-4 gap-1 text-xs text-center">
        <div className="bg-gray-100 dark:bg-gray-700 rounded p-1">
          <p className="text-gray-500">ATK</p>
          {attackBuffActive ? (
            <div>
              <p className="font-bold text-red-600">{buffedStats.attack}</p>
              <p className="text-xs text-red-500">+{buffedStats.bonuses.attack}</p>
            </div>
          ) : (
            <p className="font-bold">{creature.stats.attack}</p>
          )}
        </div>
        <div className="bg-gray-100 dark:bg-gray-700 rounded p-1">
          <p className="text-gray-500">DEF</p>
          {defenseBuffActive ? (
            <div>
              <p className="font-bold text-blue-600">{buffedStats.defense}</p>
              <p className="text-xs text-blue-500">+{buffedStats.bonuses.defense}</p>
            </div>
          ) : (
            <p className="font-bold">{creature.stats.defense}</p>
          )}
        </div>
        <div className="bg-gray-100 dark:bg-gray-700 rounded p-1">
          <p className="text-gray-500">SPD</p>
          {hasSlow && slowEffect ? (
            <div>
              <p className="font-bold text-blue-600">{Math.floor(creature.stats.speed * (1 - (slowEffect.value || 0)))}</p>
              <p className="text-xs text-blue-500">-{Math.floor((slowEffect.value || 0) * 100)}%</p>
            </div>
          ) : (
            <p className="font-bold">{creature.stats.speed}</p>
          )}
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

      {/* Active Buffs with Duration */}
      {(defenseBuffActive || dodgeBuffActive || attackBuffActive) && (
        <div className="mt-2 pt-2 border-t text-xs">
          <div className="space-y-0.5">
            {defenseBuffActive && buffedStats.activeBuffs.defenseBuff && (
              <div className="text-blue-600 dark:text-blue-400">
                🛡️ DEF +{Math.floor(buffedStats.activeBuffs.defenseBuff.value * 100)}% ({buffedStats.activeBuffs.defenseBuff.turns}t)
              </div>
            )}
            {dodgeBuffActive && buffedStats.activeBuffs.dodgeBuff && (
              <div className="text-green-600 dark:text-green-400">
                💨 Dodge +{Math.floor(buffedStats.activeBuffs.dodgeBuff.value * 100)}% ({buffedStats.activeBuffs.dodgeBuff.turns}t)
              </div>
            )}
            {attackBuffActive && buffedStats.activeBuffs.attackBuff && (
              <div className="text-red-600 dark:text-red-400">
                ⚔️ ATK +{Math.floor(buffedStats.activeBuffs.attackBuff.value * 100)}% ({buffedStats.activeBuffs.attackBuff.turns}t)
              </div>
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
