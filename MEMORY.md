# MEMORY.md - ÉcoBio Project

## Project Context
**Name:** ÉcoBio
**Owner:** Sang @sangdwitch:nips.im
**Goal:** AnyMaps-based AR game that transforms perception of physical reality into a fantasy world map
  - **Core Vision:** Like Narnia but superimposed on the real world — players see creatures, quests, and other players instead of countries/borders
  - **Physical Reality → Fantasy Overlay:** Frontiers vanish, replaced by biomes, spawn-specific creatures, resource locations
  - **Daily Life Transformed:** Commutes become exploration missions, parks = spawn zones, neighbors = fellow adventurers
  - **Technical Goal:** Battle overhaul système with RNG creatures, variance per rank, level scaling 1-50
**Repository:** AvariAI/ecobio-nextjs-ui
**Deploy:** GitHub Pages - https://avariai.github.io/ecobio-nextjs-ui/

## Core Vision & Philosophy (2026-03-30)

### The AnyMaps Overlay: A Parallel World

**Concept:** ÉcoBio uses AnyMaps to create a transformative layer over physical reality — not just overlaying creatures like Pokémon GO, but reimagining how players perceive and interact with their environment.

**What changes:**
- **From political borders → To biomes & spawn zones:** Players don't see "France/D", they see "Néphenta Forest," "Mushroom Grove," etc.
- **From daily routine → To adventure:** Commutes = exploration missions, parks = creature habitats, specific locations = rare resource spawns
- **From strangers → To fellow adventurers:** Other players aren't anonymous — they're part of the shared fantasy world
- **From static geography → To dynamic ecosystem:** Different locations host different creatures, resources, and gameplay opportunities

**Why this matters:**
1. **Cognitive shift:** Changes perception from "passing through" to "exploring"
2. **Community building:** Shared fantasy world encourages spontaneous player interactions
3. **Discovery & wonder:** Finding rare spawns/locations becomes memorable experiences
4. **Real-world connection:** Physical places gain new meaning through gameplay narratives

**Design implications:**
- Battle system, collection, feeding, breeding — all layers of engagement with this fantasy overlay
- Exploration system (missions) drives players to discover new locations and creature spawns
- Medical/craft systems provide progression tied to resource gathering across the fantasy map
- Player-to-player interactions (trading? PvP? co-op quests?) become natural extensions

**Reference:** Narnia-style portal — the real world hasn't changed, but perception has. AnyMaps is the wardrobe.

---

## Genetic Types System (2026-03-30)

### Post-Apocalyptic Genetic Mutation Framework

**Core Concept:** The 8 Genetic Types represent distinct evolutionary mutation pathways born from The Collapse and Science Gone Wrong. Each type embodies a form of adaptation to different environmental challenges (radiation, biological warfare, technological fusion, quantum anomalies).

**Design Philosophy:**
- **Lore-first mechanics** — Type interactions are justified by genetic compatibility
- **Rock-paper-scissors 8-way** — Each type counters another and is countered by a third
- **Biome affinities** — Each type spawns in specific environmental zones matched to AnyMaps fantasy overlay
- **Depth without complexity** — 8 types create strategic variety while remaining learnable

---

### The 8 Genetic Types

#### 🔬 1. Résilient (Resilient)
**Evolutionary Origin:** Survivors of harsh environments, radiation-adapted carapaces
**Biome Affinities:** Ruines urbaines, zones contaminées
**Signature Traits:** Bio-enhanced resilience, adaptive armor, recovery mechanisms
**Characteristic:** **Persistence** — Reinforce all ongoing effects (buffs/debuffs duration extension, sustained actions enhanced)
**Synergy Examples:**
- Protective = sustained protection (longer shield duration)
- Agressive = prolonged damage (damage buffs last longer)
- Soin-Leurre = extended healing (heal over time lasts longer)
**⚔️ Type Interactions:**
- ✅ **Counters:** Pathogènes (enhanced immunity resists toxins)
- ❌ **Weak Against:** Synchroniseurs (reality-warp ignores extended effects)

---

#### 🔬 2. Scribeur (Nervous)
**Evolutionary Origin:** Massive cognitive adaptation, hyper-reflexive nervous systems
**Biome Affinities:** Laboratoires abandonnés, zones technologiques
**Signature Traits:** Cognitive abilities, superhuman reflexes, enhanced perception
**Characteristic:** **Radar** — Preview enemy intent, dodge anticipation, predict-and-react gameplay
**Synergy Examples:**
- Rapide = dodge + predict (efficiency doubled)
- Précise = crit guarantee on prediction
- Balancee = safety buffer (know when to play safe)
**⚔️ Type Interactions:**
- ✅ **Counters:** Symbiotes (precision attacks dismantle hybrid structures)
- ❌ **Weak Against:** Pathogènes (toxic fog impairs cognitive function)

---

#### 🔬 3. Symbiote (Hybrid)
**Evolutionary Origin:** Organic-synthetic fusion, bio-tech integration
**Biome Affinities:** Zones de convergence, décharges électroniques
**Signature Traits:** Integrated technology, connected neural networks, adaptive forms
**Characteristic:** **Link** — Share buffs, split damage with ally, mutual buff transfer
**Synergy Examples:**
- Soin-Leurre = shared heals (heal ally + self)
- Protective = mutual protection ( defend ally + self)
- Mysterieuse = shared chaos bonus (RNG rolls apply to both)
**⚔️ Type Interactions:**
- ✅ **Counters:** Radiants (tech absorbs and dissipates radiation)
- ❌ **Weak Against:** Scribeurs (precision attacks find structural weaknesses)

