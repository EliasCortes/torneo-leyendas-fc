import React, { useState } from 'react';

export const LogoEquipo = ({ url, nombreEquipo, size = 40 }) => {
  const [hasError, setHasError] = useState(false);

  const style = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
  };

  // Diseño Retro/90s (Neobrutalismo)
  const retroClasses = "border-[3px] border-black shadow-[3px_3px_0px_#000000] object-contain bg-white";

  if (hasError || !url) {
    return (
      <div 
        style={style}
        className={`flex items-center justify-center bg-blue-600 text-white font-black uppercase ${retroClasses}`}
        title={`Logo no encontrado: ${nombreEquipo}`}
      >
        <span style={{ fontSize: typeof size === 'number' ? size * 0.5 : '1rem' }}>
          {nombreEquipo ? nombreEquipo.charAt(0) : '?'}
        </span>
      </div>
    );
  }

  return (
    <img 
      src={url} 
      alt={`Escudo de ${nombreEquipo}`} 
      style={style}
      onError={() => setHasError(true)}
      className={retroClasses}
      title={nombreEquipo}
      draggable="false"
    />
  );
};

export default LogoEquipo;
