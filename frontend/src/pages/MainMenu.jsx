import React, { useState, useEffect } from 'react';
import sounds from '../utils/audio';

const MainMenu = ({ onNewTournament, onLoadTournament }) => {
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch saved tournaments
  const fetchTournaments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/tournaments');
      if (!res.ok) throw new Error('Error al conectar con el servidor.');
      const data = await res.json();
      setTournaments(data);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los torneos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showLoadModal) {
      fetchTournaments();
    }
  }, [showLoadModal]);

  const handleSelectTournament = async (filename) => {
    sounds.playSuccess();
    try {
      const res = await fetch(`http://localhost:5000/api/tournaments/${filename}`);
      if (!res.ok) throw new Error('Error al cargar los datos del torneo.');
      const data = await res.json();
      onLoadTournament(filename, data);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTournament = async (e, filename) => {
    e.stopPropagation(); // Avoid triggering selection
    if (!window.confirm('¿Seguro que deseas eliminar permanentemente este torneo?')) return;
    
    sounds.playFail();
    try {
      const res = await fetch(`http://localhost:5000/api/tournaments/${filename}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('No se pudo eliminar el torneo.');
      fetchTournaments(); // Refresh list
    } catch (err) {
      alert(err.message);
    }
  };

  const openLoadModal = () => {
    sounds.playSwoosh();
    setShowLoadModal(true);
  };

  const closeLoadModal = () => {
    sounds.playSwoosh();
    setShowLoadModal(false);
  };

  const handleNewTournamentClick = () => {
    sounds.playSwoosh();
    onNewTournament();
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-darkBg text-white overflow-hidden p-6 select-none">
      {/* Background cinematic glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,18,32,0.6)_0%,rgba(3,5,8,1)_90%)] z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0e1520_1px,transparent_1px),linear-gradient(to_bottom,#0e1520_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-25 z-0" />

      {/* Header logo */}
      <div className="absolute top-8 text-center z-10">
        <h2 className="text-xl font-bold tracking-[0.3em] text-gray-500 uppercase font-mono">
          TORNEO LEYENDAS <span className="text-neonCyan drop-shadow-[0_0_5px_rgba(0,240,255,0.4)]">FC</span>
        </h2>
      </div>

      {/* Main Actions container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl w-full z-10 px-4 mt-12">
        {/* NUEVO TORNEO */}
        <div
          onClick={handleNewTournamentClick}
          className="group relative flex flex-col items-center justify-center p-8 bg-panelBg/80 border border-panelBorder rounded-2xl cursor-pointer hover:border-neonCyan transition-all duration-300 shadow-xl hover:-translate-y-1 select-none"
        >
          {/* Neon border hover glow */}
          <div className="absolute inset-0 rounded-2xl bg-neonCyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          
          <div className="w-16 h-16 rounded-full border border-panelBorder flex items-center justify-center bg-darkBg group-hover:border-neonCyan group-hover:shadow-neonCyan transition-all duration-300">
            <svg className="w-8 h-8 text-neonCyan group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <h3 className="text-2xl font-black tracking-wider text-white mt-6 group-hover:text-neonCyan transition-colors duration-300">
            NUEVO TORNEO
          </h3>
          <p className="text-xs text-gray-400 text-center mt-3 leading-relaxed max-w-xs">
            Inicia el asistente paso a paso, define los participantes, sortea equipos, capitanes y tira las ruletas de ventajas.
          </p>
        </div>

        {/* CARGAR TORNEO */}
        <div
          onClick={openLoadModal}
          className="group relative flex flex-col items-center justify-center p-8 bg-panelBg/80 border border-panelBorder rounded-2xl cursor-pointer hover:border-neonGold transition-all duration-300 shadow-xl hover:-translate-y-1 select-none"
        >
          {/* Neon border hover glow */}
          <div className="absolute inset-0 rounded-2xl bg-neonGold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          
          <div className="w-16 h-16 rounded-full border border-panelBorder flex items-center justify-center bg-darkBg group-hover:border-neonGold group-hover:shadow-neonGold transition-all duration-300">
            <svg className="w-8 h-8 text-neonGold group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </div>
          <h3 className="text-2xl font-black tracking-wider text-white mt-6 group-hover:text-neonGold transition-colors duration-300">
            CARGAR TORNEO
          </h3>
          <p className="text-xs text-gray-400 text-center mt-3 leading-relaxed max-w-xs">
            Recupera el historial de un torneo guardado. Incluye las plantillas, resultados de partidos, clasificaciones y fichajes.
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-8 text-[10px] text-gray-600 font-mono tracking-widest">
        DEDICADO AL ENTRETENIMIENTO ENTRE AMIGOS
      </div>

      {/* LOAD TOURNAMENT MODAL OVERLAY */}
      {showLoadModal && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 p-4">
          <div className="bg-panelBg border border-panelBorder rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[80vh] animate-scale-up">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-panelBorder pb-4">
              <h3 className="text-xl font-extrabold text-white tracking-wide font-mono">
                SELECCIONAR TORNEO GUARDADO
              </h3>
              <button
                onClick={closeLoadModal}
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto mt-4 pr-2">
              {loading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-10 h-10 border-2 border-neonCyan border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-gray-400 font-mono mt-3">CARGANDO ARCHIVOS DE TORNEOS...</span>
                </div>
              )}

              {error && (
                <div className="text-center py-12">
                  <p className="text-neonPink font-mono text-sm">{error}</p>
                  <button
                    onClick={fetchTournaments}
                    className="mt-4 px-6 py-2 bg-panelBorder rounded-full text-xs hover:bg-gray-800 transition-all font-mono"
                  >
                    REINTENTAR
                  </button>
                </div>
              )}

              {!loading && !error && tournaments.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 font-mono text-sm">No se encontraron torneos guardados.</p>
                  <p className="text-gray-600 text-xs mt-1">¡Crea tu primer torneo desde el menú principal!</p>
                </div>
              )}

              {!loading && !error && tournaments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {tournaments.map((t) => (
                    <div
                      key={t.filename}
                      onClick={() => handleSelectTournament(t.filename)}
                      className="group relative flex flex-col justify-between p-4 bg-darkBg/60 border border-panelBorder rounded-xl cursor-pointer hover:border-neonCyan transition-all duration-300"
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="font-extrabold text-sm text-white group-hover:text-neonCyan transition-colors line-clamp-1">
                            {t.name}
                          </span>
                          <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            t.status === 'Finalizado' ? 'bg-green-950 text-green-400' : 'bg-cyan-950 text-neonCyan'
                          }`}>
                            {t.status}
                          </span>
                        </div>
                        
                        <div className="mt-3 grid grid-cols-2 gap-1 text-[10px] text-gray-400 font-mono">
                          <div>
                            <span className="text-gray-500 block">Equipos:</span>
                            <span className="text-white font-bold">{t.teams_count}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Jugadores:</span>
                            <span className="text-white font-bold">{t.players.join(', ')}</span>
                          </div>
                        </div>

                        {t.champion && (
                          <div className="mt-3 bg-yellow-950/20 border border-yellow-600/20 rounded p-1.5 text-[10px]">
                            <span className="text-neonGold font-bold flex items-center gap-1">
                              🏆 {t.champion} ({t.winner_owner})
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex justify-between items-center border-t border-panelBorder/40 pt-2 text-[9px] text-gray-500 font-mono">
                        <span>{t.updated_at}</span>
                        
                        {/* Delete button */}
                        <button
                          onClick={(e) => handleDeleteTournament(e, t.filename)}
                          className="text-gray-500 hover:text-neonPink transition-colors p-1"
                          title="Eliminar torneo"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainMenu;
