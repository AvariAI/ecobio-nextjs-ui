"use client";

import Link from "next/link";

export default function ArenaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-red-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="inline-block px-4 py-2 mb-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg">← Retour</Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">Arena</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Mode de combat</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/arena/training">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border-2 border-blue-400 hover:shadow-2xl transition-all hover:scale-105">
              <h2 className="text-2xl font-bold mb-4">Entraînement</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Combats contre des créatures Rank E pour gagner de l'XP.
              </p>
              <div className="p-4 bg-blue-500 hover:bg-blue-600 text-white text-center font-bold rounded-lg">
                Démarrer
              </div>
            </div>
          </Link>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border-2 border-green-400 opacity-50">
            <h2 className="text-2xl font-bold mb-4">PvP</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Affrontez d'autres joueurs en temps réel.
            </p>
            <button disabled className="w-full p-4 bg-gray-400 text-gray-600 font-bold rounded-lg cursor-not-allowed">
              Bientôt disponible
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
