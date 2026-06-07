import React, { useState, useEffect, useRef } from 'react';
import RouletteWheel from '../components/RouletteWheel';
import PlayerCard from '../components/PlayerCard';
import sounds from '../utils/audio';
import { getLegendPosition } from '../utils/legendPositions';
import { getConstants, saveTournament, deleteTournament } from '../services/tournamentService';
import { useTeamLogos } from '../hooks/useTeamLogos';
import RulesEncyclopedia from '../components/RulesEncyclopedia';

const DraftRoom = ({ initialTournamentData, onComplete, onBackToMenu }) => {
  const [tournament, setTournament] = useState(initialTournamentData);
  const [draftPhase, setDraftPhase] = useState('mode_select'); // 'mode_select', 'teams', 'captains', 'options', 'finished', 'group_distribution', 'manual_setup', 'champion_advantage'
  const { getLogoUrl } = useTeamLogos();

  // Manual setup state
  const [manualTeamAssignments, setManualTeamAssignments] = useState({}); // { playerName: [teamName, ...] }
  const [manualCaptainAssignments, setManualCaptainAssignments] = useState({}); // { teamName: captainName }
  const [manualSetupError, setManualSetupError] = useState('');
  
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

  // Toast notifications
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef(null);

  // Champion spin completed guardrail
  const [champSpinCompleted, setChampSpinCompleted] = useState(false);

  // Rules encyclopedia modal
  const [showRules, setShowRules] = useState(false);

  // Pending spin results and keys for respinning
  const [pendingSpinResult, setPendingSpinResult] = useState(null);
  const [pendingSubSpinResult, setPendingSubSpinResult] = useState(null);
  const [wheelKey, setWheelKey] = useState(0);
  const [subWheelKey, setSubWheelKey] = useState(0);
  
  // Pools that shrink as they are drawn
  const [availableTeams, setAvailableTeams] = useState([]);
  const [availableDiamonds, setAvailableDiamonds] = useState([]);
  const [availableGolds, setAvailableGolds] = useState([]);
  const [availableSilvers, setAvailableSilvers] = useState([]);
  const [availableBronzes, setAvailableBronzes] = useState([]);

  // Player Repesca Tokens Bank
  const [playerRepescas, setPlayerRepescas] = useState({});
  const [playerRepeats, setPlayerRepeats] = useState({});
  const [playerSpecialAdvantages, setPlayerSpecialAdvantages] = useState({});

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
        const data = getConstants();
        setConstants(data);
        
        // Scan tournament for already drafted teams and legends
        const draftedTeams = new Set();
        const assignedLegendsNormalized = new Set();

        const addLegendToSet = (name) => {
          if (name) {
            assignedLegendsNormalized.add(name.trim().toLowerCase());
          }
        };
        
        if (tournament.teams) {
          tournament.teams.forEach(t => {
            draftedTeams.add(t.name);
            if (t.captain) addLegendToSet(t.captain);
            if (t.legends) {
              t.legends.forEach(l => addLegendToSet(l.name));
            }
          });
        }

        // FIX: Exclude the previous champion's retained captain from Diamond pool
        const prevChampTeamName = tournament.advantages?.prevChampTeam;
        const prevChampTeamObj = (tournament.teams || []).find(t => t.name === prevChampTeamName);
        if (prevChampTeamObj?.captain) {
          addLegendToSet(prevChampTeamObj.captain);
        }

        // FIX CRITICAL: Exclude prevCaptain set in the wizard (even before a team object exists)
        const prevCaptainFromWizard = tournament.advantages?.prevCaptain;
        if (prevCaptainFromWizard) {
          addLegendToSet(prevCaptainFromWizard);
        }

        // FIX CRITICAL: Exclude all retainedPlayers from ALL legend pools
        // retainedPlayers is an array of player name strings stored in advantages
        const retainedPlayers = tournament.advantages?.retainedPlayers || [];
        retainedPlayers.forEach(playerName => {
          addLegendToSet(playerName);
        });

        // Initialize pools by excluding already used entities
        setAvailableTeams(data.teams.filter(t => !draftedTeams.has(t)));
        setAvailableDiamonds(data.diamond_legends.filter(c => !assignedLegendsNormalized.has(c.trim().toLowerCase())));
        setAvailableGolds(data.gold_legends.filter(c => !assignedLegendsNormalized.has(c.trim().toLowerCase())));
        setAvailableSilvers(data.silver_legends.filter(c => !assignedLegendsNormalized.has(c.trim().toLowerCase())));
        setAvailableBronzes(data.bronze_legends.filter(c => !assignedLegendsNormalized.has(c.trim().toLowerCase())));

        
        // Initialize player tokens bank (Repescas, repeats, specials)
        const reps = {};
        const repeats = {};
        const specials = {};
        tournament.human_players.forEach(p => {
          const inv = (tournament.advantages && tournament.advantages.inventories && tournament.advantages.inventories[p.name]) || {
            repescas: (tournament.advantages && tournament.advantages.wildcards && tournament.advantages.wildcards[p.name]) || 1,
            repeats: 0,
            comodinOro: 0,
            comodinDiamante: 0,
            ruletaOro: 0,
            ruletaDiamante: 0
          };
          reps[p.name] = inv.repescas || 0;
          repeats[p.name] = inv.repeats || 0;
          specials[p.name] = {
            comodinOro: inv.comodinOro || 0,
            comodinDiamante: inv.comodinDiamante || 0,
            ruletaOro: inv.ruletaOro || 0,
            ruletaDiamante: inv.ruletaDiamante || 0
          };
        });
        setPlayerRepescas(reps);
        setPlayerRepeats(repeats);
        setPlayerSpecialAdvantages(specials);

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

        // Init manual team assignment structure with empty arrays per player
        const initTeams = {};
        tournament.human_players.forEach(p => {
          initTeams[p.name] = [];
          // Pre-fill already assigned teams (champion team)
          if (tournament.teams) {
            tournament.teams.forEach(t => {
              if (t.owner === p.name) initTeams[p.name].push(t.name);
            });
          }
        });
        setManualTeamAssignments(initTeams);

        // Pre-fill captain assignments from already assigned teams
        const initCaptains = {};
        if (tournament.teams) {
          tournament.teams.forEach(t => {
            if (t.captain) initCaptains[t.name] = t.captain;
          });
        }
        setManualCaptainAssignments(initCaptains);

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

  // Show a toast notification (auto-dismiss after 3.5s)
  const showToast = (message) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    setToastVisible(true);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 3500);
  };

  // Check whether champion spin is required before advancing
  const hasChampionPending = () => {
    const hasPrevChamp = tournament.advantages?.hasPrevChampion;
    const champResult  = tournament.advantages?.championsRouletteResult;
    return hasPrevChamp && champResult && !champSpinCompleted;
  };

  // --- HELPERS FOR INVENTORIES & RESPINS ---
  const syncTournamentInventories = (reps = playerRepescas, repeats = playerRepeats, specials = playerSpecialAdvantages) => {
    setTournament(prev => {
      const updated = { ...prev };
      if (!updated.advantages) updated.advantages = {};
      
      const invs = {};
      prev.human_players.forEach(p => {
        invs[p.name] = {
          repescas: reps[p.name] || 0,
          repeats: repeats[p.name] || 0,
          comodinOro: specials[p.name]?.comodinOro || 0,
          comodinDiamante: specials[p.name]?.comodinDiamante || 0,
          ruletaOro: specials[p.name]?.ruletaOro || 0,
          ruletaDiamante: specials[p.name]?.ruletaDiamante || 0
        };
      });
      updated.advantages.inventories = invs;
      
      // Keep wildcard count in sync for backwards compatibility
      if (!updated.advantages.wildcards) updated.advantages.wildcards = {};
      prev.human_players.forEach(p => {
        updated.advantages.wildcards[p.name] = reps[p.name] || 1;
      });

      return updated;
    });
  };

  const handleUseRepeatSpin = () => {
    if (!pendingSpinResult) return;
    const owner = pendingSpinResult.owner;
    const currentReps = playerRepeats[owner] || 0;
    if (currentReps <= 0) return;

    sounds.playTick();

    const updatedRepeats = {
      ...playerRepeats,
      [owner]: currentReps - 1
    };
    setPlayerRepeats(updatedRepeats);
    syncTournamentInventories(playerRepescas, updatedRepeats, playerSpecialAdvantages);

    setPendingSpinResult(null);
    setIsProcessing(false);
    setWheelKey(prev => prev + 1);
  };

  const handleUseRepeatSubSpin = () => {
    if (!pendingSubSpinResult) return;
    const owner = pendingSubSpinResult.owner;
    const currentReps = playerRepeats[owner] || 0;
    if (currentReps <= 0) return;

    sounds.playTick();

    const updatedRepeats = {
      ...playerRepeats,
      [owner]: currentReps - 1
    };
    setPlayerRepeats(updatedRepeats);
    syncTournamentInventories(playerRepescas, updatedRepeats, playerSpecialAdvantages);

    setPendingSubSpinResult(null);
    setSubWheelKey(prev => prev + 1);
  };

  // --- SPECIAL ADVANTAGES TRIGGER AND EXECUTION ---
  const handleUseSpecialAdvantage = (playerName, type) => {
    const playerTeams = tournament.teams.filter(t => t.owner === playerName);
    if (playerTeams.length === 0) {
      alert('Debes tener al menos un equipo asignado para usar esta ventaja.');
      return;
    }

    // La ventaja del campeón es automática: siempre se aplica al equipo campeón
    // guardado en tournament.advantages.prevChampTeam, sin mostrar selector.
    const prevChampTeamName = tournament.advantages?.prevChampTeam;
    if (prevChampTeamName) {
      const champTeam = playerTeams.find(t => t.name === prevChampTeamName);
      if (champTeam) {
        // Equipo campeón encontrado → ejecutar directo, sin selector
        executeSpecialAdvantage(playerName, type, champTeam);
        return;
      }
    }

    // Fallback: si por alguna razón no existe prevChampTeam registrado,
    // usar el primer equipo del jugador (o el selector si tiene varios).
    if (playerTeams.length === 1) {
      executeSpecialAdvantage(playerName, type, playerTeams[0]);
    } else {
      setModalType('select_team_for_advantage');
      setModalData({ playerName, type, teams: playerTeams });
    }
  };

  const executeSpecialAdvantage = (playerName, type, team) => {
    sounds.playTick();
    
    const fakeSpinLog = {
      accion: `Ventaja: ${type}`,
      resultado: 'Pendiente'
    };
    
    const contextData = {
      isSpecialAdvantage: true,
      specialAdvantageType: type,
      playerName,
      team,
      spinLog: fakeSpinLog
    };
    
    if (type === 'comodinOro') {
      setModalType('comodin_select');
      setModalData({ category: 'Oro', pool: availableGolds, team, spinLog: fakeSpinLog, contextData });
      setSelectedLegendForComodin('');
    } else if (type === 'comodinDiamante') {
      setModalType('comodin_select');
      setModalData({ category: 'Diamante', pool: availableDiamonds, team, spinLog: fakeSpinLog, contextData });
      setSelectedLegendForComodin('');
    } else if (type === 'ruletaOro') {
      setModalType('sub_wheel_legend');
      setModalData({ category: 'Oro', options: availableGolds, team, spinLog: fakeSpinLog, contextData });
    } else if (type === 'ruletaDiamante') {
      setModalType('sub_wheel_legend');
      setModalData({ category: 'Diamante', options: availableDiamonds, team, spinLog: fakeSpinLog, contextData });
    }
  };

  // --- MODO MANUAL: CONFIRMACIÓN Y CONSTRUCCIÓN DEL TORNEO ---
  const handleConfirmManualSetup = async () => {
    setManualSetupError('');

    // Validation: all players must have exactly teams_per_player teams assigned
    const teamsPerPlayer = tournament.teams_per_player;
    for (const player of tournament.human_players) {
      const assigned = manualTeamAssignments[player.name] || [];
      if (assigned.length !== teamsPerPlayer) {
        setManualSetupError(`${player.name} debe tener exactamente ${teamsPerPlayer} equipos asignados (tiene ${assigned.length}).`);
        return;
      }
    }

    // Validation: no duplicate teams across players
    const allAssigned = Object.values(manualTeamAssignments).flat();
    const uniqueTeams = new Set(allAssigned);
    if (uniqueTeams.size !== allAssigned.length) {
      setManualSetupError('Hay equipos duplicados. Cada equipo solo puede ser asignado a un jugador.');
      return;
    }

    // Validation: all assigned teams must have a captain
    for (const teamName of allAssigned) {
      if (!manualCaptainAssignments[teamName]) {
        setManualSetupError(`El equipo "${teamName}" no tiene capitán asignado.`);
        return;
      }
    }

    // Validation: no duplicate captains
    const allCaptains = Object.values(manualCaptainAssignments).filter(Boolean);
    const uniqueCaptains = new Set(allCaptains);
    if (uniqueCaptains.size !== allCaptains.length) {
      setManualSetupError('Hay capitanes duplicados. Cada capitán solo puede asignarse a un equipo.');
      return;
    }

    // Build the teams array — merge pre-assigned teams (champion) with new manual ones
    const preExistingTeams = tournament.teams || [];
    const preExistingNames = new Set(preExistingTeams.map(t => t.name));

    const newTeams = [...preExistingTeams];

    for (const player of tournament.human_players) {
      const assigned = manualTeamAssignments[player.name] || [];
      for (const teamName of assigned) {
        if (preExistingNames.has(teamName)) {
          // Already exists (champion team) — update captain if needed
          const idx = newTeams.findIndex(t => t.name === teamName);
          if (idx !== -1 && !newTeams[idx].captain) {
            const captainName = manualCaptainAssignments[teamName];
            const captainPos = getLegendPosition(captainName);
            newTeams[idx].captain = captainName;
            newTeams[idx].captain_category = 'Diamante';
            if (!newTeams[idx].legends.find(l => l.name === captainName)) {
              newTeams[idx].legends.push({ name: captainName, category: 'Diamante', position: captainPos });
            }
          }
        } else {
          const captainName = manualCaptainAssignments[teamName] || null;
          const captainPos = captainName ? getLegendPosition(captainName) : 'Sin definir';
          newTeams.push({
            name: teamName,
            owner: player.name,
            captain: captainName,
            captain_category: captainName ? 'Diamante' : null,
            legends: captainName ? [{ name: captainName, category: 'Diamante', position: captainPos }] : [],
            option_results: [],
            base_changes: [],
            spins: [],
            eliminated_players: [],
            wildcards: { Bronce: 0, Plata: 0, Oro: 0, Diamante: 0 }
          });
        }
      }
    }

    // Update available pools (remove used teams and captains)
    const usedTeamNames = new Set(newTeams.map(t => t.name));
    const usedCaptainNames = new Set(Object.values(manualCaptainAssignments).filter(Boolean));
    setAvailableTeams(prev => prev.filter(t => !usedTeamNames.has(t)));
    setAvailableDiamonds(prev => prev.filter(c => !usedCaptainNames.has(c)));

    // Save tournament with all teams
    const updatedTournament = { ...tournament, teams: newTeams };
    setTournament(updatedTournament);

    try {
      await saveTournament(tournament.filename, updatedTournament);
    } catch (err) {
      console.error('Error guardando el setup manual:', err);
    }

    sounds.playCardReveal();

    // Decide next phase:
    // If there's a champion advantage (ruletaDeCampeones result) that hasn't been used → show it
    const champResult = tournament.advantages?.championsRouletteResult;
    const hasPrevChamp = tournament.advantages?.hasPrevChampion;
    if (hasPrevChamp && champResult) {
      setDraftPhase('champion_advantage');
    } else {
      // Skip directly to options (3 spins per team)
      setCurrentOptionTeamIndex(0);
      setCurrentSpinNumber(1);
      setDraftPhase('options');
    }
  };

  // --- SORTEO EQUIPOS ---
  const handleTeamDrawn = (teamName) => {
    const latestTurnIndex = currentTurnIndexRef.current;
    const activePlayerName = turnSequence[latestTurnIndex];
    setPendingSpinResult({
      type: 'team',
      value: teamName,
      owner: activePlayerName
    });
  };

  const confirmTeamDrawn = (teamName) => {
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
      eliminated_players: [],
      wildcards: { Bronce: 0, Plata: 0, Oro: 0, Diamante: 0 }
    };

    const latestTournament = tournamentRef.current;
    const updatedTeams = [...latestTournament.teams, newTeam];
    const updatedTournament = { ...latestTournament, teams: updatedTeams };
    setTournament(updatedTournament);
    
    setAvailableTeams(prev => prev.filter(t => t !== teamName));
    setPendingSpinResult(null);

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
    const activeTeamOwner = tournament.teams[latestTeamIndex]?.owner;
    setPendingSpinResult({
      type: 'captain',
      value: captainName,
      owner: activeTeamOwner,
      teamIndex: latestTeamIndex
    });
  };

  const confirmCaptainDrawn = (captainName) => {
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
    lockLegend(captainName);
    setPendingSpinResult(null);

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
    }, 500);
  };

  // --- RULETA OPCIONES ---
  const handleOptionDrawn = (optionName) => {
    const latestOptionTeamIndex = currentOptionTeamIndexRef.current;
    const activeTeamOwner = tournament.teams[latestOptionTeamIndex]?.owner;
    setPendingSpinResult({
      type: 'option',
      value: optionName,
      owner: activeTeamOwner,
      teamIndex: latestOptionTeamIndex
    });
  };

  const confirmOptionDrawn = (optionName) => {
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
    setPendingSpinResult(null);

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
  const handleSubLegendFinishedWrapper = (legendName) => {
    setPendingSubSpinResult({
      type: 'sub_legend',
      value: legendName,
      owner: modalData.team?.owner,
      modalData: modalData
    });
  };

  const confirmSubLegendFinished = (legendName, mData) => {
    const { category, team, spinLog, contextData } = mData;
    sounds.playSuccess();
    
    const legendPos = getLegendPosition(legendName);
    team.legends.push({ name: legendName, category, position: legendPos });
    team.base_changes.push(`Giro: ${legendName} (${category})`);
    
    // Lock globally
    lockLegend(legendName);
    
    setModalType(null);
    setPendingSubSpinResult(null);

    if (contextData && contextData.isSpecialAdvantage) {
      // Deduct item
      const pName = contextData.playerName;
      const advType = contextData.specialAdvantageType;
      
      const updatedSpecials = {
        ...playerSpecialAdvantages,
        [pName]: {
          ...playerSpecialAdvantages[pName],
          [advType]: Math.max(0, (playerSpecialAdvantages[pName]?.[advType] || 1) - 1)
        }
      };
      setPlayerSpecialAdvantages(updatedSpecials);
      syncTournamentInventories(playerRepescas, playerRepeats, updatedSpecials);

      setModalType('result_message_static');
      setModalData({ message: `Leyenda ${category}: ${legendName} añadida a ${team.name}` });
    } else {
      completeOptionSpin(`Leyenda ${category}: ${legendName}`, spinLog);
    }
  };

  // --- COMODÍN IMMEDIATE CONFIRM ---
  const handleConfirmComodinSelect = () => {
    if (!selectedLegendForComodin) return;
    sounds.playSuccess();
    
    const { category, team, spinLog, contextData } = modalData;
    const legendName = selectedLegendForComodin;
    
    const legendPos = getLegendPosition(legendName);
    team.legends.push({ name: legendName, category, position: legendPos });
    team.base_changes.push(`Elegido: ${legendName} (${category})`);
    
    // Lock globally
    lockLegend(legendName);
    
    setModalType(null);

    if (contextData && contextData.isSpecialAdvantage) {
      // Deduct item
      const pName = contextData.playerName;
      const advType = contextData.specialAdvantageType;
      
      const updatedSpecials = {
        ...playerSpecialAdvantages,
        [pName]: {
          ...playerSpecialAdvantages[pName],
          [advType]: Math.max(0, (playerSpecialAdvantages[pName]?.[advType] || 1) - 1)
        }
      };
      setPlayerSpecialAdvantages(updatedSpecials);
      syncTournamentInventories(playerRepescas, playerRepeats, updatedSpecials);

      setModalType('result_message_static');
      setModalData({ message: `Comodín ${category}: ${legendName} añadido a ${team.name}` });
    } else {
      completeOptionSpin(`Comodín ${category}: ${legendName}`, spinLog);
    }
  };

  // --- SUB-WHEELS AND SIGNINGS RESOLUTION ---
  const handleSubWheelFinishedWrapper = (subTeamName) => {
    setPendingSubSpinResult({
      type: 'sub_team',
      value: subTeamName,
      owner: modalData.team?.owner,
      modalData: modalData
    });
  };

  const confirmSubWheelFinished = (subTeamName, mData) => {
    setModalType('fichar_manual');
    setModalData({
      ...mData,
      subTeam: subTeamName,
      title: `Fichaje de ${subTeamName}`
    });
    setPendingSubSpinResult(null);
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

    const syncedAdvantages = {
      ...tournament.advantages,
      inventories: {}
    };
    tournament.human_players.forEach(p => {
      syncedAdvantages.inventories[p.name] = {
        repescas: playerRepescas[p.name] || 0,
        repeats: playerRepeats[p.name] || 0,
        comodinOro: playerSpecialAdvantages[p.name]?.comodinOro || 0,
        comodinDiamante: playerSpecialAdvantages[p.name]?.comodinDiamante || 0,
        ruletaOro: playerSpecialAdvantages[p.name]?.ruletaOro || 0,
        ruletaDiamante: playerSpecialAdvantages[p.name]?.ruletaDiamante || 0
      };
    });

    if (!syncedAdvantages.wildcards) syncedAdvantages.wildcards = {};
    tournament.human_players.forEach(p => {
      syncedAdvantages.wildcards[p.name] = playerRepescas[p.name] || 1;
    });

    const updatedTournament = {
      ...tournament,
      status: 'Fase de Grupos',
      teams: updatedTeams,
      advantages: syncedAdvantages,
      repescas: playerRepescas,
      matches: generateFixtures(groups)
    };
    
    try {
      await saveTournament(tournament.filename, updatedTournament);
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
          const syncedAdvantages = {
            ...tournament.advantages,
            inventories: {}
          };
          tournament.human_players.forEach(p => {
            syncedAdvantages.inventories[p.name] = {
              repescas: playerRepescas[p.name] || 0,
              repeats: playerRepeats[p.name] || 0,
              comodinOro: playerSpecialAdvantages[p.name]?.comodinOro || 0,
              comodinDiamante: playerSpecialAdvantages[p.name]?.comodinDiamante || 0,
              ruletaOro: playerSpecialAdvantages[p.name]?.ruletaOro || 0,
              ruletaDiamante: playerSpecialAdvantages[p.name]?.ruletaDiamante || 0
            };
          });

          if (!syncedAdvantages.wildcards) syncedAdvantages.wildcards = {};
          tournament.human_players.forEach(p => {
            syncedAdvantages.wildcards[p.name] = playerRepescas[p.name] || 1;
          });

          const tournamentToSave = {
            ...tournament,
            advantages: syncedAdvantages
          };

          await saveTournament(tournament.filename, tournamentToSave);
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
          await deleteTournament(tournament.filename);
          if (onBackToMenu) onBackToMenu();
        } catch (err) {
          alert("No se pudo reiniciar el torneo: " + err.message);
        }
      }
    });
  };

  const renderAdvantagesPanel = () => {
    return (
      <div 
        className="bg-panelBg/90 border border-panelBorder rounded-2xl p-5 shadow-xl font-mono text-xs w-full"
        style={{ background: 'linear-gradient(135deg, rgba(11,20,38,0.9) 0%, rgba(6,10,18,0.95) 100%)' }}
      >
        <div className="flex justify-between items-center border-b border-panelBorder/30 pb-3 mb-4">
          <span className="text-[10px] text-neonCyan font-bold tracking-widest uppercase">🎒 Inventario de Ventajas</span>
          <span className="text-[9px] text-gray-500">Haz clic en comodines o giros de ruleta especiales para aplicarlos a tus equipos</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {tournament.human_players.map(p => {
            const reps = playerRepescas[p.name] || 0;
            const repeats = playerRepeats[p.name] || 0;
            const spec = playerSpecialAdvantages[p.name] || { comodinOro: 0, comodinDiamante: 0, ruletaOro: 0, ruletaDiamante: 0 };
            
            const hasSpecials = spec.comodinOro > 0 || spec.comodinDiamante > 0 || spec.ruletaOro > 0 || spec.ruletaDiamante > 0;
            const isChampOwner = tournament.advantages?.prevChampOwner === p.name;
            
            return (
              <div key={p.name} className="p-3 bg-darkBg/60 border border-panelBorder/60 rounded-xl flex flex-col gap-2.5">
                <div className="flex justify-between items-center border-b border-panelBorder/20 pb-1.5">
                  <span className="font-extrabold text-white text-sm">{p.name}</span>
                  {isChampOwner && (
                    <span className="text-[8px] bg-neonGold/10 border border-neonGold/30 text-neonGold px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">🏆 Campeón</span>
                  )}
                </div>
                
                <div className="flex flex-col gap-1.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-gray-400">🛡️ Fichas de Repesca:</span>
                    <span className="text-neonCyan font-bold text-sm">x{reps}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">🔄 Repetir Tiradas:</span>
                    <span className="text-emerald-400 font-bold text-sm">x{repeats}</span>
                  </div>
                </div>
                
                {hasSpecials && (
                  <div className="flex flex-col gap-1.5 border-t border-panelBorder/20 pt-2">
                    <span className="text-[8px] text-neonGold font-bold tracking-wider uppercase mb-0.5">Ventajas de Ruleta de Campeones:</span>
                    <div className="flex flex-col gap-1.5">
                      {spec.comodinOro > 0 && (
                        <button
                          type="button"
                          onClick={() => handleUseSpecialAdvantage(p.name, 'comodinOro')}
                          className="w-full py-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-[9px] text-amber-300 font-bold hover:bg-amber-500/20 hover:text-white transition-all uppercase tracking-wider"
                        >
                          🌟 Usar Comodín Oro ({spec.comodinOro})
                        </button>
                      )}
                      {spec.comodinDiamante > 0 && (
                        <button
                          type="button"
                          onClick={() => handleUseSpecialAdvantage(p.name, 'comodinDiamante')}
                          className="w-full py-1.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[9px] text-cyan-300 font-bold hover:bg-cyan-500/20 hover:text-white transition-all uppercase tracking-wider"
                        >
                          💎 Usar Comodín Diamante ({spec.comodinDiamante})
                        </button>
                      )}
                      {spec.ruletaOro > 0 && (
                        <button
                          type="button"
                          onClick={() => handleUseSpecialAdvantage(p.name, 'ruletaOro')}
                          className="w-full py-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-[9px] text-amber-300 font-bold hover:bg-amber-500/20 hover:text-white transition-all uppercase tracking-wider"
                        >
                          🎰 Tirar Ruleta Oro ({spec.ruletaOro})
                        </button>
                      )}
                      {spec.ruletaDiamante > 0 && (
                        <button
                          type="button"
                          onClick={() => handleUseSpecialAdvantage(p.name, 'ruletaDiamante')}
                          className="w-full py-1.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[9px] text-cyan-300 font-bold hover:bg-cyan-500/20 hover:text-white transition-all uppercase tracking-wider"
                        >
                          🎰 Tirar Ruleta Diamante ({spec.ruletaDiamante})
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-darkBg text-white flex flex-col items-center p-6 select-none relative">
      {/* Background cinematic glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,18,32,0.4)_0%,rgba(3,5,8,1)_95%)] z-0 pointer-events-none" />

      {/* Header Info */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row justify-between items-start md:items-center border-b border-panelBorder pb-4 mb-6 z-10 gap-4">
        <div className="flex items-center gap-4">
          {/* Logo oficial del torneo */}
          <div
            style={{
              width: '3rem',
              height: '3rem',
              background: 'radial-gradient(circle at center, #0b1324 0%, #060b14 100%)',
              border: '1px solid rgba(0,243,255,0.35)',
              borderRadius: '50%',
              boxShadow: 'inset 0 0 14px rgba(0,243,255,0.12), 0 0 22px rgba(0,243,255,0.1)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <img
              src="/logo-escudo-clean.png"
              alt="Torneo Leyendas"
              style={{
                width: '80%',
                height: '80%',
                objectFit: 'contain',
                mixBlendMode: 'lighten',
                backgroundColor: 'transparent',
                filter: 'drop-shadow(0 1px 5px rgba(205,155,80,0.3))',
                display: 'block',
              }}
              draggable="false"
            />
          </div>
          <div>
            <span className="text-[10px] text-neonCyan font-mono tracking-widest block">SALA DE DRAFT</span>
            <h2 className="text-2xl font-black font-mono tracking-wide uppercase mt-0.5">{tournament.name}</h2>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-mono items-center w-full md:w-auto justify-end">
          <button
            onClick={() => setShowRules(true)}
            className="px-4 py-2 bg-darkBg border border-panelBorder rounded-xl text-gray-300 hover:text-white hover:border-neonCyan/50 transition-all font-mono flex items-center gap-1.5"
          >
            📚 REGLAS
          </button>
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
              {draftPhase === 'mode_select' && 'Selección de Modo'}
              {draftPhase === 'manual_setup' && 'Asignación Manual'}
              {draftPhase === 'champion_advantage' && 'Tirada del Campeón'}
              {draftPhase === 'teams' && 'Sorteo de Equipos'}
              {draftPhase === 'captains' && 'Capitanes Diamante'}
              {draftPhase === 'options' && 'Ruleta de Opciones'}
              {draftPhase === 'finished' && 'Draft Completado'}
              {draftPhase === 'group_distribution' && 'Distribución de Grupos'}
            </span>
          </div>
        </div>
      </div>

      {/* Advantages Inventory Panel */}
      <div className="w-full max-w-5xl mb-6 z-10">
        {renderAdvantagesPanel()}
      </div>

      {/* ================= PHASE 0: MODE SELECTION ================= */}
      {draftPhase === 'mode_select' && (
        <div className="w-full max-w-3xl z-10 animate-fade-in">
          <div className="text-center mb-10">
            <span className="text-[11px] text-neonCyan font-mono tracking-[0.25em] uppercase block mb-2">Bienvenido al Draft</span>
            <h2 className="text-4xl font-black text-white uppercase tracking-tight font-mono">¿Cómo quieres asignar los equipos?</h2>
            <p className="text-gray-400 text-sm mt-3 font-mono max-w-lg mx-auto">
              Elige si quieres usar las ruletas para el sorteo o asignar equipos y capitanes de forma manual.
            </p>
          </div>

          {/* Champion Spin Guardrail Banner */}
          {hasChampionPending() && (
            <div
              className="flex items-center gap-3 px-5 py-4 rounded-xl animate-pulse"
              style={{
                background: 'linear-gradient(135deg, rgba(255,195,60,0.12) 0%, rgba(255,140,0,0.06) 100%)',
                border: '1px solid rgba(255,195,60,0.4)',
                boxShadow: '0 0 20px rgba(255,195,60,0.1)',
              }}
            >
              <span className="text-2xl flex-shrink-0">👑</span>
              <div>
                <span className="block text-[11px] font-black font-mono uppercase tracking-wider text-amber-300">Tirada de Campeón Pendiente</span>
                <p className="text-[10px] text-amber-200/70 font-mono mt-0.5">
                  Debes seleccionar un modo y realizar la tirada del campeón antes de continuar con el draft.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ruleta */}
            <button
              onClick={() => {
                if (hasChampionPending()) {
                  showToast('👑 Debes realizar la tirada de campeón para continuar');
                  return;
                }
                sounds.playCardReveal();
                setDraftPhase('teams');
              }}
              className="group relative p-8 rounded-2xl border border-neonCyan/30 bg-gradient-to-br from-cyan-950/30 to-darkBg hover:border-neonCyan hover:shadow-[0_0_30px_rgba(0,243,255,0.15)] transition-all duration-300 flex flex-col items-center text-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-neonCyan/10 border border-neonCyan/30 flex items-center justify-center group-hover:bg-neonCyan/20 transition-all">
                <span className="text-3xl">🎰</span>
              </div>
              <div>
                <h3 className="text-xl font-black text-neonCyan font-mono uppercase tracking-wider">Modo Ruleta</h3>
                <p className="text-gray-400 text-xs mt-2 font-mono leading-relaxed">
                  Los equipos y capitanes se sortean con la ruleta giratoria. El método clásico con emoción garantizada.
                </p>
              </div>
              <span className="text-[10px] font-mono text-neonCyan/60 border border-neonCyan/20 px-3 py-1 rounded-full uppercase tracking-wider">
                Equipos → Capitanes → Opciones
              </span>
            </button>

            {/* Manual */}
            <button
              onClick={() => {
                if (hasChampionPending()) {
                  showToast('👑 Debes realizar la tirada de campeón para continuar');
                  return;
                }
                sounds.playSwoosh();
                setDraftPhase('manual_setup');
              }}
              className="group relative p-8 rounded-2xl border border-neonGold/30 bg-gradient-to-br from-amber-950/30 to-darkBg hover:border-neonGold hover:shadow-[0_0_30px_rgba(255,195,60,0.15)] transition-all duration-300 flex flex-col items-center text-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-neonGold/10 border border-neonGold/30 flex items-center justify-center group-hover:bg-neonGold/20 transition-all">
                <span className="text-3xl">✍️</span>
              </div>
              <div>
                <h3 className="text-xl font-black text-neonGold font-mono uppercase tracking-wider">Modo Manual</h3>
                <p className="text-gray-400 text-xs mt-2 font-mono leading-relaxed">
                  Asigna tú mismo qué equipo y capitán corresponde a cada participante. Salta directo a las tiradas de opciones.
                </p>
              </div>
              <span className="text-[10px] font-mono text-neonGold/60 border border-neonGold/20 px-3 py-1 rounded-full uppercase tracking-wider">
                Setup Manual → Opciones
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ================= PHASE: MANUAL SETUP ================= */}
      {draftPhase === 'manual_setup' && (
        <div className="w-full max-w-5xl z-10 animate-fade-in space-y-6">
          <div className="text-center">
            <span className="text-[10px] text-neonGold font-mono tracking-widest uppercase block mb-1">Modo Manual</span>
            <h2 className="text-2xl font-black text-white font-mono uppercase tracking-tight">Asignación de Equipos y Capitanes</h2>
            <p className="text-gray-500 text-xs mt-1 font-mono">
              Asigna {tournament.teams_per_player} equipo{tournament.teams_per_player > 1 ? 's' : ''} y su capitán Diamante a cada participante.
            </p>
          </div>

          {/* One card per player */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tournament.human_players.map(player => {
              const assigned = manualTeamAssignments[player.name] || [];
              // Compute which teams are used by OTHER players (so we can filter them out)
              const usedByOthers = new Set(
                Object.entries(manualTeamAssignments)
                  .filter(([pn]) => pn !== player.name)
                  .flatMap(([, teams]) => teams)
              );
              // Pool for this player: all constants teams minus already-used-by-others
              const availableForPlayer = constants.teams.filter(t => !usedByOthers.has(t));

              return (
                <div key={player.name} className="bg-panelBg border border-panelBorder rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3 border-b border-panelBorder/40 pb-3">
                    <div className="w-8 h-8 rounded-full bg-neonGold/10 border border-neonGold/30 flex items-center justify-center text-sm font-black text-neonGold">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-sm tracking-wide">{player.name}</h3>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {assigned.length} / {tournament.teams_per_player} equipos asignados
                      </span>
                    </div>
                  </div>

                  {/* Team slots */}
                  {Array.from({ length: tournament.teams_per_player }).map((_, slotIdx) => {
                    const currentTeamInSlot = assigned[slotIdx] || '';
                    const captain = currentTeamInSlot ? (manualCaptainAssignments[currentTeamInSlot] || '') : '';
                    // Pre-assigned champion team is read-only
                    const isPreAssigned = !!(tournament.teams || []).find(t => t.name === currentTeamInSlot && t.owner === player.name);
                    const captainAlreadySet = isPreAssigned && !!(tournament.teams || []).find(t => t.name === currentTeamInSlot && t.captain);

                    return (
                      <div key={slotIdx} className="bg-darkBg/60 border border-panelBorder/50 rounded-xl p-3 space-y-2">
                        <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest block">Equipo #{slotIdx + 1}</span>

                        {/* Team selector */}
                        {isPreAssigned ? (
                          <div className="flex items-center gap-2 px-3 py-2 bg-neonGold/5 border border-neonGold/20 rounded-lg">
                            <img
                              src={getLogoUrl ? getLogoUrl(currentTeamInSlot) : ''}
                              alt={currentTeamInSlot}
                              style={{ width: 20, height: 20, objectFit: 'contain', backgroundColor: 'transparent', display: 'block', flexShrink: 0 }}
                              onError={e => { e.target.style.display = 'none'; }}
                            />
                            <span className="text-neonGold font-bold text-xs">{currentTeamInSlot}</span>
                            <span className="text-[9px] text-neonGold/50 font-mono ml-auto">🏆 Pre-asignado</span>
                          </div>
                        ) : (
                          <select
                            value={currentTeamInSlot}
                            onChange={e => {
                              const newVal = e.target.value;
                              const newAssigned = [...assigned];
                              const oldTeam = newAssigned[slotIdx];
                              newAssigned[slotIdx] = newVal;
                              // Remove captain of old team if it had one
                              if (oldTeam && oldTeam !== newVal) {
                                setManualCaptainAssignments(prev => {
                                  const updated = { ...prev };
                                  delete updated[oldTeam];
                                  return updated;
                                });
                              }
                              setManualTeamAssignments(prev => ({
                                ...prev,
                                [player.name]: newAssigned
                              }));
                              setManualSetupError('');
                            }}
                            className="w-full bg-darkBg border border-panelBorder p-2 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-neonGold cursor-pointer"
                          >
                            <option value="">-- Selecciona un equipo --</option>
                            {availableForPlayer
                              .filter(t => t === currentTeamInSlot || !assigned.includes(t))
                              .sort()
                              .map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))
                            }
                          </select>
                        )}

                        {/* Captain selector — only shown when team is assigned */}
                        {currentTeamInSlot && (
                          captainAlreadySet ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-950/20 border border-neonCyan/20 rounded-lg">
                              <span className="text-neonCyan text-[10px] font-bold">💎 {(tournament.teams || []).find(t => t.name === currentTeamInSlot)?.captain}</span>
                              <span className="text-[9px] text-neonCyan/40 ml-auto font-mono">Pre-asignado</span>
                            </div>
                          ) : (
                            <select
                              value={captain}
                              onChange={e => {
                                setManualCaptainAssignments(prev => ({
                                  ...prev,
                                  [currentTeamInSlot]: e.target.value
                                }));
                                setManualSetupError('');
                              }}
                              className="w-full bg-darkBg border border-panelBorder p-2 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-neonCyan cursor-pointer"
                            >
                              <option value="">-- Capitán Diamante --</option>
                              {constants.diamond_legends
                                .filter(d => {
                                  // Show if it's the currently selected captain OR not used by any other team
                                  const usedByOtherTeam = Object.entries(manualCaptainAssignments)
                                    .some(([tn, cap]) => tn !== currentTeamInSlot && cap === d);
                                  return d === captain || !usedByOtherTeam;
                                })
                                .map(d => (
                                  <option key={d} value={d}>{d}</option>
                                ))
                              }
                            </select>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Error message */}
          {manualSetupError && (
            <div className="bg-red-950/30 border border-red-700/50 rounded-xl p-3 text-xs text-red-300 font-mono text-center animate-pulse">
              ⚠️ {manualSetupError}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-4 justify-center pb-6">
            <button
              onClick={() => { sounds.playTick(); setDraftPhase('mode_select'); }}
              className="px-6 py-3 rounded-full font-bold bg-panelBorder text-white hover:bg-gray-800 transition-all text-sm font-mono"
            >
              ← VOLVER
            </button>
            <button
              onClick={handleConfirmManualSetup}
              className="px-10 py-3 rounded-full font-black text-sm tracking-wider bg-gradient-to-r from-neonGold to-amber-500 text-darkBg shadow-neonGold hover:brightness-105 active:scale-95 transition-all uppercase font-mono"
            >
              ✅ CONFIRMAR SETUP Y CONTINUAR
            </button>
          </div>
        </div>
      )}

      {/* ================= PHASE: CHAMPION ADVANTAGE ================= */}
      {draftPhase === 'champion_advantage' && (() => {
        const champOwnerName = tournament.advantages?.prevChampOwner;
        const champTeamName = tournament.advantages?.prevChampTeam;
        const champResult = tournament.advantages?.championsRouletteResult;
        const champTeamObj = (tournament.teams || []).find(t => t.name === champTeamName);

        return (
          <div className="w-full max-w-lg z-10 animate-scale-up">
            <div className="bg-panelBg border border-neonGold rounded-2xl p-8 shadow-2xl text-center" style={{ boxShadow: '0 0 40px rgba(255,195,60,0.15)' }}>
              <div className="w-16 h-16 rounded-full bg-neonGold/10 border border-neonGold/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👑</span>
              </div>
              <span className="text-[10px] text-neonGold/70 font-mono tracking-widest uppercase block mb-1">Tirada del Campeón</span>
              <h2 className="text-2xl font-black text-white uppercase font-mono tracking-tight mb-1">{champOwnerName}</h2>
              {champTeamObj && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <img
                    src={getLogoUrl ? getLogoUrl(champTeamName) : ''}
                    alt={champTeamName}
                    style={{ width: 24, height: 24, objectFit: 'contain', backgroundColor: 'transparent', display: 'block' }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <span className="text-sm text-neonGold/80 font-mono font-bold">{champTeamName}</span>
                </div>
              )}

              <div className="bg-darkBg/60 border border-neonGold/30 rounded-xl p-5 mb-6">
                <span className="text-[10px] text-gray-500 font-mono uppercase block mb-1">Ventaja ganada en la Ruleta de Campeones</span>
                <span className="text-2xl font-black text-neonGold font-mono uppercase">{champResult}</span>
              </div>

              <p className="text-xs text-gray-400 font-mono mb-6 leading-relaxed">
                Este es el premio que obtuvo el campeón al girar la Ruleta de Campeones. Pulsa el botón para aplicarlo ahora a tu equipo antes de las tiradas de opciones.
              </p>

              <div className="space-y-3">
                {champTeamObj && (
                  <button
                    onClick={() => {
                      // Map champResult string to the advantage type key
                      const typeMap = {
                        'Comodín Oro': 'comodinOro',
                        'Comodín Diamante': 'comodinDiamante',
                        'Tirar Ruleta Oro': 'ruletaOro',
                        'Tirar Ruleta Diamante': 'ruletaDiamante'
                      };
                      const advType = typeMap[champResult];
                      if (advType) {
                        setChampSpinCompleted(true);
                        handleUseSpecialAdvantage(champOwnerName, advType);
                      }
                    }}
                    className="w-full py-4 rounded-xl font-black text-sm tracking-wider bg-gradient-to-r from-neonGold to-amber-500 text-darkBg shadow-neonGold hover:brightness-105 active:scale-95 transition-all uppercase font-mono"
                  >
                    👑 USAR VENTAJA AHORA
                  </button>
                )}
                <button
                  onClick={() => {
                    setChampSpinCompleted(true);
                    setCurrentOptionTeamIndex(0);
                    setCurrentSpinNumber(1);
                    setDraftPhase('options');
                  }}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-gray-400 border border-panelBorder hover:text-white hover:border-gray-500 transition-all font-mono uppercase"
                >
                  Omitir por ahora y continuar a tiradas
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= PHASE 1: TEAMS SORTEO ================= */}
      {draftPhase === 'teams' && (
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-8 z-10">
          <div className="lg:col-span-2 space-y-6">
            {/* ── TURN INDICATOR (EA FC style) ── */}
            <div
              className="rounded-2xl p-5 flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, rgba(0,243,255,0.08) 0%, rgba(0,180,210,0.04) 100%)',
                border: '1px solid rgba(0,243,255,0.35)',
                boxShadow: '0 0 24px rgba(0,243,255,0.08), inset 0 1px 0 rgba(0,243,255,0.1)',
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl text-darkBg flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #00f3ff 0%, #00c8d6 100%)', boxShadow: '0 0 16px rgba(0,243,255,0.5)' }}
                >
                  {(turnSequence[currentTurnIndex] || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="block text-[10px] font-mono tracking-[0.25em] uppercase" style={{ color: 'rgba(0,243,255,0.6)' }}>🎯 TURNO ACTUAL</span>
                  <span className="block text-2xl font-black text-white uppercase tracking-tight mt-0.5">
                    {turnSequence[currentTurnIndex]}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-mono tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>PROGRESO</span>
                <span className="block text-lg font-mono font-black text-white">
                  {currentTurnIndex + 1} <span style={{ color: 'rgba(0,243,255,0.5)' }}>/</span> {turnSequence.length}
                </span>
                {/* Mini player sequence */}
                <div className="flex gap-1 mt-1 justify-end">
                  {turnSequence.map((p, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black transition-all"
                      style={{
                        background: i === currentTurnIndex ? '#00f3ff' : i < currentTurnIndex ? 'rgba(0,243,255,0.15)' : 'rgba(255,255,255,0.05)',
                        color: i === currentTurnIndex ? '#030508' : i < currentTurnIndex ? 'rgba(0,243,255,0.5)' : 'rgba(255,255,255,0.2)',
                        border: i === currentTurnIndex ? '1px solid #00f3ff' : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {p.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div 
              className="rounded-2xl relative overflow-hidden min-h-[280px]"
              style={{
                background: 'linear-gradient(145deg, rgba(11,19,36,0.9) 0%, rgba(8,14,25,0.95) 100%)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              {/* Watermark logo - large centered branding */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <img 
                  src="/logo-escudo-clean.png" 
                  alt="" 
                  className="w-[70%] max-w-[320px] object-contain opacity-[0.06]"
                  style={{ 
                    mixBlendMode: 'lighten',
                    filter: 'saturate(0.6)',
                  }}
                  draggable="false"
                />
              </div>

              {/* Top subtle glow accent line */}
              <div 
                className="absolute top-0 left-[10%] right-[10%] h-[1px] z-10"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(0,243,255,0.15), transparent)' }}
              />

              {/* Header */}
              <div className="px-6 pt-5 pb-3 relative z-10 flex items-center justify-between">
                <h3 
                  className="text-[11px] font-extrabold tracking-[0.2em] font-mono uppercase"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  EQUIPOS ASIGNADOS
                </h3>
                <span 
                  className="text-[9px] font-mono tracking-widest"
                  style={{ color: 'rgba(0,243,255,0.4)' }}
                >
                  {tournament.teams.length} / {turnSequence.length}
                </span>
              </div>

              {/* Content */}
              <div className="px-6 pb-6 relative z-10">
                {tournament.teams.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,243,255,0.03)' }}>
                      <svg className="w-5 h-5 text-neonCyan/40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                      </svg>
                    </div>
                    <span className="text-gray-500 font-mono text-xs tracking-wide">
                      Gira la ruleta para asignar el primer equipo...
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                    {tournament.teams.map((t, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 rounded-xl text-center transition-all duration-300 hover:scale-[1.02] group cursor-default flex flex-col items-center gap-1.5"
                        style={{
                          background: 'linear-gradient(135deg, rgba(5,10,20,0.8) 0%, rgba(11,19,36,0.7) 100%)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(0,243,255,0.2)';
                          e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,243,255,0.08), 0 2px 8px rgba(0,0,0,0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                        }}
                      >
                        {/* Escudo del equipo */}
                        <img
                          src={getLogoUrl ? getLogoUrl(t.name) : ''}
                          alt={t.name}
                          style={{
                            width: '28px',
                            height: '28px',
                            objectFit: 'contain',
                            backgroundColor: 'transparent',
                            display: 'block',
                          }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                          draggable="false"
                        />
                        <span className="text-[8px] text-neonCyan/70 font-mono font-bold block uppercase tracking-wider">{t.owner}</span>
                        <span className="font-extrabold text-sm text-white/90 truncate block group-hover:text-white transition-colors">{t.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center w-full max-w-md">
            {pendingSpinResult && pendingSpinResult.type === 'team' ? (
              <div 
                className="bg-panelBg border border-neonCyan p-8 rounded-2xl w-full text-center shadow-2xl animate-scale-up"
                style={{ boxShadow: '0 0 20px rgba(0, 240, 255, 0.15)' }}
              >
                <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase block mb-1">Equipo obtenido</span>
                <h4 className="text-3xl font-black text-neonCyan tracking-tight uppercase mb-8 drop-shadow-[0_0_5px_rgba(0,240,255,0.4)]">
                  {pendingSpinResult.value}
                </h4>
                
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => confirmTeamDrawn(pendingSpinResult.value)}
                    className="w-full py-3.5 rounded-xl font-black text-sm tracking-wider bg-gradient-to-r from-neonCyan to-cyan-500 text-darkBg shadow-neonCyan hover:brightness-105 active:scale-95 transition-all uppercase"
                  >
                    ✅ Confirmar y Continuar
                  </button>
                  
                  {(playerRepeats[pendingSpinResult.owner] || 0) > 0 && (
                    <button
                      onClick={handleUseRepeatSpin}
                      className="w-full py-3 rounded-xl font-bold bg-darkBg border border-emerald-500 text-emerald-400 hover:bg-emerald-950/20 hover:text-white transition-all uppercase text-xs tracking-wider flex items-center justify-center gap-1.5"
                    >
                      🔄 Repetir Tirada ({playerRepeats[pendingSpinResult.owner]} disponibles)
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <RouletteWheel
                key={wheelKey}
                options={availableTeams}
                onFinished={handleTeamDrawn}
                buttonText="SORTEAR EQUIPO"
                disabled={isProcessing}
                onSpinStart={() => setIsProcessing(true)}
              />
            )}
          </div>
        </div>
      )}

      {/* ================= PHASE 2: CAPTAINS DRAFT ================= */}
      {draftPhase === 'captains' && (
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-8 z-10">
          <div className="lg:col-span-2 space-y-6">
            {/* ── TURN INDICATOR (EA FC style) ── */}
            <div
              className="rounded-2xl p-5 flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, rgba(0,243,255,0.06) 0%, rgba(5,10,20,0.9) 100%)',
                border: '1px solid rgba(0,243,255,0.3)',
                boxShadow: '0 0 20px rgba(0,243,255,0.07)',
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl text-darkBg flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #00f3ff 0%, #00c8d6 100%)', boxShadow: '0 0 16px rgba(0,243,255,0.5)' }}
                >
                  {(tournament.teams[currentTeamIndex]?.owner || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="block text-[10px] font-mono tracking-[0.25em] uppercase" style={{ color: 'rgba(0,243,255,0.6)' }}>💸 RULETA DIAMANTE — TURNO DE</span>
                  <span className="block text-xl font-black text-white uppercase tracking-tight mt-0.5">{tournament.teams[currentTeamIndex]?.owner}</span>
                  <span className="block text-sm font-bold mt-0.5" style={{ color: '#00f3ff' }}>{tournament.teams[currentTeamIndex]?.name}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-mono tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>CAPITANES</span>
                <span className="block text-lg font-mono font-black text-white">
                  {currentTeamIndex + 1} <span style={{ color: 'rgba(0,243,255,0.5)' }}>/</span> {tournament.teams.length}
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

          <div className="flex flex-col items-center justify-center w-full max-w-md">
            {pendingSpinResult && pendingSpinResult.type === 'captain' ? (
              <div 
                className="bg-panelBg border border-neonCyan p-8 rounded-2xl w-full text-center shadow-2xl animate-scale-up"
                style={{ boxShadow: '0 0 20px rgba(0, 240, 255, 0.15)' }}
              >
                <span className="text-[10px] text-gray-500 font-mono tracking-widest block">Capitán obtenido</span>
                <h4 className="text-3xl font-black text-neonCyan tracking-tight uppercase mb-8 drop-shadow-[0_0_5px_rgba(0,240,255,0.4)]">
                  {pendingSpinResult.value}
                </h4>
                
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => confirmCaptainDrawn(pendingSpinResult.value)}
                    className="w-full py-3.5 rounded-xl font-black text-sm tracking-wider bg-gradient-to-r from-neonCyan to-cyan-500 text-darkBg shadow-neonCyan hover:brightness-105 active:scale-95 transition-all uppercase"
                  >
                    ✅ Confirmar y Continuar
                  </button>
                  
                  {(playerRepeats[pendingSpinResult.owner] || 0) > 0 && (
                    <button
                      onClick={handleUseRepeatSpin}
                      className="w-full py-3 rounded-xl font-bold bg-darkBg border border-emerald-500 text-emerald-400 hover:bg-emerald-950/20 hover:text-white transition-all uppercase text-xs tracking-wider flex items-center justify-center gap-1.5"
                    >
                      🔄 Repetir Tirada ({playerRepeats[pendingSpinResult.owner]} disponibles)
                    </button>
                  )}
                </div>
              </div>
            ) : availableDiamonds.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl text-center"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(0,243,255,0.1)',
                }}
              >
                <span className="text-4xl mb-3">💸</span>
                <span className="text-lg font-black text-white font-mono uppercase tracking-wider">Pool Diamante Agotado</span>
                <p className="text-xs text-gray-500 font-mono mt-2">No quedan leyendas Diamante disponibles para asignar.</p>
              </div>
            ) : (
              <RouletteWheel
                key={wheelKey}
                options={availableDiamonds}
                onFinished={handleCaptainDrawn}
                buttonText="GIRAR DIAMANTE"
                disabled={isProcessing}
                onSpinStart={() => setIsProcessing(true)}
              />
            )}
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

          <div className="flex flex-col items-center justify-center w-full max-w-md">
            {pendingSpinResult && pendingSpinResult.type === 'option' ? (
              <div 
                className="bg-panelBg border border-neonGold p-8 rounded-2xl w-full text-center shadow-2xl animate-scale-up"
                style={{ boxShadow: '0 0 20px rgba(255, 215, 0, 0.15)' }}
              >
                <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase block mb-1">Opción obtenida</span>
                <h4 className="text-2xl font-black text-neonGold tracking-tight uppercase mb-8 drop-shadow-[0_0_5px_rgba(255,215,0,0.4)]">
                  {pendingSpinResult.value}
                </h4>
                
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => confirmOptionDrawn(pendingSpinResult.value)}
                    className="w-full py-3.5 rounded-xl font-black text-sm tracking-wider bg-gradient-to-r from-neonGold to-amber-500 text-darkBg shadow-neonGold hover:brightness-105 active:scale-95 transition-all uppercase"
                  >
                    ✅ Confirmar y Aplicar
                  </button>
                  
                  {(playerRepeats[pendingSpinResult.owner] || 0) > 0 && (
                    <button
                      onClick={handleUseRepeatSpin}
                      className="w-full py-3 rounded-xl font-bold bg-darkBg border border-emerald-500 text-emerald-400 hover:bg-emerald-950/20 hover:text-white transition-all uppercase text-xs tracking-wider flex items-center justify-center gap-1.5"
                    >
                      🔄 Repetir Tirada ({playerRepeats[pendingSpinResult.owner]} disponibles)
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <RouletteWheel
                key={wheelKey}
                options={constants.options_roulette}
                onFinished={handleOptionDrawn}
                buttonText="GIRAR OPCIONES"
                disabled={isProcessing}
                onSpinStart={() => setIsProcessing(true)}
              />
            )}
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
            
            {pendingSubSpinResult && pendingSubSpinResult.type === 'sub_team' ? (
              <div className="flex flex-col items-center py-6 text-center animate-scale-up w-full">
                <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase block mb-1">Equipo obtenido</span>
                <h4 className="text-2xl font-black text-neonCyan tracking-tight uppercase mb-6 drop-shadow-[0_0_5px_rgba(0,240,255,0.4)]">
                  {pendingSubSpinResult.value}
                </h4>
                
                <div className="flex flex-col gap-3 w-full">
                  <button
                    onClick={() => confirmSubWheelFinished(pendingSubSpinResult.value, pendingSubSpinResult.modalData)}
                    className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-neonCyan to-cyan-500 text-darkBg shadow-neonCyan hover:scale-102 transition-all uppercase text-xs tracking-wider"
                  >
                    ✅ Confirmar Elección
                  </button>
                  
                  {(playerRepeats[pendingSubSpinResult.owner] || 0) > 0 && (
                    <button
                      onClick={handleUseRepeatSubSpin}
                      className="w-full py-3 rounded-xl font-bold bg-darkBg border border-emerald-500 text-emerald-400 hover:bg-emerald-950/20 hover:text-white transition-all uppercase text-xs tracking-wider flex items-center justify-center gap-1.5"
                    >
                      🔄 Repetir Tirada ({playerRepeats[pendingSubSpinResult.owner]} disponibles)
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <RouletteWheel
                key={subWheelKey}
                options={modalData.options}
                onFinished={handleSubWheelFinishedWrapper}
                buttonText="GIRAR SUB-RULETA"
                onSpinStart={() => {}}
              />
            )}
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
            
            {pendingSubSpinResult && pendingSubSpinResult.type === 'sub_legend' ? (
              <div className="flex flex-col items-center py-6 text-center animate-scale-up w-full">
                <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase block mb-1">Leyenda obtenida</span>
                <h4 className="text-2xl font-black text-neonCyan tracking-tight uppercase mb-6 drop-shadow-[0_0_5px_rgba(0,240,255,0.4)]">
                  {pendingSubSpinResult.value}
                </h4>
                
                <div className="flex flex-col gap-3 w-full">
                  <button
                    onClick={() => confirmSubLegendFinished(pendingSubSpinResult.value, pendingSubSpinResult.modalData)}
                    className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-neonCyan to-cyan-500 text-darkBg shadow-neonCyan hover:scale-102 transition-all uppercase text-xs tracking-wider"
                  >
                    ✅ Confirmar Elección
                  </button>
                  
                  {(playerRepeats[pendingSubSpinResult.owner] || 0) > 0 && (
                    <button
                      onClick={handleUseRepeatSubSpin}
                      className="w-full py-3 rounded-xl font-bold bg-darkBg border border-emerald-500 text-emerald-400 hover:bg-emerald-950/20 hover:text-white transition-all uppercase text-xs tracking-wider flex items-center justify-center gap-1.5"
                    >
                      🔄 Repetir Tirada ({playerRepeats[pendingSubSpinResult.owner]} disponibles)
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <RouletteWheel
                key={subWheelKey}
                options={modalData.options}
                onFinished={handleSubLegendFinishedWrapper}
                buttonText={`GIRAR ${modalData.category?.toUpperCase()}`}
                onSpinStart={() => {}}
              />
            )}
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

      {/* SELECT TEAM FOR ADVANTAGE MODAL */}
      {modalType === 'select_team_for_advantage' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm z-50 p-4">
          <div className="bg-panelBg border border-panelBorder rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-scale-up border-t-4 border-t-neonCyan">
            <h3 className="text-lg font-black text-white font-mono mb-2 uppercase flex items-center gap-2">
              ⚽ Seleccionar Equipo
            </h3>
            <p className="text-gray-300 text-xs leading-relaxed mb-4">
              Selecciona el equipo al que deseas asignar la ventaja especial de <strong>{modalData.playerName}</strong>:
            </p>
            <div className="space-y-2">
              {modalData.teams.map(t => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => {
                    setModalType(null);
                    executeSpecialAdvantage(modalData.playerName, modalData.type, t);
                  }}
                  className="w-full p-3 bg-darkBg border border-panelBorder rounded-lg text-xs font-mono font-bold text-left hover:border-neonCyan hover:bg-neonCyan/5 transition-all text-white flex justify-between"
                >
                  <span>{t.name}</span>
                  <span className="text-[10px] text-gray-500 uppercase">{t.owner}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setModalType(null)}
              className="mt-4 w-full py-2 bg-panelBorder rounded-lg text-[10px] text-gray-400 hover:text-white uppercase font-mono transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* STATIC RESULT MESSAGE BANNER FOR SPECIAL ADVANTAGES */}
      {modalType === 'result_message_static' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm z-50 p-4">
          <div className="bg-panelBg border border-panelBorder rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center animate-scale-up border-t-4 border-t-neonGold">
            <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase block mb-1">Ventaja Aplicada</span>
            <h4 className="text-xl font-black text-neonGold tracking-tight uppercase mb-6">
              {modalData.message}
            </h4>
            
            <button
              onClick={() => {
                setModalType(null);
                setChampSpinCompleted(true);
                // If we were in champion_advantage phase, advance to options now
                if (draftPhase === 'champion_advantage') {
                  setCurrentOptionTeamIndex(0);
                  setCurrentSpinNumber(1);
                  setDraftPhase('options');
                }
              }}
              className="w-full py-3 bg-panelBorder rounded-xl font-bold hover:bg-gray-800 text-xs tracking-wider transition-all uppercase font-mono"
            >
              Aceptar y Continuar a Tiradas
            </button>
          </div>
        </div>
      )}

      {/* ================= TOAST NOTIFICATION ================= */}
      {toastVisible && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-6 py-3.5 rounded-2xl font-mono font-bold text-sm animate-fade-in shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255,195,60,0.18) 0%, rgba(20,10,0,0.96) 100%)',
            border: '1px solid rgba(255,195,60,0.5)',
            boxShadow: '0 0 30px rgba(255,195,60,0.2), 0 8px 32px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(16px)',
            color: '#ffc33c',
          }}
        >
          <span className="text-xl">👑</span>
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastVisible(false)}
            className="ml-2 text-amber-400/60 hover:text-amber-300 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* ================= RULES ENCYCLOPEDIA MODAL ================= */}
      {showRules && <RulesEncyclopedia onClose={() => setShowRules(false)} />}

    </div>
  );
};

export default DraftRoom;