---

#### 🔬 4. Radiant (Radioactive)
**Evolutionary Origin:** Selective radiation absorption, irradiated mutants
**Biome Affinities:** Zones radiatives, centrales abandonnées
**Signature Traits:** Glowing eyes, energy emissions, regenerative properties
**Characteristic:** **Energy drain** — Absorb enemy HP when hitting, self-sustain via damage
**Synergy Examples:**
- Agressive = sustain DPS (hit → heal)
- Soin-Leurre = alternate healing source (damage = alternative to direct heals)
- Mysterieuse = RNG energy absorption (health bonus when chaos procs)
**⚔️ Type Interactions:**
- ✅ **Counters:** Chimères (high energy disintegrates chaotic forms)
- ❌ **Weak Against:** Symbiotes (technology absorbs radiation)

---

#### 🔬 5. Chimère (Mutagenic)
**Evolutionary Origin:** Forced cross-species hybridization, chaotic biology
**Biome Affinities:** Laboratoires de recherche, zones expérimentales
**Signature Traits:** Contradictory traits, absurd adaptations, unstable forms
**Characteristic:** **Mutation** — Random stat boost per turn, volatile but potentially game-changing
**Synergy Examples:**
- Agressive = bonus ATK RNG rolls
- Protective = bonus DEF RNG rolls
- Mysterieuse = chaos × chaos (maximum unpredictability)
**⚔️ Type Interactions:**
- ✅ **Counters:** Synchroniseurs (wild variance breaks quantum coherence)
- ❌ **Weak Against:** Radiants (energy overwhelms chaotic biology)

---

#### 🔬 6. Pathogène (Toxic)
**Evolutionary Origin:** Biological warfare, toxin-based evolution, immune resistance
**Biome Affinities:** Zones contaminées, décharges chimiques
**Signature Traits:** Toxic secretions, transmissible diseases, immune fortification
**Characteristic:** **Impact Maladie** — Transform all damage into DoT poison over 4 turns with stacking snowball bonus

**MÉCANIQUE MALADIE (PASSIF GLOBAL):**
- Chaque attaque Pathogène crée **une nouvelle maladie** sur la cible
- Poool maladie = valeur attaque (crit inclus si applicable)
- **AUCUN dégât instantané** (coût implicite = pression différée)
- Chaque maladie dure **4 tours exactement**
- Chaque tour, maladie inflige **25% de SON pool initial**
- Maladies s'empilent indépendantes (max 4 pour peak)
- DoT s'applique à la **FIN** du tour de la créature malade

**DOMMAGE PAR TOUR (SOMME DES 25% + BONUS CHARGES):**
- 1 charge  → 0%  bonus
- 2 charges → 10% bonus (somme 25% maladies actives × 110%)
- 3 charges → 20% bonus (somme 25% maladies actives × 120%)
- 4+ charges → 30% bonus (somme 25% maladies actives × 130%, capped)

**Exemple (4 attaques avec crit +31%):**
```
Attaques : 100, 131, 131, 131 HP
┌─────────────────────────────────────┐
│ Tour 1 : 1 maladie → 25 HP × 100% = 25 HP
│ Tour 2 : 2 maladies → 57.75 HP × 110% = ~63.5 HP
│ Tour 3 : 3 maladies → 90.5 HP × 120% = ~108.6 HP
│ Tour 4 : 4 maladies → 123.25 HP × 130% = ~160.2 HP ← PEAK
│ Tour 5 : 3 maladies (1 expire) → ~117.9 HP
│ Tour 6 : 2 maladies (1 expire) → ~72.1 HP
└─────────────────────────────────────┘
```

**IMPLICATION STRATÉGIQUE:**
- Pathogène est un **kamikaze tactique** — investit dans le futur (DoT continue après mort)
- **Snowball momentum** rewards consistency (attaquer régulièrement = peak 30%)
- **Contre-play précis** : stun/altéré → maladies expirent → charges diminuent
- **Punishes burst enemies** : DoT ne dégage pas instantanément
- **Rewards vs tanky** : snowball dévastateur (peak ≈ 2.5-3.25× base attaque, paramétrique selon stats)

**Synergy Examples:**
- Protective = protect while building disease (tanky + delayed DoT)
- Agressive = rapid disease stacking (aggravate snowball quickly)
- Précise = critical diseases (higher pool = more snowball)

**⚔️ Type Interactions:**
- ✅ **Counters:** Scribeurs (toxic fog impairs cognitive function)
- ❌ **Weak Against:** Résilient (enhanced immunity resists toxins)

---

#### 🔬 7. Synchroniseur (Quantum)
**Evolutionary Origin:** Bio-quantum manipulation, ethereal entities
**Biome Affinities:** Anomalies temporelles, zones "entre-deux"
**Signature Traits:** Energy control, teleportation, quantum phenomena
**Characteristic:** **Swap** — Move allies/enemies, reposition, time warps, battlefield manipulation
**Synergy Examples:**
- Protective = reposition to protect (ally to safety)
- Rapide = swap for escape (self-reposition)
- Précise = reposition for line-of-sight (perfect attack angle)
**⚔️ Type Interactions:**
- ✅ **Counters:** Résilient (reality-warp disrupts persistence and extended effects)
- ❌ **Weak Against:** Chimères (wild variance breaks quantum coherence)

---

