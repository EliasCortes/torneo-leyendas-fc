import React, { useState } from 'react';
import sounds from '../utils/audio';
import LogoShield from '../components/LogoShield';
import RulesEncyclopedia from '../components/RulesEncyclopedia';

const IntroScreen = ({ onEnter }) => {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showRules, setShowRules] = useState(false);

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
    <div className="relative h-screen flex flex-col items-center justify-center bg-darkBg text-white overflow-hidden select-none">
      
      {/* === LAYER 0: Deep cinematic radial gradient === */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(11,28,48,0.85)_0%,rgba(5,10,18,0.95)_50%,rgba(3,5,8,1)_100%)] z-0" />
      
      {/* === LAYER 1: Subtle tech grid pattern === */}
      <div 
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(14,21,32,0.8) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(14,21,32,0.8) 1px, transparent 1px)
          `,
          backgroundSize: '3rem 3rem',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 40%, transparent 100%)',
        }}
      />

      {/* === LAYER 2: Secondary hex-style micro pattern for depth === */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(30deg, #0f1923 12%, transparent 12.5%, transparent 87%, #0f1923 87.5%, #0f1923),
            linear-gradient(150deg, #0f1923 12%, transparent 12.5%, transparent 87%, #0f1923 87.5%, #0f1923),
            linear-gradient(30deg, #0f1923 12%, transparent 12.5%, transparent 87%, #0f1923 87.5%, #0f1923),
            linear-gradient(150deg, #0f1923 12%, transparent 12.5%, transparent 87%, #0f1923 87.5%, #0f1923),
            linear-gradient(60deg, #13202e 25%, transparent 25.5%, transparent 75%, #13202e 75%, #13202e),
            linear-gradient(60deg, #13202e 25%, transparent 25.5%, transparent 75%, #13202e 75%, #13202e)
          `,
          backgroundSize: '80px 140px',
          backgroundPosition: '0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px',
        }}
      />

      {/* === LAYER 3: Focused neon glow behind hero content === */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(0,243,255,0.08)_0%,transparent_65%)] z-0" />
      
      {/* === LAYER 4: Warm accent orbs (subtle) === */}
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-neonCyan/[0.04] blur-[100px] z-0" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-neonPink/[0.04] blur-[100px] z-0" />

      {/* ============================
           MAIN CONTENT 
         ============================ */}
      <div className="flex flex-col items-center max-w-2xl text-center z-10 px-4 animate-fade-in">
        
        {/* --- Shield Logo with Neon Ring Effect --- */}
        <div className="mb-2" style={{ padding: '0.75rem', overflow: 'visible' }}>
          <div 
            className="flex items-center justify-center rounded-full logo-neon-ring"
            style={{
              width: '8rem',
              height: '8rem',
              background: 'radial-gradient(circle at center, #0b1324 0%, #060b14 100%)',
              overflow: 'visible',
            }}
          >
          <img 
            src="/logo-escudo-clean.png" 
            alt="Torneo Leyendas" 
            className="w-[85%] h-[85%] object-contain"
            style={{ 
              mixBlendMode: 'lighten',
              filter: 'drop-shadow(0 2px 8px rgba(205,155,80,0.3))',
            }}
            draggable="false"
          />
          </div>
        </div>

        {/* --- Main Title Stack --- */}
        <h1 
          className="font-black uppercase leading-[0.88] tracking-tight"
          style={{ 
            fontFamily: "'Outfit', sans-serif",
            fontSize: 'clamp(2.4rem, 7vw, 4.2rem)',
            color: '#00f3ff',
            textShadow: '0 0 30px rgba(0,243,255,0.6), 0 0 60px rgba(0,243,255,0.2), 0 2px 4px rgba(0,0,0,0.8)',
          }}
        >
          <span className="block">TORNEO</span>
          <span className="block">LEYENDAS</span>
          <span className="block text-[0.65em] mt-1 tracking-widest" style={{ 
            textShadow: '0 0 20px rgba(0,243,255,0.8), 0 0 50px rgba(0,243,255,0.3)' 
          }}>
            FC
          </span>
        </h1>

        {/* --- Subtitle --- */}
        <p 
          className="mt-3 text-sm md:text-base tracking-[0.25em] uppercase font-mono"
          style={{ 
            color: 'rgba(255,255,255,0.75)',
            textShadow: '0 0 10px rgba(0,243,255,0.15)',
          }}
        >
          Edición Especial de Gestión y Ruletas
        </p>

        {/* --- Sound Config Panel --- */}
        <div 
          className="mt-4 w-full max-w-xs rounded-xl p-3.5"
          style={{
            background: 'linear-gradient(135deg, rgba(11,19,36,0.85) 0%, rgba(8,14,25,0.9) 100%)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 30px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <span 
            className="text-[10px] font-mono tracking-[0.2em] uppercase block mb-2.5"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            CONFIGURACIÓN DE SONIDO
          </span>
          <div className="flex items-center justify-between w-full">
            <span className="text-sm font-semibold text-white/90">Efectos de Sonido</span>
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300"
              style={{
                backgroundColor: audioEnabled ? '#00f3ff' : 'rgba(255,255,255,0.1)',
                boxShadow: audioEnabled ? '0 0 12px rgba(0,243,255,0.5), inset 0 1px 2px rgba(0,0,0,0.2)' : 'inset 0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-md ${
                  audioEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* --- CTA Button --- */}
        <button
          onClick={handleStart}
          className="mt-4 px-14 py-3 rounded-full font-black text-base tracking-[0.2em] uppercase transition-all duration-300 hover:scale-[1.03] active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #00f3ff 0%, #00c8d6 50%, #0099a8 100%)',
            color: '#030508',
            boxShadow: '0 0 30px rgba(0,243,255,0.35), 0 4px 15px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
            textShadow: '0 1px 0 rgba(255,255,255,0.2)',
          }}
        >
          ENTRAR AL ESTADIO
        </button>

        {/* --- Rules Button --- */}
        <button
          onClick={() => { sounds.playSwoosh(); setShowRules(true); }}
          className="mt-2 flex items-center gap-2 px-6 py-2.5 rounded-full font-mono font-bold text-xs uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            background: 'rgba(0,243,255,0.06)',
            border: '1px solid rgba(0,243,255,0.2)',
            color: 'rgba(0,243,255,0.65)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(0,243,255,0.1)';
            e.currentTarget.style.color = '#00f3ff';
            e.currentTarget.style.borderColor = 'rgba(0,243,255,0.45)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(0,243,255,0.06)';
            e.currentTarget.style.color = 'rgba(0,243,255,0.65)';
            e.currentTarget.style.borderColor = 'rgba(0,243,255,0.2)';
          }}
        >
          <span>📚</span>
          Reglas &amp; Base de Datos
        </button>

        {/* --- Footer --- */}
        <span 
          className="mt-4 text-[9px] font-mono tracking-[0.3em] uppercase"
          style={{ color: 'rgba(255,255,255,0.2)' }}
        >
          INSPIRADO EN EA SPORTS FC &amp; CHAMPIONS LEAGUE
        </span>
      </div>

      {/* RULES ENCYCLOPEDIA MODAL */}
      {showRules && <RulesEncyclopedia onClose={() => setShowRules(false)} />}
    </div>
  );
};

export default IntroScreen;
