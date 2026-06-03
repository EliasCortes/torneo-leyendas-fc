import React, { useRef, useEffect, useState } from 'react';
import sounds from '../utils/audio';

const ChampionsRouletteModal = ({ prevChampTeam, options = [], onFinished, onClose }) => {
  const canvasRef = useRef(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [localOptions, setLocalOptions] = useState(options || []);
  const [isShuffling, setIsShuffling] = useState(false);
  const animationFrameRef = useRef(null);

  const rotationAngle = useRef(0);
  const angularVelocity = useRef(0);

  // Sync local options if the prop changes
  useEffect(() => {
    setLocalOptions(options || []);
    rotationAngle.current = 0; // Reset rotation angle cleanly on options load
  }, [options]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const radius = Math.min(width, height) / 2 - 15;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    const arcSize = (2 * Math.PI) / localOptions.length;

    // Draw slices
    localOptions.forEach((option, idx) => {
      const startAngle = rotationAngle.current + idx * arcSize;
      const endAngle = startAngle + arcSize;

      // Draw segment slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      
      // Alternate slice backgrounds based on item type
      const isDiamond = option.includes("Diamante");
      // Dark deep backgrounds for luxury look
      ctx.fillStyle = isDiamond ? '#0a2335' : '#281a04'; 
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#121620';
      ctx.stroke();

      // Outer border arc with neon gold / diamond cyan border
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.strokeStyle = isDiamond ? '#00f3ff' : '#d4af37';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + arcSize / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      
      // Color matching text
      ctx.fillStyle = isDiamond ? '#b9f2ff' : '#ffe894';
      ctx.font = `bold 10px 'Outfit', sans-serif`;
      
      ctx.fillText(option, radius - 20, 0);
      ctx.restore();
    });

    // Draw central node base (Golden theme)
    ctx.beginPath();
    ctx.arc(centerX, centerY, 38, 0, 2 * Math.PI);
    ctx.fillStyle = '#05070a';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#d4af37';
    ctx.stroke();

    // Inner ring decoration
    ctx.beginPath();
    ctx.arc(centerX, centerY, 34, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw top pointer (indicator) - Golden diamond pointer
    ctx.beginPath();
    ctx.moveTo(centerX - 12, centerY - radius - 10);
    ctx.lineTo(centerX + 12, centerY - radius - 10);
    ctx.lineTo(centerX, centerY - radius + 15);
    ctx.closePath();
    ctx.fillStyle = '#d4af37';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  };

  const spin = () => {
    if (isSpinning || !prevChampTeam) return;
    setIsSpinning(true);
    setWinner(null);
    sounds.playSwoosh();

    // Physics variables matching RouletteWheel.jsx for a classic feel
    // Set initial speed
    angularVelocity.current = 0.25 + Math.random() * 0.15;
    const friction = 0.985; // Deceleration rate
    let lastTickSegment = -1;

    const animate = () => {
      if (angularVelocity.current > 0.001) {
        // Rotate
        rotationAngle.current += angularVelocity.current;
        angularVelocity.current *= friction; // Apply friction

        // Calculate current segment under pointer
        const arcSize = (2 * Math.PI) / localOptions.length;
        const normalizedRotation = (2 * Math.PI - (rotationAngle.current % (2 * Math.PI))) % (2 * Math.PI);
        const pointerAngle = (1.5 * Math.PI + normalizedRotation) % (2 * Math.PI);
        const currentSegment = Math.floor(pointerAngle / arcSize) % localOptions.length;

        // Play tick sound on boundary crossing
        if (currentSegment !== lastTickSegment) {
          sounds.playTick();
          lastTickSegment = currentSegment;
        }

        drawWheel();
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Stopped!
        setIsSpinning(false);
        
        // Calculate exact final winner
        const arcSize = (2 * Math.PI) / localOptions.length;
        const normalizedRotation = (2 * Math.PI - (rotationAngle.current % (2 * Math.PI))) % (2 * Math.PI);
        const pointerAngle = (1.5 * Math.PI + normalizedRotation) % (2 * Math.PI);
        const winnerIndex = Math.floor(pointerAngle / arcSize) % localOptions.length;
        
        const finalWinner = localOptions[winnerIndex];
        setWinner(finalWinner);
        sounds.playSuccess();
        
        if (onFinished) {
          onFinished(finalWinner);
        }
      }
    };

    animate();
  };

  const handleShuffle = () => {
    if (isSpinning || localOptions.length <= 1 || !prevChampTeam) return;
    
    // Reset rotation angle to 0 cleanly for a fresh spin orientation
    rotationAngle.current = 0;
    
    sounds.playTick();
    
    // Reset isShuffling reactively to restart the keyframe shake animation in case of multiple clicks
    setIsShuffling(false);
    
    // Defer setting shuffle state so React registers the class removal and re-addition
    setTimeout(() => {
      setIsShuffling(true);
    }, 10);

    // Shuffle the array of options using Fisher-Yates with safety check
    setLocalOptions(prev => {
      const next = [...prev];
      if (next.length === 0) {
        return options && options.length > 0 ? options : [
          'Comodín Oro', 'Comodín Oro', 'Comodín Diamante',
          'Tirar Ruleta Oro', 'Tirar Ruleta Oro', 'Tirar Ruleta Oro', 'Tirar Ruleta Oro',
          'Tirar Ruleta Diamante', 'Tirar Ruleta Diamante', 'Tirar Ruleta Diamante', 'Tirar Ruleta Diamante'
        ];
      }
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  };

  // Only run cleanup of animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Redraw when options change
  useEffect(() => {
    drawWheel();
  }, [localOptions]);

  const isBlocked = !prevChampTeam;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm z-50 p-4 animate-fade-in">
      <div 
        className="bg-panelBg border rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col items-center animate-scale-up border-neonGold"
        style={{
          boxShadow: '0 0 25px rgba(212, 175, 55, 0.25), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}
      >
        {/* Title */}
        <h3 className="text-xl font-black text-neonGold tracking-widest font-mono mb-1 text-center uppercase flex items-center gap-2">
          🏆 Ruleta de Campeones
        </h3>
        <p className="text-[10px] text-gray-400 font-mono tracking-wider mb-6 text-center uppercase">
          Edición Anterior - Premio Exclusivo
        </p>

        {/* Wheel container */}
        <div className="relative w-80 h-80 flex items-center justify-center">
          {/* Golden radial glow */}
          <div className="absolute inset-2 rounded-full border border-neonGold/30 blur-md animate-pulse pointer-events-none" />
          
          <canvas
            ref={canvasRef}
            width={320}
            height={320}
            onAnimationEnd={() => setIsShuffling(false)}
            className={`rounded-full shadow-2xl bg-darkBg ${
              isShuffling ? 'animate-shuffle-shake' : ''
            }`}
          />

          {/* Central Logo Overlay */}
          <div 
             className="absolute z-10 flex items-center justify-center rounded-full"
             style={{
               top: '50%',
               left: '50%',
               transform: 'translate(-50%, -50%)',
               width: '5.2rem',
               height: '5.2rem',
               background: 'radial-gradient(circle at center, #0f1624 0%, #05070a 100%)',
               border: '2.5px solid #d4af37',
               boxShadow: 'inset 0 0 15px rgba(212, 175, 55, 0.4), 0 0 25px rgba(212, 175, 55, 0.3)',
               overflow: 'hidden',
             }}
          >
             <img 
               src="/logo-escudo-clean.png" 
               alt="" 
               className="w-[85%] h-[85%] object-contain"
               style={{ 
                 mixBlendMode: 'lighten',
                 filter: 'drop-shadow(0 2px 5px rgba(212,175,55,0.4)) brightness(1.1)',
               }}
               draggable="false"
             />
          </div>
        </div>

        {/* Controls */}
        <div className="mt-8 w-full flex flex-col items-center">
          {isBlocked && (
            <div className="text-rose-500 text-[10px] font-mono font-bold uppercase mb-4 text-center border border-rose-950 bg-rose-950/20 px-3 py-1.5 rounded-lg">
              ⚠️ Selecciona el equipo campeón en el paso 2 antes de girar
            </div>
          )}

          {!winner ? (
            <div className="flex gap-4 w-full justify-center">
              <button
                onClick={handleShuffle}
                disabled={isSpinning || isBlocked}
                className={`px-5 py-3 rounded-full font-bold tracking-wider text-xs border transition-all duration-300 ${
                  isSpinning || isBlocked
                    ? 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed shadow-none'
                    : 'bg-darkBg border-neonGold/40 text-neonGold hover:border-neonGold hover:bg-neonGold/10 hover:shadow-[0_0_10px_rgba(212, 175, 55, 0.2)] active:opacity-70'
                }`}
              >
                🔀 BARAJAR
              </button>
              <button
                onClick={spin}
                disabled={isSpinning || isBlocked}
                className={`px-8 py-3 rounded-full font-black tracking-wider text-xs transition-all duration-300 ${
                  isSpinning || isBlocked
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-neonGold to-amber-500 text-darkBg shadow-neonGold hover:scale-105 active:scale-95'
                }`}
              >
                {isSpinning ? 'GIRANDO...' : 'TIRAR RULETA'}
              </button>
            </div>
          ) : (
            <div className="text-center animate-bounce mb-2">
              <span className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">Premio ganado</span>
              <p className="text-2xl font-black text-neonGold tracking-wide mt-1 drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]">
                {winner}
              </p>
            </div>
          )}

          {!isSpinning && (
            <button
              onClick={onClose}
              className="mt-5 text-gray-500 hover:text-white font-mono text-[10px] tracking-wider uppercase transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChampionsRouletteModal;
