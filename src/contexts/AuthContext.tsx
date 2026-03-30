import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInAnonymously, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';

type Role = 'coach' | 'athlete' | null;

interface AuthContextType {
  user: any;
  role: Role;
  athleteId: string | null;
  loading: boolean;
  loginAsCoach: () => Promise<void>;
  loginAsAthlete: (accessCode: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<Role>(null);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Determine role
        if (!currentUser.isAnonymous) {
          // Coach
          setRole('coach');
          // Ensure coach doc exists
          const coachRef = doc(db, 'coaches', currentUser.uid);
          try {
            const coachSnap = await getDoc(coachRef);
            if (!coachSnap.exists()) {
              await setDoc(coachRef, {
                uid: currentUser.uid,
                email: currentUser.email,
                name: currentUser.displayName || 'Coach',
                createdAt: new Date().toISOString()
              });
            }
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, `coaches/${currentUser.uid}`);
          }
        } else {
          // Athlete (anonymous)
          const storedAthleteId = localStorage.getItem('athleteId');
          if (storedAthleteId) {
            setRole('athlete');
            setAthleteId(storedAthleteId);
          }
        }
      } else {
        setUser(null);
        // Check if we have a stored athlete session even without Firebase Auth
        const storedAthleteId = localStorage.getItem('athleteId');
        if (storedAthleteId) {
          setRole('athlete');
          setAthleteId(storedAthleteId);
        } else {
          setRole(null);
          setAthleteId(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginAsCoach = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginAsAthlete = async (accessCode: string) => {
    const code = accessCode.trim().toUpperCase();
    if (!code) throw new Error('Por favor, insira o código de acesso.');

    try {
      // Try to sign in anonymously, but don't block if it's restricted
      let uid: string | null = null;
      try {
        const userCredential = await signInAnonymously(auth);
        uid = userCredential.user.uid;
      } catch (authError: any) {
        console.warn('Anonymous auth restricted, proceeding without auth:', authError.message);
        // If it's specifically the restricted operation error, we continue
        if (authError.code !== 'auth/admin-restricted-operation') {
          throw authError;
        }
      }

      // Try to get the athlete doc
      const athleteRef = doc(db, 'athletes', code);
      let athleteSnap;
      try {
        athleteSnap = await getDoc(athleteRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `athletes/${code}`);
        return;
      }

      if (athleteSnap.exists()) {
        const data = athleteSnap.data();
        
        // Only try to link UID if we have one
        if (uid) {
          if (!data.athleteUid) {
            // Claim the profile
            try {
              await updateDoc(athleteRef, { athleteUid: uid });
            } catch (error) {
              handleFirestoreError(error, OperationType.UPDATE, `athletes/${code}`);
            }
          } else if (data.athleteUid !== uid) {
            throw new Error('Este código já está vinculado a outro dispositivo. Peça ao seu treinador para redefinir seu acesso.');
          }
        }
        
        localStorage.setItem('athleteId', code);
        setRole('athlete');
        setAthleteId(code);
      } else {
        if (auth.currentUser?.isAnonymous) {
          await signOut(auth);
        }
        throw new Error('Código de acesso inválido. Verifique se digitou corretamente.');
      }
    } catch (error: any) {
      console.error(error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem('athleteId');
    setRole(null);
    setAthleteId(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, athleteId, loading, loginAsCoach, loginAsAthlete, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