#### 🔬 8. Ombre (Stealth/Ambush)
**Evolutionary Origin:** Shadow adaptation, optical mastery, surprise attack evolution
**Biome Affinities:** Zones sombres, couverts forestiers, cavernes
**Signature Traits:** Stealth manipulation, optical illusions, shadow strikes
**Characteristic:** **Cible Arrière** — Attaque la cible arrière
**Synergy Examples:**
- Agressive = élimine les adversaires fragiles en premier
- Rapide = frappe les arrières avant qu'ils puissent riposter
- Précise = crit garanti sur la cible prioritaire
**⚔️ Type Interactions:**
- ✅ **Counters:** [À définir]
- ❌ **Weak Against:** [À définir]

---

### Type Interaction Matrix

```
           Rés  Scr  Sym  Rad  Chim  Path  Sync
Résilient      -    -    -     -     ✅    ❌
Scribeur    ❌   -    ✅    -     -     ❌    -
Symbiote    -   ❌    -    ✅     -     -    -
Radiant     -    -    ❌    -    ✅     -    -
Chimère     -    -     -   ❌     -     -    ✅
Pathogène   ✅   ✅     -    -     -     -    -
Sync       ✅    -     -    -     ❌    -    -

✅ = Advantage (deal more damage, take less)
❌ = Disadvantage (deal less damage, take more)
- = Neutral interaction
```

---

### Environmental Zones (Matched to AnyMaps Fantasy Overlay)

**Zone A: Ruines Urbaines**
- **Dominant Types:** Résilient, Symbiote
- **Mini-Boss:** Tank Chimère (multi-defense)
- **Resource Drops:** Wreckage, circuitry, cybernetics

**Zone B: Laboratoires Abandonnés**
- **Dominant Types:** Scribeur, Chimère
- **Mini-Boss:** Nerve Sovereign (precision DPS)
- **Resource Drops:** Vials, experimental devices, data chips

**Zone C: Zones Radiatives**
- **Dominant Types:** Radiant, Pathogène
- **Mini-Boss:** Alpha Radiant (burst DPS)
- **Resource Drops:** Uranium fragments, isotopes, energy cores

**Zone D: Zones Contaminées Chimiques**
- **Dominant Types:** Pathogène, Résilient
- **Mini-Boss:** Toxine Sovereign (DoT master)
- **Resource Drops:** Toxin samples, antidotes, medical plants

**Zone E: Anomalies Temporelles**
- **Dominant Types:** Synchroniseur, Ultra-Rare spawns
- **Super-Boss:** Time-Phased Creature (reality manipulation)
- **Resource Drops:** Temporal fragments, reality dust, mythic essences

---

### Alpha Creature System (2026-03-30)

**Important Distinction:** Alpha is NOT a new type. It's a rare variant above S+.

**What is an Alpha Creature?**
- An **S+ breakthrough** ultra-rare variant
- **Contains one of the 8 types** (not a 9th type)
- **Hyper-boosted stats** (~30% stronger vs normal S+)
- **Divine Aura passive:** 30 seconds god mode per battle
- **Spawn Rate:** 0.001% (5× rarer than S+, ultra-rare collector dream)

**Divine Aura Mechanics:**
- **Duration:** 30 seconds per battle
- **Activation:** Player chooses when to trigger
- **Effects:** +100% damage, invulnerable
- **After Effect:** Creature returns to normal S+ stats, battle continues
- **Cooldown:** One use per battle (no re-trigger)

**Example Alpha Creature:**
```
Name: "Alpha Fourmi Radiante"
Type: Radiant (not "Legend")
Rank: Alpha (above S+)
Stats: ~25-30% stronger vs normal S+
Passive: Divine Aura (30s god mode)
Spawn Rate: 0.001% (extremely rare)
```

**Updated Rarity Scale:**
```
E:   8.175% (common)
D:   8.175% (common)
C:   4.000% (uncommon)
B:   1.000% (rare)
A:   0.150% (epic)
S:   0.020% (legendary)
S+:  0.005% (mythic)
🐺 ALPHA: 0.001% (ultra-rare)
```

**Design Rationale:**
- **Sandbox preservation:** Full Alpha teams theoretically possible but practically impossible due to spawn rarity
- **Strategic choice:** When to use Divine Aura (panic button vs finisher)?
- **Endgame chase:** Alphas are the final collector goal
- **No cheat mode:** Ultra-rarity prevents power creep

---

### 3-Layer Combination System

**Each creature has three independent layers:**

| Layer | Purpose | Example |
|-------|---------|---------|
| **Genetic Type** | Lore, type interactions, biome affinities | Radiant (counters Chimère) |
| **Archetype** | Skill trees, combat roles | Protective (Forteresse skills) |
| **Traits** | RNG variance, individuality | Tank (+25% HP), Sniper (+crit) |

**Example Build:**
```
Genetic Type: Résistant
Archetype: Protective (Forteresse)
Traits: Tank (+25% HP), Frappe Lourde (+15% damage), Second Souffle

Result: Tanky survivor with decent damage — solid solo, team needs pure DPS for ranked
Tier: 2.5 (meaningful tradeoff, not crippled)
```

**Sandup Value:** "Sub-optimal" builds are playable. Players can express creativity without ruining account viability.

---

## Technical Stack
- **Framework:** Next.js 16.2.1 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Build:** next build → output export → gh-pages
- **CI/CD:** GitHub Actions (Deploy to GitHub Pages workflow)

