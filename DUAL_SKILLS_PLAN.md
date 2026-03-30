# Plan: Dual Skills Integration (Specimen + Personality)

## Overview
Integrate both specimen skill AND personality skill into the battle system

## Current State
- `BattleCreature.creature.skill` = single skill only (specimenSkill from Creature interface)
- `MultiCreatureBattleDisplay` shows single skill button
- `canUseSkill()` and `useSkill()` work with `creature.skill`

## Required Changes

### 1. Battle Creature Interface Update
```typescript
export interface BattleCreature {
  creature: Creature;
  stats: BattleStats;
  currentHP: number;
  skillCooldowns: SkillCooldowns;

  // NEW: Active skill selection (for UI)
  activeSkillType?: "specimen" | "personality";

  // Skills accessible via creature.specimenSkill and creature.personalitySkill
  // (already in Creature interface from hunting update)
}
```

### 2. Skill Usage Functions Update
```typescript
export function getActiveSkill(creature: BattleCreature) {
  // Return specimenSkill or personalitySkill based on activeSkillType
}

export function canUseSkill(creature: BattleCreature, skillType?: "specimen" | "personality"): boolean {
  // Check cooldown for specific skill type
}

export function useSkill(
  creature: BattleCreature,
  log: BattleLogEntry[],
  target?: BattleCreature | null,
  skillType?: "specimen" | "personality"
): boolean {
  // Use specific skill type
}
```

### 3. UI Updates
- Add 2 skill buttons instead of 1 (or skill selector)
- Show cooldown status for both skills
- Display which skill is active/selected

### 4. Multi-Battle Integration
- Each creature has 2 skills in MiniCreatureCard
- Need to show skill icons/indicators
- Button to select which skill to use

## Implementation Priority

### Phase 1: Core Battle Functions (High Priority)
- Update `canUseSkill()` signature
- Update `useSkill()` signature
- Add `getActiveSkill()` helper
- Update cooldown tracking to use skill IDs

### Phase 2: UI - 1v1 Battle (High Priority)
- Add 2 skill buttons
- Show cooldowns for both
- Handle skill selection

### Phase 3: UI - 3v3/5v5 Battle (Medium Priority)
- Display skill indicators on cards
- Add skill choice dialog
- Update action buttons

### Phase 4: Testing & Polish (Low Priority)
- Test skill combos
- Balance cooldowns
- Optimize tooltips

## Skill Cooldown Key Format
```
Specimen: "skill_{skillName}_specimen_{creatureName}"
Personality: "skill_{skillName}_personality_{creatureName}"
```

This prevents conflicts and allows independent cooldown tracking.
