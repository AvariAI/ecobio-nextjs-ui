import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-4">
            🐛 ÉcoBio
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Collection d'insectes & Combat Génétique
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <Link href="/pokedex">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all hover:scale-105 border-2 border-transparent hover:border-green-400">
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                Pokedex
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Explore toutes les créatures, leurs stats et leurs capacités spéciales.
              </p>
            </div>
          </Link>

          <Link href="/battle">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all hover:scale-105 border-2 border-transparent hover:border-red-400">
              <div className="text-6xl mb-4">⚔️</div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                Battle Arena
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Simule des combats entre créatures et teste leur puissance.
              </p>
            </div>
          </Link>

          <Link href="/hunting">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all hover:scale-105 border-2 border-transparent hover:border-yellow-400">
              <div className="text-6xl mb-4">🏹</div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                Chasse Créatures
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Spawn RNG-optimisées et build ta collection unique.
              </p>
            </div>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-8 max-w-4xl mx-auto">
          <Link href="/formulas">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all hover:scale-105 border-2 border-transparent hover:border-blue-400">
              <div className="text-6xl mb-4">🧮</div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                Formules
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Découvrez toutes les formules du jeu: variance de stats, scaling de niveau, dégâts, critiques.
              </p>
            </div>
          </Link>

          <Link href="/traits">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all hover:scale-105 border-2 border-transparent hover:border-purple-400">
              <div className="text-6xl mb-4">✨</div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                Traits
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Liste complète des traits passifs et conditionnels avec leurs effets et rarités.
              </p>
            </div>
          </Link>

          <Link href="/breeding">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all hover:scale-105 border-2 border-transparent hover:border-pink-400">
              <div className="text-6xl mb-4">🧬</div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                Reproduction
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Combinez tes créatures pour créer de nouveaux spécimens avec de meilleurs stats.
              </p>
            </div>
          </Link>
        </div>

        <div className="grid md:grid-cols-1 gap-8 mb-8 max-w-xl mx-auto">
          <Link href="/exploration">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all hover:scale-105 border-2 border-transparent hover:border-amber-500">
              <div className="text-6xl mb-4">🗺️</div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                Exploration
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Envois tes créatures en mission pour récolter des ressources rares.
              </p>
            </div>
          </Link>
        </div>

        <footer className="text-center mt-12 text-gray-600 dark:text-gray-400">
          <p>ÉcoBio Pokedex & Battle Simulator • Next.js v16 • Made with 🕷️ by Nephila</p>
        </footer>
      </div>
    </main>
  );
}
