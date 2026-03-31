# Personality Buff SystemDocumentation

## Overview

The Personality Buff System provides active, time-limited buffs that creatures can trigger during battle based on their personality type (agressive, protective, rapide, soin_leurre, précise, balancee, mysterieuse).

**Design Goals:**
- Simple to understand: each personality boosts its corresponding stat
- Strategic depth: timing matters (when to activate?)
- Balanced: uniform cooldown (3 turns) across all personalities
- Fair tradeoffs: short duration (2 turns) with powerful effects

---

## Buff Definitions

| Personality | Buff Name | Effect | Duration | Cooldown |
|-------------|-----------|--------|----------|----------|
| **agressive** | Frénésie | +50% ATK | 2 turns | 3 turns |
| **protective** | Cuirasse | +50% DEF | 2 turns | 3 turns |
| **rapide** | Accélération | +50% SPEED | 2 turns | 3 turns |
| **soin_leurre** | Bouclier Temporel | +50% MAX HP + damage reduction on expiry | 2 turns | 3 turns |
| **précise** | Visée Laser | +50% CRIT | 2 turns | 3 turns |
| **balancee** | Équilibre | +25% ALL STATS | 2 turns | 3 turns |
| **mysterieuse** | Surprise | +50% ONE random stat | 2 turns | 3 turns |

---

## Special Mechanics

### Soin-Leurre: Bouclier Temporel (Temporal Shield)

**Unique Mechanic:** When Bouclier Temporel expires, all damage taken during the buff is **retroactively reduced by 50%**.

**How it works:**
1. **Activation:** MAX HP increases by 50% (e.g., 1000 → 1500)
2. **During buff:** Damage is tracked in `creature.soinLeurreState.damageTakenDuringBuff`
3. **Expiration:** Tracks damage is reduced by 50% and applied as HP recovery
4. **Result:** Effective damage taken = original damage × 0.5

**Example Scenario:**

```
Creature: Soin-Leurre, 1000 MAX HP
---
1. Activate Bouclier Temporel
   → MAX HP: 1500 (temp)
   → Current HP: 1000 (unchanged)

2. Take 100 damage
   → Current HP: 1400
   → tracking: damageTakenDuringBuff = 100

3. Take another 100 damage
   → Current HP: 1300
   → tracking: damageTakenDuringBuff = 200

4. Buff expires (3 turns later)
   → Damage reduction: 200 × 0.5 = 100
   → HP recovery: +100
   → Current HP: 1400 (1300 + 100)
   → MAX HP: 1000 (back to normal)
   → Final: 900/1000 HP (took 100 dmg total vs 200 original)

---
Effective damage: 100 (50% of 200)
Bonus: Allows aggressive play with sacrifice skills!

Sacrifice Skill Example:
- Sacrifice Vital: -30% HP
- With Bouclier Temporel active: -30% of 1500 = 450 HP lost
- On expiry: 450 × 0.5 = 225 HP recovered
- Effective sacrifice: 225 HP (15% of original 1500) vs 450 (30%)
```

**Benefits:**
- **Strategy:** Can play hyper-aggressively with sacrifice skills
- **Risk mitigation:** Take big damage → 50% absorbed retroactively
- **Synergy:** Perfect with DPS/RIPOST builds that take recoil damage

---

## Code Structure

### Files Added
- `src/lib/personality-buffs.ts` - Buff definitions and logic

### Files Modified
- `src/lib/battle.ts` - Integration with battle system

### Key Functions

```typescript
// Get personality buff definition
getPersonalityBuff(personality: PersonalityType): PersonalityBuff | null

// Check if buff can be activated
canActivatePersonalityBuff(creature: BattleCreature): boolean

// Activate buff
activatePersonalityBuff(creature: BattleCreature, log: BattleLogEntry[]): boolean

// Tick buff duration (call each turn)
tickPersonalityBuff(creature: BattleCreature, log: BattleLogEntry[]): boolean

// Tick cooldown (call each turn)
tickPersonalityBuffCooldown(creature: BattleCreature): void

// Get effective stats (considering active buff)
getEffectiveStats(creature: BattleCreature): BattleStats

// Track damage for soin_leurre buff
trackDamageForSoinLeurre(creature: any, damage: number)
```

---

## Battle Integration

### When to Call These Functions

**During battle turn processing:**

```typescript
// On creature's turn start
tickPersonalityBuff creature, log) // Decrease duration
tickPersonalityBuffCooldown(creature) // Decrease cooldown

// On creature's action (if player-controlled)
if (canActivatePersonalityBuff(creature)) {
  // Show buff activation button in UI
}
if (playerActivatedBuff) {
  activatePersonalityBuff(creature, log);
}

// On damage calculation
const attackerStats = getEffectiveStats(attacker);
const defenderStats = getEffectiveStats(defender);
// Use these stats instead of creature.stats
```

---

## Data Structures

### BattleCreature Additions

```typescript
interface BattleCreature {
  // ... existing fields ...

  // Personality system
  personality?: PersonalityType;
  activePersonalityBuff?: PersonalityBuff; // Currently active
  personalityBuffCooldown?: number; // Turns remaining
  originalMaxHP?: number; // For soin_leurre
  soinLeurreState?: SoinLeurreState; // Damage tracking
  mysterieuseBoostedStat?: ["atk" | "def" | "speed" | "crit"];
  tempStats?: BattleStats; // Temporarily boosted stats
}

interface SoinLeurreState {
  damageTakenDuringBuff: number;
}
```

### PersonalityBuff Interface

```typescript
interface PersonalityBuff {
  id: string; // Unique ID (e.g., "buff_frenesie")
  name: string; // Display name (e.g., "Frénésie")
  personality: PersonalityType;
  duration: number; // Turns
  cooldown: number; // Turns
  onApply: (creature: BattleCreature) => void; // Apply buff
  onRemove: (creature: BattleCreature) => void; // Remove buff
}
```

---

## Balance Notes

### Current Balance (v1)
- **All buffs:** 2 turns duration, 3 turns cooldown
- **Boost power:** 50% (except balancee at 25% all stats)
- **Soin-leurre special:** 50% retroactive damage reduction

### Future Adjustments (if needed)
Levers for balance:
- Duration (1-3 turns)
- Cooldown (2-5 turns)
- Boost percentage (25-75%)
- Soin-leurre reduction (30-70%)

---

## Example Usage

### 1v1 Battle Implementation

```typescript
// Player turn
if (canActivatePersonalityBuff(player)) {
  log.push({ text: `${player.name} peut activer ${player.personality} buff!`, type: "info" });
  // Show activation button in UI
}

// After player action
if (playerActivatedBuff) {
  activatePersonalityBuff(player, log);
}

// Start of creature's turn
tickPersonalityBuff(player, log);
tickPersonalityBuffCooldown(player);
```

### Multi-Creature Battle Implementation

Same as 1v1, but call for each creature in turn order.

---

## Status

✅ **Implemented:** Core buff system with all 7 personalities
✅ **Special:** Soin-leurre Bouclier Temporel with retroactive damage reduction
✅ **Integration:** battle.ts integration complete
🔄 **TODO:** UI implementation in battle/page.tsx (activation buttons, cooldown display)
🔄 **TODO:** Testing in battle scenarios
