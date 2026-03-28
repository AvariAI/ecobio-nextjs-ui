# Exploration Plant Loot Generation Fix

## Problem
The exploration system was only spawning plants with E and B rarity due to a mismatch between legacy rarity strings ("common", "uncommon", "rare", "epic") and the native Rank system (E-S+).

## Changes Made

### 1. `src/lib/exploration.ts`
- **Updated `generateLoot` function**: Changed from legacy rarity system to native Rank system (E-S+)
- **Added `export` to `generateLoot`**: Made the function accessible from the exploration page
- **Fixed rarity rolls**: Now correctly uses `PLANT_RARITY_CHANCES` with native Rank keys (E, D, C, B, A, S, S+)
- **Grouped plants by rank**: Eligible plants are now indexed by their native Rank for proper filtering

Key changes:
```typescript
// Before: Used legacy rarity strings (common, uncommon, rare, epic)
let rarity: "common" | "uncommon" | "rare" | "epic";
const eligiblePlants = PLANTS.filter(p => p.rarity === rarity);

// After: Uses native Rank system (E-S+)
let selectedRank: Rank = "E";
const rankPlants = eligiblePlants.get(selectedRank) || [];
```

### 2. `src/lib/inventory.ts`
- **Updated `InventoryItem` interface**: Changed from `rarity` field to `rank` field with proper Rank type
- **Updated `PLANT_DEFINITIONS`**: Changed all plant definitions from `rarity` field to `rank` field
- **Added `pissenlit` plant**: Included the D-rank Pissenlit plant that was missing
- **Updated `RARITY_COLORS`**: Now properly typed as `Record<Rank, string>` instead of `Record<string, string>`
- **Added `RANK_BORDER_COLORS`**: New constant for loot display borders in exploration results
- **Removed legacy mapping functions**: `mapOldRarityToNew` and `mapPlantId` kept for backwards compatibility but simplified
- **Updated `addExplorationLoot`**: Now directly accepts PlantResource with native Rank instead of legacy rarity

### 3. `src/app/exploration/page.tsx`
- **Added imports**: Imported `RARITY_COLORS` and `RANK_BORDER_COLORS` from inventory module
- **Updated loot display**: Loot results now show native Rank (E-S+) with proper color coding
- **Added plant icons**: Each loot item now displays its emoji icon
- **Fixed rank badges**: Loot items now display "Rank X" badges with correct styling

### 4. `src/app/inventory/page.tsx`
- **Updated all references**: Changed all `item.rarity` to `item.rank`
- **Updated variable names**: Changed `groupedByRarity` to `groupedByRank`
- **Updated labels**: Changed "Rareté" to "Rank" throughout the UI

### 5. `src/app/craft/page.tsx`
- **Updated plant essence crafting**: Fixed `plant1.rarity` to `plant1.rank` (3 occurrences)
- **Ensuring Rank averaging**: Now correctly uses native ranks for plant essence calculations

### 6. `src/lib/resources.ts`
- **Simplified `getPlantRankFromLegacy`**: Now returns default "E" since legacy system is deprecated

## Rarity Distribution by Mission Duration

The `PLANT_RARITY_CHANCES` now correctly distribute plants by Rank:

| Duration | E   | D   | C   | B   | A   | S   | S+ |
|----------|-----|-----|-----|-----|-----|-----|----|
| 15min    | 60% | 30% | 8%  | 2%  | 0%  | 0%  | 0% |
| 30min    | 50% | 30% | 12% | 6%  | 2%  | 0%  | 0% |
| 1h       | 40% | 30% | 15% | 10% | 3%  | 2%  | 0% |
| 2h       | 30% | 30% | 18% | 14% | 5%  | 2%  | 1% |
| 4h       | 25% | 25% | 20% | 18% | 8%  | 3%  | 1% |
| 8h       | 20% | 20% | 22% | 20% | 12% | 5%  | 1% |

## Plant List by Rank

| Rank | Plant ID         | Name            | Description                      | Icon |
|------|------------------|-----------------|----------------------------------|------|
| E    | herbe_commune    | Herbe Commune   | Plante commune trouvée dans les prés | 🌿 |
| D    | herbe_houleuse   | Herbe Houleuse  | Herbe résistante aux tempêtes et au vent | 🌿 |
| D    | pissenlit        | Pissenlit       | Petite fleur jaune très commune | 🌼 |
| C    | herbe_prairie    | Herbe de Prairie| Herbe qui pousse dans les prairies vastes | 🌿 |
| B    | fleur_rouge      | Fleur Rouge     | Fleur vibrante aux pétales rouges | 🌸 |
| A    | fleur_bleue      | Fleur Bleue     | Fleur rare aux propriétés magiques | 💙 |
| S    | tige_mystique    | Tige Mystique   | Tige chargée d'énergie ancienne | ✨ |
| S+   | lotus_ancien     | Lotus Ancien    | Plante légendaire utilisée pour le breeding avancé | 🌺 |

## Testing Expected Results

- **15min mission**: Mostly E (60%) and D (30%), rare C (8%), very rare B (2%)
- **30min mission**: Mix E/D (80%), more C (12%), B and A possible (6%/2%)
- **1h mission**: Good variety, all ranks up to S possible (A 3%, S 2%)
- **2h mission**: All ranks up to S+ possible (S 2%, S+ 1%)
- **4h mission**: High variety with better rare drops
- **8h mission**: Best chance for high-tier plants (A 12%, S 5%, S+ 1%)

## Build Status

✅ TypeScript compilation: PASSED (no errors)
✅ Next.js build: PASSED (all routes successfully built)

## Conclusion

The exploration loot system now correctly uses the native Rank system (E-S+) with proper rarity distribution based on mission duration. All 7 plants can now spawn with appropriate rarity chances, and the inventory/crafting systems correctly handle the native Rank field.
