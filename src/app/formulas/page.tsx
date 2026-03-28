import Link from "next/link";

export default function FormulasPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/">
          <button className="text-blue-600 hover:text-blue-800 mb-4 inline-block">← Retour</button>
        </Link>

        <h1 className="text-2xl font-bold mb-6">📐 Formules</h1>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">🎲 Spawn & Rarity</h2>
            <ul className="space-y-2 ml-4 text-sm">
              <li><strong>Weights:</strong> E (81.75%), D (10%), C (6%), B (1.5%), A (0.5%), S (0.2%), S+ (0.05%)</li>
              <li><strong>Variance rang:</strong> E (-25%±10%), D (-20%±10%), C (-15%±15%), B (-10%±20%), A (0%±25%), S (+15%±30%), S+ (+20%±40%)</li>
              <li><strong>Formule:</strong> baseStat × variance (0.75-1.40)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">📊 Level Scaling</h2>
            <ul className="space-y-2 ml-4 text-sm">
              <li><strong>HP (1-10):</strong> ×(1 + level × 0.1)</li>
              <li><strong>HP (10-25):</strong> 1.9 + (level-10) × 0.05</li>
              <li><strong>HP (25+):</strong> 2.65 × 1.01^(level-25)</li>
              <li><strong>ATK/DEF/SPD/CRIT (≤25):</strong> 1 + level × 0.15</li>
              <li><strong>ATK/DEF/SPD/CRIT (>25):</strong> 4.6 × 1.005^(level-25)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">💥 Combat</h2>
            <ul className="space-y-2 ml-4 text-sm">
              <li><strong>Dégâts:</strong> atk × (atk / (atk + def)) × buffs</li>
              <li><strong>Buffs:</strong> ATK +40%, DEF -50%, lasts 2 tours</li>
              <li><strong>Tour order:</strong> SPD le plus haut gagne</li>
              <li><strong>Esquive:</strong> base = log10(spdPlayer / (spdEnemy + 1)) × 0.5, max 25%</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">💪 Feeding</h2>
            <ul className="space-y-2 ml-4 text-sm">
              <li><strong>XP par rang:</strong> E (50), D (100), C (200), B (400), A (800), S (1600), S+ (3200)</li>
              <li><strong>Bonus stat:</strong> 7× même stat feed = +30% permanent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">🧬 Breeding</h2>
            <ul className="space-y-2 ml-4 text-sm">
              <li><strong>Stats baby:</strong> 60% avg parents + 40% template ±5%</li>
              <li><strong>Rank baby:</strong> avg parents + RNG(-2:5%, -1:25%, 0:60%, +1:10%)</li>
              <li><strong>Slots traits:</strong> E (0-1), D (1), C (1-2), B (2), A (2-3), S (3), S+ (3-4)</li>
              <li><strong>Mutation:</strong> 20% chance trait random si slot libre</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">⭐ Stars</h2>
            <ul className="space-y-2 ml-4 text-sm">
              <li><strong>XP combat:</strong> (damage contributed / enemyHP × 50) + kill bonus 20 + win bonus 30</li>
              <li><strong>Star thresholds:</strong> 0→1: 100 XP, 1→2: 200 XP, 2→3: 300 XP, 3→4: 400 XP, 4→5: 500 XP</li>
              <li><strong>Stars: 0-5 (visual only, no unlocks)</strong></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">🗺️ Exploration</h2>
            <ul className="space-y-2 ml-4 text-sm">
              <li><strong>Durées:</strong> 15min, 30min, 1h, 2h, 4h, 8h</li>
              <li><strong>XP par durée:</strong> 15min (20), 30min (35), 1h (60), 2h (100), 4h (150), 8h (200)</li>
              <li><strong>Déblocages:</strong> 30min (50 XP), 1h (150 XP), 2h (400 XP), 4h (800 XP), 8h (1500 XP)</li>
              <li><strong>Death chance:</strong> niveau 50: -50%, niveau 1: base (15min=5%, 8h=70%)</li>
              <li><strong>Loot:</strong> plantes (common → epic), le plus long = plus épique</li>
            </ul>
          </section>
        </div>

        <div className="mt-8 text-xs text-gray-500">
          <p>Note: Informations pour Sang and Nephila. Pas une vraie fonctionnalité usuario.</p>
        </div>
      </div>
    </div>
  );
}
