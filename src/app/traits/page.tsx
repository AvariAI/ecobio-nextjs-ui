"use client";

import { TRAITS, TraitType, TraitCategory } from "@/lib/traits";
import { Rank } from "@/lib/database";

export default function TraitsPage() {
  const traits = Object.values(TRAITS);

  const groupedByCategory: Record<TraitCategory, typeof traits> = {
    offense: traits.filter(t => t.category === TraitCategory.OFFENSE),
    defense: traits.filter(t => t.category === TraitCategory.DEFENSE),
    utility: traits.filter(t => t.category === TraitCategory.UTILITY),
    hybrid: traits.filter(t => t.category === TraitCategory.HYBRID),
  };

  const getTypeBadge = (type: TraitType) => {
    if (type === TraitType.PASSIVE) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Passif</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">Conditionnel</span>;
  };

  const getCategoryLabel = (category: TraitCategory) => {
    const labels: Record<TraitCategory, string> = {
      offense: "⚔️ Attaque",
      defense: "🛡️ Défense",
      utility: "⚡ Utilité",
      hybrid: "🔄 Hybrid (Bonus + Maldash;us)",
    };
    return labels[category];
  };

  const getConditionText = (condition?: string) => {
    if (!condition) return null;
    return <p className="mt-2 text-sm text-orange-700 font-semibold">Condition: {condition}</p>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h1 className="text-4xl font-bold text-green-900 mb-4">🕸️ Traits d'ÉcoBio</h1>
          <p className="text-gray-700">
            Les traits sont des capacités passives ou conditionnelles que les créatures peuvent posséder.
            Chaque rang a un nombre de slots de traits déterminé par la RNG.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-green-800 mb-4">Distribution des Traits par Rang</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {([
              { rank: "E", slots: "0-1 (50%)" },
              { rank: "D", slots: "1" },
              { rank: "C", slots: "1-2 (50%)" },
              { rank: "B", slots: "2" },
              { rank: "A", slots: "2-3 (50%)" },
              { rank: "S", slots: "3" },
              { rank: "S+", slots: "3-4 (50%)" },
            ]).map((item) => (
              <div key={item.rank} className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-900">{item.rank}</div>
                <div className="text-sm text-gray-700 mt-2">
                  <span>{item.slots}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Les rangs E, C, A, S+ ont 50% de chance d'avoir le slot minimum ou maximum.
            Les autres rangs ont toujours le même nombre de slots.
          </p>
        </div>

        {Object.entries(groupedByCategory).map(([category, categoryTraits]) => (
          <div key={category} className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-green-800 mb-4">
              {getCategoryLabel(category as TraitCategory)}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryTraits.map((trait) => (
                <div
                  key={trait.id}
                  className="border-2 border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-green-900">{trait.name}</h3>
                    {getTypeBadge(trait.type)}
                  </div>

                  <p className="text-gray-700 mb-3">{trait.description}</p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {trait.rarity.map((rank) => (
                      <span
                        key={rank}
                        className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 font-semibold"
                      >
                        {rank}
                      </span>
                    ))}
                  </div>

                  {getConditionText(trait.condition)}

                  {trait.effects.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <p className="text-xs text-gray-600 font-semibold mb-1">Effets:</p>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {trait.effects.map((effect, idx) => (
                          <li key={idx}>
                            <span className={effect.isNegative ? "text-red-600" : "text-green-700"}>
                              {effect.stat}: {effect.value > 0 ? "+" : ""}{(effect.value * 100).toFixed(0)}%
                              {effect.isNegative && " (malus)"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
