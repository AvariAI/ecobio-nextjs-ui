"use client";

import Link from "next/link";

type FormulaSection = {
  title: string;
  description: string;
  formula: string;
  example: string;
  result: string;
};

function FormulaCard({ section }: { section: FormulaSection }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border-l-4 border-blue-500">
      <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-3">
        {section.title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300 mb-4">{section.description}</p>
      <div className="bg-blue-50 dark:bg-gray-700 rounded-lg p-4 mb-3">
        <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2">
          FORMULA
        </p>
        <code className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
          {section.formula}
        </code>
      </div>
      <div className="bg-green-50 dark:bg-gray-700 rounded-lg p-4 mb-2">
        <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-2">
          EXEMPLE
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
          {section.example}
        </p>
      </div>
      <div className="bg-purple-50 dark:bg-gray-700 rounded-lg p-4">
        <p className="text-xs font-semibold text-purple-800 dark:text-purple-300 mb-2">
          RESULTAT
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200">
          {section.result}
        </p>
      </div>
    </div>
  );
}

export default function FormulasPage() {
  const spawnFormulas: FormulaSection[] = [
    {
      title: "🎲 Rank Rarities",
      description: "Probabilites de spawn pour chaque rang. On utilise un systeme de roll.",
      formula: "roll_8arity():\n  LOW (25%) = Range: 0.00-0.25 = Rank E (très courant)\n  MID (50%) = Range: 0.25-0.75 = Random: 37.5% D, 37.5% C, 25% B\n  HIGH (25%) = Range: 0.75-1.00 = Random: 40% A, 40% S, 20% S+",
      example: "rank = roll_8arity()\n  Math.random() = 0.85 = > 0.75 (HIGH) = Random(40% A, 40% S, 20% S+) = S",
      result: "Creature rank S avec spawn rate moyen"
    },
    {
      title: "⚔️ Variance par Rang",
      description: "Chaque rang a un range de variance RNG (%) pour chaque stat. La variation est multiplicative sur la base.",
      formula: "Rang E : 0.75-1.10 (-25% a +10%)\n  Rang D : 0.80-1.10 (-20% a +10%)\n  Rang C : 0.85-1.15 (-15% a +15%)\n  Rang B : 0.90-1.20 (-10% a +20%)\n  Rang A : 1.00-1.25 (+0% a +25%, pur positif)\n  Rang S : 1.15-1.30 (+15% a +30%, pur positif)\n  Rang S+: 1.20-1.40 (+20% a +40%, pur positif)\n\n  variance = minVar + Math.random() * (maxVar - minVar)\n  finalStat = Math.max(1, Math.floor(baseStat * variance))",
      example: "Fourmi E, base HP 100\n  variance = 0.75 + 0.85 * (1.10 - 0.75) = 1.0475\n  HP = Math.floor(100 * 1.0475) = 104 HP",
      result: "Cette Fourmi a +4.75% de HP au spawn (vs base 100)"
    }
  ];

  const levelFormulas: FormulaSection[] = [
    {
      title: "📊 Level Scaling (HP)",
      description: "Formule de multiplicateur pour les HP par niveau (1-50). Plus le niveau augmente, plus vite croit.",
      formula: "function getLevelScale(level, stat):\n    if (stat === \"hp\"):\n      if level <= 10: 1.0 + (level - 1) * 0.1\n      else if level <= 25: 1.9 + (level - 10) * 0.05\n      else: 2.65 * Math.pow(1.01, level - 25)\n\n  scaledHP = baseHP * getLevelScale(level, \"hp\")",
      example: "Fourmi E, base HP 100 au level 1 = Level 10\n  getLevelScale(10, \"hp\") = 1.0 + 9 * 0.1 = 1.9\n  HP scaled = 100 * 1.9 = 190 HP",
      result: "Au level 10, cette Fourmi a 190 HP (1.9x base)"
    },
    {
      title: "⚔️ Level Scaling (ATK/DEF/SPD/CRIT)",
      description: "Formule de multiplicateur pour les stats offensives et defensives. Croissance lineaire moderee jusqu a 50 (transformative a 25).",
      formula: "function getLevelScale(level, stat):\n    if (stat === \"other\" && level <= 25):\n      return 1.0 + (level - 1) * 0.15\n    if (stat === \"other\" && level > 25):\n      return 4.6 * Math.pow(1.005, level - 25)\n\n  scaledStat = baseStat * getLevelScale(level, \"other\")",
      example: "Fourmi E, base ATK 50 au level 1 = Level 25\n  getLevelScale(25, \"other\") = 1.0 + 24 * 0.15 = 4.6\n  ATK scaled = 50 * 4.6 = 230 ATK",
      result: "Au level 25, la Fourmi frappe avec 230 ATK (4.6x base)"
    },
    {
      title: "🆙 XP Required for Level Up",
      description: "XP requis par palier. Formule exponentielle : chaque niveau demande plus d XP que le precedent.",
      formula: "calculateXPToNextLevel(level):\n    return Math.floor(100 * level * Math.pow(1.1, level - 1))\n\nEx: Level 1 = 100 × 1 × 1.1⁰ = 100 XP\n    Level 5 = 100 × 5 × 1.1⁴ ≈ 732 XP\n    Level 10 = 100 × 10 × 1.1⁹ ≈ 2358 XP",
      example: "Une creature niveau 5 a besoin de\n  calculateXPToNextLevel(5) = 100 × 5 × 1.1⁴ ≈ 732 XP\n  pour atteindre le niveau 6.",
      result: "Le leveling est exponentiel : plus on avance, plus c'est lent"
    },
    {
      title: "🍖 Feed XP by Rank",
      description: "XP donne quand on nourrit une creature par rang. Les rangs plus rares donnent plus d XP (3.25 × capacit fact).",
      formula: "RANK_XP:\n  E : 50\n  D : 100\n  C : 200\n  B : 400\n  A : 800\n  S : 1600\n  S+: 3200 (3.25 × XP base)\n\ncalculateRankXP(rank, level, baseStats):\n    base = RANK_XP[rank]\n    levelFactor = 1.0\n    (Simplify: pas de level factor pour maintenant)\n    return Math.floor(base)",
      example: "Une Fourmi rank E (50 XP) nourrit l'Abeille level up\n  XP gagne = 50 XP\n  Si l'Abeille avait besoin de 100 XP = Level up!",
      result: "Les rangs S+ (3200 XP) niveau enormement le leveling"
    },
    {
      title: "💪 Feed Stat Bonuses",
      description: "Feeding 7 fois d'un meme type booste une stat specifique. On track feedCount et feedStat dans la creature.",
      formula: "feedCounter, feedStat:\n  feedCount: nombre de fois nourri (max 7 pour bonus actif)\n  feedStat: \"hp\", \"attack\", etc.\n\nQuand feedCount === 7 et feedStat !== null:\n    statBonus = 1.3 (30% de bonus sur cette stat)\n    (Implemente dans le systeme de feed/hunting/page.tsx)",
      example: "7x HP feed = +30% HP pour toujours\n  Creature base HP 500 = feedCount 7, feedStat \"hp\" = 650 HP\n  7x ATK feed = +30% ATK pour toujours",
      result: "7 feedings d'un meme type = bonus permanent 30% sur la stat selectee"
    }
  ];

  const battleFormulas: FormulaSection[] = [
    {
      title: "💥 Degats de Combat",
      description: "Formule de degats basee sur le ratio ATK/(ATK+DEF). Plus ATK est proportionnellement COMPARE a DEF, plus on frappe.",
      formula: "calculateDamage(attacker, defender):\n    atk = attacker.stats.attack\n    def = defender.stats.defense\n    damage = atk * (atk / (atk + def))\n\n    // Apply attack buff (+40%)\n    if attacker.buffs.attackBuff > 0:\n      damage = damage * (1 + attacker.buffs.attackBuff)\n\n    // Apply defense buff (-50%)\n    if defender.buffs.defenseBuff > 0:\n      damage = damage * (1 - defender.buffs.defenseBuff)\n\n    return Math.floor(Math.max(1, damage))",
      example: "Mouche S (ATK 160) vs Fourmi S (DEF 160)\n  damage = 160 × (160 / (160 + 160))\n  = 160 × (160 / 320) = 80 dmg\n\n  Fourmi S prend : 80 dmg / hit\n  Mouche meurt : ATTACK 160 vs DEF 160 = midpoint",
      result: "La formule favorise les creatures avec ATTACK eleve par ratio de DEF"
    },
    {
      title: "🔄 Battle Esquive Initialization",
      description: "L'esquive de base a pour but de determiner SPD pour tourner le battle plus realiste. L'INITIAL est bas, mais le skill peut l'amplifier.",
      formula: "initiateDodge(attacker, defender):\n    attackerSpeed = attacker.stats.speed\n    defenderSpeed = defender.stats.speed\n\n    baseDodge = log10(attackerSpeed / (defenderSpeed + 1)) × 0.5\n    baseDodge = Math.min(baseDodge, 0.25) // Max 25% base\n\n    attacker.dodge = baseDodge\n\nNote: Le skill \"Esquive Aeri monde\" de la Mouche booste de +40%",
      example: "Mouche S (SPD 100) vs Fourmi S (SPD 100)\n  baseDodge = log10(101/101) × 0.5 = 0%\n  Avec skill Esquive Aeri monde (+40%) = dodge = 40%\n\n  Mouche S (SPD 100) vs Fourmi S (SPD 50)\n  baseDodge = log10(101/51) × 0.5 = 15%\n  Avec skill = dodge = 55%",
      result: "Le skill Esquive Aeri monde transforme la bat = ESCAPE potentielle"
    },
    {
      title: "🎯 Esquive Roll during Combat",
      description: "A chaque attaque, un tirage pour savoir si l'esquive reussit. Le defenseur a une chance egale a son % d'esquive.",
      formula: "duringAttack():\n    roll = Math.random() * 100\n\n    if roll < defender.dodge * 100:\n      MISS = true\n      damage = 0\n      log.append(\"XX Esquive evite des degats!\")\n\n    else:\n      HIT = true\n      damage = calculateDamage(attacker, defender)\n      defender.currentHP -= damage",
      example: "Mouche S avec dodge 40%\n  attack() = roll = 38 = < 40 = MISS!\n  attack() = roll = 67 = > 40 = HIT = damage calcule",
      result: "40% esquive = 40% de chance de ne pas prendre des degats"
    },
    {
      title: "⚡ Defense Buff (Carapace Renforcee)",
      description: "Le skill de la Fourmi reduit les degats encaisses. Applique multiplicativement EVEN apres attack bonuses.",
      formula: "useSkill(attacker):\n    skill = attacker.creature.skill\n\n    if (skill.effect === \"defense\"):\n      attacker.buffs.defenseBuff = skill.value  // 0.50 (50%)\n      attacker.buffs.defenseBuffTurns = skill.duration // 2 tours\n\nDans calculateDamage():\n    // Apply defense buff\n    if defender.buffs.defenseBuff > 0:\n      damage = damage * (1 - defender.buffs.defenseBuff)",
      example: "Mouche S frappe = 80 dmg base\n  Fourmi S active Carapace Renforcee (-50% damage)\n  Degats = 80 × (1 - 0.50) = 40 dmg\n\n  Fourmi prend : 40 dmg / hit pendant 2 tours",
      result: "Le buff DEF multiplie les degats encaisses par 2 (50% = ×2)"
    },
    {
      title: "🔄 Attack Buff (Essaim Stimulant)",
      description: "Le skill de l'Abeille augmente les degats infliges. ATTACK × (1 + buff). Sur les Mega ATTACK spawns avec +40% buff RNG 50% ATK/DEF.",
      formula: "useSkill(attacker):\n    skill = attacker.creature.skill\n\n    if (skill.effect === \"attack\"):\n      attacker.buffs.attackBuff = skill.value  // 0.40 (40%)\n      attacker.buffs.attackBuffTurns = skill.duration // 2 tours\n\nDans calculateDamage():\n    // Apply attack buff\n    if attacker.buffs.attackBuff > 0:\n      damage = damage * (1 + attacker.buffs.attackBuff)",
      example: "Mouche S frappe = 80 dmg base\n  Mouche active Essaim Stimulant (+40% ATK)\n  Degats = 80 × (1 + 0.40) = 112 dmg\n\n  Def prend : 112 dmg / hit pendant 2 tours",
      result: "Le buff ATK multiplie les degats infliges par 1.4 (40% = ×1.4)"
    },
    {
      title: "💔 Combat Turn Order",
      description: "A chaque tour, la creature avec le SPD le plus haut gagne l'action et attaque. On compare valeurs de SPD. Si SPD tie, random gagne.",
      formula: "if player.stats.speed >= enemy.stats.speed:\n  playerTurn = player\n  enemyTurn = enemy\nelse:\n  playerTurn = enemy\n  enemyTurn = player\n\nDans turn:\n  applyDamage(attacker, defender)\n  tickCooldownsAndBuffs()",
      example: "Mouche S (SPD 100) vs Fourmi S (SPD 100)\n  SPD egale = random gagne\n  Si Mouche gagne = Mouche attaque en premier\n\n  Mouche S (SPD 100) vs Fourmi S (SPD 50)\n  Mouche gagne = Mouche attaque en premier",
      result: "Le fastest SPD gagne l'initiative. En SPD tie, RANDOM gagne"
    }
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <Link href="/" className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 rounded-lg shadow-md hover:shadow-lg hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 dark:hover:from-gray-700 dark:hover:to-gray-700 transition-all duration-200 mb-4 border border-purple-200 dark:border-purple-800 font-semibold">
            <span className="mr-2">←</span> Back to Home
          </Link>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            📐 ÉcoBio Formulas
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Guide complet du système de spawn, leveling, et combat
          </p>
        </header>

        <div className="bg-red-100 dark:bg-red-900 rounded-xl shadow-lg p-6 mb-8 border-2 border-red-500">
          <h2 className="text-3xl font-bold text-red-700 dark:text-red-400 mb-4">
            ⚠️ RÈGLE SUR les Formules
          </h2>
          <div className="space-y-3">
            <p className="text-gray-800 dark:text-gray-200 font-semibold">
              <strong className="text-red-600 dark:text-red-400">IMPORTANT :</strong> Toute modification (ajouter, modifier, supprimer) d'une formule DOIT être reportée sur cette page.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong className="text-purple-600 dark:text-purple-400">Ou modifier :</strong> hunting/page.tsx, battle.ts, database.ts
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong className="text-blue-600 dark:text-blue-400">Sur cette page :</strong> Mettre a jour la/les formule(s) correspondante(s)
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong className="text-green-600 dark:text-green-400">Verification :</strong> Sang rappellera a chaque fois et verifiera que tout est synchrone
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-4">
            📚 Comment Lire Ces Formules
          </h2>
          <div className="space-y-3">
            <p className="text-gray-700 dark:text-gray-300">
              <strong className="text-purple-600 dark:text-purple-400">Formules</strong> : Fonctions TypeScript presentes dans les fichiers database.ts, battle.ts, et hunting/page.tsx
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong className="text-blue-600 dark:text-blue-400">Exemples</strong> : Calculs concrets avec des valeurs typiques de creatures au niveau 10
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong className="text-green-600 dark:text-green-400">Resultats</strong> : Interpretation des implications de gameplay
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">🎲 Spawn & Rarity</h2>
            {spawnFormulas.map((section, index) => (
              <FormulaCard key={index} section={section} />
            ))}
          </section>

          <section>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">🆙 Level Scaling & Feeding</h2>
            {levelFormulas.map((section, index) => (
              <FormulaCard key={index} section={section} />
            ))}
          </section>

          <section>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">⚔️ Battle Mechanics</h2>
            {battleFormulas.map((section, index) => (
              <FormulaCard key={index} section={section} />
            ))}
          </section>
        </div>

        <footer className="mt-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Documentation website en progression. Mis a jour 2026-03-27.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Soutenu par Nephila 🕷️
          </p>
        </footer>
      </div>
    </main>
  );
}
