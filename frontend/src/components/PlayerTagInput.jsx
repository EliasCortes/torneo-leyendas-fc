import React, { useState, useRef, useEffect } from 'react';

const PlayerTagInput = ({ selectedPlayers, onChange, suggestions }) => {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // Filter suggestions based on input value and exclude already selected
  const filteredSuggestions = suggestions.filter(
    (player) =>
      player.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedPlayers.includes(player)
  ).slice(0, 5); // Limit to 5 suggestions

  const handleAddPlayer = (playerName) => {
    const trimmed = playerName.trim();
    if (trimmed && !selectedPlayers.includes(trimmed)) {
      onChange([...selectedPlayers, trimmed]);
    }
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleRemovePlayer = (playerToRemove) => {
    onChange(selectedPlayers.filter((p) => p !== playerToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If there's an exact match or user wants to add manually
      if (inputValue.trim()) {
        handleAddPlayer(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedPlayers.length > 0) {
      // Remove last tag if backspace pressed on empty input
      handleRemovePlayer(selectedPlayers[selectedPlayers.length - 1]);
    }
  };

  return (
    <div className="relative w-full">
      <div 
        className={`flex flex-wrap gap-2 p-2 bg-darkBg border rounded-lg transition-all ${
          isFocused ? 'border-neonCyan shadow-[0_0_10px_rgba(0,243,255,0.3)]' : 'border-panelBorder'
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {selectedPlayers.map((player, idx) => (
          <span 
            key={idx} 
            className="flex items-center gap-1.5 px-2.5 py-1 bg-panelBg border border-neonCyan/40 text-white text-xs font-mono rounded-md shadow-sm"
          >
            {player}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemovePlayer(player);
              }}
              className="text-gray-400 hover:text-red-400 focus:outline-none transition-colors"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="flex-1 bg-transparent min-w-[120px] text-sm text-white focus:outline-none font-semibold"
          placeholder={selectedPlayers.length === 0 ? "Buscar o escribir jugador..." : ""}
        />
      </div>

      {/* Autocomplete Dropdown */}
      {isFocused && inputValue.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-panelBg border border-panelBorder rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in">
          {filteredSuggestions.length > 0 ? (
            filteredSuggestions.map((player, idx) => (
              <button
                key={idx}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-white/10 hover:text-white transition-colors font-mono font-bold"
                onClick={() => handleAddPlayer(player)}
              >
                {player}
              </button>
            ))
          ) : (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              className="w-full text-left px-4 py-2 text-sm text-neonCyan hover:bg-neonCyan/10 transition-colors font-mono font-bold flex justify-between"
              onClick={() => handleAddPlayer(inputValue)}
            >
              <span>{inputValue}</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest bg-darkBg px-2 py-0.5 rounded border border-panelBorder">
                Añadir Jugador Manual
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerTagInput;
