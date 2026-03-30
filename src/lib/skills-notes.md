# Skills Database - ÉcoBio

Base skills are assigned at spawn based on personality (archetype)
Unlocks are gained via Combat XP (Stars): ★☆☆☆☆ - ★★★★★
Skill levels 1-5 scale power from 100% to 125-150%

## Combat Skill Effects

Skills modify battle state without cooldowns (cooldowns are reset each battle).
Effects are applied immediately when skill is activated.

Effects are implemented in the battle system via BattleCreature.skillCooldowns
and ActiveBuffs (defenseBuff, dodgeBuff, attackBuff, attackBuffTurns, etc.)

## Skill Implementation Notes

Each skill must have:
- effect: "defense" | "dodge" | "attack" | "heal" | "debuff" | "special"
- value: Base duration or effect strength
- cooldown: Turns before can reuse (in battle)
- duration: Effect duration in turns
- target: Which creature(s) are affected

Skill levels (1-5) scale: 
- Level 1: 100% power
- Level 5: 125-150% power + bonuses

See Battle Effects section for specific mechanics for each archetype.
