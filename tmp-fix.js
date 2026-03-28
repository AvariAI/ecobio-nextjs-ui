// This script will fix the dodgBuff reference issue
const fs = require('fs');

const file = 'src/app/battle/multi-battle-display.tsx';
const content = fs.readFileSync(file, 'utf8');

// Extract and fix just the getBuffedStats function
const oldFunction = content.match(/function getBuffedStats\(creature: BattleCreature\): BuffedStats \{[\s\S]*?\n\}/);
if (oldFunction) {
  console.log('Found function:', oldFunction[0].slice(0, 200) + '...');
  console.log('Length:', oldFunction[0].length);
}
