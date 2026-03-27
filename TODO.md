# TODO - ÉcoBio (Nephila Internal)

## ICEAGE: Features Perdus lors du revert commit 3a14898

Date: 2026-03-27 17:39
Revert commit: 3a14898
Status: Nourrir fonctionne now

### Features à réimplémenter (perdus après revert)

#### 1. Filtre par rang (dans nourrissage)
- Dropdown pour filtrer food par rang: Tous/E/D/C/B/A/S/S+
- Où: Dans "🌱 Nourrir avec d'autres créatures"
- Commit perdu starts at: 84a6a0b "feat: add rank filter and auto-select in feeding UI"

#### 2. Boutons "Tout sélectionner" et "Tout désélectionner"
- Auto-select: Sélectionne toutes les créatures affichées dans le filtre actuel
- Auto-deselect: Déselectionne toutes les créatures
- Où: Dans la section filtre romaine de nourrissage
- Commit perdu: 84a6a0b

#### 3. Modal "Voir les détails"
- Song: Bouton 👁️ Voir sur chaque créature dans la food list
- Ouvre popup modal avec:
  - Image, nom, rang, level
  - Compétence (skill name, description, CD, duration)
  - Stats (HP, ATK, DEF, SPD, CRIT)
  - Valeur XP
- Intention: Vérifier compétences/stats avant de décider de nourrir
- Sans retourner à l'inventaire
- Commit perdu: 243f54a "feat: separate food preview into real-time and modal view"

#### 4. Système de favoris (❤️/🤍)
- Toggle button partout: spawn, viewing, collection cards
- Favorites protégées:
  - Pas relâchable
  - Pas utilisable comme nourriture
- Avertissement banner quand on view une Favorite
- Heart position: Juste à gauche du badge de rang (top-right + 48px)
- Commit perdu: 7a10a8a "feat: add favorite system to protect creatures"

#### 5. Options de refactor 2026-03-27 (depuis la liste précédente)

**Level cap 50** (toimplementer plus tard)
- feedCreature stops at 50
- Surplus XP perdu
- Follow بعدall喝 blocking approach

**Level preview realtime update** (toimplementer plus tard)
- In FP选中明细: display "XP total + prédit level X→Y"
- Show next level XP requirement si < 50
- Show "MAX" si level 50 deja

**Ancien système de nourrissage** (to remove plus tard)
- Commits: 59e8d46 and e27ca27 handled the freeze attempt
- Les boutons HP/ATK/DEF/SPD/CRIT et "OU" section à echteiter

## DEBUG NOTES

### Freeze bugs NOT from features
- Commit dc1eabd: memoize feeding simulation caused freezes (reverted)
- Commit ed35718: cache getAllFoodCreatures caused freezes (reverted)
- Commit c81507b: moving getAllFoodCreatures before handleSelectAllVisible caused freezes (reverted)
- Commit 59e8d46: removed real-time preview (still had freezer)
- Commit e27ca27: batch state updates for freeze (still froze) et donc a caused final revert to 3a14898

**Conclusion:** Le freeze n'est PAS des features elles-mêmes, mais likely des interactions entre plusieurs components.

## Priority for Reimplementation

1. **Filtre par rang & Tout sélectionner/Désélectionner** (84a6a0b) - Highest priority (convenience)
2. **Modal Voir détail** (243f54a) - Medium (useful for breeding planning)
3. **Favoris** (7a10a8a) - Medium (nice-to-have)
4. **Level cap 50** - High (user requirement to have progress limit)
5. **Level preview realtime** - Medium (UX improvement)

##.strategy

For each lost feature:
1. Check git diff of its commit
2. Apply gradually, testing after each
3. If freezing occurs, isolate the specific piece causing it
4. Use safe patterns (memoization, debouncing, timeout instead of direct calls)

## Successful Features Retained

- ✅ Nourrir avec Stats (HP/ATK/DEF/SPD/CRIT + "OU" section)
- ✅ Nourrir avec d'autres créatures (XP system)
- ✅ customStats var preservation during level up

## Current Status

- Version: Commit 3a14898 (feat: implement customStats to preserve variance during level up)
- Build: ✅ Stable
- Deploied: ✅ GitHub Actions active
- Feeding: ✅ Funciona
