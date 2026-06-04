import React, { useState, useEffect } from 'react';
import PlayerCard from '../components/PlayerCard';
import sounds from '../utils/audio';
import LogoEquipo from '../components/LogoEquipo';
import { useTeamLogos } from '../hooks/useTeamLogos';
import { saveTournament, deleteTournament } from '../services/tournamentService';

const TournamentDashboard = ({ initialTournament, onBackToMenu }) => {
  const [tournament, setTournament] = useState(initialTournament);
  const [activeTab, setActiveTab] = useState('standings'); // 'standings', 'matches', 'teams', 'stats', 'playoffs'
  
  // Selection pointers
  const [selectedTeamName, setSelectedTeamName] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);
  
  // Results inputs state
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [matchMVP, setMatchMVP] = useState('');
  const [homeScorers, setHomeScorers] = useState([]);
  const [awayScorers, setAwayScorers] = useState([]);
  const [homeAssists, setHomeAssists] = useState([]);
  const [awayAssists, setAwayAssists] = useState([]);
  const [pairingMode, setPairingMode] = useState('clasico'); // 'clasico', 'inteligente', 'aleatorio'
  const [homePenalties, setHomePenalties] = useState('');
  const [awayPenalties, setAwayPenalties] = useState('');
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm, onCancel }
  
  const { getLogoUrl, loading: logosLoading } = useTeamLogos();

  // Helper to find team owner
  const getTeamOwner = (teamName) => {
    const team = tournament.teams.find(t => t.name === teamName);
    return team ? team.owner : '';
  };

  // Helper to find player's team name and logo
  const getPlayerTeamInfo = (playerName) => {
    if (!tournament.teams || !playerName) return null;
    const nameUpper = playerName.toUpperCase().trim();
    const team = tournament.teams.find(t => {
      if (t.captain && t.captain.toUpperCase().trim() === nameUpper) return true;
      if (t.legends && t.legends.some(l => l.name.toUpperCase().trim() === nameUpper)) return true;
      return false;
    });
    return team ? { name: team.name, logo: getLogoUrl(team.name) } : null;
  };

  // Trigger default selected team
  useEffect(() => {
    if (tournament.teams && tournament.teams.length > 0 && !selectedTeamName) {
      setSelectedTeamName(tournament.teams[0].name);
    }
  }, [tournament]);

  // Adjust active tab if tournament status changes
  useEffect(() => {
    if (tournament.status === 'Playoffs' && activeTab === 'standings') {
      setActiveTab('playoffs');
    }
  }, [tournament.status]);

  // Compute standings dynamically based on match results
  const computeStandings = () => {
    const standings = {};
    tournament.teams.forEach(t => {
      standings[t.name] = {
        name: t.name,
        group: t.group || 'A',
        owner: t.owner,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        pts: 0
      };
    });

    // Process only group stage matches
    tournament.matches.forEach(m => {
      if (m.result && !m.playoff) {
        const homeTeam = standings[m.home];
        const awayTeam = standings[m.away];
        
        if (homeTeam && awayTeam) {
          homeTeam.played += 1;
          awayTeam.played += 1;
          
          homeTeam.gf += m.result.homeGoals;
          homeTeam.ga += m.result.awayGoals;
          awayTeam.gf += m.result.awayGoals;
          awayTeam.ga += m.result.homeGoals;

          if (m.result.homeGoals > m.result.awayGoals) {
            homeTeam.won += 1;
            homeTeam.pts += 3;
            awayTeam.lost += 1;
          } else if (m.result.homeGoals < m.result.awayGoals) {
            awayTeam.won += 1;
            awayTeam.pts += 3;
            homeTeam.lost += 1;
          } else {
            homeTeam.drawn += 1;
            homeTeam.pts += 1;
            awayTeam.drawn += 1;
            awayTeam.pts += 1;
          }
        }
      }
    });

    // Group by letter
    const groups = {};
    Object.values(standings).forEach(teamStats => {
      const g = teamStats.group;
      if (!groups[g]) groups[g] = [];
      groups[g].push(teamStats);
    });

    // Sort teams in each group (Pts -> H2H -> GD -> GF)
    Object.keys(groups).forEach(gName => {
      groups[gName].sort((a, b) => {
        // 1. Points
        if (b.pts !== a.pts) return b.pts - a.pts;

        // 2. Head-to-Head (Enfrentamiento directo)
        const h2hMatch = tournament.matches.find(m => 
          !m.playoff && 
          m.result && 
          ((m.home === a.name && m.away === b.name) || (m.home === b.name && m.away === a.name))
        );
        if (h2hMatch) {
          const isHomeA = h2hMatch.home === a.name;
          const scoreA = isHomeA ? h2hMatch.result.homeGoals : h2hMatch.result.awayGoals;
          const scoreB = isHomeA ? h2hMatch.result.awayGoals : h2hMatch.result.homeGoals;
          if (scoreA !== scoreB) {
            return scoreB - scoreA; // If A won, return negative (A first)
          }
        }

        // 3. Goal Difference (DG)
        const dgA = a.gf - a.ga;
        const gdB = b.gf - b.ga;
        if (gdB !== dgA) return gdB - dgA;

        // 4. Goals For (GF)
        return b.gf - a.gf;
      });
    });

    return groups;
  };

  // Compute leaderboards statistics dynamically
  const computeLeaderboards = () => {
    const scorers = {};
    const assists = {};
    const mvps = {};

    tournament.matches.forEach(m => {
      if (m.result) {
        if (m.result.scorers) {
          m.result.scorers.forEach(scorerName => {
            if (scorerName.trim()) {
              scorers[scorerName] = (scorers[scorerName] || 0) + 1;
            }
          });
        }
        if (m.result.assists) {
          m.result.assists.forEach(assisterName => {
            if (assisterName.trim()) {
              assists[assisterName] = (assists[assisterName] || 0) + 1;
            }
          });
        }
        if (m.result.mvp && m.result.mvp.trim()) {
          mvps[m.result.mvp] = (mvps[m.result.mvp] || 0) + 1;
        }
      }
    });

    const sortedScorers = Object.entries(scorers)
      .map(([name, val]) => ({ name, count: val }))
      .sort((a, b) => b.count - a.count);

    const sortedAssists = Object.entries(assists)
      .map(([name, val]) => ({ name, count: val }))
      .sort((a, b) => b.count - a.count);

    const sortedMvps = Object.entries(mvps)
      .map(([name, val]) => ({ name, count: val }))
      .sort((a, b) => b.count - a.count);

    return { scorers: sortedScorers, assists: sortedAssists, mvps: sortedMvps };
  };

  // Open Results input modal
  const handleOpenMatchResult = (match) => {
    sounds.playSwoosh();
    setSelectedMatch(match);
    
    const hScore = match.result ? match.result.homeGoals : 0;
    const aScore = match.result ? match.result.awayGoals : 0;
    
    setHomeScore(hScore);
    setAwayScore(aScore);
    setMatchMVP(match.result ? match.result.mvp : '');
    
    const penalties = match.result ? match.result.penalties : null;
    setHomePenalties(penalties ? penalties.home : '');
    setAwayPenalties(penalties ? penalties.away : '');
    
    const existingScorers = match.result && match.result.scorers ? match.result.scorers : [];
    const existingAssists = match.result && match.result.assists ? match.result.assists : [];
    
    const homeTeamObj = tournament.teams.find(t => t.name === match.home);
    const awayTeamObj = tournament.teams.find(t => t.name === match.away);
    const homePlayers = homeTeamObj ? homeTeamObj.legends.map(p => p.name.toUpperCase()) : [];
    const awayPlayers = awayTeamObj ? awayTeamObj.legends.map(p => p.name.toUpperCase()) : [];
    
    const hScorers = [];
    const aScorers = [];
    existingScorers.forEach(name => {
      if (homePlayers.includes(name.toUpperCase()) && hScorers.length < hScore) {
        hScorers.push(name);
      } else if (awayPlayers.includes(name.toUpperCase()) && aScorers.length < aScore) {
        aScorers.push(name);
      } else {
        if (hScorers.length < hScore) {
          hScorers.push(name);
        } else if (aScorers.length < aScore) {
          aScorers.push(name);
        }
      }
    });
    while (hScorers.length < hScore) hScorers.push('');
    while (aScorers.length < aScore) aScorers.push('');
    
    const hAssists = [];
    const aAssists = [];
    existingAssists.forEach(name => {
      if (homePlayers.includes(name.toUpperCase()) && hAssists.length < hScore) {
        hAssists.push(name);
      } else if (awayPlayers.includes(name.toUpperCase()) && aAssists.length < aScore) {
        aAssists.push(name);
      } else {
        if (hAssists.length < hScore) {
          hAssists.push(name);
        } else if (aAssists.length < aScore) {
          aAssists.push(name);
        }
      }
    });
    while (hAssists.length < hScore) hAssists.push('');
    while (aAssists.length < aScore) aAssists.push('');
    
    setHomeScorers(hScorers);
    setAwayScorers(aScorers);
    setHomeAssists(hAssists);
    setAwayAssists(aAssists);
  };

  // Close Match result modal
  const handleCloseMatchResult = () => {
    sounds.playSwoosh();
    setSelectedMatch(null);
  };

  // Advance winner to the next round slot (playoffs)
  const advancePlayoffWinner = (matchId, winnerName, matchesList) => {
    const match = matchId.match(/^(R32|R16|QF|SF)_(\d+)$/);
    if (!match) return matchesList;

    const roundType = match[1];
    const matchNum = parseInt(match[2]);

    let nextRoundType = '';
    if (roundType === 'R32') nextRoundType = 'R16';
    else if (roundType === 'R16') nextRoundType = 'QF';
    else if (roundType === 'QF') nextRoundType = 'SF';
    else if (roundType === 'SF') nextRoundType = 'F';

    if (!nextRoundType) return matchesList;

    const nextMatchNum = Math.ceil(matchNum / 2);
    const isHome = matchNum % 2 !== 0; // Odd is Home, Even is Away
    const nextMatchId = nextRoundType === 'F' ? 'F' : `${nextRoundType}_${nextMatchNum}`;

    return matchesList.map(m => {
      if (m.id === nextMatchId) {
        if (isHome) {
          return { ...m, home: winnerName };
        } else {
          return { ...m, away: winnerName };
        }
      }
      return m;
    });
  };

  // Save Match results
  const handleSaveMatchResult = async () => {
    sounds.playSuccess();
    
    const hScore = parseInt(homeScore) || 0;
    const aScore = parseInt(awayScore) || 0;
    let winnerName = null;
    let penaltyData = null;

    if (selectedMatch.playoff) {
      if (hScore > aScore) {
        winnerName = selectedMatch.home;
      } else if (aScore > hScore) {
        winnerName = selectedMatch.away;
      } else {
        const hPen = parseInt(homePenalties);
        const aPen = parseInt(awayPenalties);
        if (isNaN(hPen) || isNaN(aPen)) {
          alert('Por favor, introduce los penaltis anotados para ambos equipos.');
          return;
        }
        if (hPen === aPen) {
          alert('La tanda de penaltis no puede terminar en empate.');
          return;
        }
        winnerName = hPen > aPen ? selectedMatch.home : selectedMatch.away;
        penaltyData = { home: hPen, away: aPen };
      }
    }

    // Validate that all scorers are filled in if score > 0
    if (hScore > 0) {
      for (let i = 0; i < hScore; i++) {
        if (!homeScorers[i] || !homeScorers[i].trim()) {
          alert(`Por favor, introduce el nombre del goleador ${i+1} para ${selectedMatch.home}.`);
          return;
        }
        const scorer = (homeScorers[i] || '').trim().toLowerCase();
        const assistant = (homeAssists[i] || '').trim().toLowerCase();
        if (scorer && assistant && scorer === assistant) {
          alert(`Error en el gol ${i + 1} de ${selectedMatch.home}: El goleador y el asistente no pueden ser la misma persona (${homeScorers[i]}).`);
          return;
        }
      }
    }
    if (aScore > 0) {
      for (let i = 0; i < aScore; i++) {
        if (!awayScorers[i] || !awayScorers[i].trim()) {
          alert(`Por favor, introduce el nombre del goleador ${i+1} para ${selectedMatch.away}.`);
          return;
        }
        const scorer = (awayScorers[i] || '').trim().toLowerCase();
        const assistant = (awayAssists[i] || '').trim().toLowerCase();
        if (scorer && assistant && scorer === assistant) {
          alert(`Error en el gol ${i + 1} de ${selectedMatch.away}: El goleador y el asistente no pueden ser la misma persona (${awayScorers[i]}).`);
          return;
        }
      }
    }

    let updatedMatches = tournament.matches.map(m => {
      if (m.id === selectedMatch.id) {
        return {
          ...m,
          result: {
            homeGoals: hScore,
            awayGoals: aScore,
            mvp: matchMVP,
            scorers: [...homeScorers, ...awayScorers].map(name => name.trim()).filter(Boolean),
            assists: [...homeAssists, ...awayAssists].map(name => name.trim()).filter(Boolean),
            winner: winnerName,
            penalties: penaltyData
          }
        };
      }
      return m;
    });

    let championName = tournament.champion;
    let winnerOwnerName = tournament.winner_owner;
    let nextStatus = tournament.status;

    if (selectedMatch.playoff && winnerName) {
      if (selectedMatch.id === 'F') {
        championName = winnerName;
        const winnerTeamObj = tournament.teams.find(t => t.name === winnerName);
        winnerOwnerName = winnerTeamObj ? winnerTeamObj.owner : null;
        nextStatus = 'Terminado';
      } else {
        updatedMatches = advancePlayoffWinner(selectedMatch.id, winnerName, updatedMatches);
      }
    }

    const updatedTournament = {
      ...tournament,
      status: nextStatus,
      champion: championName,
      winner_owner: winnerOwnerName,
      matches: updatedMatches
    };

    try {
      await saveTournament(tournament.filename, updatedTournament);
      
      setTournament(updatedTournament);
      setSelectedMatch(null);
    } catch (err) {
      alert(err.message);
    }
  };

  // Helper for Smart/Random Playoff Matchings
  const findBestMatching = (list1, list2, mode) => {
    const t1 = list1.map(name => tournament.teams.find(t => t.name === name));
    const t2 = list2.map(name => tournament.teams.find(t => t.name === name));

    if (mode === 'aleatorio') {
      let bestPerm = [...list2];
      let bestPenalty = Infinity;
      for (let attempt = 0; attempt < 100; attempt++) {
        const shuffled = [...list2].sort(() => Math.random() - 0.5);
        let penalty = 0;
        for (let i = 0; i < list1.length; i++) {
          const team1 = t1[i];
          const team2 = tournament.teams.find(t => t.name === shuffled[i]);
          if (team1 && team2) {
            if (team1.group === team2.group) penalty += 10000;
          }
        }
        if (penalty < bestPenalty) {
          bestPenalty = penalty;
          bestPerm = shuffled;
          if (penalty === 0) break;
        }
      }
      return bestPerm;
    }

    // Backtracking search with pruning for mode === 'inteligente'
    let minPenalty = Infinity;
    let bestPerms = [];
    const currentPerm = [];
    const used = new Array(list2.length).fill(false);

    const search = (idx, currentPenalty) => {
      if (currentPenalty > minPenalty) return; // Pruning
      
      if (idx === list1.length) {
        if (currentPenalty < minPenalty) {
          minPenalty = currentPenalty;
          bestPerms = [[...currentPerm]];
        } else if (currentPenalty === minPenalty) {
          bestPerms.push([...currentPerm]);
        }
        return;
      }

      const team1 = t1[idx];
      for (let i = 0; i < list2.length; i++) {
        if (used[i]) continue;
        const team2 = t2[i];
        
        let penalty = 0;
        if (team1 && team2) {
          if (team1.group === team2.group) penalty += 10000;
          if (team1.owner === team2.owner) penalty += 1000;
        }

        used[i] = true;
        currentPerm.push(list2[i]);
        
        search(idx + 1, currentPenalty + penalty);
        
        currentPerm.pop();
        used[i] = false;
      }
    };

    search(0, 0);

    const randIdx = Math.floor(Math.random() * bestPerms.length);
    return bestPerms[randIdx];
  };

  // Playoffs Generation
  const handleGeneratePlayoffs = async () => {
    sounds.playSuccess();
    const standings = computeStandings();
    const playoffMatches = [];
    const teamsCount = tournament.teams.length;
    
    if (teamsCount === 8) {
      const a1 = standings.A[0]?.name;
      const a2 = standings.A[1]?.name;
      const b1 = standings.B[0]?.name;
      const b2 = standings.B[1]?.name;

      let matched;
      if (pairingMode === 'clasico') {
        matched = [b2, a2];
      } else {
        matched = findBestMatching([a1, b1], [a2, b2], pairingMode);
      }
      
      playoffMatches.push({ id: 'SF_1', playoff: true, round: 'Semifinales', home: a1, away: matched[0], result: null });
      playoffMatches.push({ id: 'SF_2', playoff: true, round: 'Semifinales', home: b1, away: matched[1], result: null });
      playoffMatches.push({ id: 'F', playoff: true, round: 'Final', home: 'Ganador SF_1', away: 'Ganador SF_2', result: null });
    }
    else if (teamsCount === 16) {
      const a1 = standings.A[0]?.name;
      const a2 = standings.A[1]?.name;
      const b1 = standings.B[0]?.name;
      const b2 = standings.B[1]?.name;
      const c1 = standings.C[0]?.name;
      const c2 = standings.C[1]?.name;
      const d1 = standings.D[0]?.name;
      const d2 = standings.D[1]?.name;

      const list1 = [a1, c1, b1, d1];
      let matched;
      if (pairingMode === 'clasico') {
        matched = [b2, d2, a2, c2];
      } else {
        matched = findBestMatching(list1, [a2, b2, c2, d2], pairingMode);
      }
      
      playoffMatches.push({ id: 'QF_1', playoff: true, round: 'Cuartos de Final', home: list1[0], away: matched[0], result: null });
      playoffMatches.push({ id: 'QF_2', playoff: true, round: 'Cuartos de Final', home: list1[1], away: matched[1], result: null });
      playoffMatches.push({ id: 'QF_3', playoff: true, round: 'Cuartos de Final', home: list1[2], away: matched[2], result: null });
      playoffMatches.push({ id: 'QF_4', playoff: true, round: 'Cuartos de Final', home: list1[3], away: matched[3], result: null });
      
      playoffMatches.push({ id: 'SF_1', playoff: true, round: 'Semifinales', home: 'Ganador QF_1', away: 'Ganador QF_2', result: null });
      playoffMatches.push({ id: 'SF_2', playoff: true, round: 'Semifinales', home: 'Ganador QF_3', away: 'Ganador QF_4', result: null });
      
      playoffMatches.push({ id: 'F', playoff: true, round: 'Final', home: 'Ganador SF_1', away: 'Ganador SF_2', result: null });
    }
    else if (teamsCount === 32) {
      // Group Winners
      const wA = standings.A[0]?.name;
      const wB = standings.B[0]?.name;
      const wC = standings.C[0]?.name;
      const wD = standings.D[0]?.name;
      const wE = standings.E[0]?.name;
      const wF = standings.F[0]?.name;
      const wG = standings.G[0]?.name;
      const wH = standings.H[0]?.name;

      // Group 4th-places
      const fA = standings.A[3]?.name;
      const fB = standings.B[3]?.name;
      const fC = standings.C[3]?.name;
      const fD = standings.D[3]?.name;
      const fE = standings.E[3]?.name;
      const fF = standings.F[3]?.name;
      const fG = standings.G[3]?.name;
      const fH = standings.H[3]?.name;

      // Group Runners-up
      const rA = standings.A[1]?.name;
      const rB = standings.B[1]?.name;
      const rC = standings.C[1]?.name;
      const rD = standings.D[1]?.name;
      const rE = standings.E[1]?.name;
      const rF = standings.F[1]?.name;
      const rG = standings.G[1]?.name;
      const rH = standings.H[1]?.name;

      // Group 3rd-places
      const tA = standings.A[2]?.name;
      const tB = standings.B[2]?.name;
      const tC = standings.C[2]?.name;
      const tD = standings.D[2]?.name;
      const tE = standings.E[2]?.name;
      const tF = standings.F[2]?.name;
      const tG = standings.G[2]?.name;
      const tH = standings.H[2]?.name;

      // Seed 1 vs Seed 4
      const list1_14 = [wA, wB, wC, wD, wE, wF, wG, wH];
      let matched_14;
      if (pairingMode === 'clasico') {
        matched_14 = [fB, fA, fD, fC, fF, fE, fH, fG];
      } else {
        matched_14 = findBestMatching(list1_14, [fA, fB, fC, fD, fE, fF, fG, fH], pairingMode);
      }

      // Seed 2 vs Seed 3
      const list1_23 = [rB, rA, rD, rC, rF, rE, rH, rG];
      let matched_23;
      if (pairingMode === 'clasico') {
        matched_23 = [tA, tB, tC, tD, tE, tF, tG, tH];
      } else {
        matched_23 = findBestMatching(list1_23, [tA, tB, tC, tD, tE, tF, tG, tH], pairingMode);
      }

      // Generate 16 R32 matches
      for (let i = 0; i < 8; i++) {
        // Odd: R32_1, R32_3, ...
        playoffMatches.push({
          id: `R32_${i * 2 + 1}`,
          playoff: true,
          round: 'Dieciseisavos',
          home: list1_14[i],
          away: matched_14[i],
          result: null
        });
        // Even: R32_2, R32_4, ...
        playoffMatches.push({
          id: `R32_${i * 2 + 2}`,
          playoff: true,
          round: 'Dieciseisavos',
          home: list1_23[i],
          away: matched_23[i],
          result: null
        });
      }

      for (let i = 1; i <= 8; i++) {
        playoffMatches.push({ id: `R16_${i}`, playoff: true, round: 'Octavos de Final', home: `Ganador R32_${i*2 - 1}`, away: `Ganador R32_${i*2}`, result: null });
      }
      for (let i = 1; i <= 4; i++) {
        playoffMatches.push({ id: `QF_${i}`, playoff: true, round: 'Cuartos de Final', home: `Ganador R16_${i*2 - 1}`, away: `Ganador R16_${i*2}`, result: null });
      }
      playoffMatches.push({ id: 'SF_1', playoff: true, round: 'Semifinales', home: 'Ganador QF_1', away: 'Ganador QF_2', result: null });
      playoffMatches.push({ id: 'SF_2', playoff: true, round: 'Semifinales', home: 'Ganador QF_3', away: 'Ganador QF_4', result: null });
      playoffMatches.push({ id: 'F', playoff: true, round: 'Final', home: 'Ganador SF_1', away: 'Ganador SF_2', result: null });
    }
    else {
      // Custom format fallback
      const sorted = [...tournament.teams].sort((a, b) => (standings[b.name]?.pts || 0) - (standings[a.name]?.pts || 0));
      playoffMatches.push({ id: 'SF_1', playoff: true, round: 'Semifinales', home: sorted[0]?.name, away: sorted[3]?.name, result: null });
      playoffMatches.push({ id: 'SF_2', playoff: true, round: 'Semifinales', home: sorted[1]?.name, away: sorted[2]?.name, result: null });
      playoffMatches.push({ id: 'F', playoff: true, round: 'Final', home: 'Ganador SF_1', away: 'Ganador SF_2', result: null });
    }

    const updatedMatches = [...tournament.matches, ...playoffMatches];
    const updatedTournament = {
      ...tournament,
      status: 'Playoffs',
      matches: updatedMatches
    };

    try {
      await saveTournament(tournament.filename, updatedTournament);
      setTournament(updatedTournament);
      setActiveTab('playoffs');
    } catch (err) {
      alert(err.message);
    }
  };

  // Standings data
  const groupsData = computeStandings();
  const leaderboards = computeLeaderboards();

  // Find currently selected team details
  const selectedTeam = tournament.teams.find(t => t.name === selectedTeamName);

  // Teams lists for MVP selections
  const getHomePlayers = () => {
    if (!selectedMatch) return [];
    const homeTeamObj = tournament.teams.find(t => t.name === selectedMatch.home);
    return homeTeamObj ? homeTeamObj.legends : [];
  };

  const getAwayPlayers = () => {
    if (!selectedMatch) return [];
    const awayTeamObj = tournament.teams.find(t => t.name === selectedMatch.away);
    return awayTeamObj ? awayTeamObj.legends : [];
  };

  const getMatchPlayers = () => {
    if (!selectedMatch) return [];
    const homeTeamObj = tournament.teams.find(t => t.name === selectedMatch.home);
    const awayTeamObj = tournament.teams.find(t => t.name === selectedMatch.away);
    
    const players = [];
    if (homeTeamObj) {
      homeTeamObj.legends.forEach(p => players.push({ name: p.name, team: homeTeamObj.name }));
    }
    if (awayTeamObj) {
      awayTeamObj.legends.forEach(p => players.push({ name: p.name, team: awayTeamObj.name }));
    }
    return players;
  };

  const getRoundMatches = (roundName) => {
    return tournament.matches
      .filter(m => m.playoff && m.round === roundName)
      .sort((a, b) => {
        const numA = parseInt(a.id.split('_')[1]) || 1;
        const numB = parseInt(b.id.split('_')[1]) || 1;
        return numA - numB;
      });
  };

  const groupMatches = tournament.matches.filter(m => !m.playoff);
  const groupStageFinished = groupMatches.length > 0 && groupMatches.every(m => m.result !== null);

  return (
    <div className="min-h-screen bg-darkBg text-white flex flex-col items-center select-none relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,20,35,0.3)_0%,rgba(3,5,8,1)_100%)] z-0 pointer-events-none" />

      {/* CHAMPION BANNER */}
      {tournament.champion && (
        <div className="w-full bg-gradient-to-r from-neonGold via-yellow-500 to-neonGold text-darkBg font-mono py-3 text-center font-black text-sm z-50 tracking-wider shadow-lg animate-pulse">
          🏆 ¡ENHORABUENA! EL CAMPEÓN DE ESTA EDICIÓN ES {tournament.champion.toUpperCase()} (DUEÑO: {tournament.winner_owner?.toUpperCase()}) 🏆
        </div>
      )}

      {/* DASHBOARD NAVBAR HEADER */}
      <div className="w-full bg-panelBg/80 border-b border-panelBorder backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full border border-neonCyan flex items-center justify-center bg-darkBg shadow-neonCyan">
            <span className="text-neonCyan font-black text-sm">FC</span>
          </div>
          <div>
            <h2 className="text-lg font-black font-mono tracking-wider uppercase">{tournament.name}</h2>
            <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
              Fase: {tournament.status}
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-darkBg border border-panelBorder p-1 rounded-full text-xs font-mono">
          <button
            onClick={() => { sounds.playTick(); setActiveTab('standings'); }}
            className={`px-5 py-2 rounded-full font-bold transition-all ${
              activeTab === 'standings' ? 'bg-neonCyan text-darkBg' : 'text-gray-400 hover:text-white'
            }`}
          >
            CLASIFICACIÓN
          </button>
          <button
            onClick={() => { sounds.playTick(); setActiveTab('matches'); }}
            className={`px-5 py-2 rounded-full font-bold transition-all ${
              activeTab === 'matches' ? 'bg-neonCyan text-darkBg' : 'text-gray-400 hover:text-white'
            }`}
          >
            PARTIDOS
          </button>
          {(tournament.status === 'Playoffs' || tournament.status === 'Terminado') && (
            <button
              onClick={() => { sounds.playTick(); setActiveTab('playoffs'); }}
              className={`px-5 py-2 rounded-full font-bold transition-all ${
                activeTab === 'playoffs' ? 'bg-neonCyan text-darkBg' : 'text-gray-400 hover:text-white'
              }`}
            >
              ELIMINATORIAS
            </button>
          )}
          <button
            onClick={() => { sounds.playTick(); setActiveTab('teams'); }}
            className={`px-5 py-2 rounded-full font-bold transition-all ${
              activeTab === 'teams' ? 'bg-neonCyan text-darkBg' : 'text-gray-400 hover:text-white'
            }`}
          >
            PLANTILLAS
          </button>
          <button
            onClick={() => { sounds.playTick(); setActiveTab('stats'); }}
            className={`px-5 py-2 rounded-full font-bold transition-all ${
              activeTab === 'stats' ? 'bg-neonCyan text-darkBg' : 'text-gray-400 hover:text-white'
            }`}
          >
            ESTADÍSTICAS
          </button>
        </div>

        <div className="flex gap-3 items-center">
          <button
            onClick={() => {
              setConfirmModal({
                title: "Reiniciar Torneo",
                message: "¿Estás seguro de que quieres REINICIAR el torneo de forma permanente? Se borrarán todos los datos y tendrás que empezar de nuevo.",
                onConfirm: async () => {
                  try {
                    await deleteTournament(tournament.filename);
                    onBackToMenu();
                  } catch (err) {
                    alert("No se pudo reiniciar el torneo: " + err.message);
                  }
                }
              });
            }}
            className="px-4 py-2 bg-red-950/40 border border-red-800/60 rounded-full text-xs text-red-400 hover:bg-red-900/50 hover:text-red-200 transition-all font-mono"
          >
            ⚠️ REINICIAR TORNEO
          </button>
          
          <button
            onClick={() => {
              setConfirmModal({
                title: "Salir al Menú",
                message: "¿Deseas salir del torneo y regresar al menú principal?",
                onConfirm: () => {
                  onBackToMenu();
                }
              });
            }}
            className="px-4 py-2 border border-panelBorder rounded-full text-xs text-gray-400 hover:text-white hover:border-white transition-all font-mono"
          >
            SALIR AL MENÚ
          </button>
        </div>
      </div>

      {/* DASHBOARD CONTENT BODY */}
      <div className="w-full max-w-6xl p-6 z-10 flex-1">
        
        {/* ================= TAB 1: STANDINGS / CLASIFICACION ================= */}
        {activeTab === 'standings' && (
          <div className="space-y-6 animate-fade-in">
            {/* Auto Generate Playoffs Panel */}
            {groupStageFinished && tournament.status === 'Fase de Grupos' && (
              <div className="w-full bg-gradient-to-r from-neonGold/10 to-yellow-500/5 border border-neonGold p-6 rounded-2xl shadow-neonGold text-center">
                <span className="text-[10px] text-neonGold font-mono tracking-widest block uppercase mb-1">¡FASE DE GRUPOS TERMINADA!</span>
                <h4 className="text-lg font-black text-white uppercase font-mono mb-3">La fase de grupos ha finalizado con éxito. Genera las llaves de Playoff.</h4>
                
                <div className="flex flex-col items-center gap-2 mb-5">
                  <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">Modo de Emparejamiento</label>
                  <select
                    value={pairingMode}
                    onChange={(e) => setPairingMode(e.target.value)}
                    className="bg-darkBg border border-panelBorder p-2.5 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-neonGold max-w-xs cursor-pointer"
                  >
                    <option value="clasico">Clásico (1º vs 2º de Grupos opuestos)</option>
                    <option value="inteligente">Inteligente (Evita Elias vs Elias / Alvaro vs Alvaro)</option>
                    <option value="aleatorio">Aleatorio (Cruces con cabezas de serie)</option>
                  </select>
                </div>

                <button
                  onClick={handleGeneratePlayoffs}
                  className="px-8 py-3 rounded-full font-black bg-gradient-to-r from-neonGold to-yellow-500 text-darkBg shadow-neonGold hover:scale-105 active:scale-95 transition-all text-sm uppercase"
                >
                  GENERAR FASE FINAL
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(groupsData).map(([groupLetter, teams]) => (
                <div key={groupLetter} className="bg-panelBg border border-panelBorder p-5 rounded-2xl shadow-lg">
                  <div className="flex justify-between items-center border-b border-panelBorder pb-3 mb-4">
                    <h3 className="text-lg font-black font-mono tracking-wider text-neonCyan">
                      GRUPO {groupLetter}
                    </h3>
                    <span className="text-[9px] text-gray-500 font-mono tracking-widest uppercase">
                      Fase de grupos
                    </span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="text-gray-500 border-b border-panelBorder pb-2 text-[10px]">
                          <th className="py-2">POS</th>
                          <th>EQUIPO</th>
                          <th>PROPIETARIO</th>
                          <th className="text-center">PJ</th>
                          <th className="text-center">V</th>
                          <th className="text-center">E</th>
                          <th className="text-center">D</th>
                          <th className="text-center">GF</th>
                          <th className="text-center">GC</th>
                          <th className="text-center">DG</th>
                          <th className="text-center text-neonCyan">PTS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.map((t, idx) => {
                          const dg = t.gf - t.ga;
                          const dgSign = dg > 0 ? `+${dg}` : dg;
                          // If 32 teams format, all qualify. If 8/16, top 2 qualify.
                          const qualifyingLimit = tournament.teams.length === 32 ? 4 : 2;
                          const qualifies = idx < qualifyingLimit;
                          
                          return (
                            <tr
                              key={t.name}
                              className={`border-b border-panelBorder/30 last:border-0 hover:bg-white/5 transition-colors ${
                                qualifies ? 'bg-cyan-950/10' : ''
                              }`}
                            >
                              <td className="py-3 font-bold text-center w-8">
                                <span className={qualifies ? 'text-neonCyan font-black' : 'text-gray-500'}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="font-extrabold text-white">
                                <div className="flex items-center gap-3">
                                  <LogoEquipo url={getLogoUrl(t.name)} nombreEquipo={t.name} size={28} />
                                  <span>{t.name}</span>
                                </div>
                              </td>
                              <td className="text-gray-400 text-[10px] uppercase font-bold">{t.owner}</td>
                              <td className="text-center font-bold text-gray-300">{t.played}</td>
                              <td className="text-center font-bold text-gray-300">{t.won}</td>
                              <td className="text-center font-bold text-gray-300">{t.drawn}</td>
                              <td className="text-center font-bold text-gray-300">{t.lost}</td>
                              <td className="text-center font-bold text-gray-300">{t.gf}</td>
                              <td className="text-center font-bold text-gray-300">{t.ga}</td>
                              <td className={`text-center font-bold ${
                                dg > 0 ? 'text-green-400' : dg < 0 ? 'text-red-400' : 'text-gray-500'
                              }`}>
                                {dgSign}
                              </td>
                              <td className="text-center font-black text-neonCyan text-sm">{t.pts}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 2: FIXTURES / PARTIDOS ================= */}
        {activeTab === 'matches' && (
          <div className="space-y-8 animate-fade-in">
            {/* Display only Group stage fixtures */}
            {[1, 2, 3].map(roundNum => {
              const roundMatches = tournament.matches.filter(m => !m.playoff && m.round === roundNum);
              if (roundMatches.length === 0) return null;
              
              return (
                <div key={roundNum} className="bg-panelBg border border-panelBorder p-6 rounded-2xl shadow-lg">
                  <div className="flex items-center gap-3 border-b border-panelBorder pb-3 mb-4">
                    <span className="text-neonGold text-sm">📅</span>
                    <h3 className="text-lg font-black font-mono tracking-wider text-white">
                      JORNADA {roundNum} DE 3
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {roundMatches.map(match => (
                      <div
                        key={match.id}
                        onClick={() => handleOpenMatchResult(match)}
                        className="p-4 bg-darkBg/60 border border-panelBorder rounded-xl cursor-pointer hover:border-neonCyan transition-all duration-300 flex justify-between items-center group shadow-md"
                      >
                        <div className="flex flex-col gap-1.5 flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-sm group-hover:text-neonCyan transition-colors">
                              {match.home}
                            </span>
                            <span className="text-lg font-black font-mono">
                              {match.result ? match.result.homeGoals : '-'}
                            </span>
                          </div>

                          <div className="flex justify-between items-center border-t border-panelBorder/30 pt-1.5">
                            <span className="font-extrabold text-sm group-hover:text-neonCyan transition-colors">
                              {match.away}
                            </span>
                            <span className="text-lg font-black font-mono">
                              {match.result ? match.result.awayGoals : '-'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-center border-l border-panelBorder pl-4 ml-4 min-w-[70px] text-center">
                          <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-panelBorder text-gray-400">
                            GRUPO {match.group}
                          </span>
                          
                          {match.result ? (
                            <span className="text-[9px] text-green-400 font-bold mt-2">
                              ✓ HECHO
                            </span>
                          ) : (
                            <span className="text-[9px] text-neonCyan font-bold mt-2 animate-pulse">
                              JUGAR
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= TAB 3: PLAYOFF BRACKETS (ELIMINATORIAS) ================= */}
        {activeTab === 'playoffs' && (() => {
          let bracketHeightClass = 'h-[500px]';
          if (tournament.teams.length === 32) {
            bracketHeightClass = 'h-[1500px]';
          } else if (tournament.teams.length === 16) {
            bracketHeightClass = 'h-[800px]';
          } else if (tournament.teams.length === 8) {
            bracketHeightClass = 'h-[450px]';
          }

          return (
            <div className={`flex gap-8 overflow-x-auto pb-6 pt-4 max-w-full justify-start items-stretch ${bracketHeightClass} font-mono`}>
              {['Dieciseisavos', 'Octavos de Final', 'Cuartos de Final', 'Semifinales', 'Final'].map(roundName => {
                const roundMatches = getRoundMatches(roundName);
                if (roundMatches.length === 0) return null;
                
                return (
                  <div key={roundName} className="flex flex-col gap-4 min-w-[280px] bg-panelBg/40 border border-panelBorder/60 p-4 rounded-2xl h-full">
                    <h4 className="text-center font-extrabold text-neonCyan text-xs tracking-wider uppercase border-b border-panelBorder/30 pb-2">
                      {roundName}
                    </h4>
                    
                    <div className="flex flex-col justify-around flex-1 gap-4">
                      {roundMatches.map(match => {
                        const isPlayable = !match.home.startsWith('Ganador') && !match.away.startsWith('Ganador');
                        const isHomeWinner = match.result && match.result.winner === match.home;
                        const isAwayWinner = match.result && match.result.winner === match.away;
                        const homeOwner = getTeamOwner(match.home);
                        const awayOwner = getTeamOwner(match.away);
                        
                        return (
                          <div
                            key={match.id}
                            onClick={() => {
                              if (isPlayable) handleOpenMatchResult(match);
                            }}
                            className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all relative ${
                              isPlayable
                                ? 'cursor-pointer hover:border-neonCyan hover:bg-neonCyan/5 hover:shadow-[0_0_15px_rgba(0,243,255,0.15)]'
                                : 'opacity-55 cursor-not-allowed'
                            } ${match.result ? 'border-green-500/40 bg-green-950/10 shadow-[0_0_10px_rgba(16,185,129,0.05)]' : 'border-panelBorder bg-darkBg/80'}`}
                          >
                            <div className="flex justify-between items-center text-[9px] text-gray-500 font-bold uppercase mb-1 border-b border-panelBorder/20 pb-1">
                              <span>{match.id}</span>
                              {match.result ? (
                                <span className="text-green-400 font-extrabold tracking-wider">✓ FINAL</span>
                              ) : isPlayable ? (
                                <span className="text-neonCyan font-extrabold tracking-wider animate-pulse">JUGAR</span>
                              ) : (
                                <span className="text-gray-600 tracking-wider">PENDIENTE</span>
                              )}
                            </div>
                            
                            {/* Home team */}
                            <div className="flex justify-between items-center min-h-[22px]">
                              <div className="flex items-center gap-1.5 truncate">
                                {match.result && isHomeWinner && <span className="text-neonCyan text-[10px] animate-pulse">▶</span>}
                                <div className="flex flex-col truncate">
                                  <span className={`font-bold text-xs truncate max-w-[150px] ${
                                    match.result
                                      ? isHomeWinner
                                        ? 'text-neonCyan font-black'
                                        : 'text-gray-500 line-through'
                                      : 'text-gray-300'
                                  }`}>
                                    {match.home}
                                  </span>
                                  {homeOwner && (
                                    <span className={`text-[8px] font-bold uppercase tracking-wider ${
                                      match.result && !isHomeWinner ? 'text-gray-600' : 'text-neonGold/80'
                                    }`}>
                                      {homeOwner}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className={`font-extrabold text-sm text-right ${
                                match.result
                                  ? isHomeWinner
                                    ? 'text-neonCyan font-black'
                                    : 'text-gray-500'
                                  : 'text-gray-400'
                              }`}>
                                {match.result ? match.result.homeGoals : '-'}
                              </span>
                            </div>

                            {/* Away team */}
                            <div className="flex justify-between items-center border-t border-panelBorder/30 pt-1.5 min-h-[22px]">
                              <div className="flex items-center gap-1.5 truncate">
                                {match.result && isAwayWinner && <span className="text-neonCyan text-[10px] animate-pulse">▶</span>}
                                <div className="flex flex-col truncate">
                                  <span className={`font-bold text-xs truncate max-w-[150px] ${
                                    match.result
                                      ? isAwayWinner
                                        ? 'text-neonCyan font-black'
                                        : 'text-gray-500 line-through'
                                      : 'text-gray-300'
                                  }`}>
                                    {match.away}
                                  </span>
                                  {awayOwner && (
                                    <span className={`text-[8px] font-bold uppercase tracking-wider ${
                                      match.result && !isAwayWinner ? 'text-gray-600' : 'text-neonGold/80'
                                    }`}>
                                      {awayOwner}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className={`font-extrabold text-sm text-right ${
                                match.result
                                  ? isAwayWinner
                                    ? 'text-neonCyan font-black'
                                    : 'text-gray-500'
                                  : 'text-gray-400'
                              }`}>
                                {match.result ? match.result.awayGoals : '-'}
                              </span>
                            </div>
                            
                            {/* Penalty Shootout Score display */}
                            {match.result && match.result.penalties && (
                              <div className="text-[10px] text-neonPink font-mono text-center border-t border-panelBorder/30 pt-1 mt-1.5 font-bold uppercase">
                                Tanda: {match.result.homeGoals} - {match.result.awayGoals} (Pen. {match.result.penalties.home} - {match.result.penalties.away})
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ================= TAB 4: TEAM SQUADS / PLANTILLAS ================= */}
        {activeTab === 'teams' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex gap-2 overflow-x-auto pb-2 pr-1 max-w-full">
              {tournament.teams.map(t => (
                <button
                  key={t.name}
                  onClick={() => { sounds.playTick(); setSelectedTeamName(t.name); }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap border transition-all ${
                    selectedTeamName === t.name
                      ? 'bg-neonCyan text-darkBg border-neonCyan font-black shadow-neonCyan'
                      : 'bg-panelBg text-gray-400 border-panelBorder hover:text-white hover:border-gray-500'
                  }`}
                >
                  {t.name} ({t.owner})
                </button>
              ))}
            </div>

            {selectedTeam && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-panelBg border border-panelBorder p-6 rounded-2xl shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-4 border-b border-panelBorder pb-4">
                      <LogoEquipo url={getLogoUrl(selectedTeam.name)} nombreEquipo={selectedTeam.name} size={56} />
                      <div>
                        <span className="text-[10px] text-neonCyan font-mono tracking-widest block uppercase">PROPIETARIO: {selectedTeam.owner}</span>
                        <h3 className="text-2xl font-black text-white tracking-tight uppercase mt-0.5">{selectedTeam.name}</h3>
                        {selectedTeam.group && (
                          <span className="text-xs text-gray-500 font-mono">GRUPO {selectedTeam.group}</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-6">
                      <span className="text-[10px] text-gray-500 font-mono tracking-widest block mb-3">COMODINES EN RESERVA</span>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                        <div className="bg-darkBg border border-neonBronze/30 p-2 rounded-lg">
                          <span className="text-neonBronze block text-lg font-black">
                            {selectedTeam.wildcards?.Bronce || 0}
                          </span>
                          <span className="text-[7px] text-gray-400 uppercase mt-0.5">BRONCE</span>
                        </div>
                        <div className="bg-darkBg border border-neonSilver/30 p-2 rounded-lg">
                          <span className="text-neonSilver block text-lg font-black">
                            {selectedTeam.wildcards?.Plata || 0}
                          </span>
                          <span className="text-[7px] text-gray-400 uppercase mt-0.5">PLATA</span>
                        </div>
                        <div className="bg-darkBg border border-neonGold/30 p-2 rounded-lg">
                          <span className="text-neonGold block text-lg font-black">
                            {selectedTeam.wildcards?.Oro || 0}
                          </span>
                          <span className="text-[7px] text-gray-400 uppercase mt-0.5">ORO</span>
                        </div>
                        <div className="bg-darkBg border border-neonCyan/30 p-2 rounded-lg">
                          <span className="text-neonCyan block text-lg font-black">
                            {selectedTeam.wildcards?.Diamante || 0}
                          </span>
                          <span className="text-[7px] text-gray-400 uppercase mt-0.5">DIAMANTE</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-panelBorder/40 pt-4">
                      <span className="text-[10px] text-gray-500 font-mono tracking-widest block mb-2">TIRADAS HISTORIAL</span>
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {selectedTeam.spins && selectedTeam.spins.length > 0 ? (
                          selectedTeam.spins.map((spin, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px] font-mono border-b border-panelBorder/20 py-1">
                              <span className="text-gray-400">{spin.accion}</span>
                              <span className="text-neonCyan font-bold text-right">{spin.resultado}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-gray-600 font-mono italic">Sin tiradas guardadas</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedTeam.base_changes && selectedTeam.base_changes.length > 0 && (
                    <div className="mt-6 border-t border-panelBorder/40 pt-4">
                      <span className="text-[10px] text-gray-500 font-mono tracking-widest block mb-2">LOG DE CAMBIOS</span>
                      <div className="max-h-[80px] overflow-y-auto pr-1 text-[9px] text-gray-400 font-mono space-y-1">
                        {selectedTeam.base_changes.map((log, idx) => (
                          <div key={idx} className="flex gap-1.5">
                            <span className="text-neonCyan">▸</span>
                            <span>{log}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-2 bg-panelBg border border-panelBorder p-6 rounded-2xl shadow-lg">
                  <h3 className="text-sm font-extrabold tracking-wider font-mono text-gray-400 mb-4 uppercase">
                    PLANTILLA DE JUGADORES ({selectedTeam.legends?.length || 0})
                  </h3>
                  
                  {selectedTeam.legends && selectedTeam.legends.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[500px] overflow-y-auto pr-1 justify-items-center">
                      {selectedTeam.legends.map((p, idx) => (
                        <PlayerCard
                          key={idx}
                          name={p.name}
                          category={p.category}
                          position={p.position}
                          rating={p.rating}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-24 text-gray-500 font-mono text-xs">
                      No hay jugadores asignados a la plantilla.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 5: STATISTICS / LEADERBOARDS ================= */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
             {/* Pichichi (Top Scorers) */}
            <div className="bg-panelBg border border-panelBorder p-5 rounded-2xl shadow-lg">
              <div className="flex items-center gap-2.5 border-b border-panelBorder pb-3 mb-4">
                <span className="text-neonGold text-lg">⚽</span>
                <h3 className="text-sm font-black font-mono tracking-wider text-white uppercase">
                  GOLEADORES (PICHICHI)
                </h3>
              </div>

              {leaderboards.scorers.length === 0 ? (
                <p className="text-center py-8 text-gray-500 font-mono text-xs">Aún no hay goles registrados.</p>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 font-mono text-xs">
                  {leaderboards.scorers.map((scorer, idx) => {
                    const teamInfo = getPlayerTeamInfo(scorer.name);
                    return (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-darkBg/60 border border-panelBorder rounded-lg">
                        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                          <span className={`w-5 font-black text-center flex-shrink-0 ${idx === 0 ? 'text-neonGold' : 'text-gray-500'}`}>
                            {idx + 1}
                          </span>
                          <div className="flex flex-col truncate">
                            <span className="font-extrabold text-white uppercase truncate">{scorer.name}</span>
                            {teamInfo && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <img
                                  src={teamInfo.logo}
                                  alt={teamInfo.name}
                                  className="w-3.5 h-3.5 object-contain"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                <span className="text-[9px] text-gray-500 uppercase font-bold truncate max-w-[120px]">
                                  {teamInfo.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-neonCyan font-bold text-sm flex-shrink-0">{scorer.count} G</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top Assists */}
            <div className="bg-panelBg border border-panelBorder p-5 rounded-2xl shadow-lg">
              <div className="flex items-center gap-2.5 border-b border-panelBorder pb-3 mb-4">
                <span className="text-neonSilver text-lg">👟</span>
                <h3 className="text-sm font-black font-mono tracking-wider text-white uppercase">
                  MÁXIMOS ASISTENTES
                </h3>
              </div>

              {leaderboards.assists.length === 0 ? (
                <p className="text-center py-8 text-gray-500 font-mono text-xs">Aún no hay asistencias registradas.</p>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 font-mono text-xs">
                  {leaderboards.assists.map((assist, idx) => {
                    const teamInfo = getPlayerTeamInfo(assist.name);
                    return (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-darkBg/60 border border-panelBorder rounded-lg">
                        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                          <span className={`w-5 font-black text-center flex-shrink-0 ${idx === 0 ? 'text-neonSilver' : 'text-gray-500'}`}>
                            {idx + 1}
                          </span>
                          <div className="flex flex-col truncate">
                            <span className="font-extrabold text-white uppercase truncate">{assist.name}</span>
                            {teamInfo && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <img
                                  src={teamInfo.logo}
                                  alt={teamInfo.name}
                                  className="w-3.5 h-3.5 object-contain"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                <span className="text-[9px] text-gray-500 uppercase font-bold truncate max-w-[120px]">
                                  {teamInfo.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-neonCyan font-bold text-sm flex-shrink-0">{assist.count} A</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* MVPs of matches */}
            <div className="bg-panelBg border border-panelBorder p-5 rounded-2xl shadow-lg">
              <div className="flex items-center gap-2.5 border-b border-panelBorder pb-3 mb-4">
                <span className="text-neonGold text-lg">💎</span>
                <h3 className="text-sm font-black font-mono tracking-wider text-white uppercase">
                  MVP DEL TORNEO
                </h3>
              </div>

              {leaderboards.mvps.length === 0 ? (
                <p className="text-center py-8 text-gray-500 font-mono text-xs">Aún no hay MVPs registrados.</p>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 font-mono text-xs">
                  {leaderboards.mvps.map((mvp, idx) => {
                    const teamInfo = getPlayerTeamInfo(mvp.name);
                    return (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-darkBg/60 border border-panelBorder rounded-lg">
                        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                          <span className={`w-5 font-black text-center flex-shrink-0 ${idx === 0 ? 'text-neonGold' : 'text-gray-500'}`}>
                            {idx + 1}
                          </span>
                          <div className="flex flex-col truncate">
                            <span className="font-extrabold text-white uppercase truncate">{mvp.name}</span>
                            {teamInfo && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <img
                                  src={teamInfo.logo}
                                  alt={teamInfo.name}
                                  className="w-3.5 h-3.5 object-contain"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                <span className="text-[9px] text-gray-500 uppercase font-bold truncate max-w-[120px]">
                                  {teamInfo.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-neonCyan font-bold text-sm flex-shrink-0">{mvp.count} MVP</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= RESULTS ENTRY MODAL ================= */}
      {selectedMatch && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm z-50 p-4 animate-fade-in">
          <div className="bg-panelBg border border-panelBorder rounded-2xl max-w-xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Datalists for players autocomplete */}
            <datalist id="home-players-datalist">
              {getHomePlayers().map((p, idx) => (
                <option key={idx} value={p.name} />
              ))}
            </datalist>
            
            <datalist id="away-players-datalist">
              {getAwayPlayers().map((p, idx) => (
                <option key={idx} value={p.name} />
              ))}
            </datalist>

            <datalist id="match-players-datalist">
              {getMatchPlayers().map((p, idx) => (
                <option key={idx} value={p.name}>
                  {p.team}
                </option>
              ))}
            </datalist>

            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-panelBorder pb-3 mb-4">
              <h3 className="text-lg font-black font-mono tracking-wide text-neonCyan uppercase">
                ⚽ REGISTRAR RESULTADOS DEL PARTIDO
              </h3>
              <button onClick={handleCloseMatchResult} className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-5">
              {/* Score Input Row */}
              <div className="bg-darkBg/60 border border-panelBorder p-5 rounded-2xl flex justify-between items-center text-center">
                <div className="flex-1 flex flex-col items-center">
                  <span className="font-black text-sm text-white truncate max-w-[130px]">{selectedMatch.home}</span>
                  <input
                    type="number"
                    min="0"
                    value={homeScore}
                    onChange={(e) => {
                      const score = Math.max(0, parseInt(e.target.value) || 0);
                      setHomeScore(score);
                      setHomeScorers(prev => {
                        const next = [...prev];
                        if (score > next.length) {
                          while (next.length < score) next.push('');
                        } else {
                          next.length = score;
                        }
                        return next;
                      });
                      setHomeAssists(prev => {
                        const next = [...prev];
                        if (score > next.length) {
                          while (next.length < score) next.push('');
                        } else {
                          next.length = score;
                        }
                        return next;
                      });
                    }}
                    className="w-16 bg-panelBg border border-panelBorder text-center text-3xl font-black rounded-lg py-2 mt-2 focus:outline-none focus:border-neonCyan"
                  />
                </div>

                <div className="text-gray-500 font-mono text-xl font-bold px-4">VS</div>

                <div className="flex-1 flex flex-col items-center">
                  <span className="font-black text-sm text-white truncate max-w-[130px]">{selectedMatch.away}</span>
                  <input
                    type="number"
                    min="0"
                    value={awayScore}
                    onChange={(e) => {
                      const score = Math.max(0, parseInt(e.target.value) || 0);
                      setAwayScore(score);
                      setAwayScorers(prev => {
                        const next = [...prev];
                        if (score > next.length) {
                          while (next.length < score) next.push('');
                        } else {
                          next.length = score;
                        }
                        return next;
                      });
                      setAwayAssists(prev => {
                        const next = [...prev];
                        if (score > next.length) {
                          while (next.length < score) next.push('');
                        } else {
                          next.length = score;
                        }
                        return next;
                      });
                    }}
                    className="w-16 bg-panelBg border border-panelBorder text-center text-3xl font-black rounded-lg py-2 mt-2 focus:outline-none focus:border-neonCyan"
                  />
                </div>
              </div>

              {/* Playoff Tie breaker penalties inputs */}
              {selectedMatch.playoff && parseInt(homeScore) === parseInt(awayScore) && (
                <div className="flex flex-col bg-neonPink/5 border border-neonPink/20 p-4 rounded-xl space-y-3 animate-fade-in">
                  <label className="text-xs text-neonPink font-mono font-bold uppercase">
                    🏆 Marcador de Tanda de Penaltis
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <label className="text-[10px] text-gray-500 font-mono mb-1 uppercase">Penaltis {selectedMatch.home}</label>
                      <input
                        type="number"
                        min="0"
                        value={homePenalties}
                        onChange={(e) => setHomePenalties(e.target.value)}
                        className="bg-darkBg border border-panelBorder p-2.5 rounded-lg text-sm text-center text-white focus:outline-none focus:border-neonPink font-black"
                        placeholder="Goles penaltis..."
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] text-gray-500 font-mono mb-1 uppercase">Penaltis {selectedMatch.away}</label>
                      <input
                        type="number"
                        min="0"
                        value={awayPenalties}
                        onChange={(e) => setAwayPenalties(e.target.value)}
                        className="bg-darkBg border border-panelBorder p-2.5 rounded-lg text-sm text-center text-white focus:outline-none focus:border-neonPink font-black"
                        placeholder="Goles penaltis..."
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* MVP Selection (Free Text + Autocomplete) */}
              <div className="flex flex-col">
                <label className="text-xs text-gray-400 font-mono mb-1.5">JUGADOR MVP DEL PARTIDO</label>
                <input
                  type="text"
                  value={matchMVP}
                  onChange={(e) => setMatchMVP(e.target.value)}
                  className="bg-darkBg border border-panelBorder p-3 rounded-lg text-sm text-white focus:outline-none focus:border-neonCyan font-bold uppercase"
                  placeholder="Nombre del MVP..."
                  list="match-players-datalist"
                />
              </div>

              {/* Home Team Goals & Assists */}
              {homeScore > 0 && (
                <div className="border-t border-panelBorder/60 pt-4 space-y-3">
                  <span className="text-xs font-black text-neonCyan font-mono uppercase block">
                    ⚽ GOLES Y ASISTENCIAS - {selectedMatch.home} ({homeScore})
                  </span>
                  <div className="space-y-3">
                    {Array.from({ length: homeScore }).map((_, idx) => (
                      <div key={`home-goal-${idx}`} className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col">
                          <label className="text-[10px] text-gray-500 font-mono mb-1 uppercase">Goleador {idx + 1}</label>
                          <input
                            type="text"
                            value={homeScorers[idx] || ''}
                            onChange={(e) => {
                              const updated = [...homeScorers];
                              updated[idx] = e.target.value;
                              setHomeScorers(updated);
                            }}
                            className="bg-darkBg border border-panelBorder p-2 rounded text-xs text-white focus:outline-none focus:border-neonCyan uppercase font-bold"
                            placeholder="Nombre del goleador..."
                            list="home-players-datalist"
                            required
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] text-gray-500 font-mono mb-1 uppercase">Asistente {idx + 1} (Opcional)</label>
                          <input
                            type="text"
                            value={homeAssists[idx] || ''}
                            onChange={(e) => {
                              const updated = [...homeAssists];
                              updated[idx] = e.target.value;
                              setHomeAssists(updated);
                            }}
                            className="bg-darkBg border border-panelBorder p-2 rounded text-xs text-white focus:outline-none focus:border-neonCyan uppercase font-bold"
                            placeholder="Nombre del asistente..."
                            list="home-players-datalist"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Away Team Goals & Assists */}
              {awayScore > 0 && (
                <div className="border-t border-panelBorder/60 pt-4 space-y-3">
                  <span className="text-xs font-black text-neonCyan font-mono uppercase block">
                    ⚽ GOLES Y ASISTENCIAS - {selectedMatch.away} ({awayScore})
                  </span>
                  <div className="space-y-3">
                    {Array.from({ length: awayScore }).map((_, idx) => (
                      <div key={`away-goal-${idx}`} className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col">
                          <label className="text-[10px] text-gray-500 font-mono mb-1 uppercase">Goleador {idx + 1}</label>
                          <input
                            type="text"
                            value={awayScorers[idx] || ''}
                            onChange={(e) => {
                              const updated = [...awayScorers];
                              updated[idx] = e.target.value;
                              setAwayScorers(updated);
                            }}
                            className="bg-darkBg border border-panelBorder p-2 rounded text-xs text-white focus:outline-none focus:border-neonCyan uppercase font-bold"
                            placeholder="Nombre del goleador..."
                            list="away-players-datalist"
                            required
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] text-gray-500 font-mono mb-1 uppercase">Asistente {idx + 1} (Opcional)</label>
                          <input
                            type="text"
                            value={awayAssists[idx] || ''}
                            onChange={(e) => {
                              const updated = [...awayAssists];
                              updated[idx] = e.target.value;
                              setAwayAssists(updated);
                            }}
                            className="bg-darkBg border border-panelBorder p-2 rounded text-xs text-white focus:outline-none focus:border-neonCyan uppercase font-bold"
                            placeholder="Nombre del asistente..."
                            list="away-players-datalist"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="border-t border-panelBorder pt-4 mt-6 flex gap-4">
              <button
                onClick={handleCloseMatchResult}
                className="flex-1 py-3 bg-panelBorder rounded-xl font-bold hover:bg-gray-800 text-sm tracking-wider transition-all"
              >
                CANCELAR
              </button>
              <button
                onClick={handleSaveMatchResult}
                className="flex-1 py-3 rounded-xl font-black bg-gradient-to-r from-neonCyan to-cyan-500 text-darkBg shadow-neonCyan hover:brightness-105 active:scale-95 transition-all text-center tracking-wider text-sm uppercase"
              >
                GUARDAR RESULTADO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM ACTION CUSTOM DIALOG */}
      {confirmModal && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm z-50 p-4 animate-fade-in">
          <div className="bg-panelBg border border-panelBorder rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-scale-up border-t-4 border-t-neonPink">
            <h3 className="text-lg font-black text-white tracking-wide font-mono mb-2 uppercase flex items-center gap-2">
              ⚠️ {confirmModal.title || 'Confirmación'}
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-6 font-semibold">
              {confirmModal.message}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  sounds.playTick();
                  setConfirmModal(null);
                  if (confirmModal.onCancel) confirmModal.onCancel();
                }}
                className="flex-1 py-2.5 rounded-xl font-bold bg-panelBorder text-white hover:bg-gray-800 transition-all text-xs uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  sounds.playSuccess();
                  setConfirmModal(null);
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
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

export default TournamentDashboard;
