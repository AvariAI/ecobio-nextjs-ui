# Battle System Architecture v3 - Design Document

## Current Problems

The current battle.ts has an archaic interface:
- `ActiveBuffs` uses individual fields: defenseBuff, dodgeBuff, attackBuff, defenseBuffTurns, dodgeBuffTurns, attackBuffTurns
- `SkillCooldowns` only tracks cooldowns (no skill data)
- Skills are strings, not typed objects
- Effects are hard-coded in switch statements throughout the code
- No way to know what skill is active and what effects it applies
- Battle display components don't understand skill effects

## New Architecture v3

### Creature Skills in Battle

```typescript
interface BattleCreature {
  // ... existing fields ...
  activeSkill?: ActiveSkill;  // Currently selected skill
  skills: Skill[];  // All available skills
}

interface ActiveSkill {
  skill: Skill;  // Skill object from skills.ts
  cooldownRemaining: number;  // Turns until can reuse
  activationTime: number;  // When was it activated
  targetCreatureIds: string[];  // Which creatures were targeted
}
```

### Dynamic Buffs

Replace individual buff fields with an array-based system:

```typescript
interface ActiveBuff {
  skillId: string;  // Which skill created this buff
  type: BuffType;  // What does this buff do
  value: number;  // Effect strength
  turnsRemaining: number;  // How long does it last
  sourceCreatureId: string;  // Which creature applied it
}

type BuffType =
  | "attack_boost"
  | "defense_boost"
  | "dodge_boost"
  | "heal"
  | "poison"
  | "atk_debuff"
  | "def_debuff"
  | "spd_debuff"
  | "crit_boost"
  | "crit_debuff"
  | "dmg_redirect"  // Protective's fortress
  | "recoil"  // Self-damage from attack
  | "redirect_reduced"  // Damage reduction on redirected dmg
  | "stat_boost"  // Balancee's stat boost
  | "stat_debuff"  // Balancee's stat debuff
  | "dodge_heal"  // Rapide's heal on dodge
  | "poison_self"  // Soin-Leurre's self poison damage
;

interface ActiveStatusEffects {
  buffs: ActiveBuff[];
  // Status effects (stun, poison, slow) stay as-is
}
```

### Skill Application Flow

```
1. Player activates skill
   ↓
2. Battle checks if skill is on cooldown
   ↓
3. Apply skill effects:
   - Get target creatures (self, ally, ally_lowest_hp, etc.)
   - Create ActiveBuff objects for each effect
   - Apply duration-based buffs to targets with turnsRemaining
   - Apply instant effects (heal, damage) immediately
   ↓
4. Set cooldown on source creature
   ↓
5. Battle continues
```

### Buff Decrement & Cleanup

When a creature's turn starts:
- Decrease turnsRemaining for all buffs
- Remove buffs with turnsRemaining ≤ 0
- Check for special triggers (Rapide's dodge-heal, etc.)

### Skill Effect Mapping

Our skills.ts effects map to buff types:

| Skill Effect | Buff Type | Duration |
|-------------|-----------|----------|
| offenseMultiplier | attack_boost | effectDuration |
| dodgeChance | dodge_boost | effectDuration |
| damageReduction | defense_boost | effectDuration |
| healPercent | heal | instant |
| poisonPercent | poison | 2 turns |
| critDamageBonus | crit_boost | effectDuration |
| selfBoostPercent | stat_boost | effectDuration |
| enemyDebuffPercent | stat_debuff | effectDuration |
| defenseRedirect | dmg_redirect | effectDuration |
| poisonSelfDamage | poison_self | permanent (per turn) |

## Implementation Steps

1. **Update BattleCreature interface** in battle.ts
   - Add activeSkill, skills fields
   - Replace ActiveBuffs with ActiveBuff[]
   - Add helper functions for buff management

2. **Skill application functions**
   - applySkillEffects(creature, skill, targetCreatures)
   - decrementBuffs(creature)
   - cleanupExpiredBuffs(creature)
   - getEffectiveStats(creature) with buffs applied

3. **Update battle display**
   - Show skill button with icon from skills.ts
   - Display active buffs on creatures (buff icons, turns remaining)
   - Show cooldown indicators

4. **Update skill activation in battle**
   - Handle skill targets (self, ally, ally_lowest_hp)
   - Apply effects according to skill type
   - Track cooldowns per skill

## Benefits

- **Type-safe:** Skills are typed objects, not strings
- **Dynamic:** Easy to add new skills/archetypes
- **Clear:** Buff sources are tracked (knows which skill applied which buff)
- **Maintainable:** Effect logic centralized in skills.ts
- **Extensible:** Easy to add new buff types without changing core battle logic
