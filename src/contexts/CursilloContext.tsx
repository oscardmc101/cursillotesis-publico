import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Cursillo {
  id_cursillo: string;
  nombre: string;
}

interface CursilloContextType {
  cursillos: Cursillo[];
  cursilloActivo: Cursillo | null;
  setCursilloActivo: (cursillo: Cursillo) => void;
  loading: boolean;
  idCursilloActivo: string | null;
}

const STORAGE_KEY = 'cursillo_activo_id';

const CursilloContext = createContext<CursilloContextType | undefined>(undefined);

export const CursilloProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cursillos, setCursillos] = useState<Cursillo[]>([]);
  const [cursilloActivo, setCursilloActivoState] = useState<Cursillo | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch available cursillos from the DB
  const fetchCursillos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cursillos')
        .select('id_cursillo, nombre')
        .order('nombre');

      if (error) {
        console.error('Error fetching cursillos:', error);
        return;
      }

      if (data && data.length > 0) {
        setCursillos(data);

        // Try to restore the previously selected cursillo from localStorage
        const savedId = localStorage.getItem(STORAGE_KEY);
        const savedCursillo = savedId ? data.find(c => c.id_cursillo === savedId) : null;

        if (savedCursillo) {
          setCursilloActivoState(savedCursillo);
        } else {
          // Default: select "Cursillo Prueba" if exists, otherwise first
          const defaultCursillo = data.find(c => c.nombre === 'Cursillo Prueba') || data[0];
          setCursilloActivoState(defaultCursillo);
          localStorage.setItem(STORAGE_KEY, defaultCursillo.id_cursillo);
        }
      }
    } catch (err) {
      console.error('Error in fetchCursillos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCursillos();
  }, [fetchCursillos]);

  const setCursilloActivo = useCallback((cursillo: Cursillo) => {
    setCursilloActivoState(cursillo);
    localStorage.setItem(STORAGE_KEY, cursillo.id_cursillo);
  }, []);

  const idCursilloActivo = cursilloActivo?.id_cursillo ?? null;

  return (
    <CursilloContext.Provider value={{
      cursillos,
      cursilloActivo,
      setCursilloActivo,
      loading,
      idCursilloActivo,
    }}>
      {children}
    </CursilloContext.Provider>
  );
};

export const useCursillo = () => {
  const context = useContext(CursilloContext);
  if (context === undefined) {
    throw new Error('useCursillo must be used within a CursilloProvider');
  }
  return context;
};
