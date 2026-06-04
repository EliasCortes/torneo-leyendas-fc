// ==========================================
// SERVICIO CENTRALIZADO DE TORNEOS - SUPABASE
// ==========================================
// Reemplaza todas las llamadas fetch a http://localhost:5000

import { supabase } from '../supabaseClient';
import {
  TOURNAMENT_TEAMS,
  TEAMS_5_STARS,
  TEAMS_4_5_STARS,
  DIAMOND_LEGENDS,
  GOLD_LEGENDS,
  SILVER_LEGENDS,
  BRONZE_LEGENDS,
  OPTION_ROULETTE
} from '../data/constants';

/**
 * Obtiene las constantes del torneo (equipos + leyendas + opciones).
 * Equivalente a GET /api/constants del backend Flask.
 */
export const getConstants = () => {
  return {
    teams: TOURNAMENT_TEAMS,
    teams_5_stars: TEAMS_5_STARS,
    teams_4_5_stars: TEAMS_4_5_STARS,
    diamond_legends: DIAMOND_LEGENDS,
    gold_legends: GOLD_LEGENDS,
    silver_legends: SILVER_LEGENDS,
    bronze_legends: BRONZE_LEGENDS,
    options_roulette: OPTION_ROULETTE
  };
};

/**
 * Determina la categoría de un jugador por su nombre.
 * Equivalente a get_player_category() del backend Flask.
 */
export const getPlayerCategory = (playerName) => {
  const pName = playerName.trim().toLowerCase();

  for (const name of DIAMOND_LEGENDS) {
    if (name.toLowerCase() === pName) return 'Diamante';
  }
  for (const name of GOLD_LEGENDS) {
    if (name.toLowerCase() === pName) return 'Oro';
  }
  for (const name of SILVER_LEGENDS) {
    if (name.toLowerCase() === pName) return 'Plata';
  }
  for (const name of BRONZE_LEGENDS) {
    if (name.toLowerCase() === pName) return 'Bronce';
  }
  return 'Actual';
};

/**
 * Lista todos los torneos guardados.
 * Equivalente a GET /api/tournaments del backend Flask.
 * Devuelve un array con metadatos de cada torneo.
 */
export const listTournaments = async () => {
  const { data, error } = await supabase
    .from('torneos')
    .select('id, nombre, datos, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) throw new Error('Error al cargar los torneos: ' + error.message);

  // Transformar al formato que espera el frontend
  return (data || []).map(row => {
    const d = row.datos || {};
    return {
      // Usamos el id de Supabase como identificador (antes era filename)
      filename: row.id,
      name: row.nombre || d.name || 'Sin nombre',
      status: d.status || 'En curso',
      players: (d.human_players || []).map(p => typeof p === 'object' ? p.name : p),
      teams_count: (d.teams || []).length,
      champion: d.champion || null,
      winner_owner: d.winner_owner || null,
      updated_at: row.updated_at
        ? new Date(row.updated_at).toLocaleString('es-ES')
        : ''
    };
  });
};

/**
 * Obtiene los datos completos de un torneo específico.
 * Equivalente a GET /api/tournaments/<filename> del backend Flask.
 */
export const getTournament = async (id) => {
  const { data, error } = await supabase
    .from('torneos')
    .select('id, nombre, datos')
    .eq('id', id)
    .single();

  if (error) throw new Error('Error al cargar el torneo: ' + error.message);

  // Devolver los datos del torneo con el id como filename
  const tournamentData = data.datos || {};
  tournamentData.filename = data.id;
  return tournamentData;
};

/**
 * Crea un nuevo torneo.
 * Equivalente a POST /api/tournaments/new del backend Flask.
 * Recibe configData con la configuración del wizard.
 */
export const createTournament = async (configData) => {
  const {
    name,
    players = [],
    format: formatType = '16 equipos',
    teamsPerPlayer = 8,
    advantages = {}
  } = configData;

  // Pre-populate previous champion team if configured
  const teams = [];
  if (advantages.hasPrevChampion) {
    const champTeamName = advantages.prevChampTeam;
    const champOwner = advantages.prevChampOwner;
    const champCaptain = advantages.prevCaptain;
    const retainedPlayerNames = advantages.retainedPlayers || [];

    const legends = [];
    if (champCaptain) {
      legends.push({
        name: champCaptain,
        category: 'Diamante',
        position: 'Sin definir'
      });
    }
    for (const p of retainedPlayerNames) {
      const cat = getPlayerCategory(p);
      legends.push({
        name: p,
        category: cat,
        position: 'Sin definir'
      });
    }

    teams.push({
      name: champTeamName,
      owner: champOwner,
      captain: champCaptain || '',
      captain_category: champCaptain ? 'Diamante' : '',
      legends,
      option_results: [],
      base_changes: [],
      spins: [],
      wildcards: { Bronce: 0, Plata: 0, Oro: 0, Diamante: 0 },
      group: null,
      stats: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 }
    });
  }

  // Build default structure (misma estructura que el backend Flask generaba)
  const tournamentData = {
    name,
    format: formatType,
    teams_per_player: teamsPerPlayer,
    human_players: players.map(p => ({ name: p })),
    teams,
    matches: [],
    champion: null,
    winner_owner: null,
    status: 'Configuración',
    advantages,
    created_at: new Date().toISOString()
  };

  // Insertar en Supabase
  const { data, error } = await supabase
    .from('torneos')
    .insert({
      nombre: name,
      datos: tournamentData
    })
    .select('id, nombre, datos')
    .single();

  if (error) throw new Error('Error al crear el torneo: ' + error.message);

  // Devolver con el id como filename (como hacía Flask)
  const result = data.datos;
  result.filename = data.id;
  return result;
};

/**
 * Guarda/actualiza los datos de un torneo existente.
 * Equivalente a POST /api/tournaments/<filename>/save del backend Flask.
 */
export const saveTournament = async (id, tournamentData) => {
  const { error } = await supabase
    .from('torneos')
    .update({
      nombre: tournamentData.name || tournamentData.nombre || 'Sin nombre',
      datos: tournamentData
    })
    .eq('id', id);

  if (error) throw new Error('Error al guardar el torneo: ' + error.message);
  return { success: true };
};

/**
 * Elimina un torneo permanentemente.
 * Equivalente a DELETE /api/tournaments/<filename> del backend Flask.
 */
export const deleteTournament = async (id) => {
  const { error } = await supabase
    .from('torneos')
    .delete()
    .eq('id', id);

  if (error) throw new Error('Error al eliminar el torneo: ' + error.message);
  return { success: true };
};
