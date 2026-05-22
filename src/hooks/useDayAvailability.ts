import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface DayAvailability {
  friday: boolean;
  saturday: boolean;
}

const STORAGE_KEY = 'wbs_day_availability';

// Leer desde localStorage como fallback
const readLocal = (): DayAvailability => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { friday: true, saturday: true }; // Por defecto ambos activos
    const parsed = JSON.parse(raw);
    return {
      friday: parsed.friday !== false, // true por defecto
      saturday: parsed.saturday !== false // true por defecto
    };
  } catch {
    return { friday: true, saturday: true };
  }
};

// Escribir en localStorage como fallback
const writeLocal = (availability: DayAvailability) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(availability));
  } catch {}
};

export function useDayAvailability() {
  const [availability, setAvailability] = useState<DayAvailability>({ friday: true, saturday: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar desde Supabase (o localStorage como fallback)
  const loadAvailability = async () => {
    try {
      setLoading(true);
      // Intentar cargar desde Supabase
      const { data, error: supabaseError } = await supabase
        .from('day_availability')
        .select('friday, saturday')
        .maybeSingle();

      if (supabaseError) {
        const isPermissionOrEmpty =
          supabaseError.code === 'PGRST116' ||
          (supabaseError as { status?: number }).status === 401 ||
          (supabaseError as { status?: number }).status === 406;
        if (!isPermissionOrEmpty) throw supabaseError;
      }

      if (data) {
        const loaded: DayAvailability = {
          friday: data.friday !== false,
          saturday: data.saturday !== false
        };
        setAvailability(loaded);
        writeLocal(loaded);
      } else {
        const local = readLocal();
        setAvailability(local);
      }
      setError(null);
    } catch (err) {
      console.error('Error loading day availability:', err);
      // Fallback a localStorage
      const local = readLocal();
      setAvailability(local);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailability();
  }, []);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel('day_availability_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'day_availability'
      }, () => {
        loadAvailability();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateDayAvailability = async (day: 'friday' | 'saturday', enabled: boolean) => {
    const newAvailability = { ...availability, [day]: enabled };
    
    // Actualizar estado local inmediatamente
    setAvailability(newAvailability);
    writeLocal(newAvailability);

    try {
      // Intentar actualizar en Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: existingData } = await supabase
        .from('day_availability')
        .select('*')
        .maybeSingle();

      if (existingData) {
        // Actualizar registro existente
        const { error } = await supabase
          .from('day_availability')
          .update({ [day]: enabled, updated_at: new Date().toISOString() })
          .eq('id', existingData.id);

        if (error) throw error;
      } else {
        // Crear nuevo registro (primera vez)
        const { error } = await supabase
          .from('day_availability')
          .insert([{ friday: newAvailability.friday, saturday: newAvailability.saturday }]);

        if (error) {
          // Si falla (por ejemplo, si ya existe un registro), intentar actualizar el primero
          const { data: allData } = await supabase
            .from('day_availability')
            .select('*')
            .limit(1)
            .single();
          
          if (allData) {
            const { error: updateError } = await supabase
              .from('day_availability')
              .update({ [day]: enabled, updated_at: new Date().toISOString() })
              .eq('id', allData.id);
            
            if (updateError) throw updateError;
          } else {
            throw error;
          }
        }
      }
      setError(null);
    } catch (err) {
      console.error('Error updating day availability:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar disponibilidad');
      // Revertir a estado anterior en caso de error
      setAvailability(availability);
      writeLocal(availability);
      throw err;
    }
  };

  return {
    availability,
    loading,
    error,
    updateDayAvailability,
    refresh: loadAvailability
  };
}

