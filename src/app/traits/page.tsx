import Link from "next/link";
import { TRAITS } from "@/lib/traits";

export default function TraitsPage() {
  // All 6 traits (no categories anymore)
  const allTraits = Object.values(TRAITS).sort((a, b) => a.name.localeCompare(b.name));

  const renderTrait = (trait: any) => (
    <li key={trait.id} className="border-b border-gray-200 pb-3 last:border-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{trait.emoji}</span>
        <strong className="text-gray-900 text-lg">{trait.name}</strong>
      </div>
      <p className="text-sm text-gray-600 ml-8">{trait.description}</p>
    </li>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/">
          <button className="text-blue-600 hover:text-blue-800 mb-4 inline-block">← Retour</button>
        </Link>

        <h1 className="text-2xl font-bold mb-6">🕸️ Traits</h1>

        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Stat Boost Traits</h2>
          <p className="text-gray-600 mb-4">
            Les 6 traits boostent les stats en fonction du niveau (+0.6% par niveau).
            Chaque créature a 1 slot de trait, peu importe son rang.
          </p>
          <ul className="space-y-3">
            {allTraits.map(renderTrait)}
          </ul>
        </section>

        <div className="mt-6 text-sm text-gray-600 bg-white p-4 rounded-lg">
          <p><strong>Note:</strong> Les traits sont choisis à la capture via RNG.</p>
          <p><strong>Level Scaling:</strong> Un trait à level 50 donne +29.4% de bonus ((50-1) × 0.006 = 0.294).</p>
        </div>
      </div>
    </div>
  );
}
