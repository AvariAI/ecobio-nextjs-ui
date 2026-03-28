// =============================================================================
// Multi-Creature Battle Components for 3v3 and 5v5
// =============================================================================

import { BattleCreature } from "@/lib/battle";
import { BattleTeam, TeamSize, countAliveCreatures } from "@/lib/battle-multi";
import { Rank, RANKS, CREATURES } from "@/lib/database";
import { getTraitsByIds } from "@/lib/traits";

interface HuntedCreature {
  id: string;
  finalStats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    crit: number;
    rank: Rank;
  };
  customStats: any;
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  varianceBreakdown: any;
  feedCount: number;
  feedStat: "hp" | "atk" | "def" | "spd" | "crit" | null;
  createdAt: number;
  creatureId: string;
  traits: string[];
  isFavorite: boolean;
  name: string;
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

export interface SlotConfig {
  creatureId: string;
  level: number;
  rank: Rank;
}

interface MultiCreatureTestSelectorProps {
  label: string;
  slotConfigs: SlotConfig[];
  onSlotChange: (slot: number, config: SlotConfig) => void;
  teamSize: TeamSize;
  accent: "blue" | "red";
}

export function MultiCreatureTestSelector({
  label,
  slotConfigs,
  onSlotChange,
  teamSize,
  accent,
}: MultiCreatureTestSelectorProps) {
  const accentColors = {
    blue: "border-blue-400 hover:border-blue-600",
    red: "border-red-400 hover:border-red-600",
  };

  const accentBg = {
    blue: "from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900",
    red: "from-red-100 to-orange-100 dark:from-red-900 dark:to-orange-900",
  };

  const RANK_BADGE_COLORS: Record<Rank, string> = {
    E: "bg-gray-600",
    D: "bg-blue-600",
    C: "bg-green-600",
    B: "bg-orange-600",
    A: "bg-red-600",
    S: "bg-yellow-600",
    "S+": "bg-purple-600",
  };

  const isTeamValid = slotConfigs.slice(0, teamSize).every(
    config => config.creatureId !== ""
  );

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 ${accentColors[accent]} hover:shadow-2xl transition-all`}>
      <h2 className="text-2xl font-bold mb-4">{label}</h2>

      {/* Slot-based selection */}
      <div className="space-y-3">
        {Array.from({ length: teamSize }).map((_, slotIndex) => {
          const config = slotConfigs[slotIndex] || { creatureId: "", level: 10, rank: "E" as Rank };
          const creature = config.creatureId ? CREATURES[config.creatureId] : null;

          return (
            <div
              key={slotIndex}
              className={`p-4 rounded-xl border-2 transition-all ${
                creature
                  ? `${accentColors[accent]}`
                  : "border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
              }`}
            >
              {/* Slot Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg">Pos {slotIndex + 1}</h3>
                {creature && (
                  <span className={`text-xs px-2 py-1 rounded ${RANK_BADGE_COLORS[config.rank]} text-white font-bold`}>
                    R{config.rank} L{config.level}
                  </span>
                )}
              </div>

              {/* Creature Preview */}
              <div className="flex items-center gap-4 mb-3">
                <div className={`w-12 h-12 rounded-lg ${accentBg[accent]} flex items-center justify-center shrink-0`}>
                  {creature ? (
                    <img
                      src={getCreatureImage(config.creatureId, config.rank)}
                      alt={creature.name}
                      className="w-10 h-10 object-contain"
                    />
                  ) : (
                    <span className="text-2xl text-gray-400">?</span>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  {/* Creature Select */}
                  <select
                    value={config.creatureId}
                    onChange={(e) => onSlotChange(slotIndex, { ...config, creatureId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700"
                  >
                    <option value="">Select creature...</option>
                    {Object.values(CREATURES).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {/* Level Slider */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold whitespace-nowrap">L{config.level}</label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={config.level}
                      onChange={(e) => onSlotChange(slotIndex, { ...config, level: parseInt(e.target.value) })}
                      className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Rank Selection */}
                  <div className="flex flex-wrap gap-1">
                    {RANKS.map((r) => (
                      <button
                        key={r}
                        onClick={() => onSlotChange(slotIndex, { ...config, rank: r as Rank })}
                        className={`px-2 py-1 text-xs rounded font-bold transition-all ${
                          config.rank === r
                            ? `bg-${accent === "blue" ? "blue" : "red"}-600 text-white`
                            : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Validation Message */}
      {!isTeamValid && (
        <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
          <p className="text-sm text-orange-700 dark:text-orange-300">
            Sélectionnez {teamSize} créatures pour commencer le combat
          </p>
        </div>
      )}

      {isTeamValid && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300">
            ✓ Équipe prête ({teamSize} créatures)
          </p>
        </div>
      )}
    </div>
  );
}

