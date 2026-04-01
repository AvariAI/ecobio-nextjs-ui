"use client";

import { useEffect, useState } from "react";
import { GENETIC_TYPES, GeneticType } from "@/lib/genetic-types";
import { Rank } from "@/lib/database";
import Link from "next/link";

const RANKS: Rank[] = ["E", "D", "C", "B", "A", "S", "S+"];

function getRankBadgeColor(rank: Rank): string {
  if (rank === "S+") return "bg-purple-600";
  if (rank === "S") return "bg-yellow-600";
  if (rank === "A") return "bg-red-600";
  if (rank === "B") return "bg-orange-600";
  if (rank === "C") return "bg-blue-600";
  if (rank === "D") return "bg-green-600";
  return "bg-gray-600";
}

function getCardImage(geneticType: GeneticType, rank: Rank): string {
  const normalizedType = geneticType.toLowerCase().replace("é", "e").replace("è", "e");
  return `/creatures/ravaryn_${normalizedType}_e.png`;
}

// Check if user has at least one captured creature of this type rank
function hasCaptured(geneticType: GeneticType, rank: Rank): boolean {
  try {
    const collection = JSON.parse(localStorage.getItem("ecobio_collection") || "[]");
    const matches = collection.filter((creature: any) =>
      creature.geneticType === geneticType &&
      creature.finalStats.rank === rank
    );
    console.log(`Checking ${geneticType} ${rank}: found ${matches.length} creatures`);
    if (matches.length > 0) {
      console.log("Match samples:", matches.map((c: any) => ({
        id: c.id,
        name: c.name,
        geneticType: c.geneticType,
        rank: c.finalStats.rank
      })));
    }
    return matches.length > 0;
  } catch (error) {
    console.error("Error checking captures:", error);
    return false;
  }
}

// Get capture count for this type rank
function getCaptureCount(geneticType: GeneticType, rank: Rank): number {
  try {
    const collection = JSON.parse(localStorage.getItem("ecobio_collection") || "[]");
    return collection.filter((creature: any) =>
      creature.geneticType === geneticType &&
      creature.finalStats.rank === rank
    ).length;
  } catch {
    return 0;
  }
}

export default function PokedexPage() {
  const [geneticTypes] = useState<GeneticType[]>([
    "resilient",
    "scribeur",
    "symbiote",
    "radiant",
    "chimere",
    "pathogene",
    "synchroniseur",
    "ombre",
  ]);

  const [captured, setCaptured] = useState<Set<string>>(new Set());

  // Load captured status from localStorage
  useEffect(() => {
    const capturedSet = new Set<string>();
    geneticTypes.forEach(type => {
      RANKS.forEach(rank => {
        if (hasCaptured(type, rank)) {
          capturedSet.add(`${type}-${rank}`);
        }
      });
    });
    setCaptured(capturedSet);
  }, [geneticTypes]);

  // Listen for collection updates
  useEffect(() => {
    const handleStorageUpdate = () => {
      const capturedSet = new Set<string>();
      geneticTypes.forEach(type => {
        RANKS.forEach(rank => {
          if (hasCaptured(type, rank)) {
            capturedSet.add(`${type}-${rank}`);
          }
        });
      });
      setCaptured(capturedSet);
    };

    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener("inventory-updated", handleStorageUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener("inventory-updated", handleStorageUpdate);
    };
  }, [geneticTypes]);

  const getTotalCaptured = () => captured.size;
  const getTotalSlots = () => geneticTypes.length * RANKS.length; // 8 × 7 = 56

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        <Link href="/">
          <button className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 mb-4 inline-block font-semibold">
            ← Retour
          </button>
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          📚 Pokédex - Ravaryn
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-8 shadow-lg">
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Collection: <span className="font-bold text-green-600 dark:text-green-400">{getTotalCaptured()}</span> / {getTotalSlots()} cartes
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Capturez des Ravaryn de chaque type et rang pour compléter le Pokédex
          </p>
        </div>

        {/* Type rows + Rank columns */}
        <div className="space-y-6">
          {geneticTypes.map((type, typeIndex) => {
            const typeData = GENETIC_TYPES[type];
            return (
              <div key={type} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={`/creatures/ravaryn_${type.toLowerCase().replace("é", "e").replace("è", "e")}_e.png`}
                    alt={typeData.name}
                    className="w-16 h-16 rounded-lg border-2 border-gray-300 dark:border-gray-600"
                  />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {typeData.emoji} {typeData.name}
                  </h2>
                </div>

                {/* Rank cards row */}
                <div className="grid grid-cols-7 gap-3">
                  {RANKS.map((rank) => {
                    const cardKey = `${type}-${rank}`;
                    const isUnlocked = captured.has(cardKey);
                    const captureCount = getCaptureCount(type, rank);
                    const isRowOdd = typeIndex % 2 === 0;

                    return (
                      <div
                        key={rank}
                        className={`
                          relative aspect-[4/3] rounded-lg flex flex-col items-center justify-center
                          transition-all hover:scale-105 cursor-pointer
                          ${isUnlocked ? "shadow-md" : "shadow-inner"}
                          ${isRowOdd ? "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600" : "bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-600 dark:to-gray-700"}
                        `}
                        title={isUnlocked ? `${typeData.name} ${rank} (${captureCount} specimens)` : "Non débloqué - Capturez ce type"}
                      >
                        {/* Rank badge */}
                        <div className={`absolute top-2 right-2 ${getRankBadgeColor(rank)} text-white text-xs font-bold px-2 py-1 rounded-full`}>
                          {rank}
                        </div>

                        {/* Card content */}
                        {isUnlocked ? (
                          <img
                            src={getCardImage(type, rank)}
                            alt={`${typeData.name} ${rank}`}
                            className="w-full h-full object-contain px-4"
                          />
                        ) : (
                          <>
                            {/* Card back - Noir */}
                            <div className="w-full h-full bg-gray-900 dark:bg-black rounded-lg border-2 border-gray-400 dark:border-gray-600 flex items-center justify-center shadow-inner">
                              <span className="text-4xl text-gray-400 dark:text-gray-500">?</span>
                            </div>
                          </>
                        )}

                        {/* Capture count */}
                        {isUnlocked && captureCount > 1 && (
                          <div className="absolute bottom-2 left-2 bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            ×{captureCount}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}
