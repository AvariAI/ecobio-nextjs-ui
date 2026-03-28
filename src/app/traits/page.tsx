import Link from "next/link";

export default function TraitsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/">
          <button className="text-blue-600 hover:text-blue-800 mb-4 inline-block">← Retour</button>
        </Link>

        <h1 className="text-2xl font-bold mb-6">🕸️ Traits</h1>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold">⚔️ Offense</h2>
          <ul className="space-y-2 ml-4">
            <li><strong>Sniper</strong> — Augmente le taux de critique</li>
            <li><strong>Frappe Lourde</strong> — Bonus dégâts critique</li>
            <li><strong>Berserk Mode</strong> — Dégâts boostés PV bas</li>
            <li><strong>Assassin</strong> — Bonus dégâts contre adversaire PV bas</li>
            <li><strong>Frappe Éclair</strong> — Bonus vitesse et critique</li>
            <li><strong>Queste de Sang</strong> — Régénère PV sur kills</li>
          </ul>

          <h2 className="text-xl font-semibold">🛡️ Defense</h2>
          <ul className="space-y-2 ml-4">
            <li><strong>Peau Épaisse</strong> — Réduit les dégâts reçus</li>
            <li><strong>Régén. Naturelle</strong> — Régénère PV chaque tour</li>
            <li><strong>Second Souffle</strong> — Survit une fois à 1 PV</li>
            <li><strong>Tank</strong> — Augmente PV max</li>
            <li><strong>Épines</strong> — Reflète dégâts reçus</li>
            <li><strong>Volonté de Fer</strong> — Ignore effets de statut</li>
          </ul>

          <h2 className="text-xl font-semibold">⚡ Utility</h2>
          <ul className="space-y-2 ml-4">
            <li><strong>Adrénaline</strong> — Boost stats critique</li>
            <li><strong>Voltigeur</strong> — Chance d'esquiver</li>
            <li><strong>Téméraire</strong> — Dégâts + prise de dégâts</li>
            <li><strong>Stratégiste</strong> — Boost dégâts adversaire à PV bas</li>
            <li><strong>Canon de Verre</strong> — Dégâts super, défense super bas</li>
            <li><strong>Photo-Synthèse</strong> — Régénère PV chaque tour</li>
          </ul>

          <h2 className="text-xl font-semibold">🔄 Hybrid</h2>
          <ul className="space-y-2 ml-4">
            <li><strong>Puissance Volatile</strong> — Change bonus par tour</li>
            <li><strong>Chasseur Crépusculaire</strong> — Dégâts quand éclairé par l'ennemi</li>
            <li><strong>Sacrifice</strong> — Boost stats quand PV bas</li>
            <li><strong>Chasseur de Nuit</strong> — Dégâts la nuit</li>
          </ul>
        </div>

        <div className="mt-8 text-sm text-gray-600">
          <p><strong>Note:</strong> Les traits sont choisis à la capture via RNG selon le rang de la créature.</p>
          <p>Slots par rang: E (0-1), D (1), C (1-2), B (2), A (2-3), S (3), S+ (3-4)</p>
        </div>
      </div>
    </div>
  );
}
