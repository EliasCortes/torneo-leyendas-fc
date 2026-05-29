import React, { useState, useEffect, useRef } from 'react';
import RouletteWheel from '../components/RouletteWheel';
import PlayerCard from '../components/PlayerCard';
import sounds from '../utils/audio';
import { getLegendPosition } from '../utils/legendPositions';

const DraftRoom = ({ initialTournamentData, onComplete, onBackToMenu }) => {
  const [tournament, setTournament] = useState(initialTournamentData);
  const [draftPhase, setDraftPhase] = useState('teams'); // 'teams', 'captains', 'options', 'finished', 'group_distribution'
  
  // Static lists loaded from backend
  const [constants, setConstants] = useState({
    teams: [],
    teams_5_stars: [],
    teams_4_5_stars: [],
    diamond_legends: [],
    gold_legends: [],
    silver_legends: [],
    bronze_legends: [],
    options_roulette: []
  });

  // Current draft pointers
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0); // Index in the turn sequence
  const [turnSequence, setTurnSequence] = useState([]); // List of player names representing draft order
  
  // Phase 1 (Captains) pointers
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  
  // Phase 2 (Options) pointers
  const [currentOptionTeamIndex, setCurrentOptionTeamIndex] = useState(0);
  const [currentSpinNumber, setCurrentSpinNumber] = useState(1); // 1, 2, or 3
  
  // Block clicks/spins during transitions
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal states for manual actions
  const [modalType, setModalType] = useState(null); 
  // 'sub_wheel_5', 'sub_wheel_4.5', 'sub_wheel_legend', 'comodin_select', 'fichar_manual', 'quitar_manual', 'result_message'
  const [modalData, setModalData] = useState({});
  const [manualInput, setManualInput] = useState('');
  const [selectedLegendForComodin, setSelectedLegendForComodin] = useState('');
  const [removeInput, setRemoveInput] = useState('');
  const [removeError, setRemoveError] = useState('');
  
  // Pools that shrink as they are drawn
  const [availableTeams, setAvailableTeams] = useState([]);
  const [availableDiamonds, setAvailableDiamonds] = useState([]);
  const [availableGolds, setAvailableGolds] = useState([]);
  const [availableSilvers, setAvailableSilvers] = useState([]);
  const [availableBronzes, setAvailableBronzes] = useState([]);

  // Player Repesca Tokens Bank
  const [playerRepescas, setPlayerRepescas] = useState({});

  // Group distribution state
  const [groupMode, setGroupMode] = useState('balanced'); // 'balanced', 'random', 'manual'
  const [groups, setGroups] = useState([]); // Array of groups containing team objects

  // --- REFS FOR STALE CLOSURE PREVENTION ---
  const tournamentRef = useRef(tournament);
  const currentTeamIndexRef = useRef(currentTeamIndex);
  const currentOptionTeamIndexRef = useRef(currentOptionTeamIndex);
  const currentTurnIndexRef = useRef(currentTurnIndex);
  
  useEffect(() => { tournamentRef.current = tournament; }, [tournament]);
  useEffect(() => { currentTeamIndexRef.current = currentTeamIndex; }, [currentTeamIndex]);
  useEffect(() => { currentOptionTeamIndexRef.current = currentOptionTeamIndex; }, [currentOptionTeamIndex]);
  useEffect(() => { currentTurnIndexRef.current = currentTurnIndex; }, [currentTurnIndex]);

  // Fetch constants on load
  useEffect(() => {
    const fetchConstants = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/constants');
        const data = await res.json();
        setConstants(data);
        
        // Scan tournament for already drafted teams and legends
        const draftedTeams = new Set();
        const assignedLegends = new Set();
        
        if (tournament.teams) {
          tournament.teams.forEach(t => {
            draftedTeams.add(t.name);
            if (t.captain) assignedLegends.add(t.captain);
            if (t.legends) {
              t.legends.forEach(l => assignedLegends.add(l.name));
            }
          });
        }

        // Initialize pools by excluding already used entities
        setAvailableTeams(data.teams.filter(t => !draftedTeams.has(t)));
        setAvailableDiamonds(data.diamond_legends.filter(c => !assignedLegends.has(c)));
        setAvailableGolds(data.gold_legends.filter(c => !assignedLegends.has(c)));
        setAvailableSilvers(data.silver_legends.filter(c => !assignedLegends.has(c)));
        setAvailableBronzes(data.bronze_legends.filter(c => !assignedLegends.has(c)));
        
        // Initialize player repesca tokens bank
        const reps = {};
        tournament.human_players.forEach(p => {
          reps[p.name] = (tournament.advantages && tournament.advantages.wildcards && tournament.advantages.wildcards[p.name]) || 1;
        });
        setPlayerRepescas(reps);

        // Build Turn Sequence for Sorteo Equipos (alternating order, omitting pre-assigned teams)
        const seq = [];
        const preAssignedCounts = {};
        tournament.human_players.forEach(p => {
          preAssignedCounts[p.name] = 0;
        });
        if (tournament.teams) {
          tournament.teams.forEach(t => {
            if (t.owner) {
              preAssignedCounts[t.owner] = (preAssignedCounts[t.owner] || 0) + 1;
            }
          });
        }
        
        const playerTurns = tournament.human_players.map(p => {
          const needed = Math.max(0, tournament.teams_per_player - (preAssignedCounts[p.name] || 0));
          return { name: p.name, remaining: needed };
        });
        
        let added = true;
        while (added) {
          added = false;
          for (let i = 0; i < playerTurns.length; i++) {
            if (playerTurns[i].remaining > 0) {
              seq.push(playerTurns[i].name);
              playerTurns[i].remaining -= 1;
              added = true;
            }
          }
        }
        setTurnSequence(seq);
      } catch (err) {
        console.error('Error fetching constants:', err);
      }
    };
    fetchConstants();
  }, []);

  // Automatically skip captain selection for teams that already have a captain
  useEffect(() => {
    if (draftPhase === 'captains' && tournament.teams && tournament.teams.length > 0) {
      const currentTeam = tournament.teams[currentTeamIndex];
      if (currentTeam && currentTeam.captain) {
        if (currentTeamIndex < tournament.teams.length - 1) {
          setCurrentTeamIndex(currentTeamIndex + 1);
        } else {
          sounds.playCardReveal();
          setDraftPhase('options');
          setCurrentOptionTeamIndex(0);
          setCurrentSpinNumber(1);
          setIsProcessing(false);
        }
      }
    }
  }, [draftPhase, currentTeamIndex, tournament.teams]);

  // Lock a legend globally across all available categories
  const lockLegend = (legendName) => {
    setAvailableDiamonds(prev => prev.filter(c => c !== legendName));
    setAvailableGolds(prev => prev.filter(c => c !== legendName));
    setAvailableSilvers(prev => prev.filter(c => c !== legendName));
    setAvailableBronzes(prev => prev.filter(c => c !== legendName));
  };

  // --- SORTEO EQUIPOS ---
  const handleTeamDrawn = (teamName) => {
    const latestTurnIndex = currentTurnIndexRef.current;
    const activePlayerName = turnSequence[latestTurnIndex];
    
    const newTeam = {
      name: teamName,
      owner: activePlayerName,
      captain: null,
      captain_category: null,
      legends: [],
      option_results: [],
      base_changes: [],
      spins: [],
      eliminated_players: [], // To keep track of deleted players for recovery
      wildcards: { Bronce: 0, Plata: 0, Oro: 0, Diamante: 0 }
    };

    const latestTournament = tournamentRef.current;
    const updatedTeams = [...latestTournament.teams, newTeam];
    const updatedTournament = { ...latestTournament, teams: updatedTeams };
    setTournament(updatedTournament);
    
    // Remove team from available pool
    setAvailableTeams(prev => prev.filter(t => t !== teamName));

    // Next turn or Next Phase
    if (latestTurnIndex < turnSequence.length - 1) {
      setCurrentTurnIndex(latestTurnIndex + 1);
      setIsProcessing(false);
    } else {
      setIsProcessing(true);
      sounds.playCardReveal();
      setDraftPhase('captains');
      setCurrentTeamIndex(0);
      setIsProcessing(false);
    }
  };

  // --- RULETA DIAMANTE (CAPITANES) ---
  const handleCaptainDrawn = (captainName) => {
    const latestTeamIndex = currentTeamIndexRef.current;
    const latestTournament = tournamentRef.current;
    const updatedTeams = [...latestTournament.teams];
    const currentTeam = updatedTeams[latestTeamIndex];
    
    const captainPos = getLegendPosition(captainName);
    currentTeam.captain = captainName;
    currentTeam.captain_category = 'Diamante';
    currentTeam.legends.push({
      name: captainName,
      category: 'Diamante',
      position: captainPos
    });

    const updatedTournament = { ...latestTournament, teams: updatedTeams };
    setTournament(updatedTournament);
    
    // Lock captain globally
    lockLegend(captainName);

    // Next team or Next Phase
    setTimeout(() => {
      if (latestTeamIndex < latestTournament.teams.length - 1) {
        setCurrentTeamIndex(latestTeamIndex + 1);
        setIsProcessing(false);
      } else {
        sounds.playCardReveal();
        setDraftPhase('options');
        setCurrentOptionTeamIndex(0);
        setCurrentSpinNumber(1);
        setIsProcessing(false);
      }
    }, 1000);
  };

  // --- RULETA OPCIONES ---
  const handleOptionDrawn = (optionName) => {
    const latestOptionTeamIndex = currentOptionTeamIndexRef.current;
    const latestTournament = tournamentRef.current;
    const updatedTeams = [...latestTournament.teams];
    const currentTeam = updatedTeams[latestOptionTeamIndex];
    
    currentTeam.option_results.push(optionName);
    
    const spinLog = {
      accion: optionName,
      resultado: 'Pendiente'
    };
    currentTeam.spins.push(spinLog);
    
    setTournament({ ...latestTournament, teams: updatedTeams });

    // Handle Option Effect Resolution
    resolveOptionEffect(optionName, currentTeam, spinLog);
  };

  // Resolve Roulette Option Results
  const resolveOptionEffect = (option, team, spinLog) => {
    // 1. Live Visual Legend Spins
    if (option === 'Tirar Ruleta Diamante') {
      if (availableDiamonds.length === 0) {
        completeOptionSpin('No quedan Diamantes', spinLog);
        return;
      }
      setModalType('sub_wheel_legend');
      setModalData({ category: 'Diamante', options: availableDiamonds, team, spinLog });
    }
    else if (option === 'Tirar Ruleta Oro') {
      if (availableGolds.length === 0) {
        completeOptionSpin('No quedan Oros', spinLog);
        return;
      }
      setModalType('sub_wheel_legend');
      setModalData({ category: 'Oro', options: availableGolds, team, spinLog });
    }
    else if (option === 'Tirar Ruleta Plata') {
      if (availableSilvers.length === 0) {
        completeOptionSpin('No quedan Platas', spinLog);
        return;
      }
      setModalType('sub_wheel_legend');
      setModalData({ category: 'Plata', options: availableSilvers, team, spinLog });
    }
    else if (option === 'Tirar Ruleta Bronce') {
      if (availableBronzes.length === 0) {
        completeOptionSpin('No quedan Bronces', spinLog);
        return;
      }
      setModalType('sub_wheel_legend');
      setModalData({ category: 'Bronce', options: availableBronzes, team, spinLog });
    }
    
    // 2. Comodines Awards (Forced Immediate Selection of choice)
    else if (option === 'Comodín Diamante') {
      setModalType('comodin_select');
      setModalData({ category: 'Diamante', pool: availableDiamonds, team, spinLog });
      setSelectedLegendForComodin('');
    }
    else if (option === 'Comodín Oro') {
      setModalType('comodin_select');
      setModalData({ category: 'Oro', pool: availableGolds, team, spinLog });
      setSelectedLegendForComodin('');
    }
    else if (option === 'Comodín Plata') {
      setModalType('comodin_select');
      setModalData({ category: 'Plata', pool: availableSilvers, team, spinLog });
      setSelectedLegendForComodin('');
    }
    else if (option === 'Comodín Bronce') {
      setModalType('comodin_select');
      setModalData({ category: 'Bronce', pool: availableBronzes, team, spinLog });
      setSelectedLegendForComodin('');
    }
    
    // 3. Sub-Wheels for Teams 4.5* / 5* (Excluding already drafted teams)
    else if (option === 'Fichar jugador equipo 5*') {
      const drafted = tournamentRef.current.teams.map(tm => tm.name);
      const filtered = constants.teams_5_stars.filter(t => !drafted.includes(t));
      const finalOptions = filtered.length > 0 ? filtered : ['Real Madrid', 'FC Barcelona', 'PSG', 'Liverpool'];
      setModalType('sub_wheel_5');
      setModalData({ spinLog, team, options: finalOptions });
    }
    else if (option === 'Fichar jugador equipo 4.5*') {
      const drafted = tournamentRef.current.teams.map(tm => tm.name);
      const filtered = constants.teams_4_5_stars.filter(t => !drafted.includes(t));
      const finalOptions = filtered.length > 0 ? filtered : ['Napoli', 'Chelsea', 'Spurs', 'Bayer Leverkusen'];
      setModalType('sub_wheel_4.5');
      setModalData({ spinLog, team, options: finalOptions });
    }
    
    // 4. Manual Signings (Fichajes)
    else if (option === 'Fichar un Atacante') {
      openManualSigningModal('Atacante', 'DEL', spinLog, team);
    }
    else if (option === 'Fichar un Medio') {
      openManualSigningModal('Medio', 'MED', spinLog, team);
    }
    else if (option === 'Fichar un Def/Portero') {
      openManualSigningModal('Defensa/Portero', 'DEF/POR', spinLog, team);
    }
    else if (option === 'Fichar un jugador Normal' || option === 'Fichar un jugador Actual') {
      openManualSigningModal('Jugador Actual', 'JGD', spinLog, team);
    }
    
    // 5. Interactive Removes / Losses (Descartes)
    else if (option === 'Quitar un Atacante') {
      openManualRemoveModal('Atacante', 'DEL', spinLog, team);
    }
    else if (option === 'Quitar un Medio') {
      openManualRemoveModal('Medio', 'MED', spinLog, team);
    }
    else if (option === 'Quitar un Def/Portero') {
      openManualRemoveModal('Defensa/Portero', 'DEF/POR', spinLog, team);
    }
    else if (option === 'Quitar un jugador Normal' || option === 'Quitar un jugador Actual') {
      openManualRemoveModal('Jugador Actual', 'JGD', spinLog, team);
    }
    else {
      completeOptionSpin('Acción Resuelta', spinLog);
    }
  };

  const completeOptionSpin = (resultText, spinLog) => {
    spinLog.resultado = resultText;
    setTournament({ ...tournamentRef.current }); // Trigger re-render
    
    setModalType('result_message');
    setModalData({ message: resultText });
  };

  const handleCloseResultMessage = () => {
    setModalType(null);
    advanceSpinProgress();
  };

  const advanceSpinProgress = () => {
    if (currentSpinNumber < 3) {
      setCurrentSpinNumber(currentSpinNumber + 1);
      setIsProcessing(false);
    } else {
      const latestOptionTeamIndex = currentOptionTeamIndexRef.current;
      if (latestOptionTeamIndex < tournamentRef.current.teams.length - 1) {
        setCurrentOptionTeamIndex(latestOptionTeamIndex + 1);
        setCurrentSpinNumber(1);
        setIsProcessing(false);
      } else {
        setDraftPhase('finished');
        setIsProcessing(false);
      }
    }
  };

  // --- LIVE VISUAL LEGEND GIROS ---
  const handleSubLegendFinished = (legendName) => {
    const { category, team, spinLog } = modalData;
    sounds.playSuccess();
    
    const legendPos = getLegendPosition(legendName);
    team.legends.push({ name: legendName, category, position: legendPos });
    team.base_changes.push(`Giro: ${legendName} (${category})`);
    
    // Lock globally
    lockLegend(legendName);
    
    setModalType(null);
    completeOptionSpin(`Leyenda ${category}: ${legendName}`, spinLog);
  };

  // --- COMODÍN IMMEDIATE CONFIRM ---
  const handleConfirmComodinSelect = () => {
    if (!selectedLegendForComodin) return;
    sounds.playSuccess();
    
    const { category, team, spinLog } = modalData;
    const legendName = selectedLegendForComodin;
    
    const legendPos = getLegendPosition(legendName);
    team.legends.push({ name: legendName, category, position: legendPos });
    team.base_changes.push(`Elegido: ${legendName} (${category})`);
    
    // Lock globally
    lockLegend(legendName);
    
    setModalType(null);
    completeOptionSpin(`Comodín ${category}: ${legendName}`, spinLog);
  };

  // --- SUB-WHEELS AND SIGNINGS RESOLUTION ---
  const handleSubWheelFinished = (subTeamName) => {
    setModalType('fichar_manual');
    setModalData({
      ...modalData,
      subTeam: subTeamName,
      title: `Fichaje de ${subTeamName}`
    });
  };

  const openManualSigningModal = (title, posTag, spinLog, team) => {
    setModalType('fichar_manual');
    setManualInput('');
    setModalData({ title, posTag, spinLog, team });
  };

  const handleConfirmSigning = () => {
    if (!manualInput.trim()) {
      alert('Ingresa el nombre del jugador.');
      return;
    }
    sounds.playSuccess();
    
    const { team, posTag, subTeam, spinLog } = modalData;
    
    const signedPlayer = {
      name: manualInput.trim(),
      category: 'Actual',
      position: posTag || 'JGD',
      club: subTeam || 'Sin club'
    };
    
    team.legends.push(signedPlayer);
    team.base_changes.push(`Fichado: ${signedPlayer.name} (${signedPlayer.position})`);
    
    const resString = `Fichado: ${signedPlayer.name} [${subTeam || posTag || 'Actual'}]`;
    setModalType(null);
    completeOptionSpin(resString, spinLog);
  };

  // --- MANUAL REMOVES (ESCARTES) ---
  const openManualRemoveModal = (title, posTag, spinLog, team) => {
    setModalType('quitar_manual');
    setRemoveInput('');
    setRemoveError('');
    setModalData({ title, posTag, spinLog, team });
  };

  // Filter players that match the position to remove (captains are excluded!)
  const getEligibleRemovablePlayers = (legends, posTag, captainName) => {
    // Captain is NEVER removable (exclude Diamond legends / captain Name)
    const nonCaptains = legends.filter(p => p.name !== captainName && p.category !== 'Diamante');
    
    if (!posTag) return nonCaptains;
    let filtered = [];
    if (posTag === 'DEL') {
      filtered = nonCaptains.filter(p => p.position === 'DEL' || p.position === 'DC' || p.position === 'Atacante');
    } else if (posTag === 'MED') {
      filtered = nonCaptains.filter(p => p.position === 'MED' || p.position === 'MC' || p.position === 'Medio');
    } else if (posTag === 'DEF/POR') {
      filtered = nonCaptains.filter(p => p.position === 'DEF/POR' || p.position === 'DEF' || p.position === 'POR' || p.position === 'PT' || p.position === 'Defensa/Portero');
    } else if (posTag === 'JGD') {
      filtered = nonCaptains.filter(p => p.category === 'Actual' || p.position === 'JGD');
    }
    
    // Safety fallback: if no matching player exists, let them remove any non-captain
    return filtered.length > 0 ? filtered : nonCaptains;
  };

  const handleConfirmRemoveManual = () => {
    setRemoveError('');
    const { team, posTag, title, spinLog } = modalData;
    const nameInput = removeInput.trim();
    if (!nameInput) {
      setRemoveError('Por favor, escribe el nombre del jugador.');
      return;
    }

    // Find the player in team.legends (case-insensitive)
    const matchingPlayer = team.legends.find(p => p.name.toLowerCase() === nameInput.toLowerCase());

    if (!matchingPlayer) {
      // It's a player NOT currently registered in the app's roster.
      // We assume it's a real/current squad player and let the user remove them.
      let displayPos = 'JGD';
      if (posTag === 'DEL') displayPos = 'DC';
      else if (posTag === 'MED') displayPos = 'MC';
      else if (posTag === 'DEF/POR') displayPos = 'DEF';

      const customPlayer = {
        name: nameInput,
        category: 'Actual',
        position: displayPos,
        club: team.name
      };

      sounds.playFail();

      team.base_changes.push(`Eliminado: ${customPlayer.name}`);
      if (!team.eliminated_players) {
        team.eliminated_players = [];
      }
      team.eliminated_players.push(customPlayer);

      setModalType(null);
      setRemoveInput('');
      completeOptionSpin(`Eliminado: ${customPlayer.name}`, spinLog);
      return;
    }

    // Captain block
    if (matchingPlayer.name === team.captain || matchingPlayer.category === 'Diamante') {
      setRemoveError('¡No puedes eliminar al capitán del equipo!');
      return;
    }

    // Validate position eligibility
    const eligibleList = getEligibleRemovablePlayers(team.legends, posTag, team.captain);
    const isEligible = eligibleList.some(p => p.name.toLowerCase() === nameInput.toLowerCase());
    
    if (!isEligible) {
      const proceed = window.confirm(`El jugador '${matchingPlayer.name}' está registrado con la posición '${matchingPlayer.position || 'JGD'}'. ¿Estás seguro de que quieres descartarlo para esta acción de '${title || 'Quitar Jugador'}'?`);
      if (!proceed) {
        return;
      }
    }

    // Execute removal
    sounds.playFail();
    
    team.legends = team.legends.filter(p => p.name.toLowerCase() !== nameInput.toLowerCase());
    team.base_changes.push(`Eliminado: ${matchingPlayer.name}`);
    
    if (!team.eliminated_players) {
      team.eliminated_players = [];
    }
    team.eliminated_players.push(matchingPlayer);

    setModalType(null);
    setRemoveInput('');
    completeOptionSpin(`Eliminado: ${matchingPlayer.name}`, spinLog);
  };

  // --- REPESCAS RECOVERY IN FINAL SUMMARY ---
  const handleRecoverPlayer = (teamIndex, playerIdx) => {
    sounds.playSuccess();
    const updated = { ...tournament };
    const team = updated.teams[teamIndex];
    const player = team.eliminated_players[playerIdx];
    const owner = team.owner;

    if (!playerRepescas[owner] || playerRepescas[owner] <= 0) {
      alert('No te quedan Fichas de Repesca.');
      return;
    }
    
    // Add back to squad
    team.legends.push(player);
    team.base_changes.push(`Repescado: ${player.name}`);
    
    // Remove from eliminated list
    team.eliminated_players = team.eliminated_players.filter((_, idx) => idx !== playerIdx);
    
    // Deduct from owner repesca bank
    const updatedRepescas = { ...playerRepescas };
    updatedRepescas[owner] = Math.max(0, updatedRepescas[owner] - 1);
    setPlayerRepescas(updatedRepescas);
    
    setTournament(updated);
  };

  // --- GROUP DISTRIBUTION SCREEN ---
  const handleGoToGroups = () => {
    distributeGroups('balanced');
    setDraftPhase('group_distribution');
  };

  const distributeGroups = (mode) => {
    const teams = [...tournament.teams];
    const totalTeams = teams.length;
    let numGroups = 4;
    if (totalTeams === 8) numGroups = 2;
    if (totalTeams === 32) numGroups = 8;
    if (tournament.format === 'Personalizado') {
      numGroups = Math.max(1, Math.ceil(totalTeams / 4));
    }

    let resultGroups = Array.from({ length: numGroups }, (_, i) => ({
      name: String.fromCharCode(65 + i),
      teams: []
    }));

    if (mode === 'balanced') {
      const byOwner = {};
      teams.forEach(t => {
        if (!byOwner[t.owner]) byOwner[t.owner] = [];
        byOwner[t.owner].push(t);
      });

      Object.keys(byOwner).forEach(owner => {
        byOwner[owner].sort(() => Math.random() - 0.5);
      });

      const owners = Object.keys(byOwner);
      let gIdx = 0;

      owners.forEach(owner => {
        byOwner[owner].forEach((team, idx) => {
          const targetGroup = (gIdx + idx) % numGroups;
          resultGroups[targetGroup].teams.push(team);
        });
        gIdx = (gIdx + 1) % numGroups;
      });
    } 
    else if (mode === 'random') {
      const shuffled = [...teams].sort(() => Math.random() - 0.5);
      shuffled.forEach((t, idx) => {
        const targetGroup = idx % numGroups;
        resultGroups[targetGroup].teams.push(t);
      });
    }
    else {
      if (groups.length > 0) return; 
      return distributeGroups('balanced');
    }

    setGroups(resultGroups);
    setGroupMode(mode);
  };

  const handleManualGroupChange = (teamName, targetGroupName) => {
    const updatedGroups = groups.map(g => {
      const filteredTeams = g.teams.filter(t => t.name !== teamName);
      return { ...g, teams: filteredTeams };
    });

    const teamObj = tournament.teams.find(t => t.name === teamName);

    const finalGroups = updatedGroups.map(g => {
      if (g.name === targetGroupName) {
        return { ...g, teams: [...g.teams, teamObj] };
      }
      return g;
    });

    setGroups(finalGroups);
    setGroupMode('manual');
  };

  const validateGroups = () => {
    const expectedSize = 4;
    if (tournament.format === 'Personalizado') {
      return groups.every(g => g.teams.length > 0);
    }
    return groups.every(g => g.teams.length === expectedSize);
  };

  // Schedule Generator
  const generateFixtures = (finalGroups) => {
    const fixtures = [];
    
    finalGroups.forEach(group => {
      const gName = group.name;
      const gTeams = group.teams.map(t => t.name);
      
      if (gTeams.length === 4) {
        fixtures.push({ id: `M_${gName}_1_1`, group: gName, round: 1, home: gTeams[0], away: gTeams[1], result: null });
        fixtures.push({ id: `M_${gName}_1_2`, group: gName, round: 1, home: gTeams[2], away: gTeams[3], result: null });
        
        fixtures.push({ id: `M_${gName}_2_1`, group: gName, round: 2, home: gTeams[0], away: gTeams[2], result: null });
        fixtures.push({ id: `M_${gName}_2_2`, group: gName, round: 2, home: gTeams[1], away: gTeams[3], result: null });
        
        fixtures.push({ id: `M_${gName}_3_1`, group: gName, round: 3, home: gTeams[0], away: gTeams[3], result: null });
        fixtures.push({ id: `M_${gName}_3_2`, group: gName, round: 3, home: gTeams[1], away: gTeams[2], result: null });
      } else {
        const list = [...gTeams];
        if (list.length % 2 !== 0) list.push(null);
        const rounds = list.length - 1;
        const half = list.length / 2;
        let matchCounter = 1;
        
        for (let r = 0; r < rounds; r++) {
          for (let i = 0; i < half; i++) {
            const home = list[i];
            const away = list[list.length - 1 - i];
            if (home !== null && away !== null) {
              fixtures.push({
                id: `M_${gName}_${r + 1}_${matchCounter++}`,
                group: gName,
                round: r + 1,
                home,
                away,
                result: null
              });
            }
          }
          list.splice(1, 0, list.pop());
        }
      }
    });

    return fixtures;
  };

  const handleStartLeague = async () => {
    if (!validateGroups()) {
      alert('Distribución inválida. Cada grupo debe tener exactamente 4 equipos.');
      return;
    }
    sounds.playSuccess();
    
    const updatedTeams = tournament.teams.map(t => {
      const matchingGroup = groups.find(g => g.teams.map(tm => tm.name).includes(t.name));
      return {
        ...t,
        group: matchingGroup ? matchingGroup.name : 'A',
        stats: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 }
      };
    });

    const updatedTournament = {
      ...tournament,
      status: 'Fase de Grupos',
      teams: updatedTeams,
      repescas: playerRepescas, // Persist Repesca tokens remaining
      matches: generateFixtures(groups)
    };
    
    try {
      const res = await fetch(`http://localhost:5000/api/tournaments/${tournament.filename}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTournament)
      });
      if (!res.ok) throw new Error('No se pudo guardar el estado de la liga.');
      onComplete(updatedTournament);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExitDraft = () => {
    setModalType('confirm_action');
    setModalData({
      title: "Salir al Menú",
      message: "¿Deseas salir al menú principal? Se guardará el progreso actual del draft en el servidor para que puedas reanudarlo después.",
      onConfirm: async () => {
        try {
          const res = await fetch(`http://localhost:5000/api/tournaments/${tournament.filename}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tournament)
          });
          if (!res.ok) throw new Error('No se pudo guardar el estado actual de la liga.');
        } catch (err) {
          console.error('Error saving progress:', err);
        }
        if (onBackToMenu) onBackToMenu();
      }
    });
  };

  const handleResetTournament = () => {
    setModalType('confirm_action');
    setModalData({
      title: "Reiniciar Torneo",
      message: "¿Estás seguro de que quieres REINICIAR el torneo de forma permanente? Se borrarán todos los datos y tendrás que empezar de nuevo.",
      onConfirm: async () => {
        try {
          const res = await fetch(`http://localhost:5000/api/tournaments/${tournament.filename}`, {
            method: 'DELETE'
          });
          if (!res.ok) throw new Error("Error al eliminar el torneo.");
          if (onBackToMenu) onBackToMenu();
        } catch (err) {
          alert("No se pudo reiniciar el torneo: " + err.message);
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-darkBg text-white flex flex-col items-center p-6 select-none relative">
      {/* Background cinematic glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,18,32,0.4)_0%,rgba(3,5,8,1)_95%)] z-0 pointer-events-none" />

      {/* Header Info */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row justify-between items-start md:items-center border-b border-panelBorder pb-4 mb-6 z-10 gap-4">
        <div>
          <span className="text-[10px] text-neonCyan font-mono tracking-widest block">SALA DE DRAFT</span>
          <h2 className="text-2xl font-black font-mono tracking-wide uppercase mt-0.5">{tournament.name}</h2>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-mono items-center w-full md:w-auto justify-end">
          <button
            onClick={handleExitDraft}
            className="px-4 py-2 bg-darkBg border border-panelBorder rounded-xl text-gray-300 hover:text-white hover:border-gray-500 transition-all font-mono flex items-center gap-1.5"
          >
            🚪 SALIR AL MENÚ
          </button>
          <button
            onClick={handleResetTournament}
            className="px-4 py-2 bg-red-950/40 border border-red-800/60 rounded-xl text-red-400 hover:bg-red-900/50 hover:text-red-200 transition-all font-mono"
          >
            ⚠️ REINICIAR TORNEO
          </button>
          
          <div className="bg-panelBg border border-panelBorder px-4 py-2 rounded-xl">
            <span className="text-gray-500">FASE ACTUAL: </span>
            <span className="text-neonCyan font-bold uppercase">
              {draftPhase === 'teams' && 'Sorteo de Equipos'}
              {draftPhase === 'captains' && 'Capitanes Diamante'}
              {draftPhase === 'options' && 'Ruleta de Opciones'}
              {draftPhase === 'finished' && 'Draft Completado'}
              {draftPhase === 'group_distribution' && 'Distribución de Grupos'}
            </span>
          </div>
        </div>
      </div>

      {/* ================= PHASE 1: TEAMS SORTEO ================= */}
      {draftPhase === 'teams' && (
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-8 z-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-panelBg/80 border border-neonCyan p-6 rounded-2xl shadow-neonCyan animate-pulse flex items-center justify-between">
              <div>
                <span className="text-[10px] text-neonCyan font-mono tracking-widest block uppercase">Turno de elección</span>
                <span className="text-2xl font-black uppercase text-white tracking-tight">
                  {turnSequence[currentTurnIndex]}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 font-mono tracking-widest block">PROGRESO DEL SORTEO</span>
                <span className="text-lg font-mono font-bold">
                  {currentTurnIndex + 1} / {turnSequence.length}
                </span>
              </div>
            </div>

            <div className="bg-panelBg border border-panelBorder p-6 rounded-2xl shadow-lg">
              <h3 className="text-sm font-extrabold tracking-wider font-mono text-gray-400 mb-4">EQUIPOS ASIGNADOS</h3>
              {tournament.teams.length === 0 ? (
                <div className="text-center py-12 text-gray-500 font-mono text-xs">
                  Gira la ruleta para asignar el primer equipo...
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {tournament.teams.map((t, idx) => (
                    <div key={idx} className="p-3 bg-darkBg border border-panelBorder rounded-xl text-center shadow">
                      <span className="text-[9px] text-neonCyan font-mono font-bold block uppercase">{t.owner}</span>
                      <span className="font-extrabold text-sm text-white truncate block mt-1">{t.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <RouletteWheel
              options={availableTeams}
              onFinished={handleTeamDrawn}
              buttonText="SORTEAR EQUIPO"
              disabled={isProcessing}
              onSpinStart={() => setIsProcessing(true)}
            />
          </div>
        </div>
      )}

      {/* ================= PHASE 2: CAPTAINS DRAFT ================= */}
      {draftPhase === 'captains' && (
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-8 z-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-panelBg border border-panelBorder p-6 rounded-2xl shadow-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-500 font-mono tracking-widest block">RULETA CAPITÁN DIAMANTE PARA:</span>
                <h3 className="text-2xl font-black text-neonCyan tracking-tight uppercase mt-0.5">
                  {tournament.teams[currentTeamIndex]?.name}
                </h3>
                <span className="text-xs text-gray-400 font-mono">
                  Propietario: <span className="text-white font-bold">{tournament.teams[currentTeamIndex]?.owner}</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 font-mono tracking-widest block">PROGRESO CAPITANES</span>
                <span className="text-lg font-mono font-bold">
                  {currentTeamIndex + 1} / {tournament.teams.length}
                </span>
              </div>
            </div>

            <div className="bg-panelBg border border-panelBorder p-6 rounded-2xl shadow-lg">
              <h3 className="text-sm font-extrabold tracking-wider font-mono text-gray-400 mb-4">CAPITANES OBTENIDOS</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-h-[300px] overflow-y-auto pr-1">
                {tournament.teams.map((t, idx) => (
                  <div key={idx} className="p-3 bg-darkBg border border-panelBorder rounded-xl flex flex-col items-center">
                    <span className="text-[9px] text-gray-500 font-mono font-bold uppercase">{t.name}</span>
                    {t.captain ? (
                      <div className="mt-2 flex flex-col items-center">
                        <span className="font-extrabold text-neonCyan text-xs uppercase truncate max-w-[100px]">
                          {t.captain}
                        </span>
                        <span className="text-[7px] text-gray-400 mt-0.5">💎 CAPITÁN</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-600 font-mono mt-3">PENDIENTE</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <RouletteWheel
              options={availableDiamonds}
              onFinished={handleCaptainDrawn}
              buttonText="GIRAR DIAMANTE"
              disabled={isProcessing}
              onSpinStart={() => setIsProcessing(true)}
            />
          </div>
        </div>
      )}

      {/* ================= PHASE 3: OPTIONS SPINS ================= */}
      {draftPhase === 'options' && (
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-8 z-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-panelBg border border-panelBorder p-6 rounded-2xl shadow-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-500 font-mono tracking-widest block">RULETA DE OPCIONES PARA:</span>
                <h3 className="text-2xl font-black text-neonGold tracking-tight uppercase mt-0.5">
                  {tournament.teams[currentOptionTeamIndex]?.name}
                </h3>
                <span className="text-xs text-gray-400 font-mono">
                  Propietario: <span className="text-white font-bold">{tournament.teams[currentOptionTeamIndex]?.owner}</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-neonGold font-mono tracking-widest block">TIRADA ACTIVA</span>
                <span className="text-lg font-mono font-black text-neonGold">
                  TIRADA {currentSpinNumber} / 3
                </span>
              </div>
            </div>

            <div className="bg-panelBg border border-panelBorder p-6 rounded-2xl shadow-lg">
              <h3 className="text-sm font-extrabold tracking-wider font-mono text-gray-400 mb-4">
                RESULTADOS DE {tournament.teams[currentOptionTeamIndex]?.name}
              </h3>
              
              <div className="space-y-3">
                {tournament.teams[currentOptionTeamIndex]?.spins.length === 0 ? (
                  <p className="text-gray-500 font-mono text-xs py-4 text-center">Gira la ruleta de opciones...</p>
                ) : (
                  tournament.teams[currentOptionTeamIndex]?.spins.map((spin, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-darkBg border border-panelBorder rounded-xl text-xs font-mono">
                      <span className="text-gray-400">Tirada #{idx + 1}: {spin.accion}</span>
                      <span className="text-neonCyan font-bold">{spin.resultado}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <RouletteWheel
              options={constants.options_roulette}
              onFinished={handleOptionDrawn}
              buttonText="GIRAR OPCIONES"
              disabled={isProcessing}
              onSpinStart={() => setIsProcessing(true)}
            />
          </div>
        </div>
      )}

      {/* ================= PHASE 4: DRAFT COMPLETED (SUMMARY & RECOVERY) ================= */}
      {draftPhase === 'finished' && (
        <div className="w-full max-w-5xl bg-panelBg border border-panelBorder p-8 rounded-2xl shadow-2xl z-10 animate-scale-up">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full border border-neonGold bg-darkBg flex items-center justify-center mx-auto shadow-neonGold mb-4">
              <span className="text-2xl">🏆</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white uppercase font-mono">
              Resumen Final del Draft
            </h2>
            <p className="text-xs text-gray-400 mt-2 font-mono">
              Revisa los planteles definitivos. Si te quedan Fichas de Repesca, puedes recuperar a tus leyendas descartadas antes del torneo.
            </p>
          </div>

          {/* Teams Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[500px] overflow-y-auto pr-2">
            {tournament.teams.map((t, teamIdx) => {
              const owner = t.owner;
              const repescasLeft = playerRepescas[owner] || 0;
              const hasEliminated = t.eliminated_players && t.eliminated_players.length > 0;
              
              return (
                <div key={teamIdx} className="bg-darkBg border border-panelBorder p-5 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start border-b border-panelBorder/30 pb-2 mb-3">
                      <div>
                        <span className="text-[9px] text-neonCyan font-mono font-bold uppercase">{t.owner}</span>
                        <h4 className="font-extrabold text-white text-base mt-0.5">{t.name}</h4>
                      </div>
                      <div className="text-right text-xs font-mono">
                        <span className="text-gray-500">Repescas del Participante: </span>
                        <span className="text-neonCyan font-bold">{repescasLeft}</span>
                      </div>
                    </div>

                    <div className="text-xs font-mono mb-4">
                      <span className="text-neonGold font-bold">Capitán: {t.captain} (💎) - {getLegendPosition(t.captain)}</span>
                    </div>

                    {/* Roster list */}
                    <div className="space-y-1.5 mb-4">
                      <span className="text-[10px] text-gray-500 font-mono block">PLANTILLA ACTIVA ({t.legends.length})</span>
                      <div className="flex flex-wrap gap-1.5">
                        {t.legends.map((p, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-panelBg border border-panelBorder text-[10px] font-mono">
                            {p.name} [{p.position || 'JGD'}]
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Spins logs list */}
                    <div className="space-y-1 mb-4 border-t border-panelBorder/20 pt-3">
                      <span className="text-[10px] text-gray-500 font-mono block">HISTORIAL DE RULETAS</span>
                      <div className="max-h-[80px] overflow-y-auto space-y-0.5 pr-1 text-[10px] font-mono text-gray-400">
                        {t.spins.map((s, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>#{idx+1}: {s.accion}</span>
                            <span className="text-neonCyan font-bold">{s.resultado}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recovery Section using player Repesca pool */}
                  {hasEliminated && repescasLeft > 0 && (
                    <div className="border-t border-neonCyan/30 pt-3 mt-2 bg-neonCyan/5 p-3 rounded-lg border border-neonCyan/20">
                      <span className="text-[10px] text-neonCyan font-bold font-mono block mb-2 uppercase">🛡️ Recuperar Jugadores con Ficha de Repesca</span>
                      
                      <div className="space-y-2">
                        {t.eliminated_players.map((ep, pIdx) => {
                          return (
                            <div key={pIdx} className="flex justify-between items-center bg-darkBg p-2 rounded border border-panelBorder text-xs font-mono">
                              <div>
                                <span className="text-neonPink block font-bold">{ep.name}</span>
                                <span className="text-[9px] text-gray-500">{ep.category} - {ep.position}</span>
                              </div>
                              <button
                                onClick={() => handleRecoverPlayer(teamIdx, pIdx)}
                                className="px-3 py-1.5 rounded bg-neonCyan/10 border border-neonCyan text-[10px] text-neonCyan font-bold hover:bg-neonCyan hover:text-darkBg transition-all"
                              >
                                Usar Repesca ({repescasLeft})
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-center mt-8 border-t border-panelBorder pt-6">
            <button
              onClick={handleGoToGroups}
              className="px-12 py-4 rounded-full font-black text-lg tracking-widest bg-gradient-to-r from-neonCyan to-cyan-500 text-darkBg shadow-neonCyan hover:scale-105 active:scale-95 transition-all uppercase"
            >
              CONTINUAR A GRUPOS
            </button>
          </div>
        </div>
      )}

      {/* ================= PHASE 5: GROUP DISTRIBUTION ================= */}
      {draftPhase === 'group_distribution' && (
        <div className="w-full max-w-5xl bg-panelBg border border-panelBorder p-8 rounded-2xl shadow-2xl z-10 animate-scale-up">
          <div className="text-center mb-8 border-b border-panelBorder/30 pb-4">
            <h3 className="text-2xl font-black tracking-tight text-white uppercase font-mono">
              Distribución de Grupos
            </h3>
            <p className="text-xs text-gray-400 mt-1 font-mono">
              Equilibra los grupos para garantizar que cada participante tenga el mismo número de equipos por grupo.
            </p>

            <div className="flex justify-center gap-4 mt-6 font-mono text-xs">
              <button
                onClick={() => distributeGroups('balanced')}
                className={`px-5 py-2 rounded-full font-bold border transition-all ${
                  groupMode === 'balanced'
                    ? 'bg-neonCyan border-neonCyan text-darkBg shadow-neonCyan font-black'
                    : 'bg-darkBg border-panelBorder text-gray-400 hover:text-white'
                }`}
              >
                AUTOMÁTICO INTELIGENTE
              </button>
              <button
                onClick={() => distributeGroups('random')}
                className={`px-5 py-2 rounded-full font-bold border transition-all ${
                  groupMode === 'random'
                    ? 'bg-neonCyan border-neonCyan text-darkBg shadow-neonCyan font-black'
                    : 'bg-darkBg border-panelBorder text-gray-400 hover:text-white'
                }`}
              >
                SORTEO ALEATORIO
              </button>
              <button
                onClick={() => setGroupMode('manual')}
                className={`px-5 py-2 rounded-full font-bold border transition-all ${
                  groupMode === 'manual'
                    ? 'bg-neonCyan border-neonCyan text-darkBg shadow-neonCyan font-black'
                    : 'bg-darkBg border-panelBorder text-gray-400 hover:text-white'
                }`}
              >
                AJUSTE MANUAL
              </button>
            </div>
          </div>

          {/* Groups grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groups.map(group => {
              const isInvalid = group.teams.length !== 4 && tournament.format !== 'Personalizado';
              return (
                <div key={group.name} className={`bg-darkBg border p-5 rounded-xl ${isInvalid ? 'border-neonPink/40' : 'border-panelBorder'}`}>
                  <div className="flex justify-between items-center border-b border-panelBorder/30 pb-2 mb-3">
                    <h4 className="font-extrabold text-neonCyan font-mono text-lg">GRUPO {group.name}</h4>
                    <span className={`text-xs font-mono font-bold ${isInvalid ? 'text-neonPink' : 'text-gray-500'}`}>
                      {group.teams.length} Equipos {isInvalid && '(Debe tener 4)'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {group.teams.length === 0 ? (
                      <p className="text-center text-xs text-gray-600 font-mono py-4">Arrastra o mueve un equipo aquí...</p>
                    ) : (
                      group.teams.map((t, tIdx) => (
                        <div key={tIdx} className="flex justify-between items-center p-3 bg-panelBg border border-panelBorder/60 rounded-lg text-xs font-mono">
                          <div>
                            <span className="font-extrabold text-white block">{t.name}</span>
                            <span className="text-[10px] text-gray-500 uppercase block font-bold">{t.owner}</span>
                          </div>
                          
                          <select
                            value={group.name}
                            onChange={(e) => handleManualGroupChange(t.name, e.target.value)}
                            className="bg-darkBg border border-panelBorder p-1.5 rounded font-bold text-xs text-white"
                          >
                            {groups.map(g => (
                              <option key={g.name} value={g.name}>Grupo {g.name}</option>
                            ))}
                          </select>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col items-center justify-center mt-8 border-t border-panelBorder pt-6 gap-2">
            {!validateGroups() && (
              <span className="text-xs text-neonPink font-mono font-bold animate-pulse">
                ⚠ Cada grupo de la liga debe tener exactamente 4 equipos antes de iniciar.
              </span>
            )}
            <button
              onClick={handleStartLeague}
              disabled={!validateGroups()}
              className={`px-12 py-4 rounded-full font-black text-lg tracking-widest transition-all uppercase ${
                validateGroups()
                  ? 'bg-gradient-to-r from-neonCyan to-cyan-500 text-darkBg shadow-neonCyan hover:scale-105 active:scale-95'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed shadow-none'
              }`}
            >
              COMENZAR LA LIGA
            </button>
          </div>
        </div>
      )}

      {/* ================= MODALS FOR ACTION RESOLUTIONS ================= */}
      {/* 5-STAR / 4.5-STAR TEAM SUB-WHEELS */}
      {(modalType === 'sub_wheel_5' || modalType === 'sub_wheel_4.5') && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm z-50 p-4">
          <div className="bg-panelBg border border-panelBorder rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col items-center animate-scale-up">
            <h3 className="text-lg font-extrabold text-white tracking-wide font-mono mb-4 text-center">
              {modalType === 'sub_wheel_5' ? 'RULETA EQUIPO 5 ESTRELLAS' : 'RULETA EQUIPO 4.5 ESTRELLAS'}
            </h3>
            
            <RouletteWheel
              options={modalData.options}
              onFinished={handleSubWheelFinished}
              buttonText="GIRAR SUB-RULETA"
              onSpinStart={() => {}}
            />
          </div>
        </div>
      )}

      {/* LIVE SUB-WHEEL FOR LEGENDS */}
      {modalType === 'sub_wheel_legend' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm z-50 p-4">
          <div className="bg-panelBg border border-panelBorder rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col items-center animate-scale-up">
            <h3 className="text-lg font-extrabold text-neonCyan tracking-wide font-mono mb-4 text-center uppercase">
              RULETA LEYENDA {modalData.category}
            </h3>
            
            <RouletteWheel
              options={modalData.options}
              onFinished={handleSubLegendFinished}
              buttonText={`GIRAR ${modalData.category.toUpperCase()}`}
              onSpinStart={() => {}}
            />
          </div>
        </div>
      )}

      {/* COMODÍN SELECTOR CATALOG (Forced Immediate Selection) */}
      {modalType === 'comodin_select' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm z-50 p-4">
          <div className="bg-panelBg border border-panelBorder rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[85vh] animate-scale-up">
            <h3 className="text-lg font-extrabold text-neonCyan tracking-wide font-mono uppercase mb-2 border-b border-panelBorder/40 pb-2">
              Seleccionar Leyenda {modalData.category} (Efecto Comodín)
            </h3>
            <p className="text-xs text-gray-400 font-mono mb-4">
              Selecciona manualmente al jugador legendario que deseas incorporar a tu equipo ({modalData.team?.name}):
            </p>

            <div className="mb-4">
              <input
                type="text"
                className="w-full bg-darkBg border border-panelBorder p-2.5 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none"
                placeholder="Buscar leyenda por nombre..."
                onChange={(e) => {
                  const val = e.target.value.toLowerCase();
                  setModalData(prev => ({
                    ...prev,
                    filterTerm: val
                  }));
                }}
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 gap-2 mb-6">
              {modalData.pool
                .filter(name => !modalData.filterTerm || name.toLowerCase().includes(modalData.filterTerm))
                .map((name, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedLegendForComodin(name)}
                    className={`p-3 bg-darkBg border rounded-xl cursor-pointer text-xs font-mono font-bold text-center transition-all ${
                      selectedLegendForComodin === name
                        ? 'border-neonCyan bg-neonCyan/10 text-neonCyan'
                        : 'border-panelBorder text-white hover:border-gray-500'
                    }`}
                  >
                    {name} ({getLegendPosition(name)})
                  </div>
                ))}
              {modalData.pool.filter(name => !modalData.filterTerm || name.toLowerCase().includes(modalData.filterTerm)).length === 0 && (
                <p className="col-span-2 text-center text-xs text-gray-500 font-mono py-8">Ninguna leyenda disponible coincide con la búsqueda.</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleConfirmComodinSelect}
                disabled={!selectedLegendForComodin}
                className={`w-1/2 py-3 rounded-xl font-black text-xs tracking-wider transition-all uppercase font-mono ${
                  selectedLegendForComodin
                    ? 'bg-gradient-to-r from-neonCyan to-cyan-500 text-darkBg shadow-neonCyan'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                CONFIRMAR ELECCIÓN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL SIGNING INPUT (FICHAJES) */}
      {modalType === 'fichar_manual' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 p-4 animate-fade-in">
          <div className="bg-panelBg border border-panelBorder rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold text-neonCyan tracking-wide font-mono uppercase mb-4 border-b border-panelBorder pb-2">
              ⚽ Registrar Fichaje: {modalData.title}
            </h3>
            
            {modalData.subTeam && (
              <div className="mb-4 bg-cyan-950/20 border border-neonCyan/20 p-3 rounded-lg text-xs font-mono">
                <span className="text-gray-400">Equipo obtenido:</span>
                <span className="text-neonCyan font-bold block text-sm mt-0.5">{modalData.subTeam}</span>
              </div>
            )}

            <div className="flex flex-col">
              <label className="text-[10px] text-gray-500 font-mono mb-1">NOMBRE DEL JUGADOR A FICHAR</label>
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="bg-darkBg border border-panelBorder p-3 rounded-lg text-sm text-white focus:outline-none focus:border-neonCyan font-semibold uppercase"
                placeholder="Ej: Kylian Mbappé, Haaland..."
                autoFocus
              />
            </div>

            <button
              onClick={handleConfirmSigning}
              className="w-full mt-6 py-3 rounded-xl font-bold bg-gradient-to-r from-neonCyan to-cyan-500 text-darkBg shadow-neonCyan hover:brightness-105 active:scale-95 transition-all text-center tracking-wider text-sm uppercase"
            >
              CONFIRMAR FICHAJE
            </button>
          </div>
        </div>
      )}

      {/* MANUAL REMOVE SELECTOR (ESCARTES BY TYPED NAME) */}
      {modalType === 'quitar_manual' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 p-4 animate-fade-in">
          <div className="bg-panelBg border border-panelBorder rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold text-neonPink tracking-wide font-mono uppercase mb-2">
              ❌ Descartar Jugador: {modalData.title}
            </h3>
            <p className="text-xs text-gray-500 mb-4 font-mono">
              Escribe directamente el nombre del jugador a eliminar de la plantilla de {modalData.team?.name}. 
              <br />
              <span className="text-neonGold font-bold">Nota: Los capitanes Diamante no se pueden eliminar.</span>
            </p>

            {/* Datalist of only eligible players to help the user */}
            <datalist id="removable-players-datalist">
              {getEligibleRemovablePlayers(modalData.team?.legends || [], modalData.posTag, modalData.team?.captain).map((p, idx) => (
                <option key={idx} value={p.name}>
                  {p.position} - {p.category}
                </option>
              ))}
            </datalist>

            <div className="flex flex-col">
              <label className="text-[10px] text-gray-500 font-mono mb-1">NOMBRE DEL JUGADOR A DESCARTAR</label>
              <input
                type="text"
                value={removeInput}
                onChange={(e) => {
                  setRemoveInput(e.target.value);
                  setRemoveError('');
                }}
                list="removable-players-datalist"
                className="bg-darkBg border border-panelBorder p-3 rounded-lg text-sm text-white focus:outline-none focus:border-neonPink font-semibold uppercase"
                placeholder="Escribe el nombre del jugador..."
                autoFocus
              />
              {removeError && (
                <span className="text-[10px] text-neonPink font-bold font-mono mt-1.5 animate-pulse">
                  ⚠ {removeError}
                </span>
              )}
            </div>

            <button
              onClick={handleConfirmRemoveManual}
              className="w-full mt-6 py-3 rounded-xl font-bold bg-gradient-to-r from-neonPink to-pink-600 text-white shadow-neonPink hover:brightness-105 active:scale-95 transition-all text-center tracking-wider text-sm uppercase font-mono"
            >
              CONFIRMAR DESCARTE
            </button>
          </div>
        </div>
      )}

      {/* OPTION RESULT MESSAGE BANNER */}
      {modalType === 'result_message' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm z-50 p-4">
          <div className="bg-panelBg border border-panelBorder rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center animate-scale-up">
            <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase block mb-1">EFECTO DE LA RULETA</span>
            <h4 className="text-2xl font-black text-neonCyan tracking-tight uppercase drop-shadow-[0_0_5px_rgba(0,240,255,0.4)]">
              {modalData.message}
            </h4>
            
            <button
              onClick={handleCloseResultMessage}
              className="mt-6 w-full py-3 bg-panelBorder rounded-xl font-bold hover:bg-gray-800 text-sm tracking-wider transition-all"
            >
              ACEPTAR Y CONTINUAR
            </button>
          </div>
        </div>
      )}
      {/* CONFIRM ACTION CUSTOM DIALOG */}
      {modalType === 'confirm_action' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm z-50 p-4">
          <div className="bg-panelBg border border-panelBorder rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-scale-up border-t-4 border-t-neonPink">
            <h3 className="text-lg font-black text-white tracking-wide font-mono mb-2 uppercase flex items-center gap-2">
              ⚠️ {modalData.title || 'Confirmación'}
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-6 font-semibold">
              {modalData.message}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  sounds.playTick();
                  setModalType(null);
                  if (modalData.onCancel) modalData.onCancel();
                }}
                className="flex-1 py-2.5 rounded-xl font-bold bg-panelBorder text-white hover:bg-gray-800 transition-all text-xs uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  sounds.playSuccess();
                  setModalType(null);
                  if (modalData.onConfirm) modalData.onConfirm();
                }}
                className="flex-1 py-2.5 rounded-xl font-black bg-gradient-to-r from-neonPink to-red-500 text-white hover:brightness-110 active:scale-95 transition-all text-xs uppercase shadow-md shadow-neonPink/20"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DraftRoom;
