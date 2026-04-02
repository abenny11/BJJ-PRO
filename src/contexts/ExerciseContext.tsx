import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_EXERCISES, Exercise } from '../lib/exercises';
import { useAuth } from './AuthContext';
import { handleSupabaseError, OperationType } from '../lib/supabaseError';

interface ExerciseContextType {
  exercises: Exercise[];
  loading: boolean;
}

const ExerciseContext = createContext<ExerciseContextType>({
  exercises: DEFAULT_EXERCISES,
  loading: true
});

export const ExerciseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, athleteId } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>(DEFAULT_EXERCISES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const fetchExercises = async (coachId: string) => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('coach_id', coachId);

      if (error) {
        handleSupabaseError(error, OperationType.LIST, `exercises?coach_id=${coachId}`);
        setExercises(DEFAULT_EXERCISES);
      } else {
        const customExercises = (data || []) as Exercise[];
        const merged = [...DEFAULT_EXERCISES];
        customExercises.forEach(custom => {
          const index = merged.findIndex(e => e.id === custom.id);
          if (index !== -1) {
            merged[index] = custom;
          } else {
            merged.push(custom);
          }
        });
        setExercises(merged);
      }
      setLoading(false);
    };

    const startFetching = async () => {
      let coachId: string | null = null;

      if (role === 'coach' && user) {
        coachId = user.id;
      } else if (role === 'athlete' && athleteId) {
        const { data, error } = await supabase
          .from('athletes')
          .select('coach_id')
          .eq('access_code', athleteId)
          .single();

        if (error) {
          handleSupabaseError(error, OperationType.GET, `athletes?access_code=${athleteId}`);
        } else {
          coachId = data?.coach_id || null;
        }
      }

      if (coachId) {
        await fetchExercises(coachId);

        // Subscribe to real-time updates via Supabase Realtime
        channel = supabase
          .channel(`exercises:coach_id=eq.${coachId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'exercises', filter: `coach_id=eq.${coachId}` },
            () => { fetchExercises(coachId!); }
          )
          .subscribe();
      } else {
        setExercises(DEFAULT_EXERCISES);
        setLoading(false);
      }
    };

    startFetching();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, role, athleteId]);

  return (
    <ExerciseContext.Provider value={{ exercises, loading }}>
      {children}
    </ExerciseContext.Provider>
  );
};

export const useExercises = () => useContext(ExerciseContext);