## Workspace Structure
- `/home/lowkey/.openclaw/workspace-nephila/` - Principal workspace
- `/home/lowkey/.openclaw/workspace-nephila/ecobio-nextjs-ui/` - Git repo + build directory (single workflow)
  - `src/` - Source code
  - `node_modules/` - Dependencies (gitignored)
  - `.next/` - Next.js build cache (gitignored)
  - `out/` - Static export for GitHub Pages (gitignored)

## Current State (2026-03-27 12:15)
**Last successful commit:** To be determined
**Building:** ✅ OK
**Deployed:** ✅ On GitHub Pages (auto-deploying via GitHub Actions)

## Features Implemented
- ✅ **Battle system** with skills, cooldowns, buffs
- ✅ **Creatures:** Ant (Tank) vs Fly (Speedster) with base stats
- ✅ **RNG variance** per rank with separate stat rolls
- ✅ **Level scaling** 1-50 with balanced progression
- ✅ **Collection page (/hunting)** with localStorage persistence
- ✅ **Pointer-events fix** - collection cards clickable
- ✅ **Triple progression system** (Rank + Level + Stars) - Designed 2026-03-28

## Triple Progression System (2026-03-28)

### Three Independent Progression Layers

| Layer | Mechanic | Source | Effect |
|-------|----------|--------|--------|
| **Rank (E-S+)** | RNG at capture | Spawn/capture | Base stats genetic potential |
| **Level (1-50)** | Feeding system | Give food to creature | Raw power scaling (stats boost) |
| **Stars (1-5)** | Combat experience | Battle XP per creature | Unlocks skills/ultimates |

### Rank System (E-S+)
- ** Genetic potential determined at capture only**
- Ranks cannot be unlocked via player progression
- Variance ranges per rank (see Variance Ranges section)
- Each creature has independent rank RNG

### Level System (1-50)
- **Gained via FEEDING (not combat)**
- Individual per creature
- Boosts stats via level scaling formulas
- No cost scaling per level (unlike breeding costs)

### Star System (1-5)
- **Gained via COMBAT XP**
- Individual per creature (NOT shared/tied to creature type)
- Each creature can independently earn ★★★★★
- No limit on how many creatures can reach max stars
- Unlocks new skills/skill tiers at each star

### Star Unlocks Structure
```
★☆☆☆☆: Base skills only
★★☆☆☆: Tier 2 skill (+20% dmg)
★★★☆☆: Tier 3 skill (+40% dmg)
★★★★☆: New passive skill
★★★★★: ULTIMATE skill (unique ability)
```

### Unique Individuals
Each creature is completely independent:
- Creature A: Fourmi E lvl 50 ★★★★★ (500 battles invested)
- Creature B: Fourmi E lvl 50 ☆☆☆☆☆ (0 battles, same spawn)
- Both can exist simultaneously with identical base stats but different experiences

---

## Type System Architecture (2026-03-31)

### Core Design Principles

**Types Keywords**: Types provide lore, gameplay depth, and strategic choices — BUT **no level scaling**.

**Two-Layer Strategy**:
- **Type** = Skills, counters, affinities, combat effects
- **Personality** = Stats level scaling (HP, ATK, DEF, SPD, CRIT)

**No type-level-scaling** keeps deck building simple and predictable.

---

## Rank Colors (2026-03-31)

### Rank Color System

**Purpose**: Each rank E → S+ has a unique visual color for creature card backgrounds.

**Hex Colors** (from craft.ts RANK_COLORS):

| Rank | Hex Color | Tailwind Badge | Description |
|------|-----------|----------------|-------------|
| **E** | #4B5563 | bg-gray-600 text-white | Common (-gray) |
| **D** | #16A34A | bg-green-600 text-white | Common (green) |
| **C** | #2563EB | bg-blue-600 text-white | Uncommon (blue) |
| **B** | #CA8A04 | bg-yellow-600 text-white | Rare (yellow) |
| **A** | #EA580C | bg-orange-600 text-white | Epic (orange) |
| **S** | #DC2626 | bg-red-600 text-white | Legendary (red) |
| **S+** | #9333EA | bg-purple-600 text-white | Mythic (purple) |

### Visual Impact

**Card backgrounds** with rank-specific colors create instant visual recognition.

**Progression**: Gray (E) → Green → Blue → Yellow → Orange → Red → Purple (S+)

**Effect**: When a player views a collection, S+ cards immediately stand out in purple, creating "OH !" moments.

---

## Deck Building Philosophy (2026-03-31)

### Sandbox Model - Unlimited Combinations

**Core rule**: **All types × All personalities are possible.**

**Total variations**: 8 genetic types × 7 personalities = 56 possible combinations.

**Design principle**:
- Creative freedom > lore coherence
- Players can build whatever they want
- Meta evolves with player experimentation (like TCGs)

**Example weird combos**:
- Ombre Protective (shadow creature that protects allies)
- Synchroniseur Agressive (quantum entity that attacks first)
- Symbiote Mysterieuse (hybrid creature with RNG chaos)

**Why sandbox works**:
- Players discover optimal combos themselves
- Community meta evolves over time
- No artificial restrictions gating creativity
- Matches ÉcoBio's collection/pet-raising vibe

---



## Breeding System (2026-03-28)

### Breeding Paliers (Progressive Access)

| Level | Breeding Type | Results |
|-------|---------------|---------|
| **25** | Basique | Litbebe lvl 1, average stats, low inheritance |
| **35** | Amélioré | Better inheritance, trait chances, stronger baby |
| **50** | Avancé | Optimal inheritance, star-boosted chances, special skills |

### Inheritance Rules

