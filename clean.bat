@echo off
node -e "const fs=require('fs');const p='c:/Users/Namo Punno/Desktop/1/ekitag-web/src/components/TrendingSpots.tsx';const c=fs.readFileSync(p,'utf8');const lines=c.split('\n');const clean=lines.slice(0,85).join('\n');fs.writeFileSync(p,clean);console.log('Done');"
del clean.js
</arg_value></tool_call>