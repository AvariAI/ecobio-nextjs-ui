#!/bin/bash
# ÉcoBio Pre-Push Hook
# Synchronise le workspace principal avec ecobio-dev et compile

set -e

echo "🔄 Pre-push: Synchronisation vers ecobio-dev..."

# Workspace paths
MAIN_WS="/home/lowkey/.openclaw/workspace-nephila/ecobio-nextjs-ui"
DEV_WS="/home/lowkey/.openclaw/workspace-nephila/ecobio-dev"

# Synchroniser les fichiers source importants
echo "📁 Copie des fichiers source..."
mkdir -p "$DEV_WS/src/lib" "$DEV_WS/src/app/hunting" "$DEV_WS/src/app/battle" "$DEV_WS/src/app/pokedex"
cp "$MAIN_WS/src/lib/database.ts" "$DEV_WS/src/lib/database.ts"
cp "$MAIN_WS/src/lib/battle.ts" "$DEV_WS/src/lib/battle.ts"
cp "$MAIN_WS/src/app/hunting/page.tsx" "$DEV_WS/src/app/hunting/page.tsx"
cp "$MAIN_WS/src/app/battle/page.tsx" "$DEV_WS/src/app/battle/page.tsx"
cp "$MAIN_WS/src/app/pokedex/page.tsx" "$DEV_WS/src/app/pokedex/page.tsx"

# Synchroniser les images de créatures
echo "🖼️ Copie des images de créatures..."
mkdir -p "$DEV_WS/public/creatures"
cp -r "$MAIN_WS/public/creatures/"* "$DEV_WS/public/creatures/" 2>/dev/null || true

# Synchroniser package.json et package-lock.json
echo "📦 Copie des fichiers package..."
cp "$MAIN_WS/package.json" "$DEV_WS/package.json"
cp "$MAIN_WS/package-lock.json" "$DEV_WS/package-lock.json" 2>/dev/null || true

# Synchroniser tsconfig.json et autres configs
echo "⚙️ Copie des fichiers de configuration..."
cp "$MAIN_WS/tsconfig.json" "$DEV_WS/tsconfig.json" 2>/dev/null || true
cp "$MAIN_WS/tailwind.config.ts" "$DEV_WS/tailwind.config.ts" 2>/dev/null || true
cp "$MAIN_WS/next.config.ts" "$DEV_WS/next.config.ts" 2>/dev/null || true

# Build dans ecobio-dev
echo "🔨 Compilation dans ecobio-dev..."
cd "$DEV_WS"

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo "📥 Installation des dépendances..."
    npm ci
fi

# Build
npm run build

# Create .nojekyll file for GitHub Pages
mkdir -p out
touch out/.nojekyll

echo "✅ Pré-push hook terminé avec succès!"
exit 0