| Element | Inherited |
|---------|-----------|
| **Stats baby** | Between parents + RNG (range) |
| **Rank impact** | Parents with higher rank → baby more likely higher rank |
| **Skills** | YES - see Skill Inheritance below |
| **Stars** | NO - baby always ☆☆☆☆☆ at birth |
| **Baby rarity** | Parents rank blend. Two S+ = high S+ chance, but can still drop to A/S. No artificial rarity boost |

### Skill Inheritance System
- Stars/skills are semi-random per specimen
- Parent with unlocked skill = **increased chance to inherit that skill**
- Parent without unlocked skill = **pure RNG inheritance** (base chance)
- This rewards investing in specific creatures for breeding

### Cost Structure
- **RANK determines cost** (level does NOT increase price)
- Higher rank specimen = demands more rare resources for breeding
- Economy balanced by rank rarity

### Breeding Craft System
- **Separate crafting page** (not integrated into breeding UI)
- Resources: Insect + Plant → Breeding extract/item
- Crafting will expand to other items beyond breeding
- Resource rarity follows same mechanic as creature spawn (RNG spawn)

### Resource Sources
- Spawn/capture in wild (RNG-based availability)
- Combat rewards (possible drop)
- Rare resources = better breeding outcomes

### Example Craft Recipe
- Level 1 Breeding (for common creatures): 2 common insects + 1 plant
- Higher rank breeding requires proportionally rarer ingredients

---

## Breeding Exclusive Traits (2026-03-28)

### Meta-Trait System Overview
Traits breeding-exclusifs are special combinations that can only be obtained through breeding. They provide bonus power incentive while maintaining game balance.

### Inheritance Mechanics

#### Generation 1: Direct Trait Combos
```
Rule: Two parents with specific basic traits → 20% chance baby inherits meta-trait
Example: Parent A (Sniper) + Parent B (Frappe Lourde) → Baby "Maître du Tir"
```

#### Generation 2+: Meta-Trait Transmission
```
Rule: If parent already has breeding-exclusive meta-trait → 30% chance to transmit
Baby can inherit: meta-trait + additional normal traits if slots allow
```

#### Legendary Meta-Traits (Mega-Combos)
```
Rule: Two parents with different meta-traits → 10% chance mega-combo baby
Example: Parent A (Maître du Tir) + Parent B (Forteresse) → Baby "Le Déterminé"
```

### Breeding Exclusive Trait Definitions

#### 🔥 Attack + Attack Combos

**Maître du Tir** (Sniper + Frappe Lourde)
```
Effects:
  +25% crit rate (caps at 40% with other traits)
  +25% crit multiplier
Obtained from: Parent with Sniper + Parent with Frappe Lourde
```

**Chasseur Crépusculaire** (Assassin + Berserk Mode)
```
Effects:
  +35% damage dealt when HP < 30%
Obtained from: Parent with Assassin + Parent with Berserk Mode
```

#### 🛡️ Defense + Defense Combos

**Carapace d'Acier** (Peau Épaisse + Volonté de Fer)
```
Effects:
  -20% damage received (does not stack with other defense traits)
Obtained from: Parent with Peau Épaisse + Parent with Volonté de Fer
```

**Forteresse** (Tank + Épines)
```
Effects:
  +25% HP
  Reflects 25% of received damage to attacker
Obtained from: Parent with Tank + Parent with Épines
```

#### ⚔️ Hybrid Combos

**Tank Agressif** (Canon de Verre + Tank)
```
Effects:
  +20% damage dealt
  +15% HP
  +10% damage received (reduced malus from Canon de Verre)
Obtained from: Parent with Canon de Verre + Parent with Tank
```

**Fureur Survivante** (Téméraire + Adrénaline)
```
Effects:
  +25% attack
  +20% defense
  +10% speed
  +5% crit rate when HP < 25%
Obtained from: Parent with Téméraire + Parent with Adrénaline
```

#### 🧪 Utility Special Combos

**Résistance Ultime** (Second Souffle + Épines)
```
Effects:
  -30% damage received when HP < 30%
  Reflects 20% of received damage to attacker
Obtained from: Parent with Second Souffle + Parent with Épines
```

**Rafale Mortelle** (Frappe Éclair + Adrénaline)
```
Effects:
  +25% speed
  +15% crit rate (better than Adrénaline's +10%)
  +10% damage dealt when HP < 25%
Obtained from: Parent with Frappe Éclair + Parent with Adrénaline
```

#### 🌟 Legendary Meta-Trait

**Le Déterminé** (Mega-Combo)
```
Effects:
  +50% damage dealt when HP < 25%
  Reflects 30% of received damage to attacker
  -20% speed (malus for balance)
Obtained from: TWO parents with different breeding-exclusive meta-traits
  Example: Parent A (Maître du Tir) + Parent B (Forteresse)
  Base chance: 10% (extremely rare)
```

### Balance Rules

1. **One meta-trait per creature max** - Cannot stack multiple breeding-exclusive traits
2. **No component stacking** - Meta-traits do not stack with their constituent basic traits
3. **Malus for balance** - Legendary and some hybrid traits include stat penalties
4. **Rarity** - Meta-traits never spawn naturally; only via level 50 advanced breeding
5. **Breeding requirement** - Only obtainable from level 50+ advanced breeding

### Design Philosophy

**Why breeding-exclusive traits:**
- Creates long-term incentive for breeding system
- Allows creature builds that surpass normal limitations
- Rewards players who invest in specific trait combinations
- Adds depth to breeding beyond simple stat inheritance

