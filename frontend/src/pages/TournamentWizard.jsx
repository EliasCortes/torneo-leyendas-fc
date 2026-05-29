import React, { useState, useEffect } from 'react';
import sounds from '../utils/audio';

const TournamentWizard = ({ onCreated, onBack }) => {
  const [step, setStep] = useState(1);
  const [constants, setConstants] = useState({ teams: [], diamond_legends: [] });
  
  // Step 1 State: Initial Config
  const [name, setName] = useState('Superliga Leyendas');
  const [numPlayers, setNumPlayers] = useState(2);
  const [playerNames, setPlayerNames] = useState(['Elias', 'Alvaro']);
  const [formatType, setFormatType] = useState('16 equipos');
  const [teamsPerPlayer, setTeamsPerPlayer] = useState(8);

  // Step 2 State: Previous Champion
  const [hasPrevChampion, setHasPrevChampion] = useState(false);
  const [prevChampTeam, setPrevChampTeam] = useState('');
  const [prevChampOwner, setPrevChampOwner] = useState('Alvaro');
  const [prevCaptain, setPrevCaptain] = useState('');
  const [retainedPlayers, setRetainedPlayers] = useState('');
  const [prevBenefits, setPrevBenefits] = useState('');

  // Fetch constants for dropdown selections
  useEffect(() => {
    fetch('http://localhost:5000/api/constants')
      .then(res => res.json())
      .then(data => {
        const teams = data.teams || [];
        const diamond = data.diamond_legends || [];
        setConstants({ teams, diamond_legends: diamond });
        if (teams.length > 0) setPrevChampTeam(teams[0]);
        if (diamond.length > 0) setPrevCaptain(diamond[0]);
      })
      .catch(err => console.error('Error fetching constants:', err));
  }, []);

  // Step 3 State: Wildcards (Comodines)
  const [wildcardBonuses, setWildcardBonuses] = useState({
    topScorer: '',      // Player name who gets +1 wildcard
    topAssistant: '',   // Player name who gets +1 wildcard
    bestGoal: ''        // Player name who gets +1 wildcard
  });

  // Manual wildcards tweak
  const [manualWildcards, setManualWildcards] = useState({});

  // Helper to adjust number of players
  const handleNumPlayersChange = (val) => {
    const num = Math.max(1, parseInt(val) || 1);
    setNumPlayers(num);
    
    // Resize player names array
    const updated = [...playerNames];
    if (num > updated.length) {
      for (let i = updated.length; i < num; i++) {
        updated.push(`Jugador ${i + 1}`);
      }
    } else if (num < updated.length) {
      updated.splice(num);
    }
    setPlayerNames(updated);
  };

  const handlePlayerNameChange = (idx, val) => {
    const updated = [...playerNames];
    updated[idx] = val;
    setPlayerNames(updated);
  };

  // Next and Back navigation
  const nextStep = () => {
    sounds.playSwoosh();
    
    if (step === 1) {
      // Validate that total teams (numPlayers * teamsPerPlayer) equals format teams if not custom
      if (formatType !== 'Personalizado') {
        const expectedTeams = parseInt(formatType) || 16;
        const actualTeams = numPlayers * teamsPerPlayer;
        if (actualTeams !== expectedTeams) {
          alert(`El número de equipos totales (${actualTeams} = ${numPlayers} participantes x ${teamsPerPlayer} equipos por jugador) no coincide con el formato seleccionado (${expectedTeams} equipos).\n\nAjusta los participantes, los equipos por jugador o cambia el formato a "Personalizado".`);
          return;
        }
      }

      // Initialize manual wildcards structure with 1 base wildcard for everyone
      const initialManual = {};
      playerNames.forEach(p => {
        initialManual[p] = 1;
      });
      setManualWildcards(initialManual);
    }
    
    setStep(step + 1);
  };

  const prevStep = () => {
    sounds.playSwoosh();
    setStep(step - 1);
  };

  // Build final wildcards count mapping
  const computeFinalWildcards = () => {
    const counts = {};
    playerNames.forEach(p => {
      // 1 Base wildcard + manual adjustments + bonuses
      let total = manualWildcards[p] || 1;
      
      if (wildcardBonuses.topScorer === p) total += 1;
      if (wildcardBonuses.topAssistant === p) total += 1;
      if (wildcardBonuses.bestGoal === p) total += 1;
      
      counts[p] = total;
    });
    return counts;
  };

  // Submit and create tournament in backend
  const handleSubmit = async () => {
    sounds.playSuccess();
    
    const finalWildcards = computeFinalWildcards();
    
    // Prepare initial data mapping for creation
    const configData = {
      name,
      players: playerNames,
      format: formatType,
      teamsPerPlayer,
      advantages: {
        hasPrevChampion,
        prevChampTeam: hasPrevChampion ? prevChampTeam : null,
        prevChampOwner: hasPrevChampion ? prevChampOwner : null,
        prevCaptain: hasPrevChampion ? prevCaptain : null,
        retainedPlayers: hasPrevChampion ? retainedPlayers.split(',').map(s => s.trim()).filter(Boolean) : [],
        prevBenefits: hasPrevChampion ? prevBenefits : null,
        wildcards: finalWildcards
      }
    };

    try {
      const res = await fetch('http://localhost:5000/api/tournaments/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData)
      });
      
      if (!res.ok) throw new Error('Error al inicializar el torneo en el servidor.');
      const data = await res.json();
      
      // Pass the advantage/wildcard information along in the initialized structure
      data.advantages = configData.advantages;
      
      // Trigger callback to parents
      onCreated(data.filename, data);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-darkBg text-white p-6 select-none">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,18,32,0.5)_0%,rgba(3,5,8,1)_95%)] z-0" />
      
      {/* Content wrapper */}
      <div className="bg-panelBg/95 border border-panelBorder rounded-2xl max-w-xl w-full p-8 shadow-2xl z-10 animate-scale-up">
        {/* Step Indicator */}
        <div className="flex justify-between items-center mb-8 border-b border-panelBorder pb-4">
          <div>
            <span className="text-[10px] text-neonCyan font-mono tracking-widest block uppercase">Paso {step} de 3</span>
            <h3 className="text-xl font-black text-white tracking-wide uppercase font-mono mt-0.5">
              {step === 1 && 'Configuración Inicial'}
              {step === 2 && 'Campeón Anterior'}
              {step === 3 && 'Sistema de Ventajas'}
            </h3>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-1.5 border border-panelBorder rounded-full text-xs text-gray-400 hover:text-white hover:border-white transition-all font-mono"
          >
            VOLVER AL MENÚ
          </button>
        </div>

        {/* ================= STEP 1: CONFIGURATION ================= */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Tournament Name */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-400 font-mono tracking-wide mb-1.5">NOMBRE DEL TORNEO</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-darkBg border border-panelBorder p-3 rounded-lg text-sm text-white focus:outline-none focus:border-neonCyan transition-all font-semibold"
                placeholder="Escribe el nombre del torneo..."
              />
            </div>

            {/* Format Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-xs text-gray-400 font-mono tracking-wide mb-1.5">FORMATO</label>
                <select
                  value={formatType}
                  onChange={(e) => setFormatType(e.target.value)}
                  className="bg-darkBg border border-panelBorder p-3 rounded-lg text-sm text-white focus:outline-none focus:border-neonCyan font-semibold"
                >
                  <option value="8 equipos">8 Equipos</option>
                  <option value="16 equipos">16 Equipos</option>
                  <option value="32 equipos">32 Equipos</option>
                  <option value="Personalizado">Personalizado</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-gray-400 font-mono tracking-wide mb-1.5">EQUIPOS POR JUGADOR</label>
                <input
                  type="number"
                  min="1"
                  value={teamsPerPlayer}
                  onChange={(e) => setTeamsPerPlayer(Math.max(1, parseInt(e.target.value) || 1))}
                  className="bg-darkBg border border-panelBorder p-3 rounded-lg text-sm text-white focus:outline-none focus:border-neonCyan font-semibold"
                />
              </div>
            </div>

            {/* Number of Players */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-400 font-mono tracking-wide mb-1.5">NÚMERO DE PARTICIPANTES</label>
              <input
                type="number"
                min="1"
                value={numPlayers}
                onChange={(e) => handleNumPlayersChange(e.target.value)}
                className="bg-darkBg border border-panelBorder p-3 rounded-lg text-sm text-white focus:outline-none focus:border-neonCyan font-semibold"
              />
            </div>

            {/* Participant Names List */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-400 font-mono tracking-wide mb-2.5">NOMBRES DE PARTICIPANTES</label>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {playerNames.map((pName, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-xs text-neonCyan font-mono w-6">#{idx + 1}</span>
                    <input
                      type="text"
                      value={pName}
                      onChange={(e) => handlePlayerNameChange(idx, e.target.value)}
                      className="flex-1 bg-darkBg border border-panelBorder p-2 rounded-lg text-sm text-white focus:outline-none focus:border-neonCyan font-semibold"
                      placeholder={`Jugador ${idx + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation buttons */}
            <button
              onClick={nextStep}
              className="w-full mt-6 py-3 rounded-xl font-bold bg-gradient-to-r from-neonCyan to-cyan-500 text-darkBg shadow-neonCyan hover:brightness-105 active:scale-95 transition-all text-center tracking-wider text-sm"
            >
              SIGUIENTE PASO
            </button>
          </div>
        )}

        {/* ================= STEP 2: PREVIOUS CHAMPION ================= */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Toggle Switch */}
            <div className="flex items-center justify-between bg-darkBg/60 border border-panelBorder p-4 rounded-xl">
              <div className="flex flex-col">
                <span className="text-sm font-bold">¿Existe Campeón Anterior?</span>
                <span className="text-xs text-gray-500 mt-0.5">Activa para arrastrar ventajas y fichajes.</span>
              </div>
              <button
                onClick={() => setHasPrevChampion(!hasPrevChampion)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
                  hasPrevChampion ? 'bg-neonCyan' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                    hasPrevChampion ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {hasPrevChampion && (
              <div className="space-y-4 animate-fade-in">
                {/* Previous Champ Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-400 font-mono mb-1.5">DUEÑO CAMPEÓN</label>
                    <select
                      value={prevChampOwner}
                      onChange={(e) => setPrevChampOwner(e.target.value)}
                      className="bg-darkBg border border-panelBorder p-2.5 rounded-lg text-sm text-white focus:outline-none focus:border-neonCyan font-semibold"
                    >
                      {playerNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-xs text-gray-400 font-mono mb-1.5">EQUIPO CAMPEÓN</label>
                    <select
                      value={prevChampTeam}
                      onChange={(e) => setPrevChampTeam(e.target.value)}
                      className="bg-darkBg border border-panelBorder p-2.5 rounded-lg text-sm text-white focus:outline-none focus:border-neonCyan font-semibold cursor-pointer"
                    >
                      {constants.teams.map(team => (
                        <option key={team} value={team}>{team}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Retained Captain */}
                <div className="flex flex-col">
                  <label className="text-xs text-gray-400 font-mono mb-1.5">CAPITÁN CONSERVADO (DIAMANTE)</label>
                  <select
                    value={prevCaptain}
                    onChange={(e) => setPrevCaptain(e.target.value)}
                    className="bg-darkBg border border-panelBorder p-2.5 rounded-lg text-sm text-white focus:outline-none focus:border-neonCyan font-semibold cursor-pointer"
                  >
                    {constants.diamond_legends.map(cap => (
                      <option key={cap} value={cap}>{cap}</option>
                    ))}
                  </select>
                </div>

                {/* Retained players (comma separated list) */}
                <div className="flex flex-col">
                  <label className="text-xs text-gray-400 font-mono mb-1.5">JUGADORES CONSERVADOS (Separar por comas)</label>
                  <input
                    type="text"
                    value={retainedPlayers}
                    onChange={(e) => setRetainedPlayers(e.target.value)}
                    className="bg-darkBg border border-panelBorder p-2.5 rounded-lg text-sm text-white focus:outline-none focus:border-neonCyan text-xs"
                    placeholder="Ej: Mbappe, Van Dijk, Lampard"
                  />
                  <span className="text-[10px] text-gray-500 mt-1">
                    Estos jugadores se reservarán directamente en la plantilla de este equipo.
                  </span>
                </div>

                {/* Benefits */}
                <div className="flex flex-col">
                  <label className="text-xs text-gray-400 font-mono mb-1.5">BENEFICIOS ESPECIALES</label>
                  <input
                    type="text"
                    value={prevBenefits}
                    onChange={(e) => setPrevBenefits(e.target.value)}
                    className="bg-darkBg border border-panelBorder p-2.5 rounded-lg text-sm text-white focus:outline-none focus:border-neonCyan text-xs"
                    placeholder="Ej: +1 comodín de oro adicional"
                  />
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={prevStep}
                className="flex-1 py-3 rounded-xl font-bold bg-panelBorder text-white hover:bg-gray-800 transition-all text-center text-sm"
              >
                ATRÁS
              </button>
              <button
                onClick={nextStep}
                className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-neonCyan to-cyan-500 text-darkBg shadow-neonCyan hover:brightness-105 active:scale-95 transition-all text-center tracking-wider text-sm"
              >
                SIGUIENTE
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: FICHAS DE REPESCA / ADVANTAGES ================= */}
        {step === 3 && (
          <div className="space-y-5">
            <p className="text-xs text-gray-400 leading-relaxed font-mono">
              Todos los participantes empiezan con <span className="text-neonCyan font-bold">1 Ficha de Repesca base</span>. 
              Asigna los logros del torneo anterior para otorgar Fichas de Repesca extra (+1 por logro).
            </p>

            {/* Bonuses configuration */}
            <div className="space-y-3">
              {/* Max Scorer */}
              <div className="flex items-center justify-between p-3 bg-darkBg/60 border border-panelBorder rounded-xl">
                <div>
                  <span className="text-xs font-bold text-neonGold block">⚽ MÁXIMO GOLEADOR (+1)</span>
                  <span className="text-[10px] text-gray-500 font-mono mt-0.5">El participante con más goles</span>
                </div>
                <select
                  value={wildcardBonuses.topScorer}
                  onChange={(e) => setWildcardBonuses({ ...wildcardBonuses, topScorer: e.target.value })}
                  className="bg-darkBg border border-panelBorder p-2 rounded text-xs text-white focus:outline-none"
                >
                  <option value="">Nadie</option>
                  {playerNames.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Max Assistant */}
              <div className="flex items-center justify-between p-3 bg-darkBg/60 border border-panelBorder rounded-xl">
                <div>
                  <span className="text-xs font-bold text-neonSilver block">👟 MÁXIMO ASISTENTE (+1)</span>
                  <span className="text-[10px] text-gray-500 font-mono mt-0.5">El participante con más asistencias</span>
                </div>
                <select
                  value={wildcardBonuses.topAssistant}
                  onChange={(e) => setWildcardBonuses({ ...wildcardBonuses, topAssistant: e.target.value })}
                  className="bg-darkBg border border-panelBorder p-2 rounded text-xs text-white focus:outline-none"
                >
                  <option value="">Nadie</option>
                  {playerNames.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Best Goal */}
              <div className="flex items-center justify-between p-3 bg-darkBg/60 border border-panelBorder rounded-xl">
                <div>
                  <span className="text-xs font-bold text-neonBronze block">🔥 MEJOR GOL DEL TORNEO (+1)</span>
                  <span className="text-[10px] text-gray-500 font-mono mt-0.5">El gol más espectacular</span>
                </div>
                <select
                  value={wildcardBonuses.bestGoal}
                  onChange={(e) => setWildcardBonuses({ ...wildcardBonuses, bestGoal: e.target.value })}
                  className="bg-darkBg border border-panelBorder p-2 rounded text-xs text-white focus:outline-none"
                >
                  <option value="">Nadie</option>
                  {playerNames.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Total Wildcards/Repescas Recap (Manual Adjustments) */}
            <div className="border-t border-panelBorder pt-4 mt-6">
              <label className="text-xs text-gray-400 font-mono block mb-3">RECAPITULACIÓN Y REPESCAS FINALES</label>
              
              <div className="space-y-3">
                {playerNames.map(p => {
                  // Compute live totals
                  let base = manualWildcards[p] || 1;
                  let bonus = 0;
                  if (wildcardBonuses.topScorer === p) bonus += 1;
                  if (wildcardBonuses.topAssistant === p) bonus += 1;
                  if (wildcardBonuses.bestGoal === p) bonus += 1;
                  const total = base + bonus;

                  return (
                    <div key={p} className="flex justify-between items-center p-3 bg-panelBg border border-panelBorder rounded-xl">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-sm">{p}</span>
                        <span className="text-[10px] text-gray-400 font-mono">Base: {base} | Logros: +{bonus}</span>
                      </div>
                      
                      {/* Controls to manually edit base wildcards */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            sounds.playTick();
                            setManualWildcards({
                              ...manualWildcards,
                              [p]: Math.max(0, base - 1)
                            });
                          }}
                          className="w-8 h-8 rounded-full border border-panelBorder flex items-center justify-center text-gray-400 hover:border-white hover:text-white"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-black font-mono text-neonCyan text-lg">{total}</span>
                        <button
                          onClick={() => {
                            sounds.playTick();
                            setManualWildcards({
                              ...manualWildcards,
                              [p]: base + 1
                            });
                          }}
                          className="w-8 h-8 rounded-full border border-panelBorder flex items-center justify-center text-gray-400 hover:border-white hover:text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={prevStep}
                className="flex-1 py-3 rounded-xl font-bold bg-panelBorder text-white hover:bg-gray-800 transition-all text-center text-sm"
              >
                ATRÁS
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 rounded-xl font-black bg-gradient-to-r from-neonCyan to-cyan-500 text-darkBg shadow-neonCyan hover:brightness-105 active:scale-95 transition-all text-center tracking-wider text-sm uppercase"
              >
                EMPEZAR TORNEO
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentWizard;
