import { supabase } from '../supabaseClient';

/**
 * Inicializa las plantillas para un torneo recién creado.
 * Toma los equipos del torneo y puebla la tabla `tournament_rosters` 
 * con los jugadores originales basados en el campo `club_name` de la tabla `players`.
 * 
 * @param {string} tournamentId - El UUID del torneo.
 * @param {string[]} teamNames - Array con los nombres de los equipos participantes.
 */
export const CLUB_MAPPING = {
  "Rangers": "Rangers FC",
  "Villarreal FC": "Villarreal CF",
  "Copenhagen FC": "FC København",
  "PSV Eindhoven": "PSV",
  "Real Betis": "Real Betis Balompié",
  "PAOK FC": "PAOK",
  "Newells": "Newell's Old Boys",
  "Lanus": "Club Atlético Lanús",
  "Fenerbahce": "Fenerbahçe SK",
  "OGC Niza": "OGC Nice",
  "Dinamo de Zagreb": "Dinamo Zagreb",
  "Braga": "Sporting Clube de Braga",
  "West Ham UTD": "West Ham United",
  "Union Berlin": "1. FC Union Berlin",
  "Olimpiacos": "Olympiacos FC",
  "Inter de Milan": "Inter",
  "Valencia FC": "Valencia CF",
  "RB Salzburgo": "FC Red Bull Salzburg",
  "Slavia de Praga": "SK Slavia Praha",
  "Leeds": "Leeds United",
  "Bayer Leverkusen": "Bayer 04 Leverkusen",
  "Sevilla": "Sevilla FC",
  "Hamburgo": "Hamburger SV",
  "Sparta de Praga": "Sparta Praha",
  "Fulham": "Fulham FC",
  "Hellas Verona": "Hellas Verona FC",
  "Besiktas": "Beşiktaş JK",
  "Getafe FC": "Getafe CF",
  "Wolves": "Wolverhampton Wanderers",
  "Newcastle UTD": "Newcastle United",
  "O.Marsella": "Olympique de Marseille",
  "Alaves": "Deportivo Alavés",
  "VFB Stuttgart": "VfB Stuttgart",
  "Panathinaikos": "Panathinaikos FC",
  "Benfica": "SL Benfica",
  "Brighton": "Brighton & Hove Albion",
  "R.Union ST.-G": "Union SG",
  "Toulouse": "Toulouse FC",
  "Atletico de Madrid": "Atlético Madrid",
  "FC Koln": "1. FC Köln",
  "ST Pauli": "FC St. Pauli",
  "Shaktar Donestsk": "Shakhtar Donetsk",
  "Olimpique Lyon": "Olympique Lyonnais",
  "VFL Wolfsburg": "VfL Wolfsburg",
  "Elche": "Elche CF",
  "FC Bayern Munchen": "FC Bayern München",
  "Malmo FF": "Malmö FF",
  "RC Estrasburgo": "RC Strasbourg Alsace",
  "TSG Hoffenheim": "TSG 1899 Hoffenheim",
  "Anderlecht": "RSC Anderlecht",
  "Spurs": "Tottenham Hotspur",
  "Como 1907": "Como",
  "AEK Atenas": "AEK Athens",
  "FSV Mainz 05": "1. FSV Mainz 05",
  "Dinamo de Kiev": "Dynamo Kyiv",
  "Stade Brestois": "Stade Brestois 29",
  "Galatasaray": "Galatasaray SK",
  "Atalanta Bergamo": "Atalanta",
  "Viktoria Pilzen": "Viktoria Plzeň",
  "Estudiantes": "Estudiantes de La Plata",
  "PSG": "Paris SG",
  "Oviedo": "Real Oviedo",
  "Famalicio": "FC Famalicão",
  "Borussia M'gladbach": "Borussia Mönchengladbach",
  "Apoel": "APOEL FC",
  "LOSC Lille": "Lille OSC",
  "RCD Espayol": "RCD Espanyol",
  "Heidenheim": "1. FC Heidenheim 1846",
  "Club Brujas": "Club Brugge KV",
  "Utrecht": "FC Utrecht",
  "Frankfurt": "Eintracht Frankfurt",
  "Bolonia": "Bologna",
  "Cremonense": "Cremonese",
  "Levante": "Levante UD"
};

export const getDbClubName = (frontendName) => {
  return CLUB_MAPPING[frontendName] || frontendName;
};

export const getFrontendTeamName = (dbClubName, allFrontendNames) => {
  for (const fn of allFrontendNames) {
    if (getDbClubName(fn) === dbClubName) return fn;
  }
  return dbClubName;
};

