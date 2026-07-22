const fs = require('fs');
const p = 'c:/Users/Namo Punno/Desktop/1/ekitag-web/src/components/TrendingSpots.tsx';
const c = fs.readFileSync(p, 'utf8');
const lines = c.split('\n');
const clean = lines.slice(0, 85).join('\n');
fs.writeFileSync(p, clean);
console.log('Cleaned. Lines:', clean.length);
</arg_value></tool_call>