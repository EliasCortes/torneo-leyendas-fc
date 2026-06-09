import React, { useState, useEffect } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import {
  getTeamRoster,
  searchAvailablePlayers,
  releasePlayer,
  signPlayer
} from '../services/rosterService';
import LogoEquipo from './LogoEquipo';
import sounds from '../utils/audio';

const TeamManagerPanel = ({ tournamentId, selectedTeamObj }) => {
  const [supabaseRoster, setSupabaseRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [error, setError] = useState('');

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Filters
  const [minOverall, setMinOverall] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [nationalityFilter, setNationalityFilter] = useState('');
  const debouncedMinOverall = useDebounce(minOverall, 500);
  const debouncedNationality = useDebounce(nationalityFilter, 500);

  // Release Search
  const [releaseSearchQuery, setReleaseSearchQuery] = useState('');
  const [showReleaseSuggestions, setShowReleaseSuggestions] = useState(false);
  const releaseCandidates = supabaseRoster.filter(p => p.short_name.toLowerCase().includes(releaseSearchQuery.toLowerCase()));

  const teamName = selectedTeamObj?.name;
  const localLegends = selectedTeamObj?.legends || [];

  // Load roster
  useEffect(() => {
    if (!tournamentId || !teamName) return;
    loadRoster();
  }, [tournamentId, teamName]);

  const loadRoster = async () => {
    try {
      setLoadingRoster(true);
      setError('');
      const data = await getTeamRoster(tournamentId, teamName);
      setSupabaseRoster(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRoster(false);
    }
  };

  // Run search
  useEffect(() => {
    const hasSearchTerms = debouncedSearchQuery.trim().length >= 2;
    const hasFilters = debouncedMinOverall || positionFilter || debouncedNationality;

    if (hasSearchTerms || hasFilters) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery, debouncedMinOverall, positionFilter, debouncedNationality, tournamentId]);

  const handleSearch = async () => {
    try {
      setIsSearching(true);
      const filters = {
        minOverall: debouncedMinOverall,
        position: positionFilter,
        nationality: debouncedNationality
      };
      const results = await searchAvailablePlayers(tournamentId, debouncedSearchQuery, filters);
      setSearchResults(results);
    } catch (err) {
      console.error('Error buscando:', err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSignPlayer = async (player) => {
    try {
      if(sounds?.playSwoosh) sounds.playSwoosh();
      await signPlayer(tournamentId, teamName, player.player_id);
      
      // Remove from search results instantly for snappy UX
      setSearchResults(prev => prev.filter(p => p.player_id !== player.player_id));
      
      loadRoster();
    } catch (err) {
      alert('Error al fichar: ' + err.message);
    }
  };

  const handleReleasePlayer = async (player) => {
    if (!window.confirm(`¿Seguro que quieres quitar a ${player.short_name} de ${teamName}?`)) return;
    try {
      if(sounds?.playFail) sounds.playFail();
      await releasePlayer(tournamentId, teamName, player.player_id);
      loadRoster();
    } catch (err) {
      alert('Error al quitar: ' + err.message);
    }
  };

  if (!selectedTeamObj) return null;

  return (
    <div className="w-full flex flex-col gap-6 font-sans text-gray-200 mt-2">
      
      {/* HEADER SECTION (Combined count) */}
      <div className="flex justify-between items-center bg-darkBg/40 border border-panelBorder p-4 rounded-2xl shadow-xl backdrop-blur-md">
        <div>
          <h2 className="text-sm font-black font-mono tracking-widest text-white uppercase">Gestor de Jugadores</h2>
          <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
            Catálogo Supabase & Leyendas Locales
          </span>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-black/40 border border-neonGold/20 rounded-lg px-3 py-1.5 text-center">
            <span className="block text-[9px] font-mono text-neonGold uppercase tracking-widest">Leyendas</span>
            <span className="block text-lg font-black text-white">{localLegends.length}</span>
          </div>
          <div className="bg-black/40 border border-neonCyan/20 rounded-lg px-3 py-1.5 text-center">
            <span className="block text-[9px] font-mono text-neonCyan uppercase tracking-widest">Reales</span>
            <span className="block text-lg font-black text-white">{supabaseRoster.length}</span>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-darkBg/60 border border-panelBorder rounded-2xl p-5 shadow-lg backdrop-blur-md">
        <h3 className="text-xs font-bold font-mono text-neonGold tracking-widest uppercase mb-4 flex items-center gap-2">
          <span>🎯</span> Mercado de Fichajes (Catálogo Global)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          {/* Nombre */}
          <div className="md:col-span-2 relative">
            <input 
              type="text" 
              placeholder="Buscar por nombre..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/50 border border-panelBorder rounded-xl pl-10 pr-4 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neonGold/50 transition-all"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </div>

          {/* Posición */}
          <div>
            <select 
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="w-full bg-black/50 border border-panelBorder rounded-xl px-3 py-2 font-mono text-sm text-white focus:outline-none focus:border-neonGold/50 transition-all cursor-pointer"
            >
              <option value="">Todas Pos.</option>
              <option value="GK">Portero (GK)</option>
              <option value="CB">Defensa (CB, LB, RB)</option>
              <option value="CM">Medio (CM, CDM, CAM)</option>
              <option value="ST">Delantero (ST, RW, LW)</option>
            </select>
          </div>

          {/* Media Mínima */}
          <div>
            <input 
              type="number" 
              placeholder="Media Min. (Ej: 80)" 
              value={minOverall}
              onChange={(e) => setMinOverall(e.target.value)}
              min="0" max="99"
              className="w-full bg-black/50 border border-panelBorder rounded-xl px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neonGold/50 transition-all"
            />
          </div>
        </div>

        {/* Nacionalidad */}
        <div className="relative mb-2">
          <input 
            type="text" 
            placeholder="Filtrar por nacionalidad (Ej: Spain, Argentina...)" 
            value={nationalityFilter}
            onChange={(e) => setNationalityFilter(e.target.value)}
            className="w-full bg-black/50 border border-panelBorder rounded-xl px-4 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neonGold/50 transition-all"
          />
        </div>

        {/* Loading indicator */}
        {isSearching && (
          <div className="flex items-center gap-2 mt-2 text-neonGold text-xs font-mono">
            <div className="w-3 h-3 border-2 border-neonGold border-t-transparent rounded-full animate-spin" />
            Buscando jugadores...
          </div>
        )}

        {/* SEARCH RESULTS */}
        {searchResults.length > 0 && (
          <div className="mt-4 bg-black/80 border border-panelBorder rounded-xl overflow-hidden shadow-2xl max-h-60 overflow-y-auto">
            {searchResults.map(p => (
              <div key={p.player_id} className="flex items-center justify-between p-3 border-b border-white/5 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-900 border border-white/10 overflow-hidden flex-shrink-0">
                    <img 
                      src={p.player_face_url} 
                      alt={p.short_name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234B5563'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{p.short_name}</h4>
                    <p className="text-[10px] font-mono text-gray-500">{p.player_positions} • {p.club_name} • {p.nationality_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <span className="block text-[10px] text-gray-500 font-mono">OVR</span>
                    <span className="font-black text-neonCyan">{p.overall}</span>
                  </div>
                  <button 
                    onClick={() => handleSignPlayer(p)}
                    className="px-4 py-1.5 bg-neonGold/10 border border-neonGold/30 text-neonGold text-xs font-bold font-mono rounded hover:bg-neonGold hover:text-black transition-all uppercase tracking-wider"
                  >
                    Fichar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RELEASE PLAYER SEARCH */}
      {supabaseRoster.length > 0 && (
        <div className="bg-darkBg/60 border border-panelBorder rounded-2xl p-5 shadow-lg backdrop-blur-md relative">
          <h3 className="text-xs font-bold font-mono text-neonPink tracking-widest uppercase mb-4 flex items-center gap-2">
            <span>🗑️</span> Liberar Jugador
          </h3>
          <input
            type="text"
            placeholder="Buscar jugador en tu plantilla para liberarlo..."
            value={releaseSearchQuery}
            onFocus={() => setShowReleaseSuggestions(true)}
            onBlur={() => setTimeout(() => setShowReleaseSuggestions(false), 200)}
            onChange={(e) => setReleaseSearchQuery(e.target.value)}
            className="w-full bg-black/50 border border-neonPink/30 rounded-xl px-4 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neonPink transition-all"
          />
          {showReleaseSuggestions && releaseSearchQuery && releaseCandidates.length > 0 && (
            <div className="absolute z-50 left-5 right-5 mt-1 bg-black border border-neonPink/50 rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
              {releaseCandidates.map(p => (
                <div 
                  key={p.player_id} 
                  onClick={() => {
                    setReleaseSearchQuery('');
                    handleReleasePlayer(p);
                  }}
                  className="flex items-center gap-3 p-3 border-b border-white/5 hover:bg-neonPink/20 cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-900 border border-white/10 overflow-hidden flex-shrink-0">
                    <img 
                      src={p.player_face_url} 
                      alt={p.short_name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234B5563'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{p.short_name} <span className="text-neonCyan ml-2 font-mono">OVR {p.overall}</span></h4>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ROSTER LIST (Combined) */}
      <div className="bg-darkBg/40 border border-panelBorder rounded-2xl p-5 shadow-lg backdrop-blur-md">
        <h3 className="text-sm font-extrabold tracking-wider font-mono text-gray-400 mb-5 uppercase">
          PLANTILLA UNIFICADA
        </h3>

        {loadingRoster ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-8 h-8 border-2 border-neonCyan border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-400 font-mono mt-3 tracking-widest">CARGANDO...</span>
          </div>
        ) : error ? (
          <div className="text-center py-6 text-neonPink font-mono text-xs border border-neonPink/20 bg-neonPink/5 rounded-xl">
            {error}
          </div>
        ) : (localLegends.length === 0 && supabaseRoster.length === 0) ? (
          <div className="text-center py-10 text-gray-500 font-mono text-xs">
            Plantilla vacía. Añade leyendas o ficha jugadores reales.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            
            {/* LEYENDAS (Solo lectura) */}
            {localLegends.map((legend, idx) => (
              <div 
                key={`legend-${idx}`} 
                className="group relative flex items-center gap-3 bg-gradient-to-br from-black/80 to-[#1a1500] border border-neonGold/20 rounded-xl p-3 shadow-[0_0_10px_rgba(255,195,60,0.05)]"
              >
                <div className="absolute top-0 right-0 bg-neonGold/20 text-neonGold text-[8px] font-black uppercase px-2 py-0.5 rounded-bl-lg rounded-tr-xl">
                  Leyenda
                </div>
                
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-neonGold/50 flex-shrink-0 flex items-center justify-center bg-black/50">
                  <span className="text-lg">⭐</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white text-sm truncate">{legend.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono font-bold bg-neonGold/10 text-neonGold px-1.5 py-0.5 rounded">
                      {legend.position || 'N/A'}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400 truncate">{legend.category}</span>
                  </div>
                </div>

                <div className="flex-shrink-0 text-center pr-2">
                  <span className="block text-[10px] text-gray-500 font-mono tracking-wider">OVR</span>
                  <span className="font-black text-lg text-neonGold">{legend.rating || 90}</span>
                </div>
              </div>
            ))}

            {/* JUGADORES REALES (Supabase) */}
            {supabaseRoster.map(player => (
              <div 
                key={player.player_id} 
                className="group relative flex items-center gap-3 bg-gradient-to-br from-black/60 to-[#0a1120] border border-white/5 rounded-xl p-3 hover:border-neonCyan/30 transition-all duration-300"
              >
                <div className="absolute top-0 right-0 bg-neonCyan/20 text-neonCyan text-[8px] font-black uppercase px-2 py-0.5 rounded-bl-lg rounded-tr-xl">
                  Real
                </div>

                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-neonCyan/50 transition-colors flex-shrink-0">
                  <img 
                    src={player.player_face_url} 
                    alt={player.short_name} 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234B5563'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
                    }}
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white text-sm truncate">{player.short_name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono font-bold bg-white/10 px-1.5 py-0.5 rounded text-gray-300">
                      {player.player_positions?.split(',')[0] || 'N/A'}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500 truncate">{player.nationality_name}</span>
                  </div>
                </div>

                <div className="flex-shrink-0 text-center pr-2">
                  <span className="block text-[10px] text-gray-500 font-mono tracking-wider">OVR</span>
                  <span className="font-black text-lg text-neonCyan">{player.overall}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default TeamManagerPanel;