---

## Progression Design Philosophy (2026-03-28)

### Why Triple Layer System?
- **Cater to different playstyles**: Collectors (grind), battlers (combat), nurturers (feeding)
- **Long-term engagement**: Multiple progression paths keep players invested
- **Meaningful choices**: Where to invest resources? Which creature to develop?

### Economy Balance
- Breeding costs scale by RANK (not level)
- Feeding for levels (1-50) is free/cheap
- Combat XP for stars = battling (can earn resources too)
- Breeding = resource sink that rewards high-rank investment

### Player Journey
1. Capture creatures (RNG rank)
2. Feed to level 1-25 (unlock level 25 breeding)
3. Battle to gain stars + resources
4. Continue feeding + battling to level 35+ (better breeding)
5. Max creatures at level 50 ★★★★★ for optimal breeding

## Current Issues
- **Rank multiplier still applied** (removed in attempt but reverted due to bugs)
- **User requirement:** Final = (Base × Variance) × LevelScale, NO rank multiplier
- Rank multiplier = {E:1.0, D:1.2, C:1.4, B:1.6, A:1.8, S:2.0, S+:2.2} - should NOT multiply stats

## Attempted Fixes that Failed
1. **Manual gh-pages deploys** - ignored by GitHub Actions
2. **Turbopack cache clearing** - didn't work, Next.js still cached
3. **Large hunting/page.tsx edits** - created syntax errors (duplicate variables) that broke builds
4. **Multiple sync attempts** - complex structure (workspace + ecobio-dev) caused confusion
5. **Dual-directory setup** - overengineered ecobio-dev copy → simplified 2026-03-27

## Critical Lessons Learned
1. **NEVER edit duplicate code blocks** - hunting/page.tsx had duplicate spawnCreature blocks from edit
2. **Workspace structure was overengineered** - ecobio-dev copy was unnecessary, removed 2026-03-27
3. **GitHub Actions uses npm ci** - REQUIRES package-lock.json (caused build failures)
4. **Manual deploys useless** - gh-pages from npx doesn't override GitHub Actions
5. **Edit carefully** - check for duplicate code blocks before committing
6. **Rollback fast** - git reset to stable commit faster than debugging complex edits
7. **Build script must fail on errors** - `set -e` ensures TypeScript errors block deployments

## Verified Working Features
- ✅ Hunting page loads and renders
- ✅ Spawn creatures with RNG variance per rank
- ✅ Collection cards clickable (pointer-events fix)
- ✅ View creature detail, feed, release
- ✅ Build passes pre-push hook
- ✅ GitHub Actions deploys successfully
- ✅ Pre-push hook prevents failing builds (2026-03-27 fix with `set -e`)

## Code Architecture
- **battle.ts:** Contains getVarianceRange(), generateIndividualStats(), calculateFinalStats()
- **database.ts:** CREATURES object with base stats, skills, RANK_MULTIPLIERS
- **hunting/page.tsx:** React page with useState hooks for collection, filters, feed/release

## Variance Ranges (Current)
E: 0.75-1.10 (-25% à +10%)
D: 0.80-1.10 (-20% à +10%)
C: 0.85-1.15 (-15% à +15%)
B: 0.90-1.20 (-10% à +20%)
A: 1.00-1.25 (+0% à +25%, pure positif)
S: 1.15-1.30 (+15% à +30%, pure positif)
S+: 1.20-1.40 (+20% à +40%, pure positif)

## Game Design Decisions
- **Early ranks (E/D/B)** have higher variance potential for negatives
- **Progression:** Variance decreases → more reliable at high ranks
- **A/S/S+**: Pure positive variance - never below baseline 1.00
- **Level scaling:** 1.0 at level 1 to ~15.7 at level 50 (hpScale formula)

## Pre-Push Hook (2026-03-27 Simplified)
**Location:** `ecobio-nextjs-ui/.git/hooks/pre-push`

**What it does:**
1. Runs `npm run build` in the repo directory
2. Exits with error code 1 if build fails
3. Creates `.nojekyll` file for GitHub Pages

**Key features:**
- Platform-agnostic paths (`git rev-parse --show-toplevel`)
- `set -e` in package.json build script ensures TypeScript errors fail the build
- No file copying or sync needed
- Compiles directly in repo root

## Workspace Simplification History (2026-03-27)
**Before:**
- `ecobio-nextjs-ui/` = git repo
- `ecobio-dev/` = build directory (copy)
- Pre-push hook copied files → ecobio-dev → build

**After:**
- `ecobio-nextjs-ui/` = git repo + build directory
- `ecobio-dev/` removed
- `.gitignore` handles node_modules/, .next/, out/
- Pre-push hook builds directly in repo

**Reason for change:**
- Overengineered workaround for "cache issues"
- `.gitignore` already handles build artifacts
- Simpler workflow, less confusion
- Pre-push hook now portable across machines

---

## Medical Plants & Health System (2026-03-29)

### Medical Plants Implementation
**Phase 3.1:** Spawn system integration
- Added 7 medical plants to resource spawn pool (E-S+)
- Spawn rate: 15% chance medical plant vs normal plants
- Medical plants tagged with `isMedical: true` flag
- Ranks follow same Rarity distribution as normal plants

