import React, { useState } from 'react';

/**
 * LogoEquipo — Team shield/logo component optimized for dark theme.
 * 
 * Strategy:
 * - Shows logos on a subtle white/light circular backdrop so that both 
 *   light AND dark logos look great on the dark UI.
 * - On error (broken path), renders an elegant SVG shield placeholder
 *   with the team's initial letter.
 */
export const LogoEquipo = ({ url, nombreEquipo, size = 40 }) => {
  const [hasError, setHasError] = useState(false);

  const containerStyle = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
  };

  // Fallback: elegant SVG shield with the team's initial letter
  if (hasError || !url) {
    const fontSize = typeof size === 'number' ? Math.max(size * 0.38, 10) : 14;
    const initial = nombreEquipo ? nombreEquipo.charAt(0).toUpperCase() : '?';

    return (
      <div
        style={containerStyle}
        className="relative flex items-center justify-center rounded-full overflow-hidden flex-shrink-0"
        title={`Logo no disponible: ${nombreEquipo || 'Desconocido'}`}
      >
        {/* Shield SVG background */}
        <svg
          viewBox="0 0 40 46"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 w-full h-full"
          style={{ filter: 'drop-shadow(0 0 4px rgba(0,240,255,0.15))' }}
        >
          <path
            d="M20 2L4 9V22C4 33.5 11 40 20 44C29 40 36 33.5 36 22V9L20 2Z"
            fill="rgba(10,18,32,0.9)"
            stroke="rgba(0,240,255,0.35)"
            strokeWidth="1.5"
          />
          <path
            d="M20 5L7 11V22C7 31.5 13 37.5 20 41C27 37.5 33 31.5 33 22V11L20 5Z"
            fill="rgba(8,14,28,0.95)"
            stroke="rgba(0,240,255,0.12)"
            strokeWidth="0.5"
          />
        </svg>

        {/* Initial letter */}
        <span
          className="relative z-10 font-black text-cyan-400/80 select-none"
          style={{
            fontSize,
            textShadow: '0 0 6px rgba(0,240,255,0.25)',
            letterSpacing: '0.02em',
          }}
        >
          {initial}
        </span>
      </div>
    );
  }

  // Determine padding based on size (smaller logos need less padding)
  const padding = typeof size === 'number' ? Math.max(Math.round(size * 0.1), 2) : 3;

  return (
    <div
      style={{ ...containerStyle, backgroundColor: 'transparent' }}
      className="relative flex items-center justify-center rounded-full overflow-hidden flex-shrink-0"
      title={nombreEquipo}
    >
      <img
        src={url}
        alt={`Escudo de ${nombreEquipo}`}
        className="w-full h-full object-contain"
        style={{
          backgroundColor: 'transparent',
          filter: 'drop-shadow(0 0.5px 2px rgba(0,0,0,0.3))',
          display: 'block',
        }}
        onError={() => setHasError(true)}
        draggable="false"
      />
    </div>
  );
};

export default LogoEquipo;
