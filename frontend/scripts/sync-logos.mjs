/**
 * sync-logos.mjs
 * ──────────────
 * Script de sincronización: lee los archivos reales en public/equipos/,
 * compara los nombres del torneo (constants.js) con los de Supabase,
 * y actualiza la columna "nombre" en Supabase para que coincida exactamente
 * con los nombres usados en el torneo.
 *
 * Uso: node scripts/sync-logos.mjs
 *        --dry-run   (solo muestra cambios, no actualiza)
 *        --update    (aplica los cambios en Supabase)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Config ───
const SUPABASE_URL = 'https://jriasbkcdaamnzidrobj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rRpYpfPny2AMI4pCBZPuhw_eKrAPKXf';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const EQUIPOS_DIR = path.resolve(__dirname, '..', 'public', 'equipos');

// ─── Nombres del torneo (from constants.js) ───
const TOURNAMENT_TEAMS = [
  "Ajax", "Real Sociedad", "Boca Juniors", "RB Leipzig", "Rangers",
  "FC Lorient", "Villarreal FC", "Copenhagen FC", "Napoli", "Aston Villa",
  "PSV Eindhoven", "River Plate", "Borussia Dortmund", "Real Betis", "PAOK FC",
  "Manchester City", "Newells", "Lanus", "Fenerbahce", "FC Barcelona",
  "Athletic Club", "OGC Niza", "Torino", "RC Lens", "Dinamo de Zagreb",
  "AZ Alkmaar", "Braga", "West Ham UTD", "Cagliari", "Union Berlin",
  "Olimpiacos", "Crystal Palace", "Inter de Milan", "FC Twente", "Valencia FC",
  "RB Salzburgo", "Everton", "Slavia de Praga", "Roma", "KRC Genk",
  "Leeds", "Rayo Vallecano", "Bayer Leverkusen", "Rosario Central", "Sevilla",
  "Stade Rennais FC", "Hamburgo", "Sparta de Praga", "FC Porto", "Fulham",
  "Hellas Verona", "Celtic", "Nottingham Forest", "Paris FC", "Liverpool",
  "Udinese", "Independiente", "Besiktas", "Getafe FC", "Lazio",
  "KAA Gent", "Chelsea", "Wolves", "Feyenoord", "Real Madrid",
  "AJ Auxerre", "Newcastle UTD", "O.Marsella", "Alaves", "VFB Stuttgart",
  "Panatinaikos", "Benfica", "Brighton", "FC Augsburg", "Genoa",
  "RCD Mallorca", "R.Union ST.-G", "AC Milan", "Sunderland", "Girona FC",
  "SC Freiburg", "Toulouse", "Racing Club", "Atletico de Madrid", "FC Koln",
  "ST Pauli", "Shaktar Donestsk", "Brentford", "Parma", "Olimpique Lyon",
  "VFL Wolfsburg", "Elche", "AFC Bournemouth", "FC Bayern Munchen", "Malmo FF",
  "Juventus", "Le Havre AC", "Sporting CP", "Arsenal", "Pisa",
  "AS Monaco", "RC Estrasburgo", "TSG Hoffenheim", "Anderlecht", "Burnley",
  "Spurs", "Como 1907", "AEK Atenas", "FSV Mainz 05", "Dinamo de kiev",
  "Lecce", "Stade Brestois", "Galatasaray", "Bergamo", "Viktoria Pilzen",
  "Estudiantes", "Fiorentina", "PSG", "Angers SCO", "FC Nantes",
  "Oviedo", "CA Osasuna", "Famalicio", "FC Metz", "Borussia M'gladbach",
  "SV Werder Bremen", "Apoel", "RC Celta", "LOSC Lille", "RCD Espayol",
  "Heidenheim", "Club Brujas", "Manchester United", "Sassuolo", "Utrecht",
  "Frankfurt", "Bolonia", "Cremonense", "Levante",
  "RC Deportivo", "Argeninos Juniors",
];

// ─── Step 1: Read real files from disk ───
function getLocalFiles() {
  if (!fs.existsSync(EQUIPOS_DIR)) {
    console.error(`❌ Directorio no encontrado: ${EQUIPOS_DIR}`);
    process.exit(1);
  }
  return fs.readdirSync(EQUIPOS_DIR).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.svg'));
}

// ─── Step 2: Fetch current Supabase data ───
async function fetchSupabaseTeams() {
  const { data, error } = await supabase.from('equipos').select('id, nombre, "logoUrl"');
  if (error) {
    console.error('❌ Error leyendo Supabase:', error.message);
    process.exit(1);
  }
  return data;
}

// ─── Step 3: Normalize text for fuzzy matching ───
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, ''); // remove all non-alphanumeric
}

// ─── Step 4: Build Supabase nombre → tournament name mapping ───
function buildNameMapping(supabaseTeams) {
  const mapping = []; // { supabaseId, supabaseName, tournamentName, logoUrl, status }

  // Create normalized lookup for tournament names
  const tournamentNormMap = new Map();
  TOURNAMENT_TEAMS.forEach(name => {
    tournamentNormMap.set(normalize(name), name);
  });

  // Create normalized lookup for supabase names
  for (const team of supabaseTeams) {
    const supNorm = normalize(team.nombre);
    
    // Try exact normalized match first
    if (tournamentNormMap.has(supNorm)) {
      const tName = tournamentNormMap.get(supNorm);
      mapping.push({
        supabaseId: team.id,
        supabaseName: team.nombre.trim(),
        tournamentName: tName,
        logoUrl: team.logoUrl,
        status: team.nombre.trim() === tName ? '✅ OK' : '🔄 RENOMBRAR',
      });
      tournamentNormMap.delete(supNorm); // Mark as matched
      continue;
    }

    // Try manual map FIRST (for known difficult cases)
    const manualMap = {
      'psv': 'PSV Eindhoven',
      'olympiacos': 'Olimpiacos',
      'tottenhamhotspur': 'Spurs',
      'atalanta': 'Bergamo',
      'deportivo': 'RC Deportivo',
      'barcelona': 'FC Barcelona',
      'bayernmunich': 'FC Bayern Munchen',
      'wolfsburgo': 'VFL Wolfsburg',
      'rcstrasburgo': 'RC Estrasburgo',
      'espanol': 'RCD Espayol',
      'espanyol': 'RCD Espayol',
      'dinamozagreb': 'Dinamo de Zagreb',
      'dynamokiev': 'Dinamo de kiev',
      'slaviapraga': 'Slavia de Praga',
      'spartapraga': 'Sparta de Praga',
      'fcfamalicao': 'Famalicio',
      'lehavre': 'Le Havre AC',
      'rcdmallorca': 'RCD Mallorca',
      'realoviedo': 'Oviedo',
      'athleticclubbilbao': 'Athletic Club',
      'atleticomadrid': 'Atletico de Madrid',
      'nice': 'OGC Niza',
      'lille': 'LOSC Lille',
      'celta': 'RC Celta',
      'lorient': 'FC Lorient',
      'brest': 'Stade Brestois',
      'rennes': 'Stade Rennais FC',
      'lyon': 'Olimpique Lyon',
      'marseille': 'O.Marsella',
      'auxerre': 'AJ Auxerre',
      'nantes': 'FC Nantes',
      'angers': 'Angers SCO',
      'rangers': 'Rangers',
      'leedsunited': 'Leeds',
      'westham': 'West Ham UTD',
      'fcmetz': 'FC Metz',
      'fcheidenheim': 'Heidenheim',
      'mainz05': 'FSV Mainz 05',
      'koln': 'FC Koln',
      'stpauli': 'ST Pauli',
      'augsburgo': 'FC Augsburg',
      'hamburgersv': 'Hamburgo',
      'vfbstuttgart': 'VFB Stuttgart',
      'unionberlin': 'Union Berlin',
      'scbraga': 'Braga',
      'panathinaikos': 'Panatinaikos',
      'paok': 'PAOK FC',
      'aekatens': 'AEK Atenas',
      'aekathens': 'AEK Atenas',
      'bologna': 'Bolonia',
      'cremonese': 'Cremonense',
      'como1907': 'Como 1907',
      'inter': 'Inter de Milan',
      'milan': 'AC Milan',
      'roma': 'Roma',
      'salzburgo': 'RB Salzburgo',
      'salzburg': 'RB Salzburgo',
      'rbleipzig': 'RB Leipzig',
      'shakhtar': 'Shaktar Donestsk',
      'unionst': 'R.Union ST.-G',
      'clubbrujas': 'Club Brujas',
      'clubbrugge': 'Club Brujas',
      'genk': 'KRC Genk',
      'kaagent': 'KAA Gent',
      'gent': 'KAA Gent',
      'copenhagen': 'Copenhagen FC',
      'malmo': 'Malmo FF',
      'fcutrecht': 'Utrecht',
      'azalkmaar': 'AZ Alkmaar',
      'fcporto': 'FC Porto',
      'sportingcp': 'Sporting CP',
      'getafe': 'Getafe FC',
      'villarreal': 'Villarreal FC',
      'valencia': 'Valencia FC',
      'osasuna': 'CA Osasuna',
      'rayovallecano': 'Rayo Vallecano',
      'newellsoldboys': 'Newells',
      'racingclub': 'Racing Club',
      'estudiantesdelaplata': 'Estudiantes',
      'bocajuniors': 'Boca Juniors',
      'riverplate': 'River Plate',
      'argeninosjuniors': 'Argeninos Juniors',
      'rosariocentral': 'Rosario Central',
      'borussiamonchengladbach': 'Borussia M\'gladbach',
      'eintrachtfrankfurt': 'Frankfurt',
      'werderbremen': 'SV Werder Bremen',
      'bayerleverkusen': 'Bayer Leverkusen',
      'newcastleutd': 'Newcastle UTD',
      'newcastle': 'Newcastle UTD',
      'bournemouth': 'AFC Bournemouth',
      'burnley': 'Burnley',
      'sunderland': 'Sunderland',
      'hoffenheim': 'TSG Hoffenheim',
      'freiburg': 'SC Freiburg',
      'asmonaco': 'AS Monaco',
      'toulouse': 'Toulouse',
      'parissaintgermain': 'PSG',
      'parisfc': 'Paris FC',
      'gironafc': 'Girona FC',
      'verona': 'Hellas Verona',
      'viktoriaplzen': 'Viktoria Pilzen',
      'fiorentina': 'Fiorentina',
      'elche': 'Elche',
      'apoel': 'Apoel',
      'levante': 'Levante',
      'fctwente': 'FC Twente',
      'wolves': 'Wolves',
    };

    const supNormTrimmed = normalize(team.nombre.trim());
    if (manualMap[supNormTrimmed]) {
      const tName = manualMap[supNormTrimmed];
      mapping.push({
        supabaseId: team.id,
        supabaseName: team.nombre.trim(),
        tournamentName: tName,
        logoUrl: team.logoUrl,
        status: team.nombre.trim() === tName ? '✅ OK' : '🔄 RENOMBRAR',
      });
      // Remove from unmatched tournament list
      for (const [tNorm, tN] of tournamentNormMap) {
        if (tN === tName) { tournamentNormMap.delete(tNorm); break; }
      }
      continue;
    }

    // Fallback: substring/contains match (require min 5 chars and length ratio > 0.5)
    let found = false;
    for (const [tNorm, tName] of tournamentNormMap) {
      if (supNorm.length < 5 || tNorm.length < 5) continue;
      const ratio = Math.min(supNorm.length, tNorm.length) / Math.max(supNorm.length, tNorm.length);
      if (ratio < 0.5) continue;
      if (tNorm.includes(supNorm) || supNorm.includes(tNorm)) {
        mapping.push({
          supabaseId: team.id,
          supabaseName: team.nombre.trim(),
          tournamentName: tName,
          logoUrl: team.logoUrl,
          status: '🔄 RENOMBRAR',
        });
        tournamentNormMap.delete(tNorm);
        found = true;
        break;
      }
    }

    if (!found) {
      mapping.push({
        supabaseId: team.id,
        supabaseName: team.nombre.trim(),
        tournamentName: null,
        logoUrl: team.logoUrl,
        status: '❓ SIN MATCH',
      });
    }
  }

  // Remaining unmatched tournament teams
  const unmatched = [];
  for (const [, name] of tournamentNormMap) {
    unmatched.push(name);
  }

  return { mapping, unmatched };
}

// ─── Step 5: Apply updates ───
async function applyUpdates(mapping) {
  const toUpdate = mapping.filter(m => m.status === '🔄 RENOMBRAR' && m.tournamentName);
  
  console.log(`\n🚀 Aplicando ${toUpdate.length} renombramientos en Supabase...\n`);
  
  let success = 0;
  let failed = 0;

  for (const item of toUpdate) {
    const { error } = await supabase
      .from('equipos')
      .update({ nombre: item.tournamentName })
      .eq('id', item.supabaseId);

    if (error) {
      console.log(`  ❌ ${item.supabaseName} → ${item.tournamentName}: ${error.message}`);
      failed++;
    } else {
      console.log(`  ✅ ${item.supabaseName} → ${item.tournamentName}`);
      success++;
    }
  }

  console.log(`\n📊 Resultado: ${success} actualizados, ${failed} fallidos de ${toUpdate.length} total`);
}

// ─── Step 6: Also verify file paths ───
function verifyFilePaths(mapping, localFiles) {
  console.log('\n📂 VERIFICACIÓN DE ARCHIVOS EN DISCO\n');
  
  const localSet = new Set(localFiles);
  let missing = 0;
  
  for (const item of mapping) {
    if (!item.logoUrl) continue;
    const fileName = item.logoUrl.replace('/equipos/', '');
    if (!localSet.has(fileName)) {
      console.log(`  ❌ ARCHIVO NO ENCONTRADO: ${fileName}`);
      console.log(`     → Equipo: ${item.supabaseName} (id: ${item.supabaseId})`);
      missing++;
    }
  }

  if (missing === 0) {
    console.log('  ✅ Todos los archivos de logo referenciados existen en disco.');
  } else {
    console.log(`\n  ⚠️  ${missing} archivos no encontrados en disco.`);
  }
}

// ─── Main ───
async function main() {
  const isDryRun = !process.argv.includes('--update');
  
  console.log('═══════════════════════════════════════════════');
  console.log('  🏆 SYNC LOGOS — Torneo Leyendas FC');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Modo: ${isDryRun ? '🔍 DRY RUN (solo muestra)' : '🚀 UPDATE (aplica cambios)'}`);
  console.log('');

  // 1. Local files
  const localFiles = getLocalFiles();
  console.log(`📁 Archivos locales en equipos/: ${localFiles.length}`);

  // 2. Supabase teams
  const supabaseTeams = await fetchSupabaseTeams();
  console.log(`☁️  Equipos en Supabase: ${supabaseTeams.length}`);
  console.log(`🎮 Equipos en constants.js: ${TOURNAMENT_TEAMS.length}`);

  // 3. Build mapping
  const { mapping, unmatched } = buildNameMapping(supabaseTeams);

  // 4. Print report
  console.log('\n────────────────────────────────────────────');
  console.log('  MAPEO DE NOMBRES');
  console.log('────────────────────────────────────────────\n');

  const ok = mapping.filter(m => m.status === '✅ OK');
  const rename = mapping.filter(m => m.status === '🔄 RENOMBRAR');
  const noMatch = mapping.filter(m => m.status === '❓ SIN MATCH');

  console.log(`✅ Ya coinciden: ${ok.length}`);
  console.log(`🔄 Necesitan renombrar: ${rename.length}`);
  console.log(`❓ Sin match en torneo: ${noMatch.length}`);

  if (rename.length > 0) {
    console.log('\n🔄 RENOMBRAMIENTOS PROPUESTOS:\n');
    for (const item of rename) {
      console.log(`  "${item.supabaseName}" → "${item.tournamentName}"`);
    }
  }

  if (noMatch.length > 0) {
    console.log('\n❓ EQUIPOS EN SUPABASE SIN MATCH EN TORNEO:\n');
    for (const item of noMatch) {
      console.log(`  - ${item.supabaseName} (id: ${item.supabaseId})`);
    }
  }

  if (unmatched.length > 0) {
    console.log('\n⚠️  EQUIPOS DEL TORNEO SIN MATCH EN SUPABASE:\n');
    for (const name of unmatched) {
      console.log(`  - ${name}`);
    }
  }

  // 5. Verify file paths
  verifyFilePaths(mapping, localFiles);

  // 6. Apply if --update
  if (!isDryRun) {
    await applyUpdates(mapping);
  } else {
    console.log('\n💡 Para aplicar los cambios, ejecuta:');
    console.log('   node scripts/sync-logos.mjs --update\n');
  }
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