**Medical Plants List:**
| Rank | Name | Rarity | Spawn Chance |
|------|------|--------|--------------|
| E | Aloe Vera | Common | 8.175% |
| D | Menthe | Common | 8.175% |
| C | Camomille | Uncommon | 0.6% |
| B | Ginseng | Rare | 0.15% |
| A | Ginseng Royale | Epic | 0.05% |
| S | Néphenta | Epic | 0.02% |
| S+ | Néphenta Ichor | Legendary | 0.005% |

**Items displayed in hunting/collection pages:**
- Medical plants show "🌿 Médical" badge
- Green highlight to distinguish from normal plants

### Craft System Updates
**Exclusion logic (Phase 3.2):**
- Medical plants excluded from essence recipe filtering
- New `MEDICAL_PLANT_NAMES` array for filter logic
- Essence craft: 2 NORMAL plants → 1 essence
- Remedy craft: 2 MEDICAL plants → 1 remedy

**Remedy System (Phase 3.3/4):**
- Craft 2 same-rank medical plants → 1 remedy
- Remedy applies % of maxHP as instant heal
- Valid recipes: 2 Aloe Vera → Remède E (10% heal), etc.

**Remedy Heal Percentages:**
| Rank | HP Restore | Description |
|------|-----------|-------------|
| E | 10% | Light healing for minor wounds |
| D | 15% | Moderate healing |
| C | 20% | Standard healing |
| B | 25% | Strong healing |
| A | 30% | Powerful healing |
| S | 40% | Major healing |
| S+ | 50% | Maximum healing |

### Health System (2026-03-29)

#### Step 1: Data Structure
**HuntedCreature interface added health fields:**
- `currentHP: number` - Current HP (0 to maxHP)
- `lastHealTime: number` - Last auto-regeneration timestamp
- `maxHP: number` - Maximum HP (with level scaling)

**Migration:**
- Existing creatures auto-populated with health fields on load
- `currentHP` defaults to `maxHP` (full health)
- `lastHealTime` defaults to now
- `maxHP` calculated from `finalStats.hp` × level scaling

#### Step 2: HP Persistence (Battle & Exploration)
**Battle persistence (battle/page.tsx):**
- After battle victory, HP from `BattleCreature` copied to collection
- `currentHP` set to battle creature's remaining HP
- `maxHP` recalculated: `baseHP` × `levelScale` (where `levelScale = 1 + (level - 1) * 0.2`)
- Survivors keep remaining HP, defeated creatures set to `currentHP = 0`

**Exploration persistence (exploration/page.tsx + lib/exploration.ts):**
- Survival damage applied:
  - 15min: 10% damage
  - 30min: 15% damage
  - 1h: 20% damage
  - 2h: 25% damage
  - 4h: 30% damage
  - 8h: 40% damage
- Damage calculated as: `damage = floor(maxHP × damagePercent)`
- Survivors' HP persisted into `survivorsHP` map
- Dead creatures removed from collection

**Death chance linked to HP (exploration):**
- Death penalty multiplier based on current HP percent
- Formula: `deathChance = base × (1 - levelReduction - explorationBonus) × hpPenalty`
- Where `hpPenalty = 1 + ((100 - currentHPPercent) / 100)`
- Examples:
  - 100% HP → no penalty
  - 90% HP → +10% death chance
  - 50% HP → +50% death chance
  - 10% HP → +90% death chance

#### Step 3: Auto-Regeneration
**File:** `src/lib/health-regen.ts`
- Regen rate: 10% of maxHP per hour (exact 10 hours to full heal)
- Calculated based on time elapsed since `lastHealTime`
- Formula: `hpRegained = min(maxHP - currentHP, maxHP × 0.10 × hoursElapsed)`
- Caps at 100% (never exceeds maxHP)
- Minimum 1 HP (creatures always stay alive)
- Automatically applied when loading collection
- Persisted after calculation
- All HP floored to integers (no decimals)

**Integration:**
- `applyHealthRegenerationToCollection()` function for batch processing
- Auto-triggered on page load in hunting
- Saves regenerated HP if changed

#### Step 4: Remedy Healing (Instant Heal)
**UI Integration:**
- 💊 "Soigner" button added to creature detail modal (pink button)
- Opens remedy selector modal with all available remedies
- Auto-loads inventory and filters `type === "remedy"`

**Remedy Selector Features:**
- Displays all remedies with:
  - Rank and heal percentage
  - Quantity available
  - Preview result HP (e.g., "After: 900/1000")
  - HP bar with color coding
- Wastage protection:
  - Remedies that are too powerful grayed out
  - Message: "gâcherais X HP" for overpowered remedies
  - User sees HP needed before selecting
- Empty state handling:
  - Redirects to craft page if no remedies available
  - Clear instructions: "Craft des remèdes dans l'atelier de craft"

**Healing Logic:**
- `handleApplyRemedy(creature, remedy)` applies selected remedy
- `removeFromInventory(remedy.id, 1)` removes 1 remedy
- Displays alert: `{creature.name} soignée! +{healPercent}% HP: +{healAmount} HP ({currentHP} → {newHP})`
- Updates creature HP and `lastHealTime`
- Dispatches `inventory-updated` event

**Color Coding:**
- HP > 50%: 🟢 Green (healthy)
- HP 25-50%: 🟡 Yellow (wounded)
- HP < 25%: 🔴 Red (critical)

### Bugs Fixed
**1. Remedy heal percentages defaulting to 50%:**
- **Problem:** `createItemInInventory()` didn't copy `healPercent` from `REMEDY_DEFINITIONS`
- **Fix:** Added `healPercent` field copy for remedy items
- **Migration:** Auto-heals existing remedies in `loadInventory()`
- **Result:** Remedy D now shows 15% instead of 50%

