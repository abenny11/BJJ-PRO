import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { DEFAULT_EXERCISES, Exercise } from '../lib/exercises';
import { useAuth } from './AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';

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
    let unsubscribe: () => void = () => {};

    const startFetching = async () => {
      let coachId: string | null = null;

      if (role === 'coach' && user) {
        coachId = user.uid;
      } else if (role === 'athlete' && athleteId) {
        // Fetch athlete doc to get coachId
        try {
          const athleteRef = doc(db, 'athletes', athleteId);
          const athleteSnap = await getDoc(athleteRef);
          if (athleteSnap.exists()) {
            coachId = athleteSnap.data().coachId;
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `athletes/${athleteId}`);
        }
      }

      if (coachId) {
        const q = query(collection(db, 'coaches', coachId, 'exercises'));
        unsubscribe = onSnapshot(q, (snapshot) => {
          const customExercises = snapshot.docs.map(doc => doc.data() as Exercise);
          
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
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, `coaches/${coachId}/exercises`);
          setExercises(DEFAULT_EXERCISES);
          setLoading(false);
        });
      } else {
        setExercises(DEFAULT_EXERCISES);
        setLoading(false);
      }
    };

    startFetching();

    return () => unsubscribe();
  }, [user, role, athleteId]);

  return (
    <ExerciseContext.Provider value={{ exercises, loading }}>
      {children}
    </ExerciseContext.Provider>
  );
};

export const useExercises = () => useContext(ExerciseContext);
