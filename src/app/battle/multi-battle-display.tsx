// =============================================================================
// Multi-Creature Battle Display Components for 3v3 and 5v5
// =============================================================================

import { useMemo } from "react";
import {
  BattleCreature,
  BattleElement,
  getBuffValueByType,
  getBuffsByType,
  BuffType,
  getCooldownRemaining,
} from "@/lib/battle";
import { BattleTeam, TeamSize, countAliveCreatures, isFrontRow, getFrontRowPositions, getBackRowPositions } from "@/lib/battle-multi";

// Get front/back row positions
function getRowPositions(teamSize: TeamSize, rowType: "front" | "back"): number[] {
  if (rowType === "front") {
    return getFrontRowPositions(teamSize);
  } else {
    return getBackRowPositions(teamSize);
  }
}

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

interface CreatureDetailModalProps {
  creature: BattleCreature;
  show: boolean;
  onClose: () => void;
}

function CreatureDetailModal({ creature, show, onClose }: CreatureDetailModalProps) {
  if (!show) return null;

  const hpPercent = (creature.currentHP / creature.stats.hp) * 100;
  const isDead = creature.currentHP <= 0;

  // Calculate buffed stats
  const buffedStats = getBuffedStats(creature);

  // Status effects
  const hasStun = creature.statusEffects.some(e => e.type === "stun");
  const hasPoison = creature.statusEffects.some(e => e.type === "poison");
  const hasSlow = creature.statusEffects.some(e => e.type === "slow");
  const slowEffect = creature.statusEffects.find(e => e.type === "slow");
  const poisonEffect = creature.statusEffects.find(e => e.type === "poison");

  // Buffs
  const defenseBuffActive = buffedStats.activeBuffs.defenseBuff !== null;
  const dodgeBuffActive = buffedStats.activeBuffs.dodgeBuff !== null;
  const attackBuffActive = buffedStats.activeBuffs.attackBuff !== null;

  // Skill cooldown
  const skillOnCooldown = creature.creature.skill
    ? Object.entries(creature.skillCooldowns).some(([k, v]) => k.startsWith(creature.creature.skill!.name) && v > 0)
    : false;

  const creatureImage = getCreatureImagePath(creature.creature.id, creature.stats.rank);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full ${isDead ? "grayscale" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{creature.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Creature Image */}
        <div className="mb-4">
          <img
            src={creatureImage}
            alt={creature.name}
            className="w-full h-48 object-cover rounded-xl border-2 border-gray-300 dark:border-gray-600"
          />
        </div>

        {/* Status Badges */}
        <div className="flex gap-2 flex-wrap mb-4">
          <span className="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 text-emerald-700 dark:text-emerald-300 font-semibold">
            Pos {(creature.position || 0) + 1}
          </span>
          <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 font-semibold">
            R{creature.stats.rank}
          </span>
          {hasStun && <span className="px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 font-semibold">💫 Étourdi</span>}
          {hasPoison && <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 font-semibold">☠️ Poison ({poisonEffect?.duration}t)</span>}
          {hasSlow && <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-semibold">🐌 Lent ({slowEffect?.duration}t)</span>}
        </div>

        {/* HP Bar */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-semibold">HP</span>
            <span className="font-bold text-lg">{creature.currentHP} / {creature.stats.hp}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
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
        <div className="mb-4">
          <h3 className="font-bold mb-2 text-sm uppercase tracking-wide text-gray-500">Stats</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
              <p className="text-xs text-gray-500 uppercase">ATK</p>
              {attackBuffActive ? (
                <div>
                  <p className="font-bold text-red-600 text-lg">{buffedStats.attack}</p>
                  <p className="text-xs text-red-500">+{buffedStats.bonuses.attack} (buff)</p>
                </div>
              ) : (
                <p className="font-bold text-lg">{creature.stats.attack}</p>
              )}
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
              <p className="text-xs text-gray-500 uppercase">DEF</p>
              {defenseBuffActive ? (
                <div>
                  <p className="font-bold text-blue-600 text-lg">{buffedStats.defense}</p>
                  <p className="text-xs text-blue-500">+{buffedStats.bonuses.defense} (buff)</p>
                </div>
              ) : (
                <p className="font-bold text-lg">{creature.stats.defense}</p>
              )}
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
              <p className="text-xs text-gray-500 uppercase">SPD</p>
              {hasSlow && slowEffect ? (
                <div>
                  <p className="font-bold text-blue-600 text-lg">{Math.floor(creature.stats.speed * (1 - (slowEffect.value || 0)))}</p>
                  <p className="text-xs text-blue-500">-{Math.floor((slowEffect.value || 0) * 100)}% (slow)</p>
                </div>
              ) : (
                <p className="font-bold text-lg">{creature.stats.speed}</p>
              )}
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
              <p className="text-xs text-gray-500 uppercase">CRIT</p>
              <p className="font-bold text-lg">{creature.stats.crit}</p>
            </div>
          </div>
        </div>

        {/* Skill */}
        {creature.creature.skill && (
          <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900 rounded-lg">
            <h3 className="font-bold mb-2 text-sm uppercase tracking-wide text-purple-700 dark:text-purple-300">Skill</h3>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-bold text-lg">{creature.creature.skill.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{creature.creature.skill.description}</p>
                <p className="text-xs text-gray-500 mt-1">Cooldown: {creature.creature.skill.cooldown} tours</p>
              </div>
              <div className="ml-4 text-right">
                {skillOnCooldown ? (
                  <span className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full font-semibold text-sm">
                    CD: {Object.entries(creature.skillCooldowns)
                      .filter(([k, v]) => k.startsWith(creature.creature.skill!.name) && v > 0)
                      .map(([, v]) => v)
                      .join(',')}t
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full font-semibold text-sm">
                    ✓ Ready
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Active Buffs */}
        {(defenseBuffActive || dodgeBuffActive || attackBuffActive) && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <h3 className="font-bold mb-2 text-sm uppercase tracking-wide text-blue-700 dark:text-blue-300">Buffs Actifs</h3>
            <div className="space-y-1 text-sm">
              {attackBuffActive && buffedStats.activeBuffs.attackBuff && (
                <div className="text-red-600 dark:text-red-400 font-semibold">
                  ⚔️ ATK +{Math.floor(buffedStats.activeBuffs.attackBuff.value * 100)}% ({buffedStats.activeBuffs.attackBuff.turns}t restants)
                </div>
              )}
              {defenseBuffActive && buffedStats.activeBuffs.defenseBuff && (
                <div className="text-blue-600 dark:text-blue-400 font-semibold">
                  🛡️ DEF +{Math.floor(buffedStats.activeBuffs.defenseBuff.value * 100)}% ({buffedStats.activeBuffs.defenseBuff.turns}t restants)
                </div>
              )}
              {dodgeBuffActive && buffedStats.activeBuffs.dodgeBuff && (
                <div className="text-green-600 dark:text-green-400 font-semibold">
                  💨 Dodge +{Math.floor(buffedStats.activeBuffs.dodgeBuff.value * 100)}% ({buffedStats.activeBuffs.dodgeBuff.turns}t restants)
                </div>
              )}
            </div>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  );
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
  // Creature detail modal props
  showCreatureDetail?: boolean;
  detailCreature?: BattleCreature | null;
  onCloseCreatureDetail?: () => void;
  onViewCreatureDetails?: (creature: BattleCreature) => void;
  // Skill props - now supports skill type parameter
  onFirstSkill?: () => void;  //Specimen skill
  onSecondSkill?: () => void;  // Personality skill
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
  showCreatureDetail = false,
  detailCreature = null,
  onCloseCreatureDetail,
  onViewCreatureDetails,
  onFirstSkill,
  onSecondSkill,
}: MultiCreatureBattleDisplayProps) {
  const isPlayerTurn = turn === "player";
  const currentCreature = currentActingCreature;
  const canUseSkill = currentCreature && (currentCreature.creature.specimenSkill !== undefined || currentCreature.creature.personalitySkill !== undefined);

  // Get skill cooldowns
  const specimenCooldown = currentCreature ? getCooldownRemaining(currentCreature, "specimen") : 999;
  const personalityCooldown = currentCreature ? getCooldownRemaining(currentCreature, "personality") : 999;
  const hasSpecimenSkill = currentCreature?.creature.specimenSkill !== undefined;
  const hasPersonalitySkill = currentCreature?.creature.personalitySkill !== undefined;

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

      {/* Teams Display - Horizontal Layout (Face to Face) */}
      <div className="space-y-6">
        {/* Front Row - Face to Face */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <div className="flex items-end gap-4">
            {/* Player Front Row */}
            <div className="flex-1">
              <div className="mb-2 flex justify-between items-center">
                <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  🎮 AVANT
                </h3>
                <span className="text-xs text-gray-500">
                  {playerTeam ? countAliveCreatures(playerTeam) : 0} / {turnOrder.filter(el => el.team === "player").length}
                </span>
              </div>
              <div className="flex gap-2 justify-start flex-wrap">
                {playerTeam && playerTeam.creatures
                  .filter(c => getRowPositions(teamSize, "front").includes(c.position || 0))
                  .sort((a, b) => (b.position || 0) - (a.position || 0))
                  .map((creature, i) => (
                    <MiniCreatureCard
                      key={i}
                      creature={creature}
                      isCurrent={creature === currentActingCreature}
                      isPlayer={true}
                      canSwitch={!!(isPlayerTurn && currentCreature && currentCreature.currentHP > 0 && onSwitchPosition !== undefined)}
                      onOpenSwapSelector={onOpenSwapSelector}
                      onViewDetails={onViewCreatureDetails}
                    />
                  ))}
              </div>
            </div>

            {/* VS Divider */}
            <div className="px-6 py-4">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent">
                VS
              </div>
            </div>

            {/* Enemy Front Row */}
            <div className="flex-1">
              <div className="mb-2 flex justify-between items-center">
                <h3 className="text-sm font-bold text-red-600 dark:text-red-400">
                  ⚔️ AVANT
                </h3>
                <span className="text-xs text-gray-500">
                  {enemyTeam ? countAliveCreatures(enemyTeam) : 0} / {turnOrder.filter(el => el.team === "enemy").length}
                </span>
              </div>
              <div className="flex gap-2 justify-end flex-wrap">
                {enemyTeam && enemyTeam.creatures
                  .filter(c => getRowPositions(teamSize, "front").includes(c.position || 0))
                  .sort((a, b) => (a.position || 0) - (b.position || 0))
                  .map((creature, i) => (
                    <MiniCreatureCard
                      key={i}
                      creature={creature}
                      isCurrent={creature === currentActingCreature}
                      isPlayer={false}
                      canSwitch={false}
                      onOpenSwapSelector={undefined}
                      onViewDetails={onViewCreatureDetails}
                    />
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Back Row - Face to Face */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <div className="flex items-end gap-4">
            {/* Player Back Row */}
            <div className="flex-1">
              <h3 className="mb-2 text-sm font-bold text-blue-600 dark:text-blue-400">
                ➡️ ARRIÈRE
              </h3>
              <div className="flex gap-2 justify-start flex-wrap">
                {playerTeam && playerTeam.creatures
                  .filter(c => getRowPositions(teamSize, "back").includes(c.position || 0))
                  .sort((a, b) => (b.position || 0) - (a.position || 0))
                  .map((creature, i) => (
                    <MiniCreatureCard
                      key={i}
                      creature={creature}
                      isCurrent={creature === currentActingCreature}
                      isPlayer={true}
                      canSwitch={!!(isPlayerTurn && currentCreature && currentCreature.currentHP > 0 && onSwitchPosition !== undefined)}
                      onOpenSwapSelector={onOpenSwapSelector}
                      onViewDetails={onViewCreatureDetails}
                    />
                  ))}
              </div>
            </div>

            {/* Empty space for alignment */}
            <div className="px-6 py-4"></div>

            {/* Enemy Back Row */}
            <div className="flex-1">
              <h3 className="mb-2 text-sm font-bold text-red-600 dark:text-red-400">
                ⬅️ ARRIÈRE
              </h3>
              <div className="flex gap-2 justify-end flex-wrap">
                {enemyTeam && enemyTeam.creatures
                  .filter(c => getRowPositions(teamSize, "back").includes(c.position || 0))
                  .sort((a, b) => (a.position || 0) - (b.position || 0))
                  .map((creature, i) => (
                    <MiniCreatureCard
                      key={i}
                      creature={creature}
                      isCurrent={creature === currentActingCreature}
                      isPlayer={false}
                      canSwitch={false}
                      onOpenSwapSelector={undefined}
                      onViewDetails={onViewCreatureDetails}
                    />
                  ))}
              </div>
            </div>
          </div>
        </div>
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
          {/* Specimen Skill Button */}
          {hasSpecimenSkill && currentCreature.creature.specimenSkill && (
            <button
              onClick={() => onFirstSkill && onFirstSkill()}
              disabled={isActionProcessing || specimenCooldown > 0}
              className={`px-8 py-4 text-white text-lg font-bold rounded-xl shadow-lg transition-all ${
                isActionProcessing || specimenCooldown > 0
                  ? "from-gray-400 to-gray-500 cursor-not-allowed opacity-50"
                  : "bg-gradient-to-r from-orange-500 to-orange-600 hover:shadow-xl transform hover:scale-105"
              }`}
              title={`${currentCreature.creature.specimenSkill.name}: ${currentCreature.creature.specimenSkill.description} (CD: ${currentCreature.creature.specimenSkill.cooldown}t, Durée: ${currentCreature.creature.specimenSkill.duration}t)`}
            >
              {specimenCooldown > 0 ? `🎯 SPÉCIMEN (${specimenCooldown})` : "🎯 SPÉCIMEN"}
            </button>
          )}
          {/* Personality Skill Button */}
          {hasPersonalitySkill && currentCreature.creature.personalitySkill && (
            <button
              onClick={() => onSecondSkill && onSecondSkill()}
              disabled={isActionProcessing || personalityCooldown > 0}
              className={`px-8 py-4 text-white text-lg font-bold rounded-xl shadow-lg transition-all ${
                isActionProcessing || personalityCooldown > 0
                  ? "from-gray-400 to-gray-500 cursor-not-allowed opacity-50"
                  : "bg-gradient-to-r from-purple-500 to-purple-600 hover:shadow-lg transform hover:scale-105"
              }`}
              title={`${currentCreature.creature.personalitySkill.name}: ${currentCreature.creature.personalitySkill.description} (CD: ${currentCreature.creature.personalitySkill.cooldown}t, Durée: ${currentCreature.creature.personalitySkill.duration}t)`}
            >
              {personalityCooldown > 0 ? `✨ PERSONNALITÉ (${personalityCooldown})` : "✨ PERSONNALITÉ"}
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

      {/* Creature Detail Modal */}
      {showCreatureDetail && detailCreature && (
        <CreatureDetailModal
          creature={detailCreature}
          show={showCreatureDetail}
          onClose={onCloseCreatureDetail || (() => {})}
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
  onViewCreatureDetails?: (creature: BattleCreature) => void;
}

function TeamRowDisplay({
  team,
  rowType,
  teamSize,
  currentActingCreature,
  canSwitch,
  onSwitchPosition,
  onOpenSwapSelector,
  onViewCreatureDetails,
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
                : "border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer"
            } ${isFrontRow ? "" : "opacity-90"} ${creature.currentHP <= 0 ? "opacity-50" : ""}`}
            onClick={() => onViewCreatureDetails && onViewCreatureDetails(creature)}
          >
            <CompactCreatureDisplay creature={creature} />

            {/* Position indicator */}
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
              {(creature.position || 0) + 1}
            </div>

            {/* Switch button (only on player team) */}
            {canSwitch && team.teamId === "player" && creature.currentHP > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
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
  if (creatureId === "spider_mutant") {
    return `/images/creatures/spider_mutant_e.png`;
  }
  return `/images/creatures/spider_mutant_e.png`; // Fallback
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
      {/* Creature Image - Full height, not banner */}
      <div className="mb-3">
        <img
          src={creatureImage}
          alt={creature.name}
          className="w-full h-28 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600"
        />
      </div>

      {/* Name + Badges row */}
      <div className="flex items-center justify-between mb-2 pr-8">
        <h4 className="font-bold text-base">{creature.name}</h4>
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

      {/* Position Badge (small) */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 text-emerald-700 dark:text-emerald-300">
          Pos {(creature.position || 0) + 1}
        </span>
      </div>

      {/* HP Bar Only */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-semibold">HP</span>
          <span className="font-bold text-sm">{creature.currentHP} / {creature.stats.hp}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
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

      {/* Active Status/Buff Summary */}
      <div className="flex gap-1 flex-wrap text-xs">
        {/* Status Effects */}
        {hasStun && <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 rounded">💫</span>}
        {hasPoison && <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 rounded">☠️</span>}
        {hasSlow && <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded">🐌</span>}
        {/* Buffs */}
        {attackBuffActive && buffedStats.activeBuffs.attackBuff && (
          <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded font-semibold">
            ⚔️+{Math.floor(buffedStats.activeBuffs.attackBuff.value * 100)}%
          </span>
        )}
        {defenseBuffActive && buffedStats.activeBuffs.defenseBuff && (
          <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded font-semibold">
            🛡️+{Math.floor(buffedStats.activeBuffs.defenseBuff.value * 100)}%
          </span>
        )}
        {dodgeBuffActive && buffedStats.activeBuffs.dodgeBuff && (
          <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded font-semibold">
            💨+{Math.floor(buffedStats.activeBuffs.dodgeBuff.value * 100)}%
          </span>
        )}
      </div>
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

interface MiniCreatureCardProps {
  creature: BattleCreature;
  isCurrent: boolean;
  isPlayer: boolean;
  canSwitch: boolean;
  onOpenSwapSelector?: (creature: BattleCreature) => void;
  onViewDetails?: (creature: BattleCreature) => void;
}

function MiniCreatureCard({ creature, isCurrent, isPlayer, canSwitch, onOpenSwapSelector, onViewDetails }: MiniCreatureCardProps) {
  const hpPercent = (creature.currentHP / creature.stats.hp) * 100;
  const isDead = creature.currentHP <= 0;

  const buffedStats = getBuffedStats(creature);

  const hasStun = creature.statusEffects.some(e => e.type === "stun");
  const hasPoison = creature.statusEffects.some(e => e.type === "poison");
  const hasSlow = creature.statusEffects.some(e => e.type === "slow");

  const defenseBuffActive = buffedStats.activeBuffs.defenseBuff !== null;
  const dodgeBuffActive = buffedStats.activeBuffs.dodgeBuff !== null;
  const attackBuffActive = buffedStats.activeBuffs.attackBuff !== null;

  const creatureImage = getCreatureImagePath(creature.creature.id, creature.stats.rank);

  return (
    <div
      className={`relative bg-white dark:bg-gray-700 rounded-lg shadow-md border-2 transition-all cursor-pointer w-28 min-w-[112px] flex flex-col ${
        isCurrent
          ? "border-yellow-400 ring-2 ring-yellow-400 scale-105"
          : "border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
      } ${isDead ? "opacity-40 grayscale" : ""}`}
      onClick={() => onViewDetails && onViewDetails(creature)}
    >
      {/* Creature Image - Fixed Size & Uniform */}
      <div className="mb-1 p-1">
        <img
          src={creatureImage}
          alt={creature.name}
          className="w-full h-16 object-cover rounded"
        />
      </div>

      {/* Name - Fixed Height, Truncated */}
      <div className="px-1 mb-1 h-4">
        <h4 className="font-bold text-xs truncate text-center leading-4">{creature.name}</h4>
      </div>

      {/* HP Bar - Compact */}
      <div className="px-1 mb-1">
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
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

      {/* Status/Buff Badges - Micro */}
      <div className="px-1 flex justify-center gap-1 flex-wrap text-xs h-6 items-center">
        {hasStun && <span className="w-5 h-5 flex items-center justify-center rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-700 text-lg">💫</span>}
        {hasPoison && <span className="w-5 h-5 flex items-center justify-center rounded bg-purple-100 dark:bg-purple-900 text-purple-700 text-lg">☠️</span>}
        {hasSlow && <span className="w-5 h-5 flex items-center justify-center rounded bg-blue-100 dark:bg-blue-900 text-blue-700 text-lg">🐌</span>}
        {attackBuffActive && buffedStats.activeBuffs.attackBuff && (
          <span className="px-1 rounded bg-red-100 dark:bg-red-900 text-red-700 font-bold text-sm">⚔️</span>
        )}
        {defenseBuffActive && buffedStats.activeBuffs.defenseBuff && (
          <span className="px-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 font-bold text-sm">🛡️</span>
        )}
        {dodgeBuffActive && buffedStats.activeBuffs.dodgeBuff && (
          <span className="px-1 rounded bg-green-100 dark:bg-green-900 text-green-700 font-bold text-sm">💨</span>
        )}
      </div>

      {/* Position Indicator - Absolute, Top Right */}
      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[11px] font-bold text-gray-600 dark:text-gray-300 shadow">
        {(creature.position || 0) + 1}
      </div>

      {/* Swap Button - Absolute, Bottom Right */}
      {canSwitch && isPlayer && creature.currentHP > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenSwapSelector) {
              onOpenSwapSelector(creature);
            }
          }}
          className="absolute bottom-1 right-1 w-5 h-5 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm shadow"
          title="Change position"
        >
          🔄
        </button>
      )}
    </div>
  );
}
