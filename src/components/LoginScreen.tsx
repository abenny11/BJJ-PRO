import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, KeyRound } from 'lucide-react';

export function LoginScreen() {
  const { loginAsCoach, loginAsAthlete } = useAuth();
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAthleteLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;
    
    setLoading(true);
    setError('');
    try {
      await loginAsAthlete(accessCode.trim());
    } catch (err: any) {
      setError(err.message || 'Erro ao acessar. Verifique o código.');
    } finally {
      setLoading(false);
    }
  };

  const handleCoachLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await loginAsCoach();
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login com Google.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-red-700 tracking-tighter uppercase italic mb-2">BJJ Performance</h1>
          <p className="text-slate-500">Plataforma de Gestão de Treinamento</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-8">
          {/* Athlete Login */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <KeyRound size={20} className="text-red-600" />
              Sou Atleta
            </h2>
            <form onSubmit={handleAthleteLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Código de Acesso</label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Ex: ABC12345"
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-lg font-mono font-bold focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none uppercase"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !accessCode.trim()}
                className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Acessando...' : 'Acessar Meu Treino'}
              </button>
            </form>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-400">ou</span>
            </div>
          </div>

          {/* Coach Login */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <LogIn size={20} className="text-slate-600" />
              Sou Treinador
            </h2>
            <button
              onClick={handleCoachLogin}
              disabled={loading}
              className="w-full bg-white border-2 border-slate-200 text-slate-700 font-bold py-3 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Entrar com Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
