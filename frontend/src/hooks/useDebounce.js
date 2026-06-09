import { useState, useEffect } from 'react';

/**
 * Custom hook para hacer debounce a un valor.
 * Muy útil para campos de búsqueda, evita disparar peticiones
 * pesadas a la base de datos hasta que el usuario deje de escribir.
 *
 * @param {any} value - El valor a observar (ej. texto del input).
 * @param {number} delay - El tiempo de espera en milisegundos.
 * @returns {any} El valor debounced.
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Configuramos el temporizador
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpiamos el temporizador si el valor cambia antes de que se cumpla el delay
    // o si el componente se desmonta
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
