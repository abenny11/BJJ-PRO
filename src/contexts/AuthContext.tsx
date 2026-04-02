import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { handleSupabaseError, OperationType } from '../lib/supabaseError';

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
    // Restore athlete session from localStorage on mount
    const storedAthleteId = localStorage.getItem('athleteId');
    if (storedAthleteId) {
      setRole('athlete');
      setAthleteId(storedAthleteId);
    }

    // Check existing Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setRole('coach');
        ensureCoachProfile(session.user);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setRole('coach');
        await ensureCoachProfile(session.user);
      } else {
        setUser(null);
        const stored = localStorage.getItem('athleteId');
        if (!stored) {
          setRole(null);
          setAthleteId(null);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const ensureCoachProfile = async (supabaseUser: any) => {
    try {
      const { error } = await supabase.from('coaches').upsert({
        uid: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || 'Coach',
      }, { onConflict: 'uid' });
      if (error) {
        handleSupabaseError(error, OperationType.CREATE, `coaches/${supabaseUser.id}`);
      }
    } catch (error) {
      console.error('Error upserting coach profile:', error);
    }
  };

  const loginAsCoach = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) throw error;
  };

  const loginAsAthlete = async (accessCode: string) => {
    const code = accessCode.trim().toUpperCase();
    if (!code) throw new Error('Por favor, insira o código de acesso.');

    try {
      const { data, error } = await supabase
        .from('athletes')
        .select('access_code, athlete_uid')
        .eq('access_code', code)
        .single();

      if (error || !data) {
        throw new Error('Código de acesso inválido. Verifique se digitou corretamente.');
      }

      localStorage.setItem('athleteId', code);
      setRole('athlete');
      setAthleteId(code);
    } catch (error: any) {
      console.error(error);
      throw error;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('athleteId');
    setUser(null);
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
