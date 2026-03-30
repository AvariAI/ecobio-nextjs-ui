# TODO: Les changements nécessaires pour que SPEED fonctionne

## 1. getEffectiveSpeed doit appliquer le buff SPEEDs

Actuellement: getEffectiveSpeed ne prend pas en compte les buffs SPEED.

Il faut modifier la fonction pour:

```typescript
export function getEffectiveSpeed(creature: BattleCreature): number {
  // Check both old statusEffects and new buffs (for transition period)
  let totalSlowReduction = getBuffValueByType(creature, BuffType.SLOW);
  
  // TODO: Ajouter support pour SPEED buff
  let totalSpeedBoost = getBuffValueByType(creature, BuffType.SPEED); // NEW
  
  // Also check legacy statusEffects for backward compatibility
  const slowEffects = getStatusEffects(creature, StatusEffectType.SLOW);
  for (const effect of slowEffects) {
    totalSlowReduction += effect.value || 0;
  }
  
  // Cap at 50% reduction
  totalSlowReduction = Math.min(totalSlowReduction, 0.5);
  
  // Apply speed boost (no cap? or caps?)
  totalSpeedBoost = Math.min(totalSpeedBoost, 0.40); // Cap at 40% ?
  
  return Math.floor(creature.stats.speed * (1 - totalSlowReduction + totalSpeedBoost));
}
```

## 2. Ajouter "SPEED Buff" dans le log d'affichage quand un buff est appliqué

Dans useSkill() quand un buff SPEED est appliqué, il faut afficher:
- "+40% VIT" au lieu de "+40% Dodge"

## 3. Vérifier que json est correct

- BuffType.SPEED = "speed"
- effectDuration corrects dans skills.ts
- mapping skill.effect → BuffType correct
