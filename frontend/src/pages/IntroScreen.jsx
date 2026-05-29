import React, { useState } from 'react';
import sounds from '../utils/audio';

const IntroScreen = ({ onEnter }) => {
  const [audioEnabled, setAudioEnabled] = useState(true);

  const handleStart = () => {
    // Initialize browser AudioContext
    sounds.init();
    sounds.toggle(audioEnabled);
    sounds.playSuccess();
    
    if (onEnter) {
      onEnter();
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-darkBg text-white overflow-hidden p-6 select-none">
      {/* Background Cinematic Video/Static Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(11,28,48,0.8)_0%,rgba(3,5,8,1)_80%)] z-0" />
      
      {/* Glowing Neon Lines decoration */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-neonCyan/10 blur-[100px] z-0 animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-neonPink/10 blur-[100px] z-0 animate-pulse" />

      {/* Grid Pattern overlays */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0e1520_1px,transparent_1px),linear-gradient(to_bottom,#0e1520_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 z-0" />

      {/* Main content container */}
      <div className="flex flex-col items-center max-w-2xl text-center z-10 animate-fade-in px-4">
        {/* Championship badge representation */}
        <div className="mb-4 relative">
          <div className="absolute inset-0 rounded-full bg-neonCyan/20 blur-md animate-ping" />
          <div className="w-20 h-20 rounded-full border-2 border-neonCyan flex items-center justify-center bg-panelBg shadow-neonCyan">
            <svg className="w-10 h-10 text-neonCyan" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.75m5.007 0c.621 0 1.125-.504 1.125-1.125V10.5m-5.007 0c-.621 0-1.125-.504-1.125-1.125V10.5m5.007 0V6a2.25 2.25 0 00-2.25-2.25h-1.5A2.25 2.25 0 007.5 6v4.5m0 0V12m0 0H9.75" />
            </svg>
          </div>
        </div>

        {/* Cinematic pulsating title logo */}
        <h1 className="text-5xl md:text-7xl font-extrabold uppercase tracking-tighter cinematic-title bg-clip-text text-transparent bg-gradient-to-b from-white via-gray-200 to-gray-400 drop-shadow-[0_0_20px_rgba(0,240,255,0.4)]">
          Torneo Leyendas <span className="text-neonCyan block mt-1 drop-shadow-[0_0_15px_rgba(0,240,255,0.6)] font-black">FC</span>
        </h1>

        <p className="mt-6 text-gray-400 text-sm md:text-base tracking-widest font-mono uppercase">
          Edición Especial de Gestión y Ruletas
        </p>

        {/* Audio selector prompt */}
        <div className="mt-8 flex flex-col items-center bg-panelBg/80 border border-panelBorder p-4 rounded-xl max-w-xs w-full">
          <span className="text-xs text-gray-400 font-mono tracking-wider mb-3">CONFIGURACIÓN DE SONIDO</span>
          <div className="flex items-center justify-between w-full">
            <span className="text-sm font-semibold">Efectos de Sonido</span>
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
                audioEnabled ? 'bg-neonCyan' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                  audioEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Entrance CTA button */}
        <button
          onClick={handleStart}
          className="mt-12 px-12 py-4 rounded-full font-black text-lg tracking-widest bg-gradient-to-r from-neonCyan to-cyan-500 text-darkBg shadow-neonCyan hover:scale-105 hover:brightness-110 active:scale-95 transition-all duration-300 animate-pulse"
        >
          ENTRAR AL ESTADIO
        </button>

        {/* Mini disclaimer */}
        <span className="mt-8 text-[10px] text-gray-500 font-mono tracking-wider">
          INSPIRADO EN EA SPORTS FC & CHAMPIONS LEAGUE
        </span>
      </div>
    </div>
  );
};

export default IntroScreen;
