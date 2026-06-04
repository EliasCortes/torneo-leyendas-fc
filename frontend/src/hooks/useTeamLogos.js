import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// Global cache to avoid refetching on every component mount
let globalLogosMap = null;

export const useTeamLogos = () => {
  const [logosMap, setLogosMap] = useState(globalLogosMap || {});
  const [loading, setLoading] = useState(!globalLogosMap);

  useEffect(() => {
    if (globalLogosMap) {
      setLoading(false);
      return;
    }

    const fetchLogos = async () => {
      try {
        const { data, error } = await supabase.from('equipos').select('nombre, logoUrl');
        if (error) throw error;
        
        if (data) {
          const map = {};
          data.forEach(t => {
            map[t.nombre] = t.logoUrl;
          });
          globalLogosMap = map;
          setLogosMap(map);
        }
      } catch (err) {
        console.error('Error fetching logos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogos();
  }, []);

  const getLogoUrl = (teamName) => logosMap[teamName] || '';

  return { logosMap, getLogoUrl, loading };
};
