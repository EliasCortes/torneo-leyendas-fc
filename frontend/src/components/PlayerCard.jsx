import React from 'react';

const PlayerCard = ({ name, category, position = 'Sin definir', rating }) => {
  // Determine color theme based on rarity
  let borderClass = 'border-panelBorder';
  let shadowClass = '';
  let textClass = 'text-gray-300';
  let rarityBg = 'card-hologram-actual';
  let rarityTitle = 'ACTUAL';
  
  // Assign default ratings if not specified
  let defaultRating = rating || 80;

  switch (category) {
    case 'Diamante':
      borderClass = 'border-neonCyan border-[2px]';
      shadowClass = 'shadow-neonCyan';
      textClass = 'text-neonCyan font-bold';
      rarityBg = 'card-hologram-diamond';
      rarityTitle = 'DIAMANTE';
      defaultRating = rating || 96;
      break;
    case 'Oro':
      borderClass = 'border-neonGold border-[2px]';
      shadowClass = 'shadow-neonGold';
      textClass = 'text-neonGold font-bold';
      rarityBg = 'card-hologram-gold';
      rarityTitle = 'ORO LEYENDA';
      defaultRating = rating || 90;
      break;
    case 'Plata':
      borderClass = 'border-neonSilver border';
      shadowClass = 'shadow-neonSilver';
      textClass = 'text-neonSilver font-semibold';
      rarityBg = 'card-hologram-silver';
      rarityTitle = 'PLATA LEYENDA';
      defaultRating = rating || 84;
      break;
    case 'Bronce':
      borderClass = 'border-neonBronze border';
      shadowClass = 'shadow-neonBronze';
      textClass = 'text-neonBronze';
      rarityBg = 'card-hologram-bronze';
      rarityTitle = 'BRONCE LEYENDA';
      defaultRating = rating || 78;
      break;
    default:
      borderClass = 'border-panelBorder border';
      rarityTitle = 'JUGADOR ACTUAL';
      break;
  }

  // Basic Position abbreviations
  const getPositionAbbr = (pos) => {
    if (!pos || pos === 'Sin definir') return 'JGD';
    // Translate positions if needed
    const translations = {
      'Portero': 'POR', 'PT': 'POR',
      'Defensa': 'DF', 'DEF': 'DFC', 'DFC': 'DFC', 'LD': 'LD', 'LI': 'LI',
      'Medio': 'MC', 'MED': 'MC', 'MC': 'MC', 'MCO': 'MCO', 'MCD': 'MCD', 'MI': 'MI', 'MD': 'MD',
      'Atacante': 'DC', 'DEL': 'DC', 'DC': 'DC', 'EI': 'EI', 'ED': 'ED', 'SD': 'SD'
    };
    return translations[pos] || pos.substring(0, 3).toUpperCase();
  };

  const posAbbr = getPositionAbbr(position);

  // Position color
  let posColor = 'bg-gray-800 text-gray-400';
  if (category === 'Diamante') posColor = 'bg-cyan-950 text-neonCyan';
  else if (category === 'Oro') posColor = 'bg-yellow-950 text-neonGold';
  else if (category === 'Plata') posColor = 'bg-zinc-800 text-neonSilver';
  else if (category === 'Bronce') posColor = 'bg-amber-950 text-neonBronze';

  return (
    <div className={`relative w-[150px] h-[220px] m-2 transition-transform duration-300 hover:scale-108 hover:rotate-1 cursor-pointer flex flex-col items-center justify-between p-3 rounded-xl fut-card-clip select-none ${rarityBg} ${borderClass} ${shadowClass}`}>
      {/* Shining effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

      {/* Card Header (Rating & Position) */}
      <div className="w-full flex justify-between items-start z-10">
        <div className="flex flex-col items-center">
          <span className="text-2xl font-black font-mono tracking-tight leading-none">
            {defaultRating}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold mt-1 ${posColor}`}>
            {posAbbr}
          </span>
        </div>
        
        {/* Decorative Badge */}
        <div className="opacity-40">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 22h20L12 2zm0 3.99L18.47 18H5.53L12 5.99z" />
          </svg>
        </div>
      </div>

      {/* Card Center (Player Silhouette / Avatar) */}
      <div className="relative w-20 h-20 flex items-center justify-center -mt-2 z-10">
        <div className={`absolute inset-0 rounded-full blur-md opacity-25 ${
          category === 'Diamante' ? 'bg-neonCyan' : 
          category === 'Oro' ? 'bg-neonGold' : 
          category === 'Plata' ? 'bg-neonSilver' : 
          category === 'Bronce' ? 'bg-neonBronze' : 'bg-transparent'
        }`} />
        <svg className="w-16 h-16 text-gray-500/80" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      </div>

      {/* Card Footer (Name & Category) */}
      <div className="w-full flex flex-col items-center text-center z-10 mt-auto bg-black/40 rounded-lg py-1 px-1 border border-white/5">
        <span className={`text-[12px] font-bold tracking-wide truncate w-full uppercase ${textClass}`}>
          {name}
        </span>
        <span className="text-[7px] text-gray-400 font-mono tracking-widest mt-0.5">
          {rarityTitle}
        </span>
      </div>
      
      {/* Sparkles for Diamond/Gold cards */}
      {(category === 'Diamante' || category === 'Oro') && (
        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white animate-ping opacity-75" />
      )}
    </div>
  );
};

export default PlayerCard;
