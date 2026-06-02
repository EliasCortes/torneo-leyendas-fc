import React from 'react';

/**
 * LogoShield - Professional shield logo component.
 * 
 * Uses a logo rendered on solid black background + CSS mix-blend-mode: lighten
 * to make the black areas completely invisible against any dark background.
 * This is the industry-standard technique for integrating logos with
 * non-transparent backgrounds into dark UIs.
 */
const LogoShield = ({ className = '', size = 'lg', glow = true }) => {
  // Size presets for consistent usage across the app
  const sizeMap = {
    sm: { width: '3.5rem', height: '3.5rem' },
    md: { width: '5rem', height: '5rem' },
    lg: { width: '12rem', height: '12rem' },
    xl: { width: '16rem', height: '16rem' },
    roulette: { width: '5.5rem', height: '5.5rem' },
  };

  const dimensions = sizeMap[size] || sizeMap.lg;

  return (
    <div 
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      {/* Volumetric glow behind the shield */}
      {glow && (
        <div 
          className="absolute inset-[-30%] z-0 animate-pulse"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(205,155,80,0.18) 0%, rgba(0,243,255,0.08) 45%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />
      )}

      {/* The logo image with mix-blend-mode: lighten
           This makes any pure-black pixel in the image become fully transparent
           against a dark background, while preserving all the bronze/gold/metallic
           colors perfectly. No clip-path, no mask, no hacks. */}
      <img 
        src="/logo-escudo-clean.png" 
        alt="Torneo Leyendas" 
        className="relative z-10 w-full h-full object-contain"
        style={{ 
          mixBlendMode: 'lighten',
          filter: glow 
            ? 'drop-shadow(0 4px 20px rgba(0,0,0,0.6)) drop-shadow(0 0 30px rgba(205,155,80,0.25))' 
            : 'drop-shadow(0 4px 15px rgba(0,0,0,0.5))',
        }}
        draggable="false"
      />
    </div>
  );
};

export default LogoShield;
