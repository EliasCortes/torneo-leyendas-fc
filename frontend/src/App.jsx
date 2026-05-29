import React, { useState } from 'react';
import IntroScreen from './pages/IntroScreen';
import MainMenu from './pages/MainMenu';
import TournamentWizard from './pages/TournamentWizard';
import DraftRoom from './pages/DraftRoom';
import TournamentDashboard from './pages/TournamentDashboard';

function App() {
  const [currentView, setCurrentView] = useState('intro'); // 'intro', 'menu', 'wizard', 'draft', 'dashboard'
  const [tournamentFilename, setTournamentFilename] = useState('');
  const [tournamentData, setTournamentData] = useState(null);

  const handleEnterApp = () => {
    setCurrentView('menu');
  };

  const handleNewTournament = () => {
    setCurrentView('wizard');
  };

  const handleLoadTournament = (filename, data) => {
    setTournamentFilename(filename);
    setTournamentData(data);
    
    // Determine where to route based on tournament status
    if (data.status === 'Configuración' || !data.status) {
      setCurrentView('draft');
    } else {
      setCurrentView('dashboard');
    }
  };

  const handleTournamentCreated = (filename, data) => {
    setTournamentFilename(filename);
    setTournamentData(data);
    setCurrentView('draft');
  };

  const handleDraftComplete = (updatedData) => {
    setTournamentData(updatedData);
    setCurrentView('dashboard');
  };

  const handleBackToMenu = () => {
    setCurrentView('menu');
    setTournamentData(null);
    setTournamentFilename('');
  };

  return (
    <>
      {currentView === 'intro' && (
        <IntroScreen onEnter={handleEnterApp} />
      )}
      
      {currentView === 'menu' && (
        <MainMenu
          onNewTournament={handleNewTournament}
          onLoadTournament={handleLoadTournament}
        />
      )}
      
      {currentView === 'wizard' && (
        <TournamentWizard
          onCreated={handleTournamentCreated}
          onBack={handleBackToMenu}
        />
      )}
      
      {currentView === 'draft' && (
        <DraftRoom
          initialTournamentData={tournamentData}
          onComplete={handleDraftComplete}
          onBackToMenu={handleBackToMenu}
        />
      )}
      
      {currentView === 'dashboard' && (
        <TournamentDashboard
          initialTournament={tournamentData}
          onBackToMenu={handleBackToMenu}
        />
      )}
    </>
  );
}

export default App;
