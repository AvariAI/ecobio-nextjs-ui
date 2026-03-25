"use client";

import { useState, useEffect } from "react";
import { CREATURES, DAMAGE_TYPES, Creature, DamageType } from "@/lib/database";
import { calculateFinalStats, calculateDamage, BattleStats } from "@/lib/battle";
import Link from "next/link";

// GBA Color Palette
const GBA_COLORS = {
  bg: "#9bbc0f",
  bgLight: "#8bac0f",
  bgDark: "#306230",
  text: "#0f380f",
  textLight: "#306230",
  white: "#e0f8cf",
  red: "#d32f2f",
  blue: "#1976d2",
  green: "#4caf50",
  yellow: "#fbc02d",
};

type BattleState = "setup" | "battle" | "win" | "lose" | "escape";
type MenuState = "main" | "attack" | "ability" | "capture";

interface BattleCreature {
  creature: Creature;
  stats: BattleStats;
  currentHP: number;
  level: number;
  quality: number;
}

export default function RetroBattlePage() {
  const [battleState, setBattleState] = useState<BattleState>("setup");
  const [menuState, setMenuState] = useState<MenuState>("main");
  const [turn, setTurn] = useState<"player" | "enemy">("player");
  const [message, setMessage] = useState("A wild creature appeared!");
  const [typingMessage, setTypingMessage] = useState("");
  const [messageQueue, setMessageQueue] = useState<string[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [player, setPlayer] = useState<BattleCreature | null>(null);
  const [enemy, setEnemy] = useState<BattleCreature | null>(null);

  // Selection state
  const [playerCreatureId, setPlayerCreatureId] = useState("mantis");
  const [playerLevel, setPlayerLevel] = useState(10);
  const [playerQuality, setPlayerQuality] = useState(85);
  const [enemyCreatureId, setEnemyCreatureId] = useState("wolf_spider");
  const [enemyLevel, setEnemyLevel] = useState(10);
  const [enemyQuality, setEnemyQuality] = useState(85);
  const [collection, setCollection] = useState<string[]>([]);

  // Typing effect for messages
  useEffect(() => {
    if (messageQueue.length > 0) {
      const nextMessage = messageQueue[0];
      let index = 0;
      const typingInterval = setInterval(() => {
        setTypingMessage(nextMessage.substring(0, index + 1));
        index++;
        if (index >= nextMessage.length) {
          clearInterval(typingInterval);
          setTimeout(() => {
            setMessageQueue(prev => prev.slice(1));
            if (messageQueue.length === 1) {
              setMessage(nextMessage);
            }
          }, 1500);
        }
      }, 50);
      return () => clearInterval(typingInterval);
    } else {
      setTypingMessage(message);
    }
  }, [messageQueue, message]);

  const addMessage = (msg: string) => {
    setMessageQueue(prev => [...prev, msg]);
  };

  const initBattle = () => {
    const pCreature = CREATURES[playerCreatureId];
    const eCreature = CREATURES[enemyCreatureId];

    const pStats = calculateFinalStats(pCreature, playerLevel, playerQuality);
    const eStats = calculateFinalStats(eCreature, enemyLevel, enemyQuality);

    setPlayer({
      creature: pCreature,
      stats: pStats,
      currentHP: pStats.hp,
      level: playerLevel,
      quality: playerQuality,
    });

    setEnemy({
      creature: eCreature,
      stats: eStats,
      currentHP: eStats.hp,
      level: enemyLevel,
      quality: enemyQuality,
    });

    setBattleState("battle");
    setTurn("player");
    setMenuState("main");
    addMessage(`A wild ${eCreature.name} appeared!`);
    addMessage(`Go! ${pCreature.name}!`);

    // Speed-based initiative
    setTimeout(() => {
      if (eStats.speed > pStats.speed * 1.2) {
        setTurn("enemy");
        enemyTurn();
      }
    }, 3000);
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const animateHealthBar = () => {
    // Health bar animation is handled via CSS transitions
  };

  const attack = (damageType?: DamageType) => {
    if (!player || !enemy || turn !== "player") return;

    const type = damageType || DAMAGE_TYPES[Math.floor(Math.random() * DAMAGE_TYPES.length)];
    const damage = calculateDamage(
      player.creature,
      enemy.creature,
      player.stats,
      enemy.stats,
      type
    );

    addMessage(`${player.creature.name} used ${type.toUpperCase()}!`);
    setTimeout(() => {
      triggerShake();
      const newHP = Math.max(0, enemy.currentHP - damage);
      setEnemy(prev => prev ? { ...prev, currentHP: newHP } : null);
      animateHealthBar();
      addMessage(`Dealt ${damage} damage!`);

      if (newHP === 0) {
        setBattleState("win");
        addMessage(`Enemy ${enemy.creature.name} fainted!`);
      } else {
        setTurn("enemy");
        setMenuState("main");
        setTimeout(enemyTurn, 1500);
      }
    }, 1000);
  };

  const useAbility = () => {
    if (!player || !enemy || turn !== "player") return;

    // Special ability based on creature type
    const abilities: Record<string, string> = {
      Insect: "SWARM STRIKE",
      Arachnid: "VENOM BITE",
      Hybrid: "FUSION BLAST",
    };

    const abilityName = abilities[player.creature.type] || "SPECIAL ATTACK";
    const damage = Math.floor(player.stats.attack * 1.5);

    addMessage(`${player.creature.name} used ${abilityName}!`);
    setTimeout(() => {
      triggerShake();
      const newHP = Math.max(0, enemy.currentHP - damage);
      setEnemy(prev => prev ? { ...prev, currentHP: newHP } : null);
      animateHealthBar();
      addMessage(`Dealt ${damage} damage!`);

      if (newHP === 0) {
        setBattleState("win");
        addMessage(`Enemy ${enemy.creature.name} fainted!`);
      } else {
        setTurn("enemy");
        setMenuState("main");
        setTimeout(enemyTurn, 1500);
      }
    }, 1000);
  };

  const capture = () => {
    if (!enemy || !player || turn !== "player") return;

    const hpPercent = enemy.currentHP / enemy.stats.hp;
    const captureChance = (1 - hpPercent) * 0.5 + 0.1; // Higher chance at low HP
    const success = Math.random() < captureChance;

    setIsCapturing(true);
    addMessage(`${player.creature.name} threw a Capture Net!`);
    addMessage(`...`);

    setTimeout(() => {
      if (success) {
        setCollection(prev => [...prev, enemy.creature.id]);
        addMessage(`Gotcha! ${enemy.creature.name} was caught!`);
        setBattleState("win");
      } else {
        addMessage(`Oh no! ${enemy.creature.name} broke free!`);
        setTurn("enemy");
        setMenuState("main");
        setTimeout(enemyTurn, 1500);
      }
      setIsCapturing(false);
    }, 2000);
  };

  const flee = () => {
    if (turn !== "player") return;

    const success = Math.random() < 0.7;
    addMessage(`${player?.creature?.name} is trying to flee!`);

    setTimeout(() => {
      if (success) {
        addMessage("Got away safely!");
        setBattleState("escape");
      } else {
        addMessage("Can't escape!");
        setTurn("enemy");
        setMenuState("main");
        setTimeout(enemyTurn, 1500);
      }
    }, 1000);
  };

  const enemyTurn = () => {
    if (!player || !enemy) return;

    const damageType = DAMAGE_TYPES[Math.floor(Math.random() * DAMAGE_TYPES.length)];
    const damage = calculateDamage(
      enemy.creature,
      player.creature,
      enemy.stats,
      player.stats,
      damageType
    );

    addMessage(`Enemy ${enemy.creature.name} attacks!`);
    setTimeout(() => {
      triggerShake();
      const newHP = Math.max(0, player.currentHP - damage);
      setPlayer(prev => prev ? { ...prev, currentHP: newHP } : null);
      animateHealthBar();
      addMessage(`Dealt ${damage} damage!`);

      if (newHP === 0) {
        setBattleState("lose");
        addMessage(`${player.creature.name} fainted!`);
      } else {
        setTurn("player");
        setMenuState("main");
      }
    }, 1000);
  };

  const handleMenuAction = (action: string) => {
    switch (action) {
      case "attack":
        setMenuState("attack");
        break;
      case "ability":
        useAbility();
        break;
      case "capture":
        capture();
        break;
      case "flee":
        flee();
        break;
    }
  };

  const handleAttack = (type: DamageType) => {
    attack(type);
    setMenuState("main");
  };

  // Setup screen
  if (battleState === "setup") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div
          className="relative"
          style={{
            backgroundColor: GBA_COLORS.bg,
            color: GBA_COLORS.text,
            fontFamily: '"Press Start 2P", monospace',
          }}
        >
          <link
            href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
            rel="stylesheet"
          />
          <style jsx>{`
            @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
          `}</style>

          {/* GBA Screen Container */}
          <div
            className="relative border-8 rounded-lg shadow-2xl p-4"
            style={{
              backgroundColor: GBA_COLORS.bgLight,
              borderColor: GBA_COLORS.bgDark,
              imageRendering: 'pixelated',
            }}
          >
            <h1 className="text-center text-xl mb-6" style={{ color: GBA_COLORS.text }}>
              RETRO BATTLE
            </h1>

            {/* Battle Setup */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs mb-2 block">YOUR CREATURE:</label>
                <select
                  value={playerCreatureId}
                  onChange={(e) => setPlayerCreatureId(e.target.value)}
                  className="w-full p-2 text-xs border-2 rounded"
                  style={{
                    backgroundColor: GBA_COLORS.white,
                    borderColor: GBA_COLORS.bgDark,
                    color: GBA_COLORS.text,
                  }}
                >
                  {Object.values(CREATURES).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs mb-1 block">LEVEL: {playerLevel}</label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={playerLevel}
                    onChange={(e) => setPlayerLevel(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs mb-1 block">QUALITY: {playerQuality}%</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={playerQuality}
                    onChange={(e) => setPlayerQuality(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs mb-2 block">ENEMY CREATURE:</label>
                <select
                  value={enemyCreatureId}
                  onChange={(e) => setEnemyCreatureId(e.target.value)}
                  className="w-full p-2 text-xs border-2 rounded"
                  style={{
                    backgroundColor: GBA_COLORS.white,
                    borderColor: GBA_COLORS.bgDark,
                    color: GBA_COLORS.text,
                  }}
                >
                  {Object.values(CREATURES).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs mb-1 block">LEVEL: {enemyLevel}</label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={enemyLevel}
                   onChange={(e) => setEnemyLevel(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs mb-1 block">QUALITY: {enemyQuality}%</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={enemyQuality}
                    onChange={(e) => setEnemyQuality(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={initBattle}
              className="w-full py-3 text-sm font-bold rounded shadow-lg hover:shadow-xl transition-shadow"
              style={{
                backgroundColor: GBA_COLORS.bgDark,
                color: GBA_COLORS.white,
              }}
            >
              START BATTLE!
            </button>

            <Link
              href="/"
              className="block text-center mt-4 text-xs underline"
              style={{ color: GBA_COLORS.textLight }}
            >
              ← BACK
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Battle screen
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div
        className="relative"
        style={{
          backgroundColor: GBA_COLORS.bg,
          color: GBA_COLORS.text,
          fontFamily: '"Press Start 2P", monospace',
        }}
      >
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
        <style jsx>{`
          @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        `}</style>

        {/* GBA Screen Container */}
        <div
          className="relative border-8 rounded-lg shadow-2xl overflow-hidden"
          style={{
            backgroundColor: GBA_COLORS.bgLight,
            borderColor: GBA_COLORS.bgDark,
            imageRendering: 'pixelated',
            width: '320px',
          }}
        >
          {/* Battle Scene */}
          <div className="relative h-48" style={{ backgroundColor: GBA_COLORS.bg }}>
            {/* Enemy Creature */}
            {enemy && (
              <div
                className={`absolute top-4 left-4 text-right transition-transform ${isShaking && turn === 'player' ? 'shake-anim' : ''}`}
              >
                <div className="text-xs mb-1">{enemy.creature.name}</div>
                <div className="text-xs mb-1">Lv.{enemy.level}</div>
                {/* HP Bar */}
                <div className="w-24 h-3 border-2 mx-auto rounded" style={{ borderColor: GBA_COLORS.bgDark, backgroundColor: GBA_COLORS.white }}>
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${(enemy.currentHP / enemy.stats.hp) * 100}%`,
                      backgroundColor: (enemy.currentHP / enemy.stats.hp) > 0.5 ? GBA_COLORS.green : (enemy.currentHP / enemy.stats.hp) > 0.2 ? GBA_COLORS.yellow : GBA_COLORS.red,
                    }}
                  />
                </div>
                <div className="text-xs mt-1">{enemy.currentHP}/{enemy.stats.hp}</div>
                <div className="w-20 h-20 mx-auto mt-2">
                  <img
                    src={enemy.creature.image}
                    alt={enemy.creature.name}
                    className="w-full h-full object-contain pixelated"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              </div>
            )}

            {/* Player Creature */}
            {player && (
              <div
                className={`absolute bottom-4 right-4 text-left transition-transform ${isShaking && turn === 'enemy' ? 'shake-anim' : ''}`}
              >
                <div className="w-16 h-16 mx-auto mb-2">
                  <img
                    src={player.creature.image}
                    alt={player.creature.name}
                    className="w-full h-full object-contain pixelated"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <div className="text-xs mb-1">{player.creature.name}</div>
                <div className="text-xs mb-1">Lv.{player.level}</div>
                {/* HP Bar */}
                <div className="w-24 h-3 border-2 rounded" style={{ borderColor: GBA_COLORS.bgDark, backgroundColor: GBA_COLORS.white }}>
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${(player.currentHP / player.stats.hp) * 100}%`,
                      backgroundColor: (player.currentHP / player.stats.hp) > 0.5 ? GBA_COLORS.green : (player.currentHP / player.stats.hp) > 0.2 ? GBA_COLORS.yellow : GBA_COLORS.red,
                    }}
                  />
                </div>
                <div className="text-xs mt-1">{player.currentHP}/{player.stats.hp}</div>
              </div>
            )}

            {/* Capture Ball Animation */}
            {isCapturing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-bounce text-4xl">⊙</div>
              </div>
            )}
          </div>

          {/* Text Box */}
          <div className="p-3 border-t-4" style={{ borderColor: GBA_COLORS.bgDark, backgroundColor: GBA_COLORS.white }}>
            <p className="text-xs leading-relaxed min-h-[40px]">
              {typingMessage}
              <span className="animate-pulse">█</span>
            </p>
          </div>

          {/* Menu */}
          {battleState === "battle" && menuState === "main" && turn === "player" && (
            <div className="grid grid-cols-2 gap-1 p-2" style={{ backgroundColor: GBA_COLORS.bgLight }}>
              <button
                onClick={() => handleMenuAction("attack")}
                className="py-2 text-xs border-2 rounded hover:opacity-80 transition-opacity"
                style={{ borderColor: GBA_COLORS.bgDark, backgroundColor: GBA_COLORS.white }}
              >
                ATTACK
              </button>
              <button
                onClick={() => handleMenuAction("ability")}
                className="py-2 text-xs border-2 rounded hover:opacity-80 transition-opacity"
                style={{ borderColor: GBA_COLORS.bgDark, backgroundColor: GBA_COLORS.white }}
              >
                ABILITY
              </button>
              <button
                onClick={() => handleMenuAction("capture")}
                className="py-2 text-xs border-2 rounded hover:opacity-80 transition-opacity"
                style={{ borderColor: GBA_COLORS.bgDark, backgroundColor: GBA_COLORS.white }}
              >
                CAPTURE
              </button>
              <button
                onClick={() => handleMenuAction("flee")}
                className="py-2 text-xs border-2 rounded hover:opacity-80 transition-opacity"
                style={{ borderColor: GBA_COLORS.bgDark, backgroundColor: GBA_COLORS.white }}
              >
                FLEE
              </button>
            </div>
          )}

          {/* Attack Menu */}
          {battleState === "battle" && menuState === "attack" && turn === "player" && (
            <div className="p-2" style={{ backgroundColor: GBA_COLORS.bgLight }}>
              <div className="text-xs mb-2">CHOOSE ATTACK:</div>
              <div className="grid grid-cols-1 gap-1">
                {DAMAGE_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleAttack(type)}
                    className="py-2 text-xs border-2 rounded hover:opacity-80 transition-opacity text-left px-2"
                    style={{ borderColor: GBA_COLORS.bgDark, backgroundColor: GBA_COLORS.white }}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Win/Lose Screen */}
          {(battleState === "win" || battleState === "lose" || battleState === "escape") && (
            <div className="p-4 text-center space-y-4" style={{ backgroundColor: GBA_COLORS.bgLight }}>
              <div className="text-lg font-bold" style={{ color: battleState === "win" ? GBA_COLORS.green : battleState === "lose" ? GBA_COLORS.red : GBA_COLORS.text }}>
                {battleState === "win" ? "VICTORY!" : battleState === "lose" ? "DEFEAT!" : "ESCAPED!"}
              </div>

              {battleState === "win" && collection.length > 0 && (
                <div className="text-xs">
                    CAUGHT: {collection.map(id => CREATURES[id]?.name).join(", ")}
                </div>
              )}

              <button
                onClick={() => {
                  setBattleState("setup");
                  setMenuState("main");
                  setTurn("player");
                  setPlayer(null);
                  setEnemy(null);
                  setMessage("A wild creature appeared!");
                  setMessageQueue([]);
                }}
                className="w-full py-2 text-xs border-2 rounded"
                style={{ borderColor: GBA_COLORS.bgDark, backgroundColor: GBA_COLORS.white }}
              >
                NEW BATTLE
              </button>

              <Link
                href="/"
                className="block text-center text-xs underline"
                style={{ color: GBA_COLORS.textLight }}
              >
                ← MAIN MENU
              </Link>
            </div>
          )}

          {/* Enemy Turn Indicator */}
          {turn === "enemy" && battleState === "battle" && (
            <div className="p-2 text-center text-xs animate-pulse" style={{ backgroundColor: GBA_COLORS.bgLight }}>
              ENEMY TURN...
            </div>
          )}
        </div>

        {/* CSS Animations */}
        <style jsx>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }
          .shake-anim {
            animation: shake 0.5s ease-in-out;
          }
          .pixelated {
            image-rendering: pixelated;
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
          }
        `}</style>
      </div>
    </main>
  );
}