interface MultiCreatureCollectionSelectorProps {
  label: string;
  collection: HuntedCreature[];
  teamIds: (string | null)[];
  onTeamSelect: (slot: number, creatureId: string | null) => void;
  teamSize: TeamSize;
  accent: "blue" | "red";
}

export function MultiCreatureCollectionSelector({
  label,
  collection,
  teamIds,
  onTeamSelect,
  teamSize,
  accent,
}: MultiCreatureCollectionSelectorProps) {
  const accentColors = {
    blue: "border-blue-400 hover:border-blue-600",
    red: "border-red-400 hover:border-red-600",
  };

  const accentBg = {
    blue: "from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900",
    red: "from-red-100 to-orange-100 dark:from-red-900 dark:to-orange-900",
  };

  const RANK_BADGE_COLORS: Record<Rank, string> = {
    E: "bg-gray-600",
    D: "bg-blue-600",
    C: "bg-green-600",
    B: "bg-orange-600",
    A: "bg-red-600",
    S: "bg-yellow-600",
    "S+": "bg-purple-600",
  };

  const RankOrder: Record<Rank, number> = {
    "S+": 7,
    "S": 6,
    "A": 5,
    "B": 4,
    "C": 3,
    "D": 2,
    "E": 1,
  };

  const sortedCollection = [...collection].sort((a, b) => {
    const rankDiff = RankOrder[b.finalStats.rank] - RankOrder[a.finalStats.rank];
    if (rankDiff !== 0) return rankDiff;
    return b.level - a.level;
  });

  const selectedCreatures = teamIds.filter(id => id !== null).map(id => collection.find(c => c.id === id)).filter(Boolean) as HuntedCreature[];
  const isTeamValid = selectedCreatures.length === teamSize;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 ${accentColors[accent]} hover:shadow-2xl transition-all`}>
      <h2 className="text-2xl font-bold mb-4">{label}</h2>

      {/* Selected Team Slots */}
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">Équipe sélectionnée ({selectedCreatures.length}/{teamSize})</label>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: teamSize }).map((_, i) => {
            const selectedId = teamIds[i];
            const creature = selectedId ? collection.find(c => c.id === selectedId) : null;
            return (
              <div
                key={i}
                className={`w-16 h-20 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${
                  creature
                    ? `${accentBg[accent]} border-2 border-${accent === "blue" ? "blue" : "red"}-400`
                    : "bg-gray-200 dark:bg-gray-700 border-2 border-dashed border-gray-400"
                }`}
                onClick={() => onTeamSelect(i, creature ? null : teamIds.find((id, idx) => idx !== i && id) || null)}
              >
                {creature ? (
                  <>
                    <img
                      src={getCreatureImage(creature.creatureId, creature.finalStats.rank)}
                      alt={creature.name}
                      className="w-10 h-10 object-cover"
                    />
                    <span className={`text-xs px-1 rounded ${RANK_BADGE_COLORS[creature.finalStats.rank]} text-white`}>
                      R{creature.finalStats.rank}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl text-gray-400">+</span>
                )}
              </div>
            );
          })}
        </div>
        {!isTeamValid && (
          <p className="text-xs text-orange-600 mt-1">
            Sélectionnez {teamSize} créatures pour commencer le combat
          </p>
        )}
      </div>

      {/* Collection List */}
      <div className={`bg-gradient-to-br ${accentBg[accent]} rounded-xl p-4 min-h-64 max-h-80 overflow-y-auto`}>
        {collection.length === 0 && (
          <p className="text-center text-gray-500 italic">Collection vide. Allez au chasseur! 🏹</p>
        )}

        <div className="space-y-2">
          {sortedCollection.map((creature) => {
            const isSelected = teamIds.includes(creature.id);
            return (
              <button
                key={creature.id}
                onClick={() => {
                  const existingSlot = teamIds.indexOf(creature.id);
                  if (existingSlot !== -1) {
                    onTeamSelect(existingSlot, null);
                  } else {
                    const emptySlot = teamIds.findIndex(id => id === null);
                    if (emptySlot !== -1) {
                      onTeamSelect(emptySlot, creature.id);
                    }
                  }
                }}
                className={`w-full text-left rounded-lg p-2 transition-all ${
                  isSelected
                    ? "ring-2 ring-offset-1 ring-offset-white dark:ring-offset-gray-800 bg-white dark:bg-gray-700 shadow-md"
                    : "bg-white/50 dark:bg-gray-700/50 hover:bg-white dark:hover:bg-gray-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <img
                    src={getCreatureImage(creature.creatureId, creature.finalStats.rank)}
                    alt={creature.name}
                    className="w-10 h-10 object-cover rounded"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-sm">{creature.name}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${RANK_BADGE_COLORS[creature.finalStats.rank]} text-white`}>
                        R{creature.finalStats.rank}
                      </span>
                      <span className="text-xs">L{creature.level}</span>
                    </div>
                  </div>
                  {isSelected && <span className="text-green-600 font-bold">✓</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
