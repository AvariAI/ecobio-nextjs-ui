import Link from "next/link";
import { TRAITS, TraitCategory } from "@/lib/traits";
import { Rank } from "@/lib/database";

export default function TraitsPage() {
  // Group traits by category and then by rarity
  const offenseTraits = Object.values(TRAITS).filter(t => t.category === TraitCategory.OFFENSE)
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const defenseTraits = Object.values(TRAITS).filter(t => t.category === TraitCategory.DEFENSE)
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const utilityTraits = Object.values(TRAITS).filter(t => t.category === TraitCategory.UTILITY)
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const hybridTraits = Object.values(TRAITS).filter(t => t.category === TraitCategory.HYBRID)
    .sort((a, b) => a.name.localeCompare(b.name));

  const renderTraitBadge = (rarity: Rank[]) => {
    const badges = rarity.map(r => {
      const colors: Record<Rank, string> = {
        "E": "bg-gray-600",
        "D": "bg-green-600",
        "C": "bg-blue-600",
        "B": "bg-yellow-600",
        "A": "bg-orange-600",
        "S": "bg-red-600",
        "S+": "bg-purple-600"
      };
      return `<span class="${colors[r]} text-white text-xs px-2 py-0.5 rounded-full ml-1">${r}</span>`;
    }).join('');
    
    return <span dangerouslySetInnerHTML={{ __html: badges }} />;
  };

  const renderTrait = (trait: any) => (
    <li key={trait.id} className="border-b border-gray-200 pb-2 last:border-0">
      <div className="flex justify-between items-start mb-1">
        <strong className="text-gray-900">{trait.name}</strong>
        {renderTraitBadge(trait.rarity)}
      </div>
      <p className="text-sm text-gray-600">{trait.description}</p>
      {trait.type === "conditional" && (
        <p className="text-xs text-blue-600 mt-1">Condition: {trait.condition}</p>
      )}
    </li>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/">
          <button className="text-blue-600 hover:text-blue-800 mb-4 inline-block">← Retour</button>
        </Link>

        <h1 className="text-2xl font-bold mb-6">🕸️ Traits</h1>

        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">⚔️ Offense ({offenseTraits.length})</h2>
            <ul className="space-y-2 ml-4">
              {offenseTraits.map(renderTrait)}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">🛡️ Defense ({defenseTraits.length})</h2>
            <ul className="space-y-2 ml-4">
              {defenseTraits.map(renderTrait)}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">⚡ Utility ({utilityTraits.length})</h2>
            <ul className="space-y-2 ml-4">
              {utilityTraits.map(renderTrait)}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">🔄 Hybrid ({hybridTraits.length})</h2>
            <ul className="space-y-2 ml-4">
              {hybridTraits.map(renderTrait)}
            </ul>
          </section>
        </div>

        <div className="mt-8 text-sm text-gray-600 bg-white p-4 rounded-lg">
          <p><strong>Note:</strong> Les traits sont choisis à la capture via RNG selon le rang de la créature.</p>
          <p>Slots par rang: E (0-1), D (1), C (1-2), B (2), A (2-3), S (3), S+ (3-4)</p>
          <p className="mt-2"><strong>Types:</strong> Passif (toujours actif), Conditionnel (sous certaines conditions HP)</p>
        </div>
      </div>
    </div>
  );
}