export const initializeRosters = async (tournamentId, teamNames) => {
  try {
    if (!teamNames || teamNames.length === 0) return;

    // 1. Borramos rosters previos de este torneo para evitar duplicados
    const { error: deleteError } = await supabase
      .from('tournament_rosters')
      .delete()
      .eq('tournament_id', tournamentId);
    
    if (deleteError) throw deleteError;

    // Map frontend names to DB names
    const dbClubNames = teamNames.map(getDbClubName);

    // 2. Buscamos en la base estática 'players' todos los jugadores cuyo 'club_name'
    // coincida con los dbClubNames
    const { data: initialPlayers, error: fetchError } = await supabase
      .from('players')
      .select('player_id, club_name')
      .in('club_name', dbClubNames);
    
    if (fetchError) throw fetchError;

    if (!initialPlayers || initialPlayers.length === 0) return;

    // 3. Preparamos los registros para la tabla relacional tournament_rosters
    const rosterEntries = initialPlayers.map(p => ({
      tournament_id: tournamentId,
      player_id: p.player_id,
      team_name: getFrontendTeamName(p.club_name, teamNames),
      status: 'active'
    }));

    // 4. Insertamos masivamente (Bulk Insert) en la base de datos
    if (rosterEntries.length > 0) {
      const { error: insertError } = await supabase
        .from('tournament_rosters')
        .insert(rosterEntries);

      if (insertError) throw insertError;
    }

    return { success: true, count: rosterEntries.length };
  } catch (error) {
    console.error('Error inicializando plantillas:', error.message);
    throw new Error('No se pudieron inicializar las plantillas: ' + error.message);
  }
};

/**
 * Devuelve la plantilla completa de un equipo en un torneo, 
 * ordenando los jugadores por media (overall) de forma descendente.
 */
export const getTeamRoster = async (tournamentId, clubName) => {
  try {
    const { data, error } = await supabase
      .from('tournament_rosters')
      .select(`
        player_id,
        team_name,
        status,
        players:player_id (
          player_id,
          short_name,
          long_name,
          overall,
          player_positions,
          player_face_url,
          nationality_name
        )
      `)
      .eq('tournament_id', tournamentId)
      .eq('team_name', clubName)
      .eq('status', 'active');

    if (error) throw error;

    // Aplanar y ordenar el array resultante
    const formattedRoster = data
      .map(row => ({
        ...row.players,
        status: row.status,
        team_name: row.team_name
      }))
      .sort((a, b) => b.overall - a.overall); // Orden descendente por media

    return formattedRoster;
  } catch (error) {
    console.error('Error al obtener plantilla:', error.message);
    throw new Error('No se pudo cargar la plantilla: ' + error.message);
  }
};

/**
 * Busca jugadores disponibles en la base global que NO estén ya en el torneo actual
 * y cuyo nombre coincida (parcialmente) con el término de búsqueda o filtros.
 */
export const searchAvailablePlayers = async (tournamentId, query, filters = {}) => {
  const hasFilters = filters.minOverall || filters.position || filters.nationality;
  if ((!query || query.length < 2) && !hasFilters) return [];

  try {
    // 1. Obtener los IDs de los jugadores que YA ESTÁN en el torneo (activos)
    const { data: activePlayers, error: activeError } = await supabase
      .from('tournament_rosters')
      .select('player_id')
      .eq('tournament_id', tournamentId)
      .eq('status', 'active');

    if (activeError) throw activeError;
    const activeIds = activePlayers.map(p => p.player_id);

    // 2. Buscar en la base 'players'
    let queryBuilder = supabase
      .from('players')
      .select('player_id, short_name, long_name, overall, player_positions, player_face_url, club_name, nationality_name')
      .order('overall', { ascending: false })
      .limit(30);

    if (query && query.length >= 2) {
      queryBuilder = queryBuilder.or(`short_name.ilike.%${query}%,long_name.ilike.%${query}%`);
    }

    if (filters.minOverall) {
      queryBuilder = queryBuilder.gte('overall', parseInt(filters.minOverall));
    }
    if (filters.position) {
      queryBuilder = queryBuilder.ilike('player_positions', `%${filters.position}%`);
    }
    if (filters.nationality) {
      queryBuilder = queryBuilder.ilike('nationality_name', `%${filters.nationality}%`);
    }

    // Si hay jugadores activos, los filtramos fuera de los resultados
    if (activeIds.length > 0) {
        queryBuilder = queryBuilder.not('player_id', 'in', `(${activeIds.join(',')})`);
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error buscando jugadores:', error.message);
    throw new Error('No se pudo buscar jugadores: ' + error.message);
  }
};

/**
 * Quita a un jugador de la plantilla (lo marca como 'released' o lo elimina).
 */
export const releasePlayer = async (tournamentId, clubName, playerId) => {
  try {
    // Para historial podríamos hacer UPDATE a status='released'. 
    // Aquí haremos DELETE para limpiar la tabla o simplemente UPDATE.
    // Usaremos DELETE por simplicidad.
    const { error } = await supabase
      .from('tournament_rosters')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('team_name', clubName)
      .eq('player_id', playerId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error al quitar jugador:', error.message);
    throw new Error('No se pudo quitar al jugador: ' + error.message);
  }
};

/**
 * Ficha a un jugador añadiéndolo a la plantilla del equipo en el torneo.
 */
export const signPlayer = async (tournamentId, clubName, playerId) => {
  try {
    // Usamos upsert para evitar errores de clave única si ya estaba registrado y fue liberado antes.
    const { error } = await supabase
      .from('tournament_rosters')
      .upsert({
        tournament_id: tournamentId,
        team_name: clubName,
        player_id: playerId,
        status: 'active'
      }, { onConflict: 'tournament_id,player_id' });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error al fichar jugador:', error.message);
    throw new Error('No se pudo fichar al jugador: ' + error.message);
  }
};