**2. HP decimal display (202.xxxx format):**
- **Problem:** Regeneration calculation produced floating point values
- **Fix:** Added `Math.floor()` to all HP calculations
  - `health-regen.ts`: `currentHP = Math.floor(Math.min(maxHP, Math.max(1, currentHP)))`
  - `hunting/page.tsx`: `maxHP = Math.floor()` for display
- **Result:** HP now displays as clean integers: `203` instead of `202.84375`

### Health System Workflow Example
```
1. Battle: Creature 1000 HP → defeated → HP = 0
2. Auto-regen: 2 hours later → HP = 200 (10% × 2 hrs)
3. Exploration: 8h mission, HP 800 → damage 40% → HP = 480
4. Selector shows: Needs remedy E (10%) or D (15%)
5. Select Remède E: +80 HP (10% of 800) → HP = 560
6. Wait 4h: Auto-regen +40% → HP = 800
7. Full heal cycle repeated!
```

### Design Philosophy
**Why multiple healing methods?**
- **Auto-regen**: Passive recovery, slow but free
- **Remedies**: Instant healing, requires crafting resources
- **Strategic choice**: Wait for regen vs use resources now
- **Economy balance**: Medical plants rare → remedies valuable

**HP persistence importance:**
- Forces strategic planning (send healthy creatures on long missions)
- Creates risk/reward (injured creatures = high death risk)
- Remedy crafting motivated by HP system
- Adds depth beyond simple HP reset after battle

### Health System Status
| Component | Status |
|-----------|--------|
| Data structure (currentHP, maxHP, lastHealTime) | ✅ Complete |
| HP persistence (battle + exploration) | ✅ Complete |
| Auto-regeneration (10% per hour) | ✅ Complete |
| Remedy system (craft + selector) | ✅ Complete |
| Death chance HP linking | ✅ Complete |
| HP display (cards + modal + selectors) | ✅ Complete |
| Floating point fixes | ✅ Complete |

**Health System: 100% Functional** ✅

---

## AnyMaps Plugin Architecture (2026-04-03)

### Integration Strategy: Dynamic WASM Plugin

**ÉcoBio est chargé dynamiquement dans AnyMaps comme plugin WASM wasmtime.**

### Stack Technique

**AnyMaps:**
- **Application Tauri** (React frontend / Rust backend)
- **Logos Messaging** (anciennement Waku) - Communication inter-apps
- **Logos Storage** (anciennement Codex) - Stockage distribué (IPFS-like)

**Plugin ÉcoBio:**
- **WASM runtime:** wasmtime (ou wasmer)
- **Target compilation:** wasm32-wasip1
- **Interface:** WASI (WebAssembly System Interface) pour filesystem/network

### Communication Bidirectionnelle

**1. AnyMaps expose API → Plugin ÉcoBio peut appeler:**
```rust
register_poi(lat: f64, lng: f64, type: string) → spawn POI sur carte
get_user_location() → (lat, lng)
logos_storage_read(hash: string) → bytes depuis storage distribué
logos_messaging_send(topic: string, message: string) → envoyer message inter-app
show_ui_panel(component: ReactComponent) → injecter UI ÉcoBio
```

**2. AnyMaps émet events → Plugin ÉcoBio écoute:**
```rust
on_location_changed(lat: f64, lng: f64) → spawn créature/POI quand user bouge
on_map_click(lat: f64, lng: f64) → interagir avec créature
on_user_action(action: UserAction) → built quotidian transformed gameplay
```

### Distribution via Logos Storage

**Plugin Manifest (dans Logos Storage):**
```json
{
  "id": "ecobio-game",
  "name": "ÉcoBio Fantasy Overlay",
  "version": "1.0.0",
  "entry_points": {
    "rust": "ecobio_rust_module.wasm",
    "js": "ecobio_ui_bundle.js"
  },
  "capabilities": [
    "poi_injection",
    "user_interaction",
    "logos_messaging_read",
    "logos_storage_read"
  ],
  "logos_content_hash": "QmXyZ..."
}
```

**Workflow:**
1. AnyMaps scan Logos Storage pour manifests
2. Trouve "ecobio-game" → résout WASM bundle via hash
3. Instance via wasmtime → plugin register events handlers
4. Communication bidirectionnelle active

### Cas d'Utilisation Concret

**Utilisateur arrive près d'une pharmacie:**
```
1. AnyMaps détecte location near pharmacy POI
2. Emit on_location_changed(lat, lng)
3. Plugin ÉcoBio: check si pharmacie (via POI lookup)
4. Spawn healing zone jeu
5. Call register_poi() pour afficher icône soin
6. UI montre panel "Soigner ici" avec créatures blessées
```

### Avantages

✅ **Décentralisé** - Pas serveur central, distribution via Logos Storage  
✅ **Mise à jour auto** - Nouvelle version = nouveau hash + reload  
✅ **Sandbox sécurité** - Plugins limités par capabilities  
✅ **Performance** - WASM rapide pour calculs (spawning, battle logic)  
✅ **Cross-platform** - Même WASM bundle sur tous les OS  

### Architecture Clarification

- **Pas d'AR** (pas de camera overlay, style Pokémon GO)
- **Application standalone** avec AnyMaps comme moteur de carte intégré
- ÉcoBio = couche fantasy superposée à la carte réelle (créatures, quêtes, POI)

### État Actuel

**Architecture définie, prêt à implémenter.**  
**Voir détails complets:** `memory/2026-04-03.md`
