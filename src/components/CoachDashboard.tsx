import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Users, Plus, LogOut, Copy, Trash2, ChevronRight, Dumbbell, RefreshCw } from 'lucide-react';
import { INITIAL_STATE } from '../App';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { ExerciseManagement } from './ExerciseManagement';

export function CoachDashboard({ onSelectAthlete }: { onSelectAthlete: (id: string) => void }) {
  const { user, logout } = useAuth();
  const [athletes, setAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAthleteName, setNewAthleteName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'athletes' | 'exercises'>('athletes');

  useEffect(() => {
    fetchAthletes();
  }, [user]);

  const fetchAthletes = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'athletes'), where('coachId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAthletes(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'athletes');
    } finally {
      setLoading(false);
    }
  };

  const generateAccessCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleAddAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAthleteName.trim() || !user) return;

    setIsAdding(true);
    const accessCode = generateAccessCode();
    try {
      const newAthlete = {
        coachId: user.uid,
        name: newAthleteName.trim(),
        accessCode,
        createdAt: new Date().toISOString(),
        athleteUid: null,
        userData: JSON.stringify({
          ...INITIAL_STATE,
          name: newAthleteName.trim()
        })
      };

      await setDoc(doc(db, 'athletes', accessCode), newAthlete);
      setNewAthleteName('');
      fetchAthletes();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `athletes/${accessCode}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleResetAccess = async (athlete: any) => {
    if (!window.confirm(`Deseja redefinir o acesso de ${athlete.name}? Isso permitirá que ele vincule um novo dispositivo.`)) return;
    try {
      await updateDoc(doc(db, 'athletes', athlete.id), { athleteUid: null });
      fetchAthletes();
      alert('Acesso redefinido com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `athletes/${athlete.id}`);
    }
  };

  const handleDeleteAthlete = async (accessCode: string) => {
    if (!window.confirm('Tem certeza que deseja remover este atleta? Esta ação não pode ser desfeita.')) return;
    try {
      await deleteDoc(doc(db, 'athletes', accessCode));
      fetchAthletes();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `athletes/${accessCode}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Código copiado!');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-red-700 tracking-tighter uppercase italic">Painel do Treinador</h1>
            <p className="text-slate-500 font-medium">Olá, {user?.displayName}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 mr-4">
              <button 
                onClick={() => setActiveTab('athletes')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'athletes' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Users size={14} />
                Atletas
              </button>
              <button 
                onClick={() => setActiveTab('exercises')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'exercises' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Dumbbell size={14} />
                Exercícios
              </button>
            </div>
            <button 
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-bold text-sm"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </header>

        {activeTab === 'athletes' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Add Athlete Form */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-8">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Users size={20} className="text-red-600" />
                  Novo Atleta
                </h2>
                <form onSubmit={handleAddAthlete} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nome do Atleta</label>
                    <input
                      type="text"
                      value={newAthleteName}
                      onChange={(e) => setNewAthleteName(e.target.value)}
                      placeholder="Ex: João Silva"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none"
                      disabled={isAdding}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isAdding || !newAthleteName.trim()}
                    className="w-full bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    {isAdding ? 'Adicionando...' : 'Adicionar Atleta'}
                  </button>
                </form>
              </div>
            </div>

            {/* Athletes List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800">Meus Atletas</h2>
                </div>
                
                {loading ? (
                  <div className="p-8 text-center text-slate-500">Carregando atletas...</div>
                ) : athletes.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <p>Nenhum atleta cadastrado ainda.</p>
                    <p className="text-sm mt-2">Adicione seu primeiro atleta usando o formulário ao lado.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {athletes.map(athlete => (
                      <li key={athlete.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-slate-800">{athlete.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">
                              Código: {athlete.accessCode}
                            </span>
                            <button 
                              onClick={() => copyToClipboard(athlete.accessCode)}
                              className="text-slate-400 hover:text-red-600 transition-colors"
                              title="Copiar Código"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                          {athlete.athleteUid ? (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] uppercase tracking-wider font-bold text-green-600 block">Ativo (Vinculado)</span>
                              <button 
                                onClick={() => handleResetAccess(athlete)}
                                className="text-slate-400 hover:text-red-600 transition-colors flex items-center gap-1"
                                title="Redefinir Acesso"
                              >
                                <RefreshCw size={10} />
                                <span className="text-[8px] uppercase">Redefinir</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-amber-600 mt-2 block">Aguardando Acesso</span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => onSelectAthlete(athlete.id)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-red-50 text-red-700 font-bold text-sm rounded-lg hover:bg-red-100 transition-colors"
                          >
                            Ver Treino
                            <ChevronRight size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteAthlete(athlete.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remover Atleta"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            <ExerciseManagement coachId={user?.uid || ''} />
          </div>
        )}
      </div>
    </div>
  );
}
