import React, { useRef, useEffect, useState } from 'react';
import sounds from '../utils/audio';
import LogoShield from '../components/LogoShield';

const RouletteWheel = ({ options = [], onFinished, buttonText = 'TIRAR RULETA', disabled = false, onSpinStart }) => {
  const canvasRef = useRef(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [localOptions, setLocalOptions] = useState(options || []);
  const [isShuffling, setIsShuffling] = useState(false);
  const animationFrameRef = useRef(null);
  
  // Audio tick trigger tracker
  const lastSegmentRef = useRef(-1);

  // Wheel physics state stored in refs for animation loop
  const rotationAngle = useRef(0);
  const angularVelocity = useRef(0);
  const isSpinningRef = useRef(false);

  useEffect(() => {
    setLocalOptions(options || []);
  }, [options]);

  // Safe check for options
  const safeOptions = localOptions;

  // Color generator
  const getColors = (idx, total) => {
    // Elegant neon color palettes
    const palette = [
      '#0e1624', '#0d2230', '#1c172b', '#0b2a33', '#1e1424',
      '#102a3a', '#221935', '#0f3240', '#25162a', '#14313b'
    ];
    
    // Choose segment color
    const fill = palette[idx % palette.length];
    
    // Border color based on index
    const borderColors = ['#00f0ff', '#ffd700', '#c0c0c0', '#cd7f32', '#ff007f'];
    const border = borderColors[idx % borderColors.length];
    
    return { fill, border };
  };

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

    const arcSize = (2 * Math.PI) / safeOptions.length;

    // Draw slices
    safeOptions.forEach((option, idx) => {
      const startAngle = rotationAngle.current + idx * arcSize;
      const endAngle = startAngle + arcSize;

      const { fill, border } = getColors(idx, safeOptions.length);

      // Draw segment slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#1c2331';
      ctx.stroke();

      // Draw segment outer border glow line
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.strokeStyle = border;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      // Position text in center of slice
      ctx.rotate(startAngle + arcSize / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      
      // Shorten option text if too long
      let text = typeof option === 'object' ? option.name : option;
      if (text.length > 15) text = text.substring(0, 13) + '...';
      
      ctx.fillStyle = '#f3f4f6';
      // Adjust font size based on number of segments
      const fontSize = safeOptions.length > 25 ? '8px' : safeOptions.length > 15 ? '10px' : '12px';
      ctx.font = `bold ${fontSize} 'Outfit', sans-serif`;
      
      ctx.fillText(text, radius - 20, 0);
      ctx.restore();
    });

    // Draw central node base
    ctx.beginPath();
    ctx.arc(centerX, centerY, 35, 0, 2 * Math.PI);
    ctx.fillStyle = '#05070a';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#00f0ff';
    ctx.stroke();

    // Draw top pointer (indicator)
    ctx.beginPath();
    ctx.moveTo(centerX - 12, centerY - radius - 10);
    ctx.lineTo(centerX + 12, centerY - radius - 10);
    ctx.lineTo(centerX, centerY - radius + 15);
    ctx.closePath();
    ctx.fillStyle = '#ff007f';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  };

  const spin = () => {
    if (isSpinningRef.current || disabled) return;
    
    if (onSpinStart) {
      onSpinStart();
    }
    
    sounds.playSwoosh();
    setIsSpinning(true);
    isSpinningRef.current = true;
    setWinner(null);

    // Generate random physics variables
    // Target spins: between 4 and 8 full rotations
    const spins = 4 + Math.random() * 4;
    // Set initial speed
    angularVelocity.current = 0.25 + Math.random() * 0.15;
    
    // Calculate total distance to slide
    // friction will decelerate velocity in each frame
    const friction = 0.985; // Deceleration rate
    
    lastSegmentRef.current = -1;

    const animate = () => {
      if (angularVelocity.current > 0.001) {
        // Rotate
        rotationAngle.current += angularVelocity.current;
        angularVelocity.current *= friction; // Apply friction

        // Calculate which segment is currently under the pointer
        // Pointer is at angle 3/2 * PI (top)
        const arcSize = (2 * Math.PI) / safeOptions.length;
        // Normalize rotation angle between 0 and 2*PI
        const normalizedRotation = (2 * Math.PI - (rotationAngle.current % (2 * Math.PI))) % (2 * Math.PI);
        // The pointer is at 1.5 * PI (top pointer position)
        // Angle offset calculation to map current pointer
        const pointerAngle = (1.5 * Math.PI + normalizedRotation) % (2 * Math.PI);
        const currentSegment = Math.floor(pointerAngle / arcSize) % safeOptions.length;

        // Play tick sound when crossing segment boundaries
        if (currentSegment !== lastSegmentRef.current) {
          sounds.playTick();
          lastSegmentRef.current = currentSegment;
        }

        drawWheel();
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Stopped!
        setIsSpinning(false);
        isSpinningRef.current = false;
        
        // Calculate exact final winner
        const arcSize = (2 * Math.PI) / safeOptions.length;
        const normalizedRotation = (2 * Math.PI - (rotationAngle.current % (2 * Math.PI))) % (2 * Math.PI);
        const pointerAngle = (1.5 * Math.PI + normalizedRotation) % (2 * Math.PI);
        const winnerIndex = Math.floor(pointerAngle / arcSize) % safeOptions.length;
        
        const finalWinner = safeOptions[winnerIndex];
        setWinner(finalWinner);
        sounds.playSuccess();
        
        if (onFinished) {
          onFinished(finalWinner);
        }
      }
    };

    animate();
  };

  useEffect(() => {
    drawWheel();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [localOptions]);

  const handleShuffle = () => {
    if (isSpinning || disabled || localOptions.length <= 1) return;
    sounds.playTick();
    setIsShuffling(true);

    // Shuffle the array of options
    setLocalOptions(prev => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });

    // Animate a spring-like shake/vibration on the wheel's angle
    const initialAngle = rotationAngle.current;
    // Shake angle back and forth (about 25 degrees)
    const twistAmount = 0.45;
    const duration = 400; // 400ms duration
    let startTime = null;

    const animateShake = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Decaying sine wave for spring effect:
      // Sin(progress * PI * 4) shakes back and forth twice
      const decay = Math.pow(1 - progress, 2);
      const angleOffset = Math.sin(progress * Math.PI * 4) * decay * twistAmount;

      rotationAngle.current = initialAngle + angleOffset;
      drawWheel();

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animateShake);
      } else {
        rotationAngle.current = initialAngle; // Ensure it returns exactly to original angle
        drawWheel();
        setIsShuffling(false);
      }
    };

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(animateShake);
  };

  if (!localOptions || localOptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-panelBg border border-panelBorder rounded-2xl shadow-xl max-w-md w-full min-h-[400px]">
        <div className="w-10 h-10 border-4 border-neonCyan border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-gray-400 font-mono tracking-wider animate-pulse uppercase">
          Cargando opciones de ruleta...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-6 bg-panelBg border border-panelBorder rounded-2xl shadow-xl max-w-md w-full">
      <div className="relative w-80 h-80 flex items-center justify-center">
        {/* Glow effect surrounding the wheel */}
        <div className="absolute inset-2 rounded-full border border-neonCyan/30 blur-md animate-pulse pointer-events-none" />
        
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className={`rounded-full shadow-2xl bg-darkBg transition-shadow duration-300 ${
            isShuffling ? 'shadow-[0_0_25px_rgba(0,240,255,0.5)] animate-pulse' : ''
          }`}
        />

        {/* DOM Overlay for the central logo */}
        <div 
           className="absolute z-10 flex items-center justify-center rounded-full"
           style={{
             top: '50%',
             left: '50%',
             transform: 'translate(-50%, -50%)',
             width: '5.5rem',
             height: '5.5rem',
             background: 'radial-gradient(circle at center, #0b1324 0%, #060b14 100%)',
             border: '1px solid rgba(0, 243, 255, 0.3)',
             boxShadow: 'inset 0 0 18px rgba(0, 243, 255, 0.15), 0 0 30px rgba(0, 243, 255, 0.12), 0 0 60px rgba(0,0,0,0.6)',
             overflow: 'hidden',
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

      <div className="flex gap-4 mt-8 w-full justify-center">
        <button
          onClick={handleShuffle}
          disabled={isSpinning || disabled || localOptions.length <= 1}
          className={`px-5 py-3 rounded-full font-bold tracking-wider text-xs border transition-all duration-300 ${
            isSpinning || disabled || localOptions.length <= 1
              ? 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed shadow-none'
              : 'bg-darkBg border-neonCyan/40 text-neonCyan hover:border-neonCyan hover:bg-neonCyan/10 hover:shadow-[0_0_10px_rgba(0,240,255,0.2)]'
          }`}
        >
          🔀 BARAJAR
        </button>
        <button
          onClick={spin}
          disabled={isSpinning || disabled}
          className={`px-8 py-3 rounded-full font-black tracking-wider text-xs transition-all duration-300 ${
            isSpinning || disabled
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-neonCyan to-cyan-500 text-darkBg shadow-neonCyan hover:scale-105 active:scale-95'
          }`}
        >
          {isSpinning ? 'GIRANDO...' : buttonText}
        </button>
      </div>

      {winner && (
        <div className="mt-6 text-center animate-bounce">
          <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">Resultado obtenido</p>
          <p className="text-xl font-extrabold text-neonCyan tracking-wide mt-1 drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]">
            {typeof winner === 'object' ? winner.name : winner}
          </p>
        </div>
      )}
    </div>
  );
};

export default RouletteWheel;
