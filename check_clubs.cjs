const fs = require('fs');
const data = JSON.parse(fs.readFileSync('c:/Users/claud/Documents/Torneo_leyendas/data/database.json'));
const dbClubs = new Set(data.map(p => p.club));
const constants = fs.readFileSync('c:/Users/claud/Documents/Torneo_leyendas/frontend/src/data/constants.js', 'utf-8');
const match = constants.match(/TOURNAMENT_TEAMS = \[([\s\S]*?)\];/);
const teams = match[1].split(',').map(s => s.trim().replace(/\"/g, '')).filter(Boolean);
const missing = teams.filter(t => ![...dbClubs].some(c => c && c.toLowerCase() === t.toLowerCase()));
console.log(missing);
