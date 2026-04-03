/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  User, 
  Activity, 
  Utensils, 
  LayoutDashboard, 
  ChevronRight, 
  ChevronLeft,
  Plus, 
  Save,
  TrendingUp,
  TrendingDown,
  Zap,
  Scale,
  Timer,
  CheckCircle2,
  Check,
  Info,
  HelpCircle,
  ExternalLink,
  LogOut,
  Calendar,
  Trash2,
  Edit2,
  X,
  Users
} from 'lucide-react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts';
import { cn } from './lib/utils';
import { UserData, Gender, BodyMetrics, StrengthTest, StrengthTestSeries, AerobicTest, AerobicLog, Cycle, RetestStrengthTest, Meal, DayOfWeek, TrainingType, TrainingSession, DailyNutrition, BodyCompRecord, BodyComposition } from './types';
import { calculateBodyFat, estimate1RM, calculateVO2Max, calculateVVO2Max, getIdealWeightCategory, suggestBJJStyle, getBJJWeightCategory, getBJJTechnicalFocus } from './lib/calculations';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { ExerciseProvider, useExercises } from './contexts/ExerciseContext';
import { LoginScreen } from './components/LoginScreen';
import { CoachDashboard } from './components/CoachDashboard';
import { Exercise } from './lib/exercises';
import { supabase } from './lib/supabase';
import { handleSupabaseError, OperationType } from './lib/supabaseError';

export const INITIAL_STATE: UserData = {
  name: '',
  gender: 'Masculino',
  belt: 'Branca',
  stylePreference: 'Híbrido',
  strongPositions: [],
  path: 'Lifestyle',
  pathData: {
    rollsCount: 5,
    rollDuration: 5
  },
  currentCycle: {
    id: 'cycle-1',
    startDate: new Date().toISOString().split('T')[0],
    initialMetrics: {
      age: 25,
      height: 175,
      weight: 80,
      neck: 40,
      abdomen: 85,
      armLength: 0,
      legLength: 0
    },
    initialStrengthTests: {},
    selectedExercises: {
      'Upper Push': 'db_incline_bench',
      'Upper Pull': 'lat_pull_down',
      'Lower Body': 'lunge'
    },
    weeklyLogs: {
      1: { strength: {}, aerobic: {}, presence: {} },
      2: { strength: {}, aerobic: {}, presence: {} },
      3: { strength: {}, aerobic: {}, presence: {} },
      4: { strength: {}, aerobic: {}, presence: {} }
    }
  },
  history: [],
  bodyCompHistory: [],
  nutritionLog: {},
  trainingSchedule: {
    'Segunda': [],
    'Terça': [],
    'Quarta': [],
    'Quinta': [],
    'Sexta': [],
    'Sábado': [],
    'Domingo': []
  }
};

export interface Food {
  id: string;
  name: string;
  unit: string;
  calories: number; // per 100g or per unit
  protein: number;
  carbs: number;
  fat: number;
  isPerUnit?: boolean;
}

const FOOD_DATABASE: Food[] = [
  { id: 'pao_frances', name: 'Pão Francês', unit: 'unidade', calories: 135, protein: 4.5, carbs: 28, fat: 1, isPerUnit: true },
  { id: 'banana', name: 'Banana Nanica', unit: 'unidade', calories: 90, protein: 1, carbs: 23, fat: 0.3, isPerUnit: true },
  { id: 'mel', name: 'Mel', unit: 'colher de sopa', calories: 60, protein: 0, carbs: 17, fat: 0, isPerUnit: true },
  { id: 'ovo', name: 'Ovo Cozido', unit: 'unidade', calories: 70, protein: 6, carbs: 0.5, fat: 5, isPerUnit: true },
  { id: 'frango', name: 'Frango Grelhado', unit: 'g', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { id: 'arroz', name: 'Arroz Branco Cozido', unit: 'g', calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { id: 'feijao', name: 'Feijão Carioca Cozido', unit: 'g', calories: 76, protein: 4.8, carbs: 14, fat: 0.5 },
  { id: 'macarrao', name: 'Macarrão Cozido', unit: 'g', calories: 158, protein: 5.8, carbs: 31, fat: 0.9 },
  { id: 'whey', name: 'Whey Protein', unit: 'scoop (30g)', calories: 120, protein: 24, carbs: 3, fat: 1.5, isPerUnit: true },
  { id: 'maca', name: 'Maçã', unit: 'unidade', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, isPerUnit: true },
  { id: 'aveia', name: 'Aveia em Flocos', unit: 'g', calories: 389, protein: 16.9, carbs: 66, fat: 6.9 },
  { id: 'pasta_amendoim', name: 'Pasta de Amendoim', unit: 'g', calories: 588, protein: 25, carbs: 20, fat: 50 },
  { id: 'batata_doce', name: 'Batata Doce Cozida', unit: 'g', calories: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  { id: 'patinho', name: 'Carne Moída (Patinho)', unit: 'g', calories: 219, protein: 35, carbs: 0, fat: 7.3 },
];

const AEROBIC_SESSIONS = [
  { id: 't1', label: 'Treino 1', type: 'Running', stages: [{ id: 's1', intensity: '60%' }, { id: 's2', intensity: '70%' }] },
  { id: 't2', label: 'Treino 2', type: 'Running', stages: [{ id: 's1', intensity: '60%' }, { id: 's2', intensity: '70%' }] },
  { id: 'jj1', label: 'Condicionamento Jiu-Jitsu', type: 'JiuJitsu', roundTime: 5, restTime: 1, rounds: 4 }
];

const PSE_OPTIONS = [
  { label: 'Muito Leve', color: 'bg-[#1b5e20]', text: 'text-white' },
  { label: 'Leve', color: 'bg-[#8bc34a]', text: 'text-slate-900' },
  { label: 'Moderado', color: 'bg-[#ffca28]', text: 'text-slate-900' },
  { label: 'Difícil', color: 'bg-[#ffa726]', text: 'text-slate-900' },
  { label: 'Muito Difícil', color: 'bg-[#f4511e]', text: 'text-white' },
  { label: 'Exaustivo', color: 'bg-[#b71c1c]', text: 'text-white' }
];

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const SCHEDULE = [
  { day: 'Segunda', type: 'Empurrada' },
  { day: 'Terça', type: 'Aeróbico' },
  { day: 'Quarta', type: 'Membros Inferiores' },
  { day: 'Quinta', type: 'Descanso' },
  { day: 'Sexta', type: 'Puxada' },
  { day: 'Sábado', type: 'Aeróbico' },
  { day: 'Domingo', type: 'Descanso' }
];

const RETEST_SCHEDULE = [
  { day: 'Segunda', type: 'Empurrada' },
  { day: 'Terça', type: 'Vo2 max' },
  { day: 'Quarta', type: 'Membros Inferiores' },
  { day: 'Quinta', type: 'Descanso' },
  { day: 'Sexta', type: 'Puxada' },
  { day: 'Sábado', type: 'Descanso' },
  { day: 'Domingo', type: 'Descanso' }
];

export function AthleteView({ athleteId, isCoach, onBack }: { athleteId: string, isCoach: boolean, onBack?: () => void }) {
  const { logout } = useAuth();
  const { exercises } = useExercises();
  const [activeTab, setActiveTab] = useState<'profile' | 'evaluations' | 'training' | 'nutrition' | 'dashboard' | 'history'>('dashboard');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const pendingSaveRef = React.useRef(false);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const fetchAthleteData = async () => {
      const { data, error } = await supabase
        .from('athletes')
        .select('user_data')
        .eq('access_code', athleteId)
        .single();

      if (error) {
        handleSupabaseError(error, OperationType.GET, `athletes?access_code=${athleteId}`);
        setLoading(false);
        return;
      }

      if (data) {
        const rawUserData = data.user_data;
        if (rawUserData && typeof rawUserData === 'object' && Object.keys(rawUserData).length > 0) {
          setUserData({
            ...rawUserData as UserData,
            bodyCompHistory: (rawUserData as any).bodyCompHistory || []
          });
        } else if (rawUserData && typeof rawUserData === 'string') {
          // Compatibility fallback: handle data that may have been stored as a JSON string
          // before the migration to native JSONB. New data will always be a plain object.
          try {
            const parsed = JSON.parse(rawUserData);
            setUserData({
              ...parsed,
              bodyCompHistory: parsed.bodyCompHistory || []
            });
          } catch (e) {
            console.error("Error parsing userData:", e);
            setUserData(INITIAL_STATE);
          }
        } else {
          setUserData(INITIAL_STATE);
        }
      } else {
        setUserData(INITIAL_STATE);
      }
      setLoading(false);
    };

    fetchAthleteData();

    // Subscribe to real-time changes for this athlete
    channel = supabase
      .channel(`athletes:access_code=eq.${athleteId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'athletes', filter: `access_code=eq.${athleteId}` },
        () => { if (!pendingSaveRef.current) fetchAthleteData(); }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [athleteId]);

  useEffect(() => {
    if (!userData) return;
    const saveUserData = async () => {
      pendingSaveRef.current = true;
      try {
        const { error } = await supabase
          .from('athletes')
          .update({ user_data: userData })
          .eq('access_code', athleteId);
        if (error) {
          handleSupabaseError(error, OperationType.UPDATE, `athletes?access_code=${athleteId}`);
        }
      } catch (error) {
        handleSupabaseError(error, OperationType.UPDATE, `athletes?access_code=${athleteId}`);
      } finally {
        pendingSaveRef.current = false;
      }
    };
    const timeoutId = setTimeout(saveUserData, 1000);
    return () => clearTimeout(timeoutId);
  }, [userData, athleteId]);

  const updateUserData = (updates: Partial<UserData> | ((prev: UserData) => Partial<UserData>)) => {
    setUserData(prev => {
      if (!prev) return prev;
      const resolved = typeof updates === 'function' ? updates(prev) : updates;
      return { ...prev, ...resolved };
    });
  };

  const updateCurrentCycle = (updates: Partial<Cycle>) => {
    setUserData(prev => prev ? {
      ...prev,
      currentCycle: { ...prev.currentCycle, ...updates }
    } : prev);
  };

  const finishCycle = (unsavedData?: Partial<Cycle>) => {
    if (!userData) return;
    const currentCycle = { ...userData.currentCycle, ...unsavedData };
    
    // Check if retest is done
    if (!currentCycle.retestMetrics || !currentCycle.retestAerobicTest) {
      const confirmSkip = window.confirm('Você não completou todos os dados do reteste. Deseja finalizar o ciclo mesmo assim?');
      if (!confirmSkip) return;
    } else {
      const confirmFinish = window.confirm('Deseja finalizar este ciclo? Os dados do reteste se tornarão os dados iniciais do próximo ciclo.');
      if (!confirmFinish) return;
    }

    // Create new cycle from retest results
    const newInitialStrengthTests: Record<string, StrengthTest> = {};
    
    // First, copy over initial tests as a fallback
    Object.entries(currentCycle.initialStrengthTests || {}).forEach(([id, test]: [string, any]) => {
      newInitialStrengthTests[id] = { ...test };
    });

    // Then overwrite with retest results if available
    Object.entries(currentCycle.retestStrengthTests || {}).forEach(([id, retest]: [string, any]) => {
      newInitialStrengthTests[id] = {
        exercise: retest.exercise,
        series: [
          retest.test,
          retest.series2,
          retest.series3
        ],
        estimated1RM: retest.estimated1RM
      };
    });

    const newCycle: Cycle = {
      id: `cycle-${userData.history.length + 2}`,
      startDate: new Date().toISOString().split('T')[0],
      initialMetrics: currentCycle.retestMetrics,
      initialStrengthTests: newInitialStrengthTests,
      initialAerobicTest: currentCycle.retestAerobicTest ? {
        distance: currentCycle.retestAerobicTest.distance,
        vo2Max: currentCycle.retestAerobicTest.vo2Max,
        vVo2Max: currentCycle.retestAerobicTest.vVo2Max
      } : currentCycle.initialAerobicTest,
      weeklyLogs: INITIAL_STATE.currentCycle.weeklyLogs
    };

    setUserData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        history: [...prev.history, { ...currentCycle, endDate: new Date().toISOString().split('T')[0] }],
        currentCycle: newCycle
      };
    });

    setActiveTab('dashboard');
    alert('Ciclo finalizado com sucesso! Novo ciclo iniciado.');
  };

  if (loading || !userData) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500 font-bold">Carregando dados do atleta...</div>;
  }

  const bodyComp = calculateBodyFat(userData.currentCycle.initialMetrics, userData.gender);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-red-600 selection:text-white">
      {/* Sidebar / Navigation */}
      <nav className="fixed left-0 top-0 h-full w-20 md:w-64 bg-slate-900 text-slate-50 flex flex-col z-50 shadow-2xl">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shrink-0 shadow-xl shadow-red-600/30 ring-2 ring-white/10">
            <Activity className="text-white" />
          </div>
          <span className="hidden md:block font-black tracking-[-0.05em] text-2xl uppercase italic text-white">BJJ <span className="text-red-600">PRO</span></span>
        </div>

        <div className="flex-1 py-6 flex flex-col gap-2 overflow-y-auto">
          <NavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
          />
          <NavItem 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
            icon={<User size={20} />} 
            label="Dados Iniciais" 
          />
          <NavItem 
            active={activeTab === 'evaluations'} 
            onClick={() => setActiveTab('evaluations')} 
            icon={<TrendingUp size={20} />} 
            label="Avaliações" 
          />
          <NavItem 
            active={activeTab === 'training'} 
            onClick={() => setActiveTab('training')} 
            icon={<Dumbbell size={20} />} 
            label="Treinamento" 
          />
          <NavItem 
            active={activeTab === 'nutrition'} 
            onClick={() => setActiveTab('nutrition')} 
            icon={<Utensils size={20} />} 
            label="Nutrição" 
          />
          <NavItem 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            icon={<TrendingUp size={20} />} 
            label="Histórico" 
          />
        </div>

        <div className="p-4 border-t border-white/10 space-y-2">
          {isCoach && onBack && (
            <button onClick={onBack} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all font-bold group">
              <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="hidden md:block">Voltar ao Painel</span>
            </button>
          )}
          {!isCoach && (
            <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all font-bold group">
              <LogOut size={20} className="group-hover:text-red-500 transition-colors" />
              <span className="hidden md:block">Sair</span>
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="pl-20 md:pl-64 min-h-screen">
        <header className="h-20 border-b border-slate-200 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-40">
          <h1 className="text-[10px] uppercase tracking-[0.3em] text-slate-900 font-black">
            {activeTab.replace('_', ' ')} <span className="text-slate-300 mx-2">/</span> {userData.name || 'Atleta'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Sincronizado</span>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto">
          {activeTab === 'profile' && (
            <ProfileSection userData={userData} updateUserData={updateUserData} updateCurrentCycle={updateCurrentCycle} bodyComp={bodyComp} />
          )}
          {activeTab === 'evaluations' && (
            <EvaluationsSection userData={userData} updateCurrentCycle={updateCurrentCycle} finishCycle={finishCycle} setActiveTab={setActiveTab} />
          )}
          {activeTab === 'training' && (
            <TrainingSection userData={userData} updateCurrentCycle={updateCurrentCycle} setActiveTab={setActiveTab} />
          )}
          {activeTab === 'nutrition' && (
            <NutritionSection userData={userData} updateUserData={updateUserData} />
          )}
          {activeTab === 'dashboard' && (
            <DashboardSection userData={userData} bodyComp={bodyComp} setActiveTab={setActiveTab} />
          )}
          {activeTab === 'history' && (
            <HistorySection 
              history={userData.history} 
              bodyCompHistory={userData.bodyCompHistory} 
              gender={userData.gender}
              currentCycle={userData.currentCycle}
              currentBodyComp={bodyComp}
              updateUserData={updateUserData}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 px-6 py-4 transition-all relative group",
        active ? "text-white bg-red-600/20" : "text-slate-400 hover:text-white hover:bg-white/10"
      )}
    >
      {active && <div className="absolute left-0 top-0 h-full w-1 bg-red-600" />}
      <span className={cn("shrink-0 transition-colors", active ? "text-red-500" : "group-hover:text-red-400")}>{icon}</span>
      <span className={cn("hidden md:block text-sm tracking-tight transition-all", active ? "font-black" : "font-bold")}>{label}</span>
    </button>
  );
}

function ProfileSection({ userData, updateUserData, updateCurrentCycle, bodyComp }: { userData: UserData, updateUserData: (u: Partial<UserData> | ((prev: UserData) => Partial<UserData>)) => void, updateCurrentCycle: (c: Partial<Cycle>) => void, bodyComp: any }) {
  const [isSaved, setIsSaved] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'schedule'>('profile');
  const [editingRecordIndex, setEditingRecordIndex] = useState<number | null>(null);
  const [editMetrics, setEditMetrics] = useState<BodyMetrics | null>(null);
  const [editDate, setEditDate] = useState<string>('');

  const handleSaveProfile = () => {
    const newRecord = {
      date: new Date().toISOString().split('T')[0],
      metrics: userData.currentCycle.initialMetrics,
      composition: bodyComp
    };
    
    updateUserData({
      bodyCompHistory: [newRecord, ...(userData.bodyCompHistory || [])]
    });
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleDeleteRecord = (index: number) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    updateUserData(prev => {
      const newHistory = [...(prev.bodyCompHistory || [])];
      newHistory.splice(index, 1);
      return { bodyCompHistory: newHistory };
    });
  };

  const handleStartEdit = (index: number, record: BodyCompRecord) => {
    setEditingRecordIndex(index);
    setEditMetrics({ ...record.metrics });
    setEditDate(record.date);
  };

  const handleSaveEdit = () => {
    if (editingRecordIndex === null || !editMetrics) return;

    const capturedIndex = editingRecordIndex;
    const capturedMetrics = { ...editMetrics };
    const capturedDate = editDate;

    // Validate the index is still valid before updating
    const currentHistory = userData.bodyCompHistory || [];
    if (capturedIndex < 0 || capturedIndex >= currentHistory.length) {
      alert('Este registro não existe mais. Recarregue a página e tente novamente.');
      setEditingRecordIndex(null);
      setEditMetrics(null);
      setEditDate('');
      return;
    }

    updateUserData(prev => {
      const newHistory = [...(prev.bodyCompHistory || [])];
      if (capturedIndex < 0 || capturedIndex >= newHistory.length) return {};
      const updatedComp = calculateBodyFat(capturedMetrics, prev.gender);
      newHistory[capturedIndex] = {
        date: capturedDate,
        metrics: capturedMetrics,
        composition: updatedComp
      };
      return { bodyCompHistory: newHistory };
    });

    setEditingRecordIndex(null);
    setEditMetrics(null);
    setEditDate('');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200 w-fit">
          <button 
            onClick={() => setActiveSubTab('profile')}
            className={cn(
              "px-6 py-2 text-[10px] uppercase tracking-widest rounded-xl transition-all font-black",
              activeSubTab === 'profile' ? "bg-white shadow-md text-red-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Perfil do Atleta
          </button>
          <button 
            onClick={() => setActiveSubTab('schedule')}
            className={cn(
              "px-6 py-2 text-[10px] uppercase tracking-widest rounded-xl transition-all font-black",
              activeSubTab === 'schedule' ? "bg-white shadow-md text-red-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Agenda de Treinos
          </button>
        </div>

        {activeSubTab === 'profile' && (
          <button 
            onClick={handleSaveProfile}
            className={cn(
              "px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg active:scale-95",
              isSaved ? "bg-green-600 text-white" : "bg-red-600 text-white hover:bg-red-700"
            )}
          >
            {isSaved ? 'Dados Salvos!' : 'Salvar Dados do Atleta'}
          </button>
        )}
      </div>

      {activeSubTab === 'profile' ? (
        <div className="space-y-12">
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card title="Identificação">
                <div className="space-y-4">
                  <Input 
                    label="Nome do Atleta" 
                    value={userData.name} 
                    onChange={e => updateUserData({ name: e.target.value })} 
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-slate-700 font-bold mb-1.5 block">Gênero</label>
                      <select 
                        className="w-full bg-slate-100 border border-slate-300 rounded-xl p-3 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all text-sm font-bold"
                        value={userData.gender}
                        onChange={e => updateUserData({ gender: e.target.value as Gender })}
                      >
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                      </select>
                    </div>
                    <Input 
                      label="Data de Início" 
                      type="date" 
                      value={userData.currentCycle.startDate} 
                      onChange={e => updateCurrentCycle({ startDate: e.target.value })} 
                    />
                  </div>
                </div>
              </Card>

              <Card title="Objetivo / Perfil">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-slate-700 font-bold mb-1.5 block">Graduação</label>
                      <select 
                        className="w-full bg-slate-100 border border-slate-300 rounded-xl p-3 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all text-sm font-bold"
                        value={userData.belt || 'Branca'}
                        onChange={e => updateUserData({ belt: e.target.value as any })}
                      >
                        {['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'].map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-slate-700 font-bold mb-1.5 block">Estilo</label>
                      <select 
                        className="w-full bg-slate-100 border border-slate-300 rounded-xl p-3 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all text-sm font-bold"
                        value={userData.stylePreference || 'Híbrido'}
                        onChange={e => updateUserData({ stylePreference: e.target.value as any })}
                      >
                        {['Guardeiro', 'Passador', 'Híbrido'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-slate-700 font-bold mb-1.5 block">Posições Fortes</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-100 border border-slate-300 rounded-xl p-3 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all text-sm font-bold"
                      value={userData.strongPositions?.join(', ') || ''}
                      onChange={e => updateUserData({ strongPositions: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '') })}
                      placeholder="Ex: Triângulo, Passagem de Gancho"
                    />
                  </div>

                  <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button 
                      onClick={() => updateUserData({ path: 'Competidor' })}
                      className={cn("flex-1 py-3 text-[10px] uppercase tracking-widest rounded-lg transition-all", userData.path === 'Competidor' ? "bg-white shadow-md font-black text-red-600" : "text-slate-400 font-bold hover:text-slate-600")}
                    >
                      Competidor
                    </button>
                    <button 
                      onClick={() => updateUserData({ path: 'Lifestyle' })}
                      className={cn("flex-1 py-3 text-[10px] uppercase tracking-widest rounded-lg transition-all", userData.path === 'Lifestyle' ? "bg-white shadow-md font-black text-red-600" : "text-slate-400 font-bold hover:text-slate-600")}
                    >
                      Lifestyle
                    </button>
                  </div>

                  {userData.path === 'Competidor' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <Input 
                        label="Duração Luta (min)" 
                        type="number" 
                        value={userData.pathData.fightDuration || 0} 
                        onChange={e => updateUserData({ pathData: { ...userData.pathData, fightDuration: Number(e.target.value) } })} 
                      />
                      <Input 
                        label="Lutas até Final" 
                        type="number" 
                        value={userData.pathData.fightsToFinal || 0} 
                        onChange={e => updateUserData({ pathData: { ...userData.pathData, fightsToFinal: Number(e.target.value) } })} 
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <Input 
                        label="Qtd Rolas" 
                        type="number" 
                        value={userData.pathData.rollsCount || 0} 
                        onChange={e => updateUserData({ pathData: { ...userData.pathData, rollsCount: Number(e.target.value) } })} 
                      />
                      <Input 
                        label="Tempo Rola (min)" 
                        type="number" 
                        value={userData.pathData.rollDuration || 0} 
                        onChange={e => updateUserData({ pathData: { ...userData.pathData, rollDuration: Number(e.target.value) } })} 
                      />
                    </div>
                  )}
                  
                  <div className="p-5 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-600/20">
                    <div className="text-[10px] uppercase tracking-[0.2em] font-black opacity-80 mb-1">Alvo Aeróbico (min)</div>
                    <div className="text-3xl font-mono font-black">
                      {userData.path === 'Competidor' 
                        ? (userData.pathData.fightDuration || 0) * (userData.pathData.fightsToFinal || 0)
                        : (userData.pathData.rollsCount || 0) * (userData.pathData.rollDuration || 0)
                      }<span className="text-sm ml-1 font-bold opacity-60">min</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-serif italic mb-8">Composição Corporal</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card title="Medidas (cm/kg)">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Idade" type="number" value={userData.currentCycle.initialMetrics.age} onChange={e => updateCurrentCycle({ initialMetrics: { ...userData.currentCycle.initialMetrics, age: Number(e.target.value) } })} />
                  <Input label="Estatura" type="number" value={userData.currentCycle.initialMetrics.height} onChange={e => updateCurrentCycle({ initialMetrics: { ...userData.currentCycle.initialMetrics, height: Number(e.target.value) } })} />
                  <Input label="Peso" type="number" value={userData.currentCycle.initialMetrics.weight} onChange={e => updateCurrentCycle({ initialMetrics: { ...userData.currentCycle.initialMetrics, weight: Number(e.target.value) } })} />
                  <Input label="Pescoço" type="number" value={userData.currentCycle.initialMetrics.neck} onChange={e => updateCurrentCycle({ initialMetrics: { ...userData.currentCycle.initialMetrics, neck: Number(e.target.value) } })} />
                  <Input label="Abdômen" type="number" value={userData.currentCycle.initialMetrics.abdomen} onChange={e => updateCurrentCycle({ initialMetrics: { ...userData.currentCycle.initialMetrics, abdomen: Number(e.target.value) } })} />
                  <Input label="Braço (L)" type="number" value={userData.currentCycle.initialMetrics.armLength || 0} onChange={e => updateCurrentCycle({ initialMetrics: { ...userData.currentCycle.initialMetrics, armLength: Number(e.target.value) } })} />
                  <Input label="Perna (L)" type="number" value={userData.currentCycle.initialMetrics.legLength || 0} onChange={e => updateCurrentCycle({ initialMetrics: { ...userData.currentCycle.initialMetrics, legLength: Number(e.target.value) } })} />
                  {userData.gender === 'Feminino' && (
                    <Input label="Quadril" type="number" value={userData.currentCycle.initialMetrics.hip || 0} onChange={e => updateCurrentCycle({ initialMetrics: { ...userData.currentCycle.initialMetrics, hip: Number(e.target.value) } })} />
                  )}
                </div>
              </Card>

              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MetricResult 
                  label="Gordura (%)" 
                  value={bodyComp.fatPercentage} 
                  unit="%" 
                  info="Cálculo baseado na circunferência do pescoço, abdômen (e quadril para mulheres) e altura. Método padrão da Marinha dos EUA."
                />
                <MetricResult 
                  label="Massa Gorda" 
                  value={bodyComp.fatMass} 
                  unit="kg" 
                  info="Peso total de gordura corporal calculado a partir do percentual de gordura."
                />
                <MetricResult 
                  label="Massa Livre" 
                  value={bodyComp.leanMass} 
                  unit="kg" 
                  info="Massa corporal magra (músculos, ossos, órgãos) excluindo a gordura."
                />
              </div>
            </div>
          </section>

          {userData.bodyCompHistory && userData.bodyCompHistory.length > 0 && (
            <section className="pt-12 border-t border-slate-200">
              <h3 className="text-2xl font-serif italic mb-8">Histórico de Composição</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userData.bodyCompHistory.slice(0, 6).map((record, idx) => (
                  <Card 
                    key={idx} 
                    title={record.date}
                    actions={
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleStartEdit(idx, record)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteRecord(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    }
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <div className="text-[8px] uppercase font-black text-slate-400 mb-1">Gordura</div>
                        <div className="text-xs font-mono font-black text-red-600">{record.composition.fatPercentage}%</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <div className="text-[8px] uppercase font-black text-slate-400 mb-1">Massa Magra</div>
                        <div className="text-xs font-mono font-black text-slate-900">{record.composition.leanMass}kg</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <div className="text-[8px] uppercase font-black text-slate-400 mb-1">Peso</div>
                        <div className="text-xs font-mono font-black text-slate-900">{record.metrics.weight}kg</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <div className="text-[8px] uppercase font-black text-slate-400 mb-1">Abdômen</div>
                        <div className="text-xs font-mono font-black text-slate-900">{record.metrics.abdomen}cm</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Modal de Edição de Histórico */}
          {editingRecordIndex !== null && editMetrics && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xl font-serif italic">Editar Registro</h3>
                  <button 
                    onClick={() => setEditingRecordIndex(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="Data" 
                      type="date" 
                      value={editDate} 
                      onChange={e => setEditDate(e.target.value)} 
                    />
                    <Input 
                      label="Peso (kg)" 
                      type="number" 
                      value={editMetrics.weight} 
                      onChange={e => setEditMetrics({ ...editMetrics, weight: Number(e.target.value) })} 
                    />
                    <Input 
                      label="Pescoço (cm)" 
                      type="number" 
                      value={editMetrics.neck} 
                      onChange={e => setEditMetrics({ ...editMetrics, neck: Number(e.target.value) })} 
                    />
                    <Input 
                      label="Abdômen (cm)" 
                      type="number" 
                      value={editMetrics.abdomen} 
                      onChange={e => setEditMetrics({ ...editMetrics, abdomen: Number(e.target.value) })} 
                    />
                    <Input 
                      label="Estatura (cm)" 
                      type="number" 
                      value={editMetrics.height} 
                      onChange={e => setEditMetrics({ ...editMetrics, height: Number(e.target.value) })} 
                    />
                    {userData.gender === 'Feminino' && (
                      <Input 
                        label="Quadril (cm)" 
                        type="number" 
                        value={editMetrics.hip || 0} 
                        onChange={e => setEditMetrics({ ...editMetrics, hip: Number(e.target.value) })} 
                      />
                    )}
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button 
                      onClick={() => setEditingRecordIndex(null)}
                      className="flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleSaveEdit}
                      className="flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <ScheduleSection userData={userData} updateUserData={updateUserData} />
      )}
    </div>
  );
}

function EvaluationsSection({ userData, updateCurrentCycle, finishCycle, setActiveTab }: { userData: UserData, updateCurrentCycle: (c: Partial<Cycle>) => void, finishCycle: (unsavedData?: Partial<Cycle>) => void, setActiveTab: (tab: string) => void }) {
  const hasInitialTest = userData.currentCycle.initialAerobicTest && userData.currentCycle.initialAerobicTest.distance > 0;
  const [showInitial, setShowInitial] = useState(false);
  const displayInitial = !hasInitialTest || showInitial;

  const startDate = new Date(userData.currentCycle.startDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const needsRetest = diffDays >= 30;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {needsRetest && !displayInitial && (
        <div className="bg-red-600 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <Activity size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-widest">Semana de Reteste!</h3>
              <p className="text-red-100 text-sm mt-1">
                Já se passaram {diffDays} dias desde o início do ciclo. Preencha os dados abaixo para finalizar o ciclo atual.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-serif italic">
            {displayInitial ? 'Semana de Testes' : 'Reteste de Performance'}
          </h2>
          {hasInitialTest && (
            <button 
              onClick={() => setShowInitial(!showInitial)}
              className="text-[10px] uppercase tracking-widest text-red-600 font-black bg-red-50 px-3 py-1 rounded-full hover:bg-red-100 transition-all"
            >
              {showInitial ? 'Voltar para Reteste' : 'Ver Testes Iniciais'}
            </button>
          )}
        </div>
      </div>

      {displayInitial ? (
        <TestsContent userData={userData} updateCurrentCycle={updateCurrentCycle} setActiveTab={setActiveTab} />
      ) : (
        <RetestContent userData={userData} updateCurrentCycle={updateCurrentCycle} finishCycle={finishCycle} />
      )}

      {userData.history.length > 0 && (
        <section className="pt-12 border-t border-slate-200">
          <h3 className="text-2xl font-serif italic mb-8">Histórico de Evolução</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...userData.history].reverse().map((cycle, idx) => (
              <EvaluationHistoryCard key={idx} cycle={cycle} gender={userData.gender} index={userData.history.length - idx} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const EvaluationHistoryCard: React.FC<{ cycle: Cycle, gender: Gender, index: number }> = ({ cycle, gender, index }) => {
  const { exercises } = useExercises();
  const initialComp = calculateBodyFat(cycle.initialMetrics, gender);
  const finalComp = cycle.retestMetrics ? calculateBodyFat(cycle.retestMetrics, gender) : null;

  return (
    <Card title={`Ciclo #${index} - ${cycle.startDate}`}>
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-slate-50 rounded-xl">
            <div className="text-[8px] uppercase font-black text-slate-400 mb-1">Gordura</div>
            <div className="text-xs font-mono font-black">
              {initialComp.fatPercentage}% {finalComp ? `→ ${finalComp.fatPercentage}%` : ''}
            </div>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-xl">
            <div className="text-[8px] uppercase font-black text-slate-400 mb-1">Massa Magra</div>
            <div className="text-xs font-mono font-black">
              {initialComp.leanMass}kg {finalComp ? `→ ${finalComp.leanMass}kg` : ''}
            </div>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-xl">
            <div className="text-[8px] uppercase font-black text-slate-400 mb-1">VO2 Máx</div>
            <div className="text-xs font-mono font-black">
              {cycle.initialAerobicTest?.vo2Max || '-'} {cycle.retestAerobicTest ? `→ ${cycle.retestAerobicTest.vo2Max}` : ''}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-1 pt-2 border-t border-slate-100">
          <div className="text-[8px] uppercase font-black text-slate-400 mb-1">Força (1RM)</div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1">
            {(() => {
              const categories = ['Upper Push', 'Upper Pull', 'Lower Body'];
              return categories.map(cat => {
                const relevant = exercises.filter(e => e.category === cat);
                
                return relevant.map(ex => {
                  const initial = cycle.initialStrengthTests[ex.id]?.estimated1RM || 0;
                  const retest = cycle.retestStrengthTests?.[ex.id]?.estimated1RM || 0;
                  const subName = cycle.selectedSubExercises?.[ex.id];
                  const displayName = subName || ex.name;
                  return (
                    <div key={ex.id} className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <Dumbbell size={10} className={ex.type === 'FIXO' ? 'text-red-600' : 'text-slate-400'} />
                        <span className="truncate">{displayName}</span>
                        <span className={`text-[7px] uppercase font-black px-1 py-0.5 rounded shrink-0 ${ex.type === 'FIXO' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {ex.type}
                        </span>
                      </div>
                      <span className="font-mono shrink-0">{initial}kg {retest > 0 ? `→ ${retest}kg` : ''}</span>
                    </div>
                  );
                });
              });
            })()}
          </div>
        </div>
      </div>
    </Card>
  );
}

function TestsContent({ userData, updateCurrentCycle, setActiveTab }: { userData: UserData, updateCurrentCycle: (c: Partial<Cycle>) => void, setActiveTab: (tab: string) => void }) {
  const { exercises } = useExercises();
  const [aerobicDist, setAerobicDist] = useState(userData.currentCycle.initialAerobicTest?.distance || 0);
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveTests = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    // The data is already in state, but this provides the user feedback they requested
  };

  const handleStrengthUpdate = (id: string, seriesIndex: number, field: 'weight' | 'reps' | 'rest', value: any) => {
    const currentTest = userData.currentCycle.initialStrengthTests[id] || {
      exercise: exercises.find(e => e.id === id)?.name || '',
      series: [
        { weight: 0, reps: 0, rest: '3 minutos' },
        { weight: 0, reps: 0, rest: '3 minutos' },
        { weight: 0, reps: 0, rest: '3 minutos' }
      ],
      estimated1RM: 0
    };

    const newSeries = [...currentTest.series] as [StrengthTestSeries, StrengthTestSeries, StrengthTestSeries];
    newSeries[seriesIndex] = { ...newSeries[seriesIndex], [field]: value };

    // Calculate best 1RM from all series
    const best1RM = Math.max(...newSeries.map(s => estimate1RM(s.weight, s.reps)));

    const updatedTests = {
      ...userData.currentCycle.initialStrengthTests,
      [id]: { ...currentTest, series: newSeries, estimated1RM: best1RM }
    };
    updateCurrentCycle({ initialStrengthTests: updatedTests });
  };

  const handleAerobicUpdate = () => {
    const vo2 = calculateVO2Max(aerobicDist);
    const vvo2 = calculateVVO2Max(aerobicDist);
    updateCurrentCycle({ initialAerobicTest: { distance: aerobicDist, vo2Max: vo2, vVo2Max: vvo2 } });
  };

  const TEST_SCHEDULE = [
    { day: 'Segunda', type: 'Empurrada' },
    { day: 'Terça', type: 'Vo2 max' },
    { day: 'Quarta', type: 'Membros Inferiores' },
    { day: 'Quinta', type: 'Descanso' },
    { day: 'Sexta', type: 'Puxada' },
    { day: 'Sábado', type: 'Descanso' },
    { day: 'Domingo', type: 'Descanso' }
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Test Week Schedule Header */}
      <section className="bg-white rounded-3xl p-6 border border-slate-300 shadow-sm">
        <div className="grid grid-cols-7 gap-2">
          {TEST_SCHEDULE.map(item => {
            const displayType = item.type;
            return (
              <div key={item.day} className="text-center">
                <div className="text-[10px] uppercase tracking-widest text-slate-900 font-black mb-1">{item.day}</div>
                <div className="text-xs font-black text-red-600">{displayType}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-serif italic">Testes de Força (1RM)</h2>
            <InfoPopover 
              title="O que é 1RM?" 
              content="1RM (Uma Repetição Máxima) é o peso máximo que você consegue levantar para uma única repetição. O sistema usa a fórmula de Brzycki para estimar esse valor a partir de séries de 3 a 5 repetições." 
            />
          </div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-mono bg-slate-100 px-3 py-1 rounded-full">Meta: 3-5 Reps Máximas na última série</div>
        </div>
        
        <div className="space-y-8">
          {['Upper Push', 'Upper Pull', 'Lower Body'].map(category => (
            <div key={category} className="space-y-4">
              <h3 className="text-sm uppercase tracking-[0.2em] font-black opacity-80 border-b border-slate-300 pb-2">{category}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest opacity-80 font-bold">
                      <th className="py-4 font-normal">N</th>
                      <th className="py-4 font-normal">Exercício</th>
                      <th className="py-4 font-normal text-center" colSpan={3}>Série 1</th>
                      <th className="py-4 font-normal text-center" colSpan={3}>Série 2</th>
                      <th className="py-4 font-normal text-center" colSpan={3}>Série 3</th>
                      <th className="py-4 font-normal text-right">1 RM</th>
                    </tr>
                    <tr className="text-[8px] uppercase tracking-tighter opacity-70 font-bold border-b border-slate-300">
                      <th></th>
                      <th></th>
                      <th className="text-center">Carga</th>
                      <th className="text-center">Reps</th>
                      <th className="text-center">Descanso</th>
                      <th className="text-center">Carga</th>
                      <th className="text-center">Reps</th>
                      <th className="text-center">Descanso</th>
                      <th className="text-center">Carga</th>
                      <th className="text-center">Reps</th>
                      <th className="text-center">Descanso</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(() => {
                      const rows = exercises.filter(e => e.category === category);
                      
                      return rows.map((ex, idx) => {
                        const exerciseId = ex.id;
                        const test = userData.currentCycle.initialStrengthTests[exerciseId] || {
                          series: [
                            { weight: 0, reps: 0, rest: '3 min' },
                            { weight: 0, reps: 0, rest: '3 min' },
                            { weight: 0, reps: 0, rest: '3 min' }
                          ],
                          estimated1RM: 0
                        };

                        return (
                          <tr key={ex.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors group">
                            <td className="py-4 text-xs font-mono text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-4 text-sm font-black text-slate-900">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ex.type === 'FIXO' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>
                                  <Dumbbell size={16} />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    {ex.subExercises && ex.subExercises.length > 0 ? (
                                      <select 
                                        className="bg-transparent border-b border-red-600 focus:outline-none cursor-pointer text-sm font-black text-slate-900 w-fit"
                                        value={userData.currentCycle.selectedSubExercises?.[ex.id] || ex.name}
                                        onChange={e => {
                                          const newSelected = { ...userData.currentCycle.selectedSubExercises, [ex.id]: e.target.value };
                                          updateCurrentCycle({ selectedSubExercises: newSelected });
                                        }}
                                      >
                                        <option value={ex.name}>{ex.name}</option>
                                        {ex.subExercises.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                      </select>
                                    ) : (
                                      <span>{ex.name}</span>
                                    )}
                                    <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded ${ex.type === 'FIXO' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                      {ex.type}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{ex.category}</span>
                                    {(userData.currentCycle.selectedSubExercises?.[ex.id] 
                                      ? (ex.subExercises?.find(s => s.name === userData.currentCycle.selectedSubExercises?.[ex.id])?.videoUrl || ex.videoUrl)
                                      : ex.videoUrl) && (
                                      <a 
                                        href={userData.currentCycle.selectedSubExercises?.[ex.id] 
                                          ? (ex.subExercises?.find(s => s.name === userData.currentCycle.selectedSubExercises?.[ex.id])?.videoUrl || ex.videoUrl)
                                          : ex.videoUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-blue-500 hover:text-blue-700 flex items-center gap-1 text-[10px] font-bold uppercase leading-none"
                                      >
                                        <ExternalLink size={10} />
                                        Vídeo
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            {[0, 1, 2].map(sIdx => (
                              <React.Fragment key={sIdx}>
                                <td className="py-2 px-1">
                                  <input 
                                    type="number"
                                    className="w-16 bg-slate-50 border border-slate-200 rounded p-1 focus:border-red-600 outline-none text-center text-sm font-mono font-bold"
                                    value={test.series[sIdx].weight || ''}
                                    onChange={e => handleStrengthUpdate(ex.id, sIdx, 'weight', Number(e.target.value))}
                                  />
                                </td>
                                <td className="py-2 px-1">
                                  <input 
                                    type="number"
                                    className="w-12 bg-slate-50 border border-slate-200 rounded p-1 focus:border-red-600 outline-none text-center text-sm font-mono font-bold"
                                    value={test.series[sIdx].reps || ''}
                                    onChange={e => handleStrengthUpdate(ex.id, sIdx, 'reps', Number(e.target.value))}
                                  />
                                </td>
                                <td className="py-2 px-1">
                                  <input 
                                    type="text"
                                    className="w-20 bg-slate-50 border border-slate-200 rounded p-1 focus:border-red-600 outline-none text-center text-[10px] font-mono font-bold"
                                    value={test.series[sIdx].rest}
                                    onChange={e => handleStrengthUpdate(ex.id, sIdx, 'rest', e.target.value)}
                                  />
                                </td>
                              </React.Fragment>
                            ))}
                            <td className="py-4 text-right pr-4">
                              <span className="text-sm font-black font-mono text-red-600">{test.estimated1RM}</span>
                              <span className="text-[8px] text-slate-400 ml-1 font-bold">kg</span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-8">
          <h2 className="text-3xl font-serif italic">Teste Aeróbico (12 min)</h2>
          <InfoPopover 
            title="Teste de Cooper" 
            content="O teste de 12 minutos estima seu VO2 Máximo (capacidade aeróbica) e sua vVO2 Máx (velocidade na qual você atinge o VO2 Máx). Esses valores são fundamentais para prescrever as velocidades de treino aeróbico." 
          />
        </div>
        <Card title="Cooper Test (Esteira 1% Inclinação)">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 w-full space-y-4">
              <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200">
                <p className="text-xs text-slate-700 font-bold mb-4 leading-relaxed">
                  Objetivo: Maior distância em metros em 12 minutos com a esteira a 1% de inclinação.
                </p>
                <Input 
                  label="Distância Percorrida (metros)" 
                  type="number" 
                  value={aerobicDist} 
                  onChange={e => setAerobicDist(Number(e.target.value))} 
                />
              </div>
              <button 
                onClick={handleAerobicUpdate}
                className="w-full bg-red-600 text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-[0.98]"
              >
                Calcular Resultados
              </button>
            </div>
            
            <div className="flex gap-4 w-full md:w-auto">
              <div className="flex-1 md:w-32 p-4 bg-white border border-slate-300 rounded-2xl text-center shadow-sm">
                <div className="text-[10px] uppercase tracking-widest text-slate-600 font-black mb-1">VO2 Max</div>
                <div className="text-2xl font-bold font-mono text-red-600">{userData.currentCycle.initialAerobicTest?.vo2Max || 0}</div>
                <div className="text-[8px] text-slate-400 font-bold">ml/kg/min</div>
              </div>
              <div className="flex-1 md:w-32 p-4 bg-white border border-slate-300 rounded-2xl text-center shadow-sm">
                <div className="text-[10px] uppercase tracking-widest text-slate-600 font-black mb-1">vVO2 Max</div>
                <div className="text-2xl font-bold font-mono text-red-600">{userData.currentCycle.initialAerobicTest?.vVo2Max || 0}</div>
                <div className="text-[8px] text-slate-400 font-bold">km/h</div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="pt-12 border-t border-slate-200">
        <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2">
            <h3 className="text-2xl font-serif italic">Finalizar Semana de Testes</h3>
            <p className="text-sm text-slate-400 max-w-xl">
              Ao salvar, seus parâmetros base serão registrados e o sistema prescreverá as cargas para as próximas 4 semanas de treinamento.
            </p>
          </div>
          <button 
            onClick={handleSaveTests}
            className={cn(
              "px-8 py-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl active:scale-[0.98] whitespace-nowrap",
              isSaved ? "bg-green-600 text-white" : "bg-red-600 text-white hover:bg-red-700"
            )}
          >
            {isSaved ? 'Testes Registrados!' : 'Salvar e Registrar Informações'}
          </button>
        </div>
      </section>
    </div>
  );
}

function PSESelector({ value, onChange }: { value: string | null, onChange: (val: string) => void }) {
  const selected = PSE_OPTIONS.find(o => o.label === value);
  
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button className={cn(
          "w-full h-10 rounded-sm flex items-center justify-center font-bold text-[10px] transition-all",
          selected ? `${selected.color} ${selected.text}` : "bg-white border border-slate-300 text-slate-400"
        )}>
          {value || '-'}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content 
          className="bg-white rounded-lg shadow-xl border border-slate-200 p-2 w-48 z-50 animate-in fade-in zoom-in duration-200"
          sideOffset={5}
        >
          <div className="space-y-1">
            {PSE_OPTIONS.map(option => (
              <button
                key={option.label}
                onClick={() => onChange(option.label)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-[10px] font-bold transition-colors flex items-center gap-2",
                  option.color,
                  option.text,
                  "hover:opacity-90"
                )}
              >
                <div className="w-2 h-2 rounded-full bg-white/30" />
                {option.label}
              </button>
            ))}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function TrainingSection({ userData, updateCurrentCycle, setActiveTab }: { userData: UserData, updateCurrentCycle: (c: Partial<Cycle>) => void, setActiveTab: (tab: any) => void }) {
  const { exercises } = useExercises();
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [retestAerobicDist, setRetestAerobicDist] = useState<number | null>(userData.currentCycle.retestAerobicTest?.distance || null);

  const handleRetestAerobicUpdate = async () => {
    if (!retestAerobicDist) return;
    const vo2Max = (retestAerobicDist - 504.9) / 44.73;
    const vVo2Max = (retestAerobicDist / 12) * 0.06;
    
    const newTest = {
      date: new Date().toISOString(),
      distance: retestAerobicDist,
      vo2Max: Number(vo2Max.toFixed(1)),
      vVo2Max: Number(vVo2Max.toFixed(1))
    };

    const newCycle = {
      ...userData.currentCycle,
      retestAerobicTest: newTest
    };
    
    updateCurrentCycle(newCycle);
  };

  const weeks = [1, 2, 3, 4];
  
  const currentWeekLog = userData.currentCycle.weeklyLogs[selectedWeek] || { strength: {}, aerobic: {}, presence: {} };

  const handlePrevDay = () => setSelectedDate(d => { const newDate = new Date(d); newDate.setDate(newDate.getDate() - 1); return newDate; });
  const handleNextDay = () => setSelectedDate(d => { const newDate = new Date(d); newDate.setDate(newDate.getDate() + 1); return newDate; });

  const handlePresenceToggle = (day: string) => {
    const updatedLogs = { ...userData.currentCycle.weeklyLogs };
    const weekLog = updatedLogs[selectedWeek] || { presence: {}, strength: {}, aerobic: {} };
    weekLog.presence = { ...weekLog.presence, [day]: !weekLog.presence[day] };
    updatedLogs[selectedWeek] = weekLog;
    updateCurrentCycle({ weeklyLogs: updatedLogs });
  };

  const handleStrengthSetUpdate = (exId: string, setIndex: number, val: number | null) => {
    const updatedLogs = { ...userData.currentCycle.weeklyLogs };
    const weekLog = updatedLogs[selectedWeek] || { presence: {}, strength: {}, aerobic: {} };
    const test = userData.currentCycle.initialStrengthTests[exId];
    const prescribedWeight = test ? Math.round(test.estimated1RM * 0.6) : 0;
    
    const currentLog = weekLog.strength[exId] || {
      exerciseId: exId,
      sets: [null, null, null],
      prescribedWeight,
      goalReps: 20
    };
    
    const newSets = [...currentLog.sets] as [number | null, number | null, number | null];
    newSets[setIndex] = val;
    
    weekLog.strength = { ...weekLog.strength, [exId]: { ...currentLog, sets: newSets } };
    updatedLogs[selectedWeek] = weekLog;
    updateCurrentCycle({ weeklyLogs: updatedLogs });
  };

  const handleAerobicUpdate = (sessionId: string, field: string, val: any) => {
    const updatedLogs = { ...userData.currentCycle.weeklyLogs };
    const weekLog = updatedLogs[selectedWeek] || { presence: {}, strength: {}, aerobic: {} };
    const currentLog = weekLog.aerobic[sessionId] || {
      sessionId,
      distance: null,
      rpe: null,
      avgHr: null,
      prescribedSpeed: { low: 7.8, high: 9.1 },
      duration: 20
    };

    weekLog.aerobic = { ...weekLog.aerobic, [sessionId]: { ...currentLog, [field]: val } };
    updatedLogs[selectedWeek] = weekLog;
    updateCurrentCycle({ weeklyLogs: updatedLogs });
  };

  const calculateExUtilization = (exId: string) => {
    const log = currentWeekLog.strength[exId];
    if (!log) return 0;
    const totalReps = log.sets.reduce((acc, s) => acc + (s || 0), 0);
    const goalTotal = log.goalReps * 3;
    return (totalReps / goalTotal) * 100;
  };

  const calculateCategoryUtilization = (category: string) => {
    const catExercises = exercises.filter(e => e.category === category);
    const totalPerc = catExercises.reduce((acc, ex) => acc + calculateExUtilization(ex.id), 0);
    return totalPerc / catExercises.length;
  };

  const microcicloUtilization = (calculateCategoryUtilization('Upper Push') + calculateCategoryUtilization('Upper Pull') + calculateCategoryUtilization('Lower Body')) / 3;

  const currentDayIndex = selectedDate.getDay();
  const currentDayName = DAYS[currentDayIndex === 0 ? 6 : currentDayIndex - 1];

  // Dynamic Schedule Logic based on user's marked 'Academia' days
  const getDynamicSchedule = () => {
    const isRetestWeek = selectedWeek === 4;
    const baseSchedule = isRetestWeek ? RETEST_SCHEDULE : SCHEDULE;
    
    // Get all days where the user marked 'Academia' in their routine
    const academiaDays = DAYS.filter(day => 
      (userData.trainingSchedule?.[day] || []).some(s => s.type === 'Academia')
    );
    
    // The sequence of training types defined in the program (excluding rest)
    const trainingSequence = baseSchedule
      .filter(s => s.type !== 'Descanso')
      .map(s => s.type);
    
    const dynamicSchedule: Record<string, string> = {};
    DAYS.forEach(day => dynamicSchedule[day] = 'Descanso');
    
    if (isRetestWeek) {
      // For retest week, ensure Vo2 max is shown on its day (usually Tuesday)
      // and other tests are mapped to gym days
      const vo2Day = baseSchedule.find(s => s.type === 'Vo2 max')?.day;
      if (vo2Day) dynamicSchedule[vo2Day] = 'Vo2 max';

      const otherTests = trainingSequence.filter(t => t !== 'Vo2 max');
      const otherAcademiaDays = academiaDays.filter(d => d !== vo2Day);

      otherAcademiaDays.forEach((day, index) => {
        if (index < otherTests.length) {
          dynamicSchedule[day] = otherTests[index];
        } else {
          // If more gym days than tests, cycle back or keep as descanso
          // but usually we just want to ensure all tests are covered
        }
      });
    } else {
      // Map the user's available days to the program's training sequence
      academiaDays.forEach((day, index) => {
        dynamicSchedule[day] = trainingSequence[index % trainingSequence.length];
      });
    }
    
    return dynamicSchedule;
  };

  const dynamicSchedule = getDynamicSchedule();
  const todaySchedule = { day: currentDayName, type: dynamicSchedule[currentDayName] };
  
  const typeMap: Record<string, string> = { 'Empurrada': 'Upper Push', 'Puxada': 'Upper Pull', 'Membros Inferiores': 'Lower Body' };
  const currentTrainingType = typeMap[todaySchedule.type || ''];
  const trainingTypes = currentTrainingType ? [currentTrainingType] : [];
  const aerobicSessions = todaySchedule.type === 'Aeróbico' 
    ? [AEROBIC_SESSIONS[currentDayName === 'Terça' ? 0 : 1]] 
    : [];

  const getExercisesByCategory = (category: string) => exercises.filter(e => e.category === category);

  const calculateTrainingAverageForCategory = (category: string) => {
    const catExs = getExercisesByCategory(category);
    const totalUtil = catExs.reduce((acc, ex) => acc + calculateExUtilization(ex.id), 0);
    return totalUtil / catExs.length;
  };

  const startDate = new Date(userData.currentCycle.startDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const needsRetest = diffDays >= 30;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {needsRetest && (
        <div className="bg-red-600 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <Activity size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-widest">Semana de Reteste!</h3>
              <p className="text-red-100 text-sm mt-1">
                Já se passaram {diffDays} dias desde o início do ciclo. É hora de realizar seus retestes para acompanhar sua evolução.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('evaluations')}
            className="px-6 py-3 bg-white text-red-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-50 transition-all whitespace-nowrap"
          >
            Fazer Retestes
          </button>
        </div>
      )}

      {/* Week Selector & Presence */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-serif italic">Treinamento</h2>
          <div className="flex items-center gap-4">
            <button onClick={handlePrevDay} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
              <ChevronRight className="rotate-180" size={20} />
            </button>
            <span className="font-mono font-bold text-lg">
              {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - {currentDayName}
            </span>
            <button onClick={handleNextDay} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="flex gap-2">
            {weeks.map(w => (
              <button 
                key={w}
                onClick={() => setSelectedWeek(w)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-mono text-sm transition-all",
                  selectedWeek === w ? "bg-slate-900 text-white" : "bg-white border border-slate-300 hover:bg-slate-50 font-bold"
                )}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {DAYS.map(day => {
            const displayType = dynamicSchedule[day];
            return (
              <button 
                key={day}
                onClick={() => handlePresenceToggle(day)}
                className={cn(
                  "p-4 rounded-2xl border transition-all text-center group",
                  currentWeekLog.presence[day] 
                    ? "bg-green-600 border-green-600 text-white shadow-lg shadow-green-600/20" 
                    : "bg-white border-slate-300 hover:border-red-600 shadow-sm"
                )}
              >
                <div className="text-[8px] uppercase tracking-widest text-slate-900 font-black group-hover:text-red-600 mb-1">{day}</div>
                <div className="text-[10px] font-black mb-2 truncate text-slate-700 group-hover:text-slate-900">{displayType}</div>
                <div className="flex justify-center">
                  {currentWeekLog.presence[day] ? <Check size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-slate-200 group-hover:border-red-600" />}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Utilization Summary */}
      <section className="bg-slate-900 text-slate-50 rounded-3xl p-8 shadow-xl shadow-slate-900/20">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xs uppercase tracking-[0.3em] font-black opacity-80">Aproveitamento do Treinamento (Média Semanal)</h3>
          <InfoPopover 
            title="Como é calculado o Aproveitamento?" 
            content="O aproveitamento é o percentual de repetições totais realizadas em relação à meta prescrita. O Microciclo é a média de todas as categorias." 
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <UtilizationStat label="Upper Push" value={calculateCategoryUtilization('Upper Push')} />
          <UtilizationStat label="Upper Pull" value={calculateCategoryUtilization('Upper Pull')} />
          <UtilizationStat label="Lower Body" value={calculateCategoryUtilization('Lower Body')} />
          <UtilizationStat label="Microciclo" value={microcicloUtilization} highlight />
        </div>
      </section>

      {/* Strength Training Table */}
      {trainingTypes.length === 0 && aerobicSessions.length === 0 && (
        <div className="text-center py-12 text-slate-500 font-bold bg-slate-50 rounded-xl border border-slate-200">
          Neste dia ({currentDayName}) é dia de {todaySchedule?.type || 'descanso'}. Não há exercícios de força ou aeróbicos prescritos.
        </div>
      )}
      {trainingTypes.length > 0 && (
        <section className="space-y-8">
          {trainingTypes.map(category => (
            <div key={category} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-300 pb-2">
                <h3 className="text-xl font-serif italic">{category}</h3>
                <div className="text-xs font-black text-red-600">
                  Média do Treino: {calculateTrainingAverageForCategory(category).toFixed(1)}%
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-slate-900 font-black border-b border-slate-300">
                      <th className="py-4 font-black">Exercício</th>
                      <th className="py-4 font-black text-center">Intensidade</th>
                      <th className="py-4 font-black text-center">Carga</th>
                      <th className="py-4 font-black text-center">Reps</th>
                      <th className="py-4 font-black text-center">Descanso</th>
                      <th className="py-4 font-black text-center">Set 1</th>
                      <th className="py-4 font-black text-center">Set 2</th>
                      <th className="py-4 font-black text-center">Set 3</th>
                      <th className="py-4 font-black text-right">Aprov. Exercício</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(() => {
                      const rows = exercises.filter(e => e.category === category);
                      
                      return rows.map((ex: any) => {
                        const log = currentWeekLog.strength[ex.id];
                        const test = userData.currentCycle.initialStrengthTests[ex.id];
                        
                        // Calculate intensity and reps based on 1RM
                        const intensity = 60; // Example: 60%
                        const prescribedWeight = test ? Math.round(test.estimated1RM * (intensity / 100)) : 0;
                        const goalReps = 20; // Example: 20 reps
                        const util = calculateExUtilization(ex.id);

                        return (
                          <tr key={ex.id} className="group hover:bg-white/50 transition-colors">
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ex.type === 'FIXO' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>
                                  <Dumbbell size={16} />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    {ex.subExercises && ex.subExercises.length > 0 ? (
                                      <div className="flex items-center gap-2">
                                        <select 
                                          className="bg-transparent border-b border-red-600 focus:outline-none cursor-pointer text-sm font-bold text-slate-900"
                                          value={userData.currentCycle.selectedSubExercises?.[ex.id] || ex.name}
                                          onChange={e => {
                                            const newSelected = { ...userData.currentCycle.selectedSubExercises, [ex.id]: e.target.value };
                                            updateCurrentCycle({ selectedSubExercises: newSelected });
                                          }}
                                        >
                                          <option value={ex.name}>{ex.name}</option>
                                          {ex.subExercises.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                        </select>
                                        <a 
                                          href={userData.currentCycle.selectedSubExercises?.[ex.id] 
                                            ? (ex.subExercises?.find(s => s.name === userData.currentCycle.selectedSubExercises?.[ex.id])?.videoUrl || ex.videoUrl)
                                            : ex.videoUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-slate-400 hover:text-red-600 transition-colors"
                                        >
                                          <ExternalLink size={12} />
                                        </a>
                                      </div>
                                    ) : (
                                      <a 
                                        href={ex.videoUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-sm font-bold hover:text-red-600 transition-colors flex items-center gap-1"
                                      >
                                        {ex.name}
                                        <ExternalLink size={12} className="opacity-50" />
                                      </a>
                                    )}
                                    <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded ${ex.type === 'FIXO' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                      {ex.type}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{ex.category}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 text-center font-mono text-xs opacity-90 font-bold">{intensity}%</td>
                            <td className="py-4 text-center font-mono text-sm font-bold text-red-600">{prescribedWeight}kg</td>
                            <td className="py-4 text-center font-mono text-sm">{goalReps}</td>
                            <td className="py-4 text-center font-mono text-xs opacity-90 font-bold">1 min</td>
                            {[0, 1, 2].map(idx => (
                              <td key={idx} className="py-4 px-2">
                                <input 
                                  type="number"
                                  className="w-12 bg-slate-100 border border-slate-300 focus:border-red-600 p-1 text-center font-mono text-sm outline-none rounded-lg mx-auto block transition-all"
                                  value={log?.sets[idx] ?? ''}
                                  onChange={e => handleStrengthSetUpdate(ex.id, idx, e.target.value ? Number(e.target.value) : null)}
                                />
                              </td>
                            ))}
                            <td className="py-4 text-right">
                              <span className={cn(
                                "text-xs font-bold font-mono",
                                util >= 80 ? "text-green-600" : util >= 60 ? "text-yellow-600" : "text-red-600"
                              )}>
                                {util.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Aeróbico Training Table */}
      {aerobicSessions.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xl font-serif italic">Condicionamento Aeróbico</h3>
          <p className="text-sm text-gray-600 mb-2">
            O treino simula rounds de luta: 5 min de esforço + 1 min de descanso.
            A intensidade progride mensalmente: Leve → Moderado → Intenso → Simulação Real.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-red-700">
              <thead>
                <tr className="bg-red-700 text-white text-[10px] uppercase tracking-widest font-black">
                  <th className="py-2 px-4 border border-red-700 text-center">Semana</th>
                  <th className="py-2 px-4 border border-red-700 text-center">Treino</th>
                  <th className="py-2 px-4 border border-red-700 text-center">Séries</th>
                  <th className="py-2 px-4 border border-red-700 text-center">Duração (min)</th>
                  <th className="py-2 px-4 border border-red-700 text-center">Intensidade</th>
                  <th className="py-2 px-4 border border-red-700 text-center">Km/h</th>
                  <th className="py-2 px-4 border border-red-700 text-center">Distancia</th>
                  <th className="py-2 px-4 border border-red-700 text-center">PSE</th>
                  <th className="py-2 px-4 border border-red-700 text-center">Média da FC (bpm)</th>
                </tr>
              </thead>
              <tbody>
                {aerobicSessions.map((session, sIdx) => {
                  const vvo2 = userData.currentCycle.initialAerobicTest?.vVo2Max || 0;
                  
                  if (session.type === 'JiuJitsu') {
                    const intensities = ['Leve', 'Moderado', 'Intenso', 'Simulação Real'];
                    const currentIntensity = intensities[selectedWeek - 1] || 'Leve';
                    
                    return (
                      <tr key={session.id} className="group hover:bg-red-50 transition-colors">
                        {sIdx === 0 && (
                          <td rowSpan={aerobicSessions.filter(s => s.type === 'JiuJitsu').length} className="bg-red-800 text-white font-black text-4xl text-center border border-red-700">
                            {selectedWeek}
                          </td>
                        )}
                        <td className="py-4 text-center font-bold text-xl border border-red-700">
                           {(selectedWeek - 1) * 2 + sIdx + 1}
                        </td>
                        <td className="py-4 text-center font-bold border border-red-700">{session.rounds} x {session.roundTime}min</td>
                        <td className="py-4 text-center font-bold border border-red-700">{session.restTime}min</td>
                        <td className="py-2 px-4 text-center font-bold border border-red-700">{currentIntensity}</td>
                        <td className="py-2 px-4 text-center font-bold text-red-700 border border-red-700">-</td>
                        <td className="py-2 px-4 border border-red-700 bg-amber-50">
                          <input 
                            type="number"
                            className="w-full bg-transparent text-center font-mono text-sm font-bold outline-none"
                            placeholder="Rounds"
                            onChange={e => handleAerobicUpdate(session.id, 'rounds', e.target.value ? Number(e.target.value) : null)}
                          />
                        </td>
                        <td className="py-2 px-4 border border-red-700 bg-amber-50">
                          <PSESelector 
                            value={userData.currentCycle.weeklyLogs?.[selectedWeek]?.aerobic?.[session.id]?.rpe || null}
                            onChange={val => handleAerobicUpdate(session.id, 'rpe', val)} 
                          />
                        </td>
                        <td className="py-2 px-4 border border-red-700 bg-amber-50">
                           -
                        </td>
                      </tr>
                    );
                  }

                  return session.stages.map((stage, stIdx) => {
                    const sessionId = `${session.id}_${stage.id}`;
                    const log = currentWeekLog.aerobic[sessionId];
                    const intensityValue = parseInt(stage.intensity) / 100;
                    const speed = (vvo2 * intensityValue).toFixed(1);
                    
                    return (
                      <tr key={sessionId} className="group hover:bg-red-50 transition-colors">
                        {sIdx === 0 && stIdx === 0 && (
                          <td rowSpan={aerobicSessions.filter(s => s.type !== 'JiuJitsu').reduce((acc, s) => acc + s.stages.length, 0)} className="bg-red-800 text-white font-black text-4xl text-center border border-red-700">
                            {selectedWeek}
                          </td>
                        )}
                        {stIdx === 0 && (
                          <>
                            <td rowSpan={session.stages.length} className="py-4 text-center font-bold text-xl border border-red-700">
                              {(selectedWeek - 1) * 2 + sIdx + 1}
                            </td>
                            <td rowSpan={session.stages.length} className="py-4 text-center font-bold border border-red-700">1</td>
                            <td rowSpan={session.stages.length} className="py-4 text-center font-bold border border-red-700">20</td>
                          </>
                        )}
                        <td className="py-2 px-4 text-center font-bold border border-red-700">{stage.intensity}</td>
                        <td className="py-2 px-4 text-center font-bold text-red-700 border border-red-700">{speed}</td>
                        <td className="py-2 px-4 border border-red-700 bg-amber-50">
                          <input 
                            type="number"
                            className="w-full bg-transparent text-center font-mono text-sm font-bold outline-none"
                            value={log?.distance ?? ''}
                            onChange={e => handleAerobicUpdate(sessionId, 'distance', e.target.value ? Number(e.target.value) : null)}
                          />
                        </td>
                        <td className="py-2 px-4 border border-red-700 bg-amber-50">
                          <PSESelector 
                            value={log?.rpe ?? null} 
                            onChange={val => handleAerobicUpdate(sessionId, 'rpe', val)} 
                          />
                        </td>
                        <td className="py-2 px-4 border border-red-700 bg-amber-50">
                          <input 
                            type="number"
                            className="w-full bg-transparent text-center font-mono text-sm font-bold outline-none"
                            value={log?.avgHr ?? ''}
                            onChange={e => handleAerobicUpdate(sessionId, 'avgHr', e.target.value ? Number(e.target.value) : null)}
                          />
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Vo2 max Test (Retest Week) */}
      {todaySchedule.type === 'Vo2 max' && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-serif italic">Teste de Vo2 Máx (Reteste)</h3>
            <InfoPopover 
              title="Teste de Cooper" 
              content="Corra a maior distância possível em 12 minutos. Registre o resultado para calcular seu VO2 Máximo atual." 
            />
          </div>
          <div className="bg-white rounded-3xl p-8 border border-slate-300 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/20">
                    <Activity size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black uppercase tracking-widest">Cooper Test</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">12 Minutos de Corrida</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-[8px] uppercase font-black text-slate-400 mb-1 block">Distância Percorrida (metros)</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-lg font-mono font-bold focus:border-red-600 outline-none"
                        placeholder="Ex: 2400"
                        value={retestAerobicDist || ''}
                        onChange={e => setRetestAerobicDist(Number(e.target.value))}
                      />
                      <button 
                        onClick={handleRetestAerobicUpdate}
                        className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                      >
                        <Check size={24} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-4 shadow-xl">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">VO2 Máximo Atual</span>
                  <span className="text-2xl font-black text-red-500">{userData.currentCycle.retestAerobicTest?.vo2Max || 0}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">VVO2 Máximo</span>
                  <span className="text-2xl font-black text-red-500">{userData.currentCycle.retestAerobicTest?.vVo2Max || 0} km/h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">Melhoria</span>
                  <span className={cn("text-xl font-black", 
                    ((userData.currentCycle.retestAerobicTest?.distance || 0) - (userData.currentCycle.initialAerobicTest?.distance || 0)) >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {userData.currentCycle.initialAerobicTest?.distance && userData.currentCycle.retestAerobicTest?.distance ? 
                      (((userData.currentCycle.retestAerobicTest.distance - userData.currentCycle.initialAerobicTest.distance) / userData.currentCycle.initialAerobicTest.distance) * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Aula (Class) */}
      {todaySchedule.type === 'Aula' && (
        <section className="space-y-6">
          <h3 className="text-xl font-serif italic">Aula de Jiu-Jitsu</h3>
          <div className="bg-white rounded-3xl p-8 border border-slate-300 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-xl">
              <Users size={32} />
            </div>
            <div>
              <h4 className="text-lg font-black uppercase tracking-widest">Treino Técnico / Específico</h4>
              <p className="text-sm text-slate-500 mt-1">
                Hoje o foco é na aula técnica e rolas. Mantenha a intensidade conforme orientado pelo seu professor.
              </p>
              <div className="flex gap-4 mt-4">
                <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600">Técnica</div>
                <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600">Drills</div>
                <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600">Sparring</div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function UtilizationStat({ label, value, highlight = false }: { label: string, value: number, highlight?: boolean }) {
  return (
    <div className={cn("space-y-1", highlight && "border-l border-white/10 pl-8")}>
      <div className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-black">{label}</div>
      <div className={cn("text-2xl font-mono font-bold", highlight ? "text-red-500" : "text-white")}>
        {value.toFixed(1)}%
      </div>
    </div>
  );
}

function ScheduleSection({ userData, updateUserData }: { userData: UserData, updateUserData: (updates: Partial<UserData>) => void }) {
  const days: DayOfWeek[] = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const schedule = userData.trainingSchedule || INITIAL_STATE.trainingSchedule!;

  const addSession = (day: DayOfWeek) => {
    const newSession: TrainingSession = { type: 'Jiu-Jitsu', time: '18:00', duration: 90 };
    const newSchedule = { ...schedule, [day]: [...(schedule[day] || []), newSession] };
    updateUserData({ trainingSchedule: newSchedule });
  };

  const removeSession = (day: DayOfWeek, index: number) => {
    const newSchedule = { ...schedule, [day]: schedule[day].filter((_, i) => i !== index) };
    updateUserData({ trainingSchedule: newSchedule });
  };

  const updateSession = (day: DayOfWeek, index: number, updates: Partial<TrainingSession>) => {
    const newSchedule = {
      ...schedule,
      [day]: schedule[day].map((s, i) => i === index ? { ...s, ...updates } : s)
    };
    updateUserData({ trainingSchedule: newSchedule });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-serif italic">Agenda de Treinos</h2>
          <InfoPopover 
            title="Sincronização Nutricional" 
            content="Seus horários de treino definem automaticamente as janelas ideais para refeições pré e pós-treino no seu diário nutricional." 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {days.map(day => (
          <Card key={day} title={day}>
            <div className="space-y-4">
              {schedule[day]?.map((session, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <select 
                      value={session.type}
                      onChange={(e) => updateSession(day, idx, { type: e.target.value as TrainingType })}
                      className="bg-transparent text-[10px] font-black uppercase tracking-widest text-red-600 outline-none"
                    >
                      <option value="Jiu-Jitsu">Jiu-Jitsu</option>
                      <option value="Academia">Academia</option>
                    </select>
                    <button onClick={() => removeSession(day, idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <Plus size={14} className="rotate-45" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8px] uppercase font-black text-slate-400">Horário</label>
                      <input 
                        type="time"
                        value={session.time}
                        onChange={(e) => updateSession(day, idx, { time: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] uppercase font-black text-slate-400">Duração (min)</label>
                      <input 
                        type="number"
                        value={session.duration}
                        onChange={(e) => updateSession(day, idx, { duration: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={() => addSession(day)}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all flex items-center justify-center gap-2 group"
              >
                <Plus size={16} className="group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Adicionar Treino</span>
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NutritionSection({ userData, updateUserData }: { userData: UserData, updateUserData: (updates: Partial<UserData>) => void }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const weight = userData.currentCycle.initialMetrics.weight || 70;
  const isAthlete = userData.path === 'Competidor';
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [searchFood, setSearchFood] = useState('');

  const dayOfWeekMap: Record<number, string> = {
    0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado'
  };
  const dayOfWeek = dayOfWeekMap[new Date(selectedDate + 'T12:00:00').getDay()];
  const trainingSessions = (userData.trainingSchedule?.[dayOfWeek] || []).filter(s => s.type === 'Academia');

  // Targets based on weight
  const preWorkoutCarbsGoal = Math.round(weight * 1);
  const postWorkoutCarbsGoal = Math.round(weight * 0.8);
  const postWorkoutProtGoal = Math.round(weight * 0.2);
  const goldenTipProt = Math.round(weight * 0.3);

  // Daily Targets
  const dailyProtGoal = Math.round(weight * (isAthlete ? 2.2 : 1.8));
  const dailyFatGoal = Math.round(weight * (isAthlete ? 1.0 : 0.9));
  const dailyCarbsGoal = Math.round(weight * (isAthlete ? 6.0 : 4.0));
  const dailyCalsGoal = Math.round((dailyProtGoal * 4) + (dailyCarbsGoal * 4) + (dailyFatGoal * 9));

  const getInitialMeals = (sessions: TrainingSession[]) => {
    const baseMeals: Meal[] = [
      { id: 'm1', name: 'Café da Manhã', time: '08:00', items: [] },
      { id: 'm2', name: 'Almoço', time: '12:00', items: [] },
      { id: 'm3', name: 'Lanche da Tarde', time: '15:00', items: [] },
      { id: 'm4', name: 'Lanche Pré-Treino', time: '17:00', items: [] },
      { id: 'm5', name: 'Jantar / Pós-Treino', time: '20:00', items: [] },
      { id: 'm6', name: 'Ceia', time: '22:00', items: [] }
    ];

    if (sessions.length === 0) return baseMeals;

    const timeToMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const minutesToTime = (mins: number) => {
      let normalized = mins % 1440;
      if (normalized < 0) normalized += 1440;
      const h = Math.floor(normalized / 60);
      const m = normalized % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const mealsWithFlags = baseMeals.map(m => ({ ...m, isPreWorkout: false, isPostWorkout: false }));

    sessions.forEach(session => {
      const sStart = timeToMinutes(session.time);
      const sEnd = sStart + (session.duration || 90);
      
      const idealPre = sStart - 60;
      const idealPost = sEnd + 30;

      // Find best pre-workout meal (must be before session)
      let bestPreIdx = -1;
      let minPreDiff = Infinity;
      mealsWithFlags.forEach((meal, idx) => {
        const mTime = timeToMinutes(meal.time);
        if (mTime < sStart) {
          const diff = Math.abs(mTime - idealPre);
          if (diff < minPreDiff) {
            minPreDiff = diff;
            bestPreIdx = idx;
          }
        }
      });

      if (bestPreIdx !== -1) {
        mealsWithFlags[bestPreIdx].isPreWorkout = true;
        mealsWithFlags[bestPreIdx].time = minutesToTime(idealPre);
        mealsWithFlags[bestPreIdx].name = 'Refeição Pré-Treino';
      }

      // Find best post-workout meal (must be after session start)
      let bestPostIdx = -1;
      let minPostDiff = Infinity;
      mealsWithFlags.forEach((meal, idx) => {
        const mTime = timeToMinutes(meal.time);
        if (mTime > sStart && idx !== bestPreIdx) {
          const diff = Math.abs(mTime - idealPost);
          if (diff < minPostDiff) {
            minPostDiff = diff;
            bestPostIdx = idx;
          }
        }
      });

      if (bestPostIdx !== -1) {
        mealsWithFlags[bestPostIdx].isPostWorkout = true;
        mealsWithFlags[bestPostIdx].time = minutesToTime(idealPost);
        mealsWithFlags[bestPostIdx].name = 'Refeição Pós-Treino';
      }
    });

    return mealsWithFlags;
  };

  const dailyNutrition = userData.nutritionLog?.[selectedDate] || { meals: getInitialMeals(trainingSessions) };
  const meals = [...dailyNutrition.meals].sort((a, b) => a.time.localeCompare(b.time));

  const calculateMealMacros = (meal: Meal) => {
    return meal.items.reduce((acc, item) => {
      const food = FOOD_DATABASE.find(f => f.id === item.foodId);
      if (food) {
        const factor = food.isPerUnit ? item.quantity : item.quantity / 100;
        acc.calories += food.calories * factor;
        acc.protein += food.protein * factor;
        acc.carbs += food.carbs * factor;
        acc.fat += food.fat * factor;
      }
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const totalMacros = meals.reduce((acc, meal) => {
    const mealMacros = calculateMealMacros(meal);
    acc.calories += mealMacros.calories;
    acc.protein += mealMacros.protein;
    acc.carbs += mealMacros.carbs;
    acc.fat += mealMacros.fat;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const getAdequacy = (current: number, target: number) => {
    if (current > target * 1.1) return { label: 'Ultrapassou', color: 'text-red-600', bg: 'bg-red-50' };
    if (current < target * 0.9) return { label: 'Faltando', color: 'text-amber-600', bg: 'bg-amber-50' };
    return { label: 'Bom', color: 'text-green-600', bg: 'bg-green-50' };
  };

  const updateDailyNutrition = (updates: Partial<DailyNutrition>) => {
    const newLog = {
      ...(userData.nutritionLog || {}),
      [selectedDate]: { ...dailyNutrition, ...updates }
    };
    updateUserData({ nutritionLog: newLog });
  };

  const updateMeal = (mealId: string, updates: Partial<Meal>) => {
    const newMeals = meals.map(m => m.id === mealId ? { ...m, ...updates } : m);
    updateDailyNutrition({ meals: newMeals });
  };

  const addFoodToMeal = (mealId: string, foodId: string) => {
    const meal = meals.find(m => m.id === mealId);
    if (!meal) return;
    const newItems = [...meal.items, { foodId, quantity: 100 }];
    updateMeal(mealId, { items: newItems });
  };

  const removeFoodFromMeal = (mealId: string, index: number) => {
    const meal = meals.find(m => m.id === mealId);
    if (!meal) return;
    const newItems = meal.items.filter((_, i) => i !== index);
    updateMeal(mealId, { items: newItems });
  };

  const updateFoodQuantity = (mealId: string, index: number, quantity: number) => {
    const meal = meals.find(m => m.id === mealId);
    if (!meal) return;
    const newItems = meal.items.map((item, i) => i === index ? { ...item, quantity } : item);
    updateMeal(mealId, { items: newItems });
  };

  const filteredFoods = FOOD_DATABASE.filter(f => f.name.toLowerCase().includes(searchFood.toLowerCase()));

  const preWorkoutMeal = meals.find(m => m.isPreWorkout);
  const postWorkoutMeal = meals.find(m => m.isPostWorkout);

  const preMacros = preWorkoutMeal ? calculateMealMacros(preWorkoutMeal) : { carbs: 0 };
  const postMacros = postWorkoutMeal ? calculateMealMacros(postWorkoutMeal) : { carbs: 0, protein: 0 };

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-serif italic">Nutrição & Performance</h2>
          <InfoPopover 
            title="Estratégia Nutricional" 
            content="Ajustamos seus macros para maximizar a performance no tatame e a recuperação muscular. Atletas possuem metas mais agressivas de carboidratos e proteínas." 
          />
        </div>
        <div className="flex items-center gap-4">
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-red-500"
          />
          <div className={cn(
            "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border",
            isAthlete ? "bg-red-50 border-red-200 text-red-600" : "bg-slate-50 border-slate-200 text-slate-600"
          )}>
            Perfil: {userData.path}
          </div>
        </div>
      </div>

      {/* Training Context for the Day */}
      {trainingSessions.length > 0 && (
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Treinos de {dayOfWeek}:</span>
            {trainingSessions.map((session, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-red-50 border border-red-100 px-3 py-1.5 rounded-full whitespace-nowrap">
                <Activity size={12} className="text-red-600" />
                <span className="text-[10px] font-bold text-red-900">{session.type} às {session.time}</span>
              </div>
            ))}
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowResetConfirm(!showResetConfirm)}
              className="text-[8px] font-black uppercase text-red-600 hover:underline whitespace-nowrap"
            >
              Redefinir por Agenda
            </button>
            {showResetConfirm && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 shadow-xl p-4 rounded-2xl z-50 min-w-[200px] animate-in zoom-in-95 duration-200">
                <p className="text-[10px] font-black uppercase text-slate-500 mb-3">Redefinir marcações de Pré/Pós treino?</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const resetMeals = getInitialMeals(trainingSessions);
                      updateDailyNutrition({ meals: resetMeals });
                      setShowResetConfirm(false);
                    }}
                    className="flex-1 bg-red-600 text-white text-[10px] font-black uppercase py-2 rounded-xl hover:bg-red-700 transition-colors"
                  >
                    Sim
                  </button>
                  <button 
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase py-2 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Não
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Daily Targets & Ideal Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Calorias Diárias" value={dailyCalsGoal} sub="kcal" color="slate" info="Total estimado para manter o rendimento e composição alvo." />
        <StatCard label="Proteína Diária" value={dailyProtGoal} sub="g" color="red" info={`${isAthlete ? '2.2g/kg' : '1.8g/kg'} - Foco em síntese proteica.`} />
        <StatCard label="Carboidratos Diários" value={dailyCarbsGoal} sub="g" color="green" info="Meta de carboidratos para suporte energético." />
        <StatCard label="Gordura Diária" value={dailyFatGoal} sub="g" color="green" info="Meta de gorduras para suporte hormonal." />
      </div>

      {/* Adequacy Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Adequação Diária (Total)">
          <div className="space-y-4">
            {[
              { label: 'Calorias', current: totalMacros.calories, target: dailyCalsGoal, unit: 'kcal' },
              { label: 'Proteínas', current: totalMacros.protein, target: dailyProtGoal, unit: 'g' },
              { label: 'Carboidratos', current: totalMacros.carbs, target: dailyCarbsGoal, unit: 'g' },
              { label: 'Gorduras', current: totalMacros.fat, target: dailyFatGoal, unit: 'g' },
            ].map(macro => {
              const adequacy = getAdequacy(macro.current, macro.target);
              return (
                <div key={macro.label} className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black uppercase text-slate-500">{macro.label}</span>
                    <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-full", adequacy.bg, adequacy.color)}>
                      {adequacy.label}
                    </span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-black text-slate-900">{Math.round(macro.current)}</span>
                    <span className="text-xs font-bold text-slate-400 mb-1">/ {macro.target}{macro.unit}</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-500", adequacy.color.replace('text', 'bg'))}
                      style={{ width: `${Math.min((macro.current / macro.target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pre-Workout Highlight */}
            <div className="p-6 bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Timer size={60} />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                  <Activity className="text-white" size={16} />
                </div>
                <h4 className="text-xs uppercase tracking-[0.2em] font-black text-red-500">Pré-Treino</h4>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-black opacity-60">Carbo Alvo</span>
                  <span className="text-xl font-black">{preWorkoutCarbsGoal}g</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-black opacity-60">Carbo Atual</span>
                  <span className={cn(
                    "text-xl font-black",
                    getAdequacy(preMacros.carbs, preWorkoutCarbsGoal).color
                  )}>{Math.round(preMacros.carbs)}g</span>
                </div>
              </div>
            </div>

            {/* Post-Workout Highlight */}
            <div className="p-6 bg-white rounded-3xl border border-slate-300 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Plus size={60} />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <Check className="text-white" size={16} />
                </div>
                <h4 className="text-xs uppercase tracking-[0.2em] font-black text-green-600">Pós-Treino</h4>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-black text-slate-400">Carbo Alvo</span>
                  <span className="text-xl font-black text-slate-900">{postWorkoutCarbsGoal}g</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-black text-slate-400">Prot Alvo</span>
                  <span className="text-xl font-black text-slate-900">{postWorkoutProtGoal}g</span>
                </div>
              </div>
            </div>
          </div>

          <Card title="Diário de Refeições">
            <div className="space-y-4">
              {meals.map(meal => (
                <div key={meal.id} className={cn(
                  "p-4 rounded-2xl border transition-all",
                  meal.isPreWorkout ? "bg-red-50 border-red-100" : 
                  meal.isPostWorkout ? "bg-green-50 border-green-100" : 
                  "bg-slate-50 border-slate-200"
                )}>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-900 uppercase tracking-tight">{meal.name}</h4>
                          <button 
                            onClick={() => {
                              const newMeals = meals.filter(m => m.id !== meal.id);
                              updateDailyNutrition({ meals: newMeals });
                            }}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Plus size={12} className="rotate-45" />
                          </button>
                        </div>
                        <span className="text-[8px] font-mono text-slate-400">{meal.time}</span>
                      </div>
                      {meal.isPreWorkout && <span className="text-[8px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black uppercase">Pré</span>}
                      {meal.isPostWorkout && <span className="text-[8px] bg-green-600 text-white px-2 py-0.5 rounded-full font-black uppercase">Pós</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => updateMeal(meal.id, { isPreWorkout: !meal.isPreWorkout, isPostWorkout: false })}
                        className={cn("text-[8px] font-black uppercase px-2 py-1 rounded-lg border transition-all", meal.isPreWorkout ? "bg-red-600 text-white border-red-600" : "text-slate-400 border-slate-200 hover:border-red-200")}
                      >
                        Marcar Pré
                      </button>
                      <button 
                        onClick={() => updateMeal(meal.id, { isPostWorkout: !meal.isPostWorkout, isPreWorkout: false })}
                        className={cn("text-[8px] font-black uppercase px-2 py-1 rounded-lg border transition-all", meal.isPostWorkout ? "bg-green-600 text-white border-green-600" : "text-slate-400 border-slate-200 hover:border-green-200")}
                      >
                        Marcar Pós
                      </button>
                      <button 
                        onClick={() => setEditingMealId(editingMealId === meal.id ? null : meal.id)}
                        className="text-[10px] font-black uppercase text-red-600 hover:underline"
                      >
                        {editingMealId === meal.id ? 'Fechar' : 'Editar'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {meal.items.map((item, idx) => {
                      const food = FOOD_DATABASE.find(f => f.id === item.foodId);
                      if (!food) return null;
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-slate-200">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{food.name}</span>
                            {editingMealId === meal.id ? (
                              <div className="flex items-center gap-1 mt-1">
                                <input 
                                  type="number"
                                  className="w-16 px-1 py-0.5 border border-slate-200 rounded text-[10px] font-mono"
                                  value={item.quantity}
                                  onChange={(e) => updateFoodQuantity(meal.id, idx, Number(e.target.value))}
                                />
                                <span className="text-[10px] text-slate-400">{food.unit}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400">{item.quantity}{food.unit}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-[8px] uppercase font-black text-slate-400">Prot</div>
                              <div className="font-mono font-bold">{Math.round(food.protein * (food.isPerUnit ? item.quantity : item.quantity / 100))}g</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[8px] uppercase font-black text-slate-400">Carbo</div>
                              <div className="font-mono font-bold">{Math.round(food.carbs * (food.isPerUnit ? item.quantity : item.quantity / 100))}g</div>
                            </div>
                            {editingMealId === meal.id && (
                              <button 
                                onClick={() => removeFoodFromMeal(meal.id, idx)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Plus size={14} className="rotate-45" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {meal.items.length === 0 && (
                      <p className="text-[10px] text-slate-400 italic">Nenhum alimento adicionado.</p>
                    )}
                  </div>

                  {editingMealId === meal.id && (
                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase font-black text-slate-400">Nome da Refeição</label>
                          <input 
                            type="text"
                            value={meal.name}
                            onChange={(e) => updateMeal(meal.id, { name: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-red-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase font-black text-slate-400">Horário</label>
                          <input 
                            type="time"
                            value={meal.time}
                            onChange={(e) => updateMeal(meal.id, { time: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-1 focus:ring-red-500"
                          />
                        </div>
                      </div>
                      <div className="relative">
                        <input 
                          type="text"
                          placeholder="Buscar alimento..."
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500 outline-none"
                          value={searchFood}
                          onChange={(e) => setSearchFood(e.target.value)}
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {filteredFoods.map(food => (
                          <button
                            key={food.id}
                            onClick={() => addFoodToMeal(meal.id, food.id)}
                            className="w-full flex items-center justify-between p-2 hover:bg-white rounded-lg text-left text-[10px] font-bold text-slate-700 transition-colors"
                          >
                            <span>{food.name}</span>
                            <Plus size={12} className="text-red-600" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button 
                onClick={() => {
                  const newMeal: Meal = {
                    id: `m-${Date.now()}`,
                    name: 'Nova Refeição',
                    time: '12:00',
                    items: []
                  };
                  updateDailyNutrition({ meals: [...meals, newMeal] });
                }}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all flex items-center justify-center gap-2 group"
              >
                <Plus size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Adicionar Refeição</span>
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Golden Tip */}
      <div className="p-6 bg-slate-900 text-slate-50 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Activity size={80} />
        </div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
            <Plus className="text-white" size={16} />
          </div>
          <h4 className="text-xs uppercase tracking-[0.2em] font-black text-red-500">Dica de Ouro</h4>
        </div>
        <p className="text-lg font-serif italic mb-2">
          Consuma <span className="text-red-500 font-black not-italic">{goldenTipProt}g</span> de proteína a cada 3-4 horas.
        </p>
        <p className="text-[10px] text-slate-400 font-bold leading-relaxed max-w-md">
          A distribuição fracionada de proteína é o segredo para manter o balanço nitrogenado positivo e garantir que seu corpo não degrade massa magra durante o dia.
        </p>
      </div>
    </div>
  );
}

function BoletimSection({ userData }: { userData: UserData }) {
  const { exercises } = useExercises();
  
  const categories = [
    { label: 'Membros Superiores Puxada', cat: 'Upper Pull' },
    { label: 'Membros Superiores Empurrada', cat: 'Upper Push' },
    { label: 'Membros Inferiores', cat: 'Lower Body' }
  ];

  const allExercisesData = categories.flatMap(c => {
    const catExercises = exercises.filter(e => e.category === c.cat);
    return catExercises.map(ex => ({
      initial: userData.currentCycle.initialStrengthTests[ex.id]?.estimated1RM || 0,
      retest: userData.currentCycle.retestStrengthTests?.[ex.id]?.estimated1RM || 0
    }));
  });

  const totalInitialStrength = allExercisesData.reduce((acc, d) => acc + d.initial, 0);
  const totalRetestStrength = allExercisesData.reduce((acc, d) => acc + d.retest, 0);
  const strengthImprovement = totalInitialStrength > 0 ? ((totalRetestStrength - totalInitialStrength) / totalInitialStrength) * 100 : 0;

  const initialVO2 = userData.currentCycle.initialAerobicTest?.vo2Max || 0;
  const retestVO2 = userData.currentCycle.retestAerobicTest?.vo2Max || 0;
  const vo2Improvement = initialVO2 > 0 ? ((retestVO2 - initialVO2) / initialVO2) * 100 : 0;

  const initialFat = calculateBodyFat(userData.currentCycle.initialMetrics, userData.gender).fatPercentage;
  const retestFat = userData.currentCycle.retestMetrics ? calculateBodyFat(userData.currentCycle.retestMetrics, userData.gender).fatPercentage : initialFat;
  const fatImprovement = initialFat > 0 ? ((retestFat - initialFat) / initialFat) * 100 : 0;

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-300 shadow-sm">
      <h3 className="text-xl font-serif italic mb-6">Boletim</h3>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className={cn("p-4 rounded-xl text-center", vo2Improvement >= 0 ? "bg-green-900" : "bg-red-900")}>
          <div className="text-[8px] uppercase tracking-widest opacity-70 text-white">VO2 máx</div>
          <div className="text-xl font-black text-white">{vo2Improvement > 0 ? '+' : ''}{vo2Improvement.toFixed(1)}%</div>
        </div>
        <div className={cn("p-4 rounded-xl text-center", fatImprovement <= 0 ? "bg-green-900" : "bg-red-900")}>
          <div className="text-[8px] uppercase tracking-widest opacity-70 text-white">Gordura</div>
          <div className="text-xl font-black text-white">{fatImprovement > 0 ? '+' : ''}{fatImprovement.toFixed(1)}%</div>
        </div>
        <div className={cn("p-4 rounded-xl text-center", strengthImprovement >= 0 ? "bg-green-900" : "bg-red-900")}>
          <div className="text-[8px] uppercase tracking-widest opacity-70 text-white">Força</div>
          <div className="text-xl font-black text-white">{strengthImprovement > 0 ? '+' : ''}{strengthImprovement.toFixed(1)}%</div>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-200">
            <th className="pb-2">Que força estamos avaliando?</th>
            <th className="pb-2">Exercício</th>
            <th className="pb-2">1RM Inicial</th>
            <th className="pb-2">1RM Final</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {categories.flatMap(c => {
            const catExercises = exercises.filter(e => e.category === c.cat);
            return catExercises.map(ex => {
              const subName = userData.currentCycle.selectedSubExercises?.[ex.id];
              const displayName = subName || ex.name;
              const initial = userData.currentCycle.initialStrengthTests[ex.id]?.estimated1RM || 0;
              const retest = userData.currentCycle.retestStrengthTests?.[ex.id]?.estimated1RM || 0;

              return (
                <tr key={ex.id}>
                  <td className="py-2 text-xs font-bold text-slate-600">{c.label}</td>
                  <td className="py-2 text-xs font-black text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <Dumbbell size={10} className={ex.type === 'FIXO' ? 'text-red-600' : 'text-slate-400'} />
                      <span>{displayName}</span>
                      <span className={`text-[7px] uppercase font-black px-1 py-0.5 rounded ${ex.type === 'FIXO' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {ex.type}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 font-mono text-xs font-bold text-slate-400">{initial}kg</td>
                  <td className="py-2 font-mono text-xs font-black text-red-600">{retest}kg</td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}

function GamificationSection({ userData }: { userData: UserData }) {
  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-300 shadow-sm">
      <h3 className="text-xl font-serif italic mb-6">Monitoramento - Gameficação</h3>
      <div className="bg-red-900 text-white p-4 rounded-xl mb-6">
        <div className="flex justify-between items-center">
          <span className="font-bold">Presença Geral</span>
          <span className="text-xl font-black">0,0%</span>
        </div>
      </div>
      <table className="w-full text-sm mt-6">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-200">
            <th className="pb-2">Aeróbico (Histórico)</th>
            <th className="pb-2">Sem 1</th>
            <th className="pb-2">Sem 2</th>
            <th className="pb-2">Sem 3</th>
            <th className="pb-2">Sem 4</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Object.values(userData.currentCycle.weeklyLogs).map((week, idx) => (
            <tr key={idx}>
              <td className="py-2">Treino {idx + 1}</td>
              <td className="py-2">{week.aerobic ? 'Realizado' : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DashboardSection({ userData, bodyComp, setActiveTab }: { userData: UserData, bodyComp: any, setActiveTab: (tab: any) => void }) {
  const { exercises } = useExercises();
  const calculateCategoryUtilization = (week: number, category: string) => {
    const weekLog = userData.currentCycle.weeklyLogs[week];
    if (!weekLog) return 0;
    
    const relevantExercises = exercises.filter(e => e.category === category);
    
    if (relevantExercises.length === 0) return 0;

    const totalPerc = relevantExercises.reduce((acc, ex) => {
      const log = weekLog.strength[ex.id];
      if (!log) return acc;
      const totalReps = log.sets.reduce((sum, s) => sum + (s || 0), 0);
      const goalTotal = log.goalReps * 3;
      return acc + (totalReps / goalTotal) * 100;
    }, 0);
    return totalPerc / relevantExercises.length;
  };

  const chartData = [1, 2, 3, 4].map(w => ({
    name: `Sem ${w}`,
    push: calculateCategoryUtilization(w, 'Upper Push'),
    pull: calculateCategoryUtilization(w, 'Upper Pull'),
    lower: calculateCategoryUtilization(w, 'Lower Body'),
  }));

  const currentPresence = Object.values(userData.currentCycle.weeklyLogs).reduce((acc, week) => {
    return acc + Object.values(week.presence).filter(Boolean).length;
  }, 0);
  const trainingDaysPerWeek = Object.values(userData.trainingSchedule || {}).filter(sessions => 
    sessions.some(s => s.type === 'Academia')
  ).length;
  const totalPossiblePresence = 4 * (trainingDaysPerWeek || 7); // 4 weeks, use 7 as fallback if none marked
  const presencePerc = (currentPresence / totalPossiblePresence) * 100;

  const latestMicrociclo = (chartData[3].push + chartData[3].pull + chartData[3].lower) / 3;

  const startDate = new Date(userData.currentCycle.startDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const needsRetest = diffDays >= 30;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {needsRetest && (
        <div className="bg-red-600 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <Activity size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-widest">Semana de Reteste!</h3>
              <p className="text-red-100 text-sm mt-1">
                Já se passaram {diffDays} dias desde o início do ciclo. É hora de realizar seus retestes para acompanhar sua evolução.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('evaluations')}
            className="px-6 py-3 bg-white text-red-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-50 transition-all whitespace-nowrap"
          >
            Fazer Retestes
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <BoletimSection userData={userData} />
        <GamificationSection userData={userData} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="VO2 Máx" value={userData.currentCycle.initialAerobicTest?.vo2Max || 0} sub="ml/kg/min" color="red" info="Capacidade aeróbica máxima estimada pelo teste de Cooper." />
        <StatCard label="Gordura" value={bodyComp.fatPercentage} sub="%" color="slate" info="Percentual de gordura corporal atual." />
        <StatCard label="Massa Magra" value={bodyComp.leanMass} sub="kg" color="slate" info="Massa corporal livre de gordura." />
        <StatCard label="Presença" value={presencePerc} sub="%" color="green" info="Percentual de treinos realizados em relação ao total possível." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card title="Análise de Biotipo BJJ">
          <div className="space-y-6">
            {(() => {
              const { current, ideal, suggestion } = getIdealWeightCategory(
                userData.currentCycle.initialMetrics.weight,
                userData.currentCycle.initialMetrics.height,
                userData.gender
              );
              const { style, positions } = suggestBJJStyle(userData.currentCycle.initialMetrics);
              
              return (
                <>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <div className="text-[10px] uppercase font-black text-slate-400 mb-1">Categoria Atual</div>
                      <div className="text-xl font-black text-slate-900">{current}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-black text-slate-400 mb-1">Ideal Sugerida</div>
                      <div className="text-xl font-black text-red-600">{ideal}</div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                    <div className="text-[10px] uppercase font-black text-red-600 mb-2">Sugestão de Peso</div>
                    <p className="text-xs font-bold text-red-800 leading-relaxed">{suggestion}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900 text-white rounded-2xl">
                      <div className="text-[10px] uppercase font-black opacity-60 mb-1">Estilo Sugerido</div>
                      <div className="text-lg font-black">{style}</div>
                    </div>
                    <div className="p-4 bg-slate-100 rounded-2xl">
                      <div className="text-[10px] uppercase font-black text-slate-400 mb-1">Graduação</div>
                      <div className="text-lg font-black text-slate-900">{userData.belt || 'Branca'}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] uppercase font-black text-slate-400">Posições Fortes para seu Biotipo</div>
                    <div className="flex flex-wrap gap-2">
                      {positions.map(p => (
                        <span key={p} className="px-3 py-1 bg-slate-100 text-slate-700 text-[10px] font-black rounded-full border border-slate-200">{p}</span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <div className="text-[10px] uppercase font-black text-red-600 mb-3">Foco Técnico Recomendado</div>
                    {(() => {
                      const focus = getBJJTechnicalFocus(userData.currentCycle.initialMetrics.height, userData.currentCycle.initialMetrics.weight);
                      return (
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                            <span className="text-[10px] font-black text-red-800 uppercase">Guarda</span>
                            <span className="text-xs font-black text-red-900">{focus.guard}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Passagem</span>
                            <span className="text-xs font-black text-white">{focus.pass}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              );
            })()}
          </div>
        </Card>

        <Card title="Posições de Especialidade">
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[10px] uppercase font-black text-slate-400 mb-3">Suas Posições Favoritas</div>
              <div className="flex flex-wrap gap-2">
                {userData.strongPositions && userData.strongPositions.length > 0 ? (
                  userData.strongPositions.map(p => (
                    <span key={p} className="px-3 py-1 bg-red-600 text-white text-[10px] font-black rounded-full shadow-md shadow-red-600/20">{p}</span>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">Nenhuma posição favorita cadastrada no perfil.</p>
                )}
              </div>
            </div>

            <div className="p-5 bg-slate-900 rounded-2xl text-white">
              <h4 className="text-xs font-black uppercase tracking-widest mb-3 text-red-500">Dica Estratégica</h4>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                {userData.stylePreference === 'Guardeiro' 
                  ? "Como guardeiro, foque em manter a distância com seus membros longos e utilize ganchos para desequilibrar o oponente antes de atacar finalizações."
                  : userData.stylePreference === 'Passador'
                  ? "Como passador, use seu peso e pressão constante. Não dê espaço para o guardeiro repor e foque em estabilizar cada etapa da passagem."
                  : "Como atleta híbrido, sua versatilidade é sua maior arma. Use quedas para ditar onde a luta acontece e esteja pronto para transitar entre guarda e passagem."
                }
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-300 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-serif italic">Aproveitamento do Treinamento</h3>
            <InfoPopover 
              title="Gráfico de Evolução" 
              content="Acompanhe o percentual de aproveitamento de cada categoria de força ao longo das 4 semanas." 
            />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="push" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, fill: '#EF4444' }} />
                <Line type="monotone" dataKey="pull" stroke="#0f172a" strokeWidth={3} dot={{ r: 4, fill: '#0f172a' }} />
                <Line type="monotone" dataKey="lower" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-6 mt-6 justify-center">
            <LegendItem color="#EF4444" label="Upper Push" />
            <LegendItem color="#0f172a" label="Upper Pull" />
            <LegendItem color="#10B981" label="Lower Body" />
          </div>
        </div>

        <div className="space-y-4 bg-white rounded-3xl p-8 border border-slate-300 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-xl font-serif italic">Status de Atleta</h3>
            <InfoTooltip content="Baseado na média de aproveitamento da última semana." />
          </div>
          <div className="space-y-2">
            <StatusItem label="Campeão" range="100%" active={latestMicrociclo >= 100} color="bg-green-600" />
            <StatusItem label="Competitivo" range="90-99%" active={latestMicrociclo >= 90 && latestMicrociclo < 100} color="bg-green-400" />
            <StatusItem label="Pré-Competitivo" range="80-89%" active={latestMicrociclo >= 80 && latestMicrociclo < 90} color="bg-yellow-400" />
            <StatusItem label="Em Evolução" range="70-79%" active={latestMicrociclo >= 70 && latestMicrociclo < 80} color="bg-orange-400" />
            <StatusItem label="Fraco" range="60-69%" active={latestMicrociclo >= 60 && latestMicrociclo < 70} color="bg-red-300" />
            <StatusItem label="Muito Fraco" range="50-59%" active={latestMicrociclo >= 50 && latestMicrociclo < 60} color="bg-red-500" />
            <StatusItem label="Sobrevivente" range="<50%" active={latestMicrociclo < 50} color="bg-red-700" />
          </div>
        </div>
      </div>
    </div>
  );
}

function RetestContent({ userData, updateCurrentCycle, finishCycle }: { userData: UserData, updateCurrentCycle: (c: Partial<Cycle>) => void, finishCycle: (unsavedData?: Partial<Cycle>) => void }) {
  const { exercises } = useExercises();
  const [retestMetrics, setRetestMetrics] = useState<BodyMetrics>(userData.currentCycle.retestMetrics || userData.currentCycle.initialMetrics);
  const [retestAerobicDist, setRetestAerobicDist] = useState(userData.currentCycle.retestAerobicTest?.distance || 0);
  
  const initialComp = calculateBodyFat(userData.currentCycle.initialMetrics, userData.gender);
  const finalComp = calculateBodyFat(retestMetrics, userData.gender);
  
  const handleSaveRetest = () => {
    updateCurrentCycle({ retestMetrics: retestMetrics });
    alert('Dados de reteste salvos!');
  };

  const handleRetestStrengthUpdate = (id: string, series: 'buildUp' | 'test' | 'series2' | 'series3', field: string, value: any, defaultWeight?: number) => {
    const current = userData.currentCycle.retestStrengthTests?.[id] || {
      exercise: id,
      buildUp: { weight: 0, reps: 0, rest: '3 min' },
      test: { weight: defaultWeight || 0, reps: 0, rest: '3 min', completed: false },
      series2: { weight: 0, reps: 0, rest: '3 min' },
      series3: { weight: 0, reps: 0, rest: '3 min' },
      estimated1RM: 0
    };

    const updatedSeries = { ...current[series], [field]: value };
    const updatedTest = { ...current, [series]: updatedSeries };

    if (series === 'test' && field === 'reps' && updatedTest.test.weight === 0 && defaultWeight) {
      updatedTest.test.weight = defaultWeight;
    }

    const r1 = estimate1RM(updatedTest.test.weight, updatedTest.test.reps);
    const r2 = estimate1RM(updatedTest.series2.weight, updatedTest.series2.reps);
    const r3 = estimate1RM(updatedTest.series3.weight, updatedTest.series3.reps);
    updatedTest.estimated1RM = Math.max(r1, r2, r3);

    updateCurrentCycle({
      retestStrengthTests: {
        ...userData.currentCycle.retestStrengthTests,
        [id]: updatedTest
      }
    });
  };

  const handleRetestAerobicUpdate = () => {
    const vo2 = calculateVO2Max(retestAerobicDist);
    const vvo2 = calculateVVO2Max(retestAerobicDist);
    updateCurrentCycle({ retestAerobicTest: { distance: retestAerobicDist, vo2Max: vo2, vVo2Max: vvo2 } });
    alert('Reteste aeróbico calculado!');
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Retest Schedule Header */}
      <section className="bg-white rounded-3xl p-6 border border-slate-300 shadow-sm">
        <div className="grid grid-cols-7 gap-2">
          {RETEST_SCHEDULE.map(item => {
            const displayType = item.type;
            return (
              <div key={item.day} className="text-center">
                <div className="text-[10px] uppercase tracking-widest text-slate-900 font-black mb-1">{item.day}</div>
                <div className="text-xs font-black text-red-600">{displayType}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-serif italic mb-8">Reteste de Composição</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card title="Medidas Finais">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Peso" type="number" value={retestMetrics.weight} onChange={e => setRetestMetrics({ ...retestMetrics, weight: Number(e.target.value) })} />
              <Input label="Pescoço" type="number" value={retestMetrics.neck} onChange={e => setRetestMetrics({ ...retestMetrics, neck: Number(e.target.value) })} />
              <Input label="Abdômen" type="number" value={retestMetrics.abdomen} onChange={e => setRetestMetrics({ ...retestMetrics, abdomen: Number(e.target.value) })} />
              {userData.gender === 'Feminino' && (
                <Input label="Quadril" type="number" value={retestMetrics.hip || 0} onChange={e => setRetestMetrics({ ...retestMetrics, hip: Number(e.target.value) })} />
              )}
            </div>
            <button 
              onClick={handleSaveRetest}
              className="w-full mt-6 bg-slate-900 hover:bg-red-600 text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98]"
            >
              Salvar Reteste
            </button>
          </Card>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ComparisonCard label="Gordura (%)" initial={initialComp.fatPercentage} final={finalComp.fatPercentage} unit="%" inverse />
            <ComparisonCard label="Massa Gorda" initial={initialComp.fatMass} final={finalComp.fatMass} unit="kg" inverse />
            <ComparisonCard label="Massa Livre" initial={initialComp.leanMass} final={finalComp.leanMass} unit="kg" />
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-serif italic">Reteste de Força (1RM)</h2>
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-mono bg-slate-100 px-3 py-1 rounded-full">Meta: Superar 1RM Inicial</div>
        </div>
        
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-sm text-slate-800 mb-1">Build Up (Aquecimento)</h4>
            <p className="text-xs text-slate-600">
              O sistema calcula automaticamente 80% da carga do seu último teste. Faça uma série de aquecimento com essa carga, buscando de 5 a 7 repetições.
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-100">
            <h4 className="font-bold text-sm text-red-800 mb-1">Confere ! (Teste Principal)</h4>
            <p className="text-xs text-red-600">
              Utilize a <strong>mesma carga</strong> do seu teste inicial. O objetivo é tentar fazer <strong>mais repetições</strong> do que você conseguiu da primeira vez. Anote o novo número de repetições na coluna "Confere".
            </p>
          </div>
        </div>
        
        <div className="space-y-8">
          {['Upper Push', 'Upper Pull', 'Lower Body'].map(category => (
            <div key={category} className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest opacity-80 font-bold bg-slate-50">
                      <th className="py-4 px-4 font-black">Treino</th>
                      <th className="py-4 font-normal">N</th>
                      <th className="py-4 font-normal">Exercício</th>
                      <th className="py-4 font-normal text-center bg-slate-100/50" colSpan={3}>Build Up</th>
                      <th className="py-4 font-normal text-center bg-red-50" colSpan={4}>Confere !</th>
                      <th className="py-4 font-normal text-center bg-slate-100/50" colSpan={3}>Série 2</th>
                      <th className="py-4 font-normal text-center bg-slate-100/50" colSpan={3}>Série 3</th>
                      <th className="py-4 font-normal text-right">1 RM (Kg)</th>
                      <th className="py-4 font-normal text-right">1RM (Kg) Inicial</th>
                      <th className="py-4 font-normal text-right pr-4">Melhora</th>
                    </tr>
                    <tr className="text-[8px] uppercase tracking-tighter opacity-70 font-bold border-b border-slate-300">
                      <th></th>
                      <th></th>
                      <th></th>
                      {/* Build Up */}
                      <th className="text-center">Carga (Kg)</th>
                      <th className="text-center">Repetições</th>
                      <th className="text-center">Descanso</th>
                      {/* Teste */}
                      <th className="text-center">Teste</th>
                      <th className="text-center">Repetições</th>
                      <th className="text-center">Confere</th>
                      <th className="text-center">Descanso</th>
                      {/* Série 2 */}
                      <th className="text-center">Carga (Kg)</th>
                      <th className="text-center">Repetições</th>
                      <th className="text-center">Descanso</th>
                      {/* Série 3 */}
                      <th className="text-center">Carga (Kg)</th>
                      <th className="text-center">Repetições</th>
                      <th className="text-center">Descanso</th>
                      <th colSpan={3}></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(() => {
                      const rows = exercises.filter(e => e.category === category);
                      
                      return rows.map((ex, idx) => {
                        const initialTest = userData.currentCycle.initialStrengthTests[ex.id];
                        let bestInitialSeries = { weight: 0, reps: 0 };
                        let max1RM = 0;
                        if (initialTest && initialTest.series) {
                          initialTest.series.forEach(s => {
                            const rm = estimate1RM(s.weight, s.reps);
                            if (rm > max1RM) {
                              max1RM = rm;
                              bestInitialSeries = s;
                            }
                          });
                        }
                        
                        const buildUpWeight = Math.round(bestInitialSeries.weight * 0.8);

                        const retest = userData.currentCycle.retestStrengthTests?.[ex.id] || {
                          buildUp: { weight: buildUpWeight, reps: 0, rest: '3 min' },
                          test: { weight: bestInitialSeries.weight, reps: 0, rest: '3 min', completed: false },
                          series2: { weight: 0, reps: 0, rest: '3 min' },
                          series3: { weight: 0, reps: 0, rest: '3 min' },
                          estimated1RM: 0
                        };
                        const initial1RM = initialTest?.estimated1RM || 0;
                        const improvement = initial1RM > 0 ? ((retest.estimated1RM - initial1RM) / initial1RM) * 100 : 0;

                        const categoryDisplay = {
                          'Upper Push': 'Membros Superiores Empurrada',
                          'Upper Pull': 'Membros Superiores Puxada',
                          'Lower Body': 'Membros Inferiores'
                        }[category as 'Upper Push' | 'Upper Pull' | 'Lower Body'];

                        return (
                          <tr key={ex.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors group">
                            <td className="py-4 px-4 text-[10px] font-black text-slate-500 leading-tight w-32">
                              {idx === 0 ? categoryDisplay : ''}
                            </td>
                            <td className="py-4 text-xs font-mono text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-4 text-sm font-black text-slate-900">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ex.type === 'FIXO' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>
                                  <Dumbbell size={16} />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    {ex.subExercises && ex.subExercises.length > 0 ? (
                                      <select 
                                        className="bg-transparent border-b border-red-600 focus:outline-none cursor-pointer text-sm font-black text-slate-900 w-fit"
                                        value={userData.currentCycle.selectedSubExercises?.[ex.id] || ex.name}
                                        onChange={e => {
                                          const newSelected = { ...userData.currentCycle.selectedSubExercises, [ex.id]: e.target.value };
                                          updateCurrentCycle({ selectedSubExercises: newSelected });
                                        }}
                                      >
                                        <option value={ex.name}>{ex.name}</option>
                                        {ex.subExercises.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                      </select>
                                    ) : (
                                      <span>{ex.name}</span>
                                    )}
                                    <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded ${ex.type === 'FIXO' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                      {ex.type}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{ex.category}</span>
                                    {(userData.currentCycle.selectedSubExercises?.[ex.id] 
                                      ? (ex.subExercises?.find(s => s.name === userData.currentCycle.selectedSubExercises?.[ex.id])?.videoUrl || ex.videoUrl)
                                      : ex.videoUrl) && (
                                      <a 
                                        href={userData.currentCycle.selectedSubExercises?.[ex.id] 
                                          ? (ex.subExercises?.find(s => s.name === userData.currentCycle.selectedSubExercises?.[ex.id])?.videoUrl || ex.videoUrl)
                                          : ex.videoUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-blue-500 hover:text-blue-700 flex items-center gap-1 text-[10px] font-bold uppercase leading-none"
                                      >
                                        <ExternalLink size={10} />
                                        Vídeo
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            
                            {/* Build Up */}
                            <td className="py-2 px-1 text-center font-mono text-xs text-slate-600 bg-slate-50/50">
                              {buildUpWeight > 0 ? buildUpWeight : '-'}
                            </td>
                            <td className="py-2 px-1 text-center font-mono text-xs text-slate-600 bg-slate-50/50">
                              5 a 7
                            </td>
                            <td className="py-2 px-1 text-center font-mono text-[10px] text-slate-500 bg-slate-50/50">
                              3 min
                            </td>

                            {/* Teste */}
                            <td className="py-2 px-1 text-center font-mono text-sm font-black text-red-700 bg-red-50/50">
                              {bestInitialSeries.weight > 0 ? bestInitialSeries.weight : '-'}
                            </td>
                            <td className="py-2 px-1 text-center font-mono text-sm font-black text-red-700 bg-red-50/50">
                              {bestInitialSeries.reps > 0 ? bestInitialSeries.reps : '-'}
                            </td>
                            <td className="py-2 px-1 text-center bg-red-50/50">
                              <input 
                                type="number" 
                                className="w-12 mx-auto bg-white border border-red-300 rounded p-1 text-center text-sm font-mono font-black text-red-700 shadow-sm focus:ring-red-500 focus:border-red-500" 
                                value={retest.test.reps || ''} 
                                onChange={e => handleRetestStrengthUpdate(ex.id, 'test', 'reps', Number(e.target.value), bestInitialSeries.weight)} 
                                placeholder="Confere"
                              />
                            </td>
                            <td className="py-2 px-1 text-center font-mono text-[10px] text-slate-500 bg-red-50/50">
                              3 min
                            </td>

                            {/* Série 2 */}
                            <td className="py-2 px-1">
                              <input type="number" className="w-14 bg-slate-50 border border-slate-200 rounded p-1 text-center text-xs font-mono" value={retest.series2.weight || ''} onChange={e => handleRetestStrengthUpdate(ex.id, 'series2', 'weight', Number(e.target.value))} />
                            </td>
                            <td className="py-2 px-1">
                              <input type="number" className="w-10 bg-slate-50 border border-slate-200 rounded p-1 text-center text-xs font-mono" value={retest.series2.reps || ''} onChange={e => handleRetestStrengthUpdate(ex.id, 'series2', 'reps', Number(e.target.value))} />
                            </td>
                            <td className="py-2 px-1">
                              <input type="text" className="w-14 bg-slate-50 border border-slate-200 rounded p-1 text-center text-[8px] font-mono" value={retest.series2.rest} onChange={e => handleRetestStrengthUpdate(ex.id, 'series2', 'rest', e.target.value)} />
                            </td>

                            {/* Série 3 */}
                            <td className="py-2 px-1">
                              <input type="number" className="w-14 bg-slate-50 border border-slate-200 rounded p-1 text-center text-xs font-mono" value={retest.series3.weight || ''} onChange={e => handleRetestStrengthUpdate(ex.id, 'series3', 'weight', Number(e.target.value))} />
                            </td>
                            <td className="py-2 px-1">
                              <input type="number" className="w-10 bg-slate-50 border border-slate-200 rounded p-1 text-center text-xs font-mono" value={retest.series3.reps || ''} onChange={e => handleRetestStrengthUpdate(ex.id, 'series3', 'reps', Number(e.target.value))} />
                            </td>
                            <td className="py-2 px-1">
                              <input type="text" className="w-14 bg-slate-50 border border-slate-200 rounded p-1 text-center text-[8px] font-mono" value={retest.series3.rest} onChange={e => handleRetestStrengthUpdate(ex.id, 'series3', 'rest', e.target.value)} />
                            </td>

                            <td className="py-4 text-right">
                              <span className="text-sm font-black font-mono text-red-600">{retest.estimated1RM}</span>
                            </td>
                            <td className="py-4 text-right">
                              <span className="text-sm font-bold font-mono text-slate-400">{initial1RM}</span>
                            </td>
                            <td className={cn("py-4 text-right font-mono font-black text-xs pr-4", improvement >= 0 ? "text-green-600" : "text-red-600")}>
                              {improvement.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-8">
          <h2 className="text-3xl font-serif italic">Reteste Aeróbico</h2>
          <InfoPopover 
            title="Evolução Aeróbica" 
            content="Compare sua distância e VO2 Máximo com o teste inicial para medir seu ganho de condicionamento." 
          />
        </div>
        <Card title="Cooper Test Reteste">
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest opacity-80 font-bold border-b border-slate-300 bg-red-800 text-white">
                    <th className="py-4 px-4 text-center">Date</th>
                    <th className="py-4 text-center">Distance (meters)</th>
                    <th className="py-4 text-center">Vo2 Max<br/><span className="text-[8px] normal-case">(ml/kg/min)</span></th>
                    <th className="py-4 text-center">Vvo2 Max<br/><span className="text-[8px] normal-case">(Km/h)</span></th>
                    <th className="py-4 text-center">Improvement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="text-sm">
                    <td className="py-4 text-center font-mono text-xs">{userData.currentCycle.startDate}</td>
                    <td className="py-4 text-center font-mono text-slate-600">{userData.currentCycle.initialAerobicTest?.distance || 0}</td>
                    <td className="py-4 text-center font-mono text-slate-600">{userData.currentCycle.initialAerobicTest?.vo2Max || 0}</td>
                    <td className="py-4 text-center font-mono text-slate-600">{userData.currentCycle.initialAerobicTest?.vVo2Max || 0}</td>
                    <td className="py-4 text-center align-middle border-l border-slate-200" rowSpan={2}>
                      <span className={cn("font-mono font-black", 
                        ((userData.currentCycle.retestAerobicTest?.distance || 0) - (userData.currentCycle.initialAerobicTest?.distance || 0)) >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {userData.currentCycle.initialAerobicTest?.distance && userData.currentCycle.retestAerobicTest?.distance ? 
                          (((userData.currentCycle.retestAerobicTest.distance - userData.currentCycle.initialAerobicTest.distance) / userData.currentCycle.initialAerobicTest.distance) * 100).toFixed(2) : '0.00'}%
                      </span>
                    </td>
                  </tr>
                  <tr className="text-sm bg-amber-50/50">
                    <td className="py-4 text-center text-slate-400 font-mono text-xs">{new Date().toLocaleDateString()}</td>
                    <td className="py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <input 
                          type="number" 
                          className="w-24 bg-white border border-slate-300 rounded p-1 text-sm font-mono font-bold focus:border-red-600 outline-none text-center"
                          value={retestAerobicDist || ''}
                          onChange={e => setRetestAerobicDist(Number(e.target.value))}
                        />
                        <button 
                          onClick={handleRetestAerobicUpdate}
                          className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                          title="Calcular"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="py-4 text-center font-mono font-black text-red-600">{userData.currentCycle.retestAerobicTest?.vo2Max || 0}</td>
                    <td className="py-4 text-center font-mono font-black text-red-600">{userData.currentCycle.retestAerobicTest?.vVo2Max || 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-slate-900 p-6 rounded-2xl text-slate-50 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-[10px] uppercase tracking-widest font-bold text-red-500">Análise de Performance</h4>
                <InfoTooltip content="Sua evolução aeróbica impacta diretamente na sua recuperação entre os rounds." />
              </div>
              <p className="text-sm text-slate-300 leading-relaxed italic">
                {userData.currentCycle.retestAerobicTest && userData.currentCycle.initialAerobicTest && userData.currentCycle.retestAerobicTest.distance > userData.currentCycle.initialAerobicTest.distance ? 
                  "Excelente evolução! Seu VO2 Máximo subiu, o que significa que você conseguirá manter um ritmo mais alto por mais tempo durante as lutas." :
                  "Mantenha a consistência nos treinos aeróbicos para ver sua evolução no próximo reteste."
                }
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="pt-12 border-t border-slate-200">
        <div className="bg-red-600 p-8 rounded-3xl text-white shadow-2xl shadow-red-600/20 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2">
            <h3 className="text-2xl font-serif italic">Finalizar Ciclo de Treinamento</h3>
            <p className="text-sm text-red-100 max-w-xl">
              Ao finalizar o ciclo, os resultados deste reteste serão salvos no seu histórico e se tornarão os novos parâmetros base para o próximo ciclo de 4 semanas.
            </p>
          </div>
          <button 
            onClick={() => {
              const vo2 = calculateVO2Max(retestAerobicDist);
              const vvo2 = calculateVVO2Max(retestAerobicDist);
              finishCycle({
                retestMetrics,
                retestAerobicTest: retestAerobicDist > 0 ? { distance: retestAerobicDist, vo2Max: vo2, vVo2Max: vvo2 } : undefined
              });
            }}
            className="px-8 py-4 bg-white text-red-600 rounded-xl font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-100 transition-all shadow-xl active:scale-[0.98] whitespace-nowrap"
          >
            Finalizar e Iniciar Próximo
          </button>
        </div>
      </section>
    </div>
  );
}

function HistorySection({ history, bodyCompHistory, gender, currentCycle, currentBodyComp, updateUserData }: { 
  history: Cycle[], 
  bodyCompHistory: BodyCompRecord[], 
  gender: Gender,
  currentCycle: Cycle,
  currentBodyComp: BodyComposition,
  updateUserData: (u: Partial<UserData>) => void
}) {
  const { exercises } = useExercises();
  const bodyCompData = [...bodyCompHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const displayHistory = bodyCompData.length > 0 ? bodyCompData : [{
    date: currentCycle.startDate,
    metrics: currentCycle.initialMetrics,
    composition: calculateBodyFat(currentCycle.initialMetrics, gender)
  }];

  const labels = displayHistory.map(r => {
    const d = new Date(r.date);
    return d.toLocaleDateString('pt-BR', { month: 'short' });
  });

  const evolucaoPeso = displayHistory.map(r => r.metrics.weight);
  const evolucaoGordura = displayHistory.map(r => r.composition.fatPercentage);
  const evolucaoMassaMagra = displayHistory.map(r => r.composition.leanMass);

  const antes = displayHistory[0];
  const depois = displayHistory[displayHistory.length - 1];

  const getAvgStrength = (tests: any, category: string, cycleSelectedExercises?: Record<string, string>) => {
    const fixed = exercises.filter(e => e.category === category && e.type === 'FIXO');
    const variables = exercises.filter(e => e.category === category && e.type === 'VARIAVEL');
    const selectedVarId = cycleSelectedExercises?.[category] || variables[0]?.id;
    
    const relevantIds = [
      ...fixed.map(e => e.id),
      ...(variables.find(v => v.id === selectedVarId) ? [selectedVarId] : [])
    ];

    const relevantTests = Object.entries(tests || {}).filter(([id]) => relevantIds.includes(id));
    if (relevantTests.length === 0) return 0;
    return relevantTests.reduce((acc, [, t]: [string, any]) => acc + (t.estimated1RM || 0), 0) / relevantTests.length;
  };

  const pushInitial = getAvgStrength(currentCycle.initialStrengthTests, 'Upper Push', currentCycle.selectedExercises);
  const pullInitial = getAvgStrength(currentCycle.initialStrengthTests, 'Upper Pull', currentCycle.selectedExercises);
  const lowerInitial = getAvgStrength(currentCycle.initialStrengthTests, 'Lower Body', currentCycle.selectedExercises);

  const pushCurrent = getAvgStrength(currentCycle.retestStrengthTests || currentCycle.initialStrengthTests, 'Upper Push', currentCycle.selectedExercises);
  const pullCurrent = getAvgStrength(currentCycle.retestStrengthTests || currentCycle.initialStrengthTests, 'Upper Pull', currentCycle.selectedExercises);
  const lowerCurrent = getAvgStrength(currentCycle.retestStrengthTests || currentCycle.initialStrengthTests, 'Lower Body', currentCycle.selectedExercises);

  const radarAntes = [
    Math.min(100, pushInitial),
    Math.min(100, pullInitial),
    Math.min(100, lowerInitial),
    currentCycle.initialAerobicTest?.vo2Max || 0,
    (antes.composition.leanMass / antes.metrics.weight) * 100
  ];

  const radarDepois = [
    Math.min(100, pushCurrent),
    Math.min(100, pullCurrent),
    Math.min(100, lowerCurrent),
    currentCycle.retestAerobicTest?.vo2Max || currentCycle.initialAerobicTest?.vo2Max || 0,
    (depois.composition.leanMass / depois.metrics.weight) * 100
  ];

  const totalForca = pushCurrent + pullCurrent + lowerCurrent;
  const forcaPush = totalForca > 0 ? (pushCurrent / totalForca) * 100 : 33.3;
  const forcaPull = totalForca > 0 ? (pullCurrent / totalForca) * 100 : 33.3;
  const forcaLower = totalForca > 0 ? (lowerCurrent / totalForca) * 100 : 33.4;

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Evolução Geral — BJJ</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#F4F2EC;color:#2C2C2A;padding:24px}
h1{font-size:28px;font-weight:700;letter-spacing:-.02em;margin-bottom:20px;text-transform:uppercase}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
.metric{background:#fff;border:0.5px solid #ddd;border-radius:12px;padding:16px 14px;text-align:center}
.metric-val{font-size:26px;font-weight:600;line-height:1}
.metric-lbl{font-size:11px;color:#888;margin-top:4px;text-transform:uppercase;letter-spacing:.05em}
.metric-delta{font-size:13px;margin-top:5px;font-weight:500}
.up{color:#1D9E75}.down{color:#E24B4A}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.card{background:#fff;border:0.5px solid #ddd;border-radius:12px;padding:18px}
.card.full{grid-column:1/-1}
.card-title{font-size:10px;font-weight:600;letter-spacing:.1em;color:#888;text-transform:uppercase;margin-bottom:14px}
.chart-wrap{position:relative}
.legend{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;font-size:12px;color:#555}
.legend span{display:flex;align-items:center;gap:5px}
.dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.sq{width:9px;height:9px;border-radius:2px;flex-shrink:0}
.insight{background:#F4F2EC;border-radius:8px;padding:14px;margin-top:8px;font-size:13px;line-height:1.6}
.insight + .insight{margin-top:8px}
.insight-tag{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#1D9E75;margin-bottom:4px}
@media(max-width:640px){.metrics{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:1fr}.card.full{grid-column:1}}
</style>
</head>
<body>

<h1>Evolução Geral</h1>

<!-- KPIs -->
<div class="metrics">
  <div class="metric">
    <div class="metric-val" id="kpi-peso">${depois.metrics.weight}<span style="font-size:15px">kg</span></div>
    <div class="metric-lbl">Peso atual</div>
    <div class="metric-delta" id="kpi-peso-d"></div>
  </div>
  <div class="metric">
    <div class="metric-val" id="kpi-gord">${depois.composition.fatPercentage}<span style="font-size:15px">%</span></div>
    <div class="metric-lbl">Gordura</div>
    <div class="metric-delta" id="kpi-gord-d"></div>
  </div>
  <div class="metric">
    <div class="metric-val" id="kpi-mm">${depois.composition.leanMass}<span style="font-size:15px">kg</span></div>
    <div class="metric-lbl">Massa magra</div>
    <div class="metric-delta" id="kpi-mm-d"></div>
  </div>
  <div class="metric">
    <div class="metric-val" id="kpi-abd">${depois.metrics.abdomen}<span style="font-size:15px">cm</span></div>
    <div class="metric-lbl">Abdômen</div>
    <div class="metric-delta" id="kpi-abd-d"></div>
  </div>
</div>

<!-- Charts grid -->
<div class="grid">

  <div class="card">
    <div class="card-title">Composição — antes vs depois</div>
    <div class="chart-wrap" style="height:200px"><canvas id="compBar"></canvas></div>
    <div class="legend">
      <span><span class="sq" style="background:#B4B2A9"></span>Antes</span>
      <span><span class="sq" style="background:#2C2C2A"></span>Depois</span>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Evolução de composição</div>
    <div class="chart-wrap" style="height:200px"><canvas id="compLine"></canvas></div>
    <div class="legend">
      <span><span class="dot" style="background:#2C2C2A"></span>Peso</span>
      <span><span class="dot" style="background:#E24B4A"></span>Gordura%</span>
      <span><span class="dot" style="background:#1D9E75"></span>Massa magra</span>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Perfil do atleta — radar</div>
    <div class="chart-wrap" style="height:220px"><canvas id="radarChart"></canvas></div>
    <div class="legend">
      <span><span class="dot" style="background:#B4B2A9"></span>Inicial</span>
      <span><span class="dot" style="background:#E24B4A"></span>Atual</span>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Distribuição de força atual</div>
    <div class="chart-wrap" style="height:220px"><canvas id="forcaDonut"></canvas></div>
    <div class="legend">
      <span><span class="dot" style="background:#E24B4A"></span>Push</span>
      <span><span class="dot" style="background:#2C2C2A"></span>Pull</span>
      <span><span class="dot" style="background:#1D9E75"></span>Lower</span>
    </div>
  </div>

  <div class="card">
    <div class="card-title">VO₂ máx — antes vs depois</div>
    <div class="chart-wrap" style="height:180px"><canvas id="vo2Bar"></canvas></div>
    <div class="legend">
      <span><span class="sq" style="background:#85B7EB"></span>Antes</span>
      <span><span class="sq" style="background:#185FA5"></span>Depois</span>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Perímetros — antes vs depois</div>
    <div class="chart-wrap" style="height:180px"><canvas id="perBar"></canvas></div>
    <div class="legend">
      <span><span class="sq" style="background:#B4B2A9;opacity:.7"></span>Antes</span>
      <span><span class="sq" style="background:#185FA5"></span>Depois</span>
    </div>
  </div>

  <div class="card full">
    <div class="card-title">Insights de evolução</div>
    <div class="insight" id="insight1"></div>
    <div class="insight" id="insight2"></div>
  </div>

</div>

<script>
// ============================================================
// DADOS — edite aqui os valores do atleta
// ============================================================
const DATA = {
  nome: "Atleta",
  labels: ${JSON.stringify(labels)},
  composicao: {
    antes: { peso:${antes.metrics.weight}, gordura:${antes.composition.fatPercentage}, massaMagra:${antes.composition.leanMass}, abdomen:${antes.metrics.abdomen} },
    depois: { peso:${depois.metrics.weight}, gordura:${depois.composition.fatPercentage}, massaMagra:${depois.composition.leanMass}, abdomen:${depois.metrics.abdomen} }
  },
  evolucao: {
    peso:       ${JSON.stringify(evolucaoPeso)},
    gordura:    ${JSON.stringify(evolucaoGordura)},
    massaMagra: ${JSON.stringify(evolucaoMassaMagra)}
  },
  radar: {
    antes:  ${JSON.stringify(radarAntes)},
    depois: ${JSON.stringify(radarDepois)},
    labels: ["Empurrar","Puxar","Pernas","Aeróbico","Massa Magra"]
  },
  forca: { push:${forcaPush}, pull:${forcaPull}, lower:${forcaLower} },
  vo2:   { antes:${currentCycle.initialAerobicTest?.vo2Max || 0}, depois:${currentCycle.retestAerobicTest?.vo2Max || currentCycle.initialAerobicTest?.vo2Max || 0} },
  perimetros: {
    labels:  ["Cintura","Peitoral","Quadril"],
    antes:   [${antes.metrics.abdomen}, ${antes.metrics.chest || 0}, ${antes.metrics.hips || antes.metrics.hip || 0}],
    depois:  [${depois.metrics.abdomen}, ${depois.metrics.chest || 0}, ${depois.metrics.hips || depois.metrics.hip || 0}]
  }
};
// ============================================================

const d = DATA.composicao;

function delta(depois, antes, unidade, boaSePositivo) {
  const diff = (depois - antes).toFixed(1);
  const sinal = diff > 0 ? "+" : "";
  const bom = boaSePositivo ? diff > 0 : diff < 0;
  return \`<span class="\${bom?'up':'down'}">\${sinal}\${diff}\${unidade}</span>\`;
}

document.getElementById("kpi-peso-d").innerHTML   = delta(d.depois.peso,       d.antes.peso,       "kg",  true);
document.getElementById("kpi-gord-d").innerHTML   = delta(d.depois.gordura,     d.antes.gordura,    "%",   false);
document.getElementById("kpi-mm-d").innerHTML     = delta(d.depois.massaMagra,  d.antes.massaMagra, "kg",  true);
document.getElementById("kpi-abd-d").innerHTML    = delta(d.depois.abdomen,     d.antes.abdomen,    "cm",  false);

const gridC = "rgba(0,0,0,0.06)";
const tickC = "#888";
const base = { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} };

// Composição barras
new Chart(document.getElementById("compBar"),{
  type:"bar",
  data:{
    labels:["Peso (kg)","Gordura (%)","Massa Magra (kg)","Abdômen (cm)"],
    datasets:[
      {label:"Antes", data:[d.antes.peso,d.antes.gordura,d.antes.massaMagra,d.antes.abdomen], backgroundColor:"#B4B2A9", borderRadius:4},
      {label:"Depois",data:[d.depois.peso,d.depois.gordura,d.depois.massaMagra,d.depois.abdomen], backgroundColor:"#2C2C2A", borderRadius:4}
    ]
  },
  options:{...base, scales:{x:{ticks:{color:tickC,font:{size:11}},grid:{display:false}},y:{ticks:{color:tickC,font:{size:11}},grid:{color:gridC}}}}
});

// Evolução linha
new Chart(document.getElementById("compLine"),{
  type:"line",
  data:{
    labels:DATA.labels,
    datasets:[
      {label:"Peso",       data:DATA.evolucao.peso,       borderColor:"#2C2C2A",backgroundColor:"transparent",pointBackgroundColor:"#2C2C2A",tension:.4,pointRadius:3},
      {label:"Gordura%",   data:DATA.evolucao.gordura,    borderColor:"#E24B4A",backgroundColor:"transparent",pointBackgroundColor:"#E24B4A",tension:.4,pointRadius:3},
      {label:"Massa Magra",data:DATA.evolucao.massaMagra, borderColor:"#1D9E75",backgroundColor:"transparent",pointBackgroundColor:"#1D9E75",tension:.4,pointRadius:3}
    ]
  },
  options:{...base, scales:{x:{ticks:{color:tickC,font:{size:11}},grid:{display:false}},y:{ticks:{color:tickC,font:{size:11}},grid:{color:gridC}}}}
});

// Radar
new Chart(document.getElementById("radarChart"),{
  type:"radar",
  data:{
    labels:DATA.radar.labels,
    datasets:[
      {label:"Inicial",data:DATA.radar.antes, borderColor:"#B4B2A9",backgroundColor:"rgba(180,178,169,0.15)",pointBackgroundColor:"#B4B2A9",borderWidth:1.5,pointRadius:3},
      {label:"Atual",  data:DATA.radar.depois,borderColor:"#E24B4A",backgroundColor:"rgba(226,75,74,0.15)",  pointBackgroundColor:"#E24B4A",borderWidth:2, pointRadius:4}
    ]
  },
  options:{...base, scales:{r:{ticks:{display:false},grid:{color:gridC},angleLines:{color:gridC},pointLabels:{color:tickC,font:{size:11}},min:0,max:100}}}
});

// Donut
new Chart(document.getElementById("forcaDonut"),{
  type:"doughnut",
  data:{
    labels:["Push","Pull","Lower"],
    datasets:[{data:[DATA.forca.push,DATA.forca.pull,DATA.forca.lower],backgroundColor:["#E24B4A","#2C2C2A","#1D9E75"],borderWidth:0,hoverOffset:6}]
  },
  options:{...base, cutout:"65%", plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>\`\${c.label}: \${c.parsed}%\`}}}}
});

// VO2
new Chart(document.getElementById("vo2Bar"),{
  type:"bar",
  data:{
    labels:["VO₂ Máximo (ml/kg/min)"],
    datasets:[
      {label:"Antes", data:[DATA.vo2.antes], backgroundColor:"#85B7EB",borderRadius:4},
      {label:"Depois",data:[DATA.vo2.depois],backgroundColor:"#185FA5",borderRadius:4}
    ]
  },
  options:{...base, scales:{x:{ticks:{color:tickC,font:{size:11}},grid:{display:false}},y:{ticks:{color:tickC,font:{size:11}},grid:{color:gridC},min:30}}}
});

// Perímetros horizontal
new Chart(document.getElementById("perBar"),{
  type:"bar",
  data:{
    labels:DATA.perimetros.labels,
    datasets:[
      {label:"Antes", data:DATA.perimetros.antes, backgroundColor:"rgba(180,178,169,0.6)",borderRadius:4},
      {label:"Depois",data:DATA.perimetros.depois,backgroundColor:"#185FA5",borderRadius:4}
    ]
  },
  options:{...base, indexAxis:"y", scales:{x:{ticks:{color:tickC,font:{size:11}},grid:{color:gridC},min:70},y:{ticks:{color:tickC,font:{size:11}},grid:{display:false}}}}
});

// Insights automáticos
const mmGain = (d.depois.massaMagra - d.antes.massaMagra).toFixed(1);
const mmVarPct = ((d.depois.massaMagra - d.antes.massaMagra) / d.antes.massaMagra * 100).toFixed(1);
const gordDelta = (d.depois.gordura - d.antes.gordura).toFixed(1);
const gordVarPct = ((d.depois.gordura - d.antes.gordura) / d.antes.gordura * 100).toFixed(1);
const pesoGain = (d.depois.peso - d.antes.peso).toFixed(1);
const pesoVarPct = ((d.depois.peso - d.antes.peso) / d.antes.peso * 100).toFixed(1);
const mmPct = ((d.depois.massaMagra/d.depois.peso)*100).toFixed(1);
const mmPctAntes = ((d.antes.massaMagra/d.antes.peso)*100).toFixed(1);

document.getElementById("insight1").innerHTML = \`
  <div class="insight-tag">Composição corporal</div>
  Variação de Massa Magra: <strong>\${mmGain}kg (\${mmVarPct}%)</strong>.
  Variação de Gordura: <strong>\${gordDelta}pp (\${gordVarPct}%)</strong>.
  Variação de Peso Total: <strong>\${pesoGain}kg (\${pesoVarPct}%)</strong>.
  Peso total aumentou \${pesoGain}kg no período.\`;

const vo2Gain = DATA.vo2.depois - DATA.vo2.antes;
document.getElementById("insight2").innerHTML = \`
  <div class="insight-tag">Performance aeróbica</div>
  VO₂ máx evoluiu de \${DATA.vo2.antes} → \${DATA.vo2.depois} ml/kg/min (+\${vo2Gain} unidades).
  Prioridade atual: controlar o perímetro abdominal (\${d.antes.abdomen}cm → \${d.depois.abdomen}cm) com
  maior volume de treino aeróbico e ajuste nutricional nos dias de folga.\`;
</script>
</body>
</html>`;

  return (
    <div className="w-full h-[1500px] bg-white rounded-3xl overflow-hidden border border-slate-300 shadow-sm">
      <iframe 
        srcDoc={htmlContent}
        className="w-full h-full border-none"
        title="Evolução Geral"
      />
    </div>
  );
}

function MetricCard({ label, value, unit, delta, inverse = false }: { 
  label: string, 
  value: string | number, 
  unit: string, 
  delta: number, 
  inverse?: boolean 
}) {
  const isPositive = delta > 0;
  const isBetter = inverse ? delta < 0 : delta > 0;
  const deltaColor = delta === 0 ? "text-slate-400" : isBetter ? "text-green-600" : "text-red-600";
  const deltaIcon = delta === 0 ? null : isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-all">
      <div className="text-2xl font-black text-slate-900 tracking-tighter">
        {value}<span className="text-xs text-slate-400 ml-0.5 font-bold">{unit}</span>
      </div>
      <div className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-400 mt-1">{label}</div>
      <div className={cn(
        "text-[10px] font-black mt-2 flex items-center gap-1 px-2 py-0.5 rounded-full", 
        deltaColor, 
        delta !== 0 ? (isBetter ? "bg-green-50" : "bg-red-50") : "bg-slate-50"
      )}>
        {delta !== 0 && (
          <>
            {deltaIcon}
            <span>{Math.abs(delta).toFixed(1)}{unit}</span>
          </>
        )}
        {delta === 0 && <span>Mantido</span>}
      </div>
    </div>
  );
}

function EvolutionCharts({ history, bodyCompHistory, currentCycle, currentBodyComp, gender }: { 
  history: Cycle[], 
  bodyCompHistory: any[],
  currentCycle: Cycle,
  currentBodyComp: any,
  gender: Gender
}) {
  const { exercises } = useExercises();
  // Prepare data for charts
  const compData = [...(bodyCompHistory || [])].reverse().map(record => ({
    date: record.date,
    weight: record.metrics.weight,
    fat: record.composition.fatPercentage,
    lean: record.composition.leanMass
  }));

  // Add current body comp as the latest point
  if (currentBodyComp) {
    compData.push({
      date: 'Atual',
      weight: currentCycle.initialMetrics.weight,
      fat: currentBodyComp.fatPercentage,
      lean: currentBodyComp.leanMass
    });
  }

  const performanceData = history.map((cycle, idx) => {
    const strengthTests = cycle.retestStrengthTests || cycle.initialStrengthTests;
    const getAvg = (cat: string) => {
      const tests = Object.entries(strengthTests).filter(([id]) => exercises.find(e => e.id === id)?.category === cat);
      const avg = tests.length > 0 ? tests.reduce((acc, [, t]: [string, any]) => acc + t.estimated1RM, 0) / tests.length : 0;
      return Number(avg.toFixed(1));
    };

    return {
      name: `Ciclo ${idx + 1}`,
      vo2: Number((cycle.retestAerobicTest?.vo2Max || cycle.initialAerobicTest?.vo2Max || 0).toFixed(1)),
      distance: cycle.retestAerobicTest?.distance || cycle.initialAerobicTest?.distance || 0,
      strength: Number((Object.values(strengthTests).reduce((acc, t: any) => acc + t.estimated1RM, 0) / (Object.keys(strengthTests).length || 1)).toFixed(1)),
      push: getAvg('Upper Push'),
      pull: getAvg('Upper Pull'),
      lower: getAvg('Lower Body'),
      arm: cycle.retestMetrics?.armLength || cycle.initialMetrics.armLength || 0,
      leg: cycle.retestMetrics?.legLength || cycle.initialMetrics.legLength || 0,
      waist: cycle.retestMetrics?.waist || cycle.initialMetrics.waist || 0,
      chest: cycle.retestMetrics?.chest || cycle.initialMetrics.chest || 0,
      hips: cycle.retestMetrics?.hips || cycle.initialMetrics.hips || 0,
      biceps: cycle.retestMetrics?.biceps || cycle.initialMetrics.biceps || 0,
    };
  });

  // Add current cycle as the latest point
  const currentStrengthTests = currentCycle.retestStrengthTests || currentCycle.initialStrengthTests;
  const getCurrentAvg = (cat: string) => {
    const tests = Object.entries(currentStrengthTests).filter(([id]) => exercises.find(e => e.id === id)?.category === cat);
    const avg = tests.length > 0 ? tests.reduce((acc, [, t]: [string, any]) => acc + t.estimated1RM, 0) / tests.length : 0;
    return Number(avg.toFixed(1));
  };

  performanceData.push({
    name: 'Atual',
    vo2: Number((currentCycle.retestAerobicTest?.vo2Max || currentCycle.initialAerobicTest?.vo2Max || 0).toFixed(1)),
    distance: currentCycle.retestAerobicTest?.distance || currentCycle.initialAerobicTest?.distance || 0,
    strength: Number((Object.values(currentStrengthTests).reduce((acc, t: any) => acc + t.estimated1RM, 0) / (Object.keys(currentStrengthTests).length || 1)).toFixed(1)),
    push: getCurrentAvg('Upper Push'),
    pull: getCurrentAvg('Upper Pull'),
    lower: getCurrentAvg('Lower Body'),
    arm: currentCycle.retestMetrics?.armLength || currentCycle.initialMetrics.armLength || 0,
    leg: currentCycle.retestMetrics?.legLength || currentCycle.initialMetrics.legLength || 0,
    waist: currentCycle.retestMetrics?.waist || currentCycle.initialMetrics.waist || 0,
    chest: currentCycle.retestMetrics?.chest || currentCycle.initialMetrics.chest || 0,
    hips: currentCycle.retestMetrics?.hips || currentCycle.initialMetrics.hips || 0,
    biceps: currentCycle.retestMetrics?.biceps || currentCycle.initialMetrics.biceps || 0,
  });

  // INITIAL VS CURRENT COMPARISON DATA
  const firstCycle = history.length > 0 ? history[0] : currentCycle;
  const initialStrengthTests = firstCycle.initialStrengthTests;
  const getInitialAvg = (cat: string) => {
    const tests = Object.entries(initialStrengthTests).filter(([id]) => exercises.find(e => e.id === id)?.category === cat);
    const avg = tests.length > 0 ? tests.reduce((acc, [, t]: [string, any]) => acc + t.estimated1RM, 0) / tests.length : 0;
    return Number(avg.toFixed(1));
  };

  const initialPerf = {
    push: getInitialAvg('Upper Push'),
    pull: getInitialAvg('Upper Pull'),
    lower: getInitialAvg('Lower Body'),
    vo2: firstCycle.initialAerobicTest?.vo2Max || 0
  };

  const latestPerf = performanceData[performanceData.length - 1] || { push: 0, pull: 0, lower: 0, vo2: 0 };

  const firstBodyComp = bodyCompHistory.length > 0 ? bodyCompHistory[bodyCompHistory.length - 1] : null;
  const initialMetricsForComp = firstBodyComp ? firstBodyComp.metrics : firstCycle.initialMetrics;
  const initialComp = firstBodyComp ? firstBodyComp.composition : calculateBodyFat(initialMetricsForComp, gender);
  const currentComp = currentBodyComp || calculateBodyFat(currentCycle.retestMetrics || currentCycle.initialMetrics, gender);

  // Data for Radar Chart (Initial vs Current Athlete Profile)
  const radarData = [
    { subject: 'Empurrar', Initial: initialPerf.push, Current: latestPerf.push, fullMark: 150 },
    { subject: 'Puxar', Initial: initialPerf.pull, Current: latestPerf.pull, fullMark: 150 },
    { subject: 'Pernas', Initial: initialPerf.lower, Current: latestPerf.lower, fullMark: 200 },
    { subject: 'Aeróbico', Initial: initialPerf.vo2 * 2, Current: latestPerf.vo2 * 2, fullMark: 100 },
    { subject: 'Massa Magra', Initial: initialComp.leanMass, Current: currentComp.leanMass, fullMark: 100 },
  ];

  // Data for Bar Chart (Before vs After Strength)
  const strengthComparisonData = [
    { name: 'Empurrar', Antes: initialPerf.push, Depois: latestPerf.push },
    { name: 'Puxar', Antes: initialPerf.pull, Depois: latestPerf.pull },
    { name: 'Pernas', Antes: initialPerf.lower, Depois: latestPerf.lower },
  ];

  // Data for Bar Chart (Before vs After Body Composition)
  const compComparisonData = [
    { name: 'Peso (kg)', Antes: initialMetricsForComp.weight, Depois: (currentCycle.retestMetrics?.weight || currentCycle.initialMetrics.weight) },
    { name: 'Gordura (%)', Antes: initialComp.fatPercentage, Depois: currentComp.fatPercentage },
    { name: 'Massa Magra (kg)', Antes: initialComp.leanMass, Depois: currentComp.leanMass },
  ];

  // Data for Pie Chart (Latest Cycle Strength Distribution)
  const pieData = [
    { name: 'Push', value: latestPerf.push, fill: '#EF4444' },
    { name: 'Pull', value: latestPerf.pull, fill: '#0F172A' },
    { name: 'Lower', value: latestPerf.lower, fill: '#10B981' },
  ].filter(d => d.value > 0);

  // Data for Bar Chart (Before vs After VO2 Max)
  const vo2ComparisonData = [
    { name: 'VO2 Máximo', Antes: initialPerf.vo2, Depois: latestPerf.vo2 },
  ];

  // If no data, show empty state placeholders
  const hasCompData = compData.length > 0;
  const hasPerfData = performanceData.length > 0;

  const weightDelta = (currentCycle.retestMetrics?.weight || currentCycle.initialMetrics.weight) - initialMetricsForComp.weight;
  const fatDelta = currentComp.fatPercentage - initialComp.fatPercentage;
  const leanDelta = currentComp.leanMass - initialComp.leanMass;
  const vo2Delta = latestPerf.vo2 - initialPerf.vo2;

  return (
    <div className="space-y-8">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
          label="Peso Atual" 
          value={currentCycle.retestMetrics?.weight || currentCycle.initialMetrics.weight} 
          unit="kg" 
          delta={weightDelta} 
          inverse 
        />
        <MetricCard 
          label="Gordura" 
          value={currentComp.fatPercentage} 
          unit="%" 
          delta={fatDelta} 
          inverse 
        />
        <MetricCard 
          label="Massa Magra" 
          value={currentComp.leanMass} 
          unit="kg" 
          delta={leanDelta} 
        />
        <MetricCard 
          label="VO2 Máximo" 
          value={latestPerf.vo2} 
          unit="" 
          delta={vo2Delta} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card title="Perfil do Atleta (Antes vs Depois)">
        <div className="h-64 w-full relative">
          {!hasPerfData && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 z-10 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aguardando Dados...</span>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={hasPerfData ? radarData : [{ subject: 'N/A', Initial: 0, Current: 0, fullMark: 100 }] as any[]}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} />
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} hide />
              <Radar
                name="Inicial"
                dataKey="Initial"
                stroke="#94a3b8"
                fill="#94a3b8"
                fillOpacity={0.3}
              />
              <Radar
                name="Atual"
                dataKey="Current"
                stroke="#DC2626"
                fill="#DC2626"
                fillOpacity={0.6}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-4 justify-center">
          <LegendItem color="#94a3b8" label="Inicial" />
          <LegendItem color="#DC2626" label="Atual" />
        </div>
      </Card>

      <Card title="Comparativo de Força (Antes vs Depois)">
        <div className="h-64 w-full relative">
          {!hasPerfData && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 z-10 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aguardando Dados...</span>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={strengthComparisonData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="Antes" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Depois" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-4 justify-center">
          <LegendItem color="#94a3b8" label="Antes" />
          <LegendItem color="#DC2626" label="Depois" />
        </div>
      </Card>

      <Card title="Comparativo de Composição (Antes vs Depois)">
        <div className="h-64 w-full relative">
          {!hasCompData && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 z-10 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aguardando Dados...</span>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compComparisonData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="Antes" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Depois" fill="#0F172A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-4 justify-center">
          <LegendItem color="#94a3b8" label="Antes" />
          <LegendItem color="#0F172A" label="Depois" />
        </div>
      </Card>

      <Card title="Evolução de Composição">
        <div className="h-64 w-full relative">
          {!hasCompData && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 z-10 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aguardando Dados...</span>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hasCompData ? compData : [{ date: '', weight: 0, fat: 0, lean: 0 }] as any[]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
              />
              <Line type="monotone" dataKey="weight" name="Peso (kg)" stroke="#0F172A" strokeWidth={3} dot={{ r: 4, fill: '#0F172A' }} />
              <Line type="monotone" dataKey="fat" name="Gordura (%)" stroke="#DC2626" strokeWidth={3} dot={{ r: 4, fill: '#DC2626' }} />
              <Line type="monotone" dataKey="lean" name="Massa Magra (kg)" stroke="#16A34A" strokeWidth={3} dot={{ r: 4, fill: '#16A34A' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-4 justify-center">
          <LegendItem color="#0F172A" label="Peso" />
          <LegendItem color="#DC2626" label="Gordura" />
          <LegendItem color="#16A34A" label="Massa Magra" />
        </div>
      </Card>

      <Card title="Evolução de Perímetros (Circunferências)">
        <div className="h-64 w-full relative">
          {!hasPerfData && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 z-10 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aguardando Dados...</span>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hasPerfData ? performanceData : [{ name: '', waist: 0, chest: 0, hips: 0 }] as any[]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Line type="monotone" dataKey="waist" name="Cintura (cm)" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, fill: '#EF4444' }} />
              <Line type="monotone" dataKey="chest" name="Peitoral (cm)" stroke="#0F172A" strokeWidth={3} dot={{ r: 4, fill: '#0F172A' }} />
              <Line type="monotone" dataKey="hips" name="Quadril (cm)" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-4 justify-center">
          <LegendItem color="#EF4444" label="Cintura" />
          <LegendItem color="#0F172A" label="Peitoral" />
          <LegendItem color="#10B981" label="Quadril" />
        </div>
      </Card>

      <Card title="Distribuição de Força Atual">
        <div className="h-64 w-full relative">
          {!hasPerfData && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 z-10 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aguardando Dados...</span>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={hasPerfData && pieData.length > 0 ? pieData : [{ name: 'Nenhum', value: 1, fill: '#f1f5f9' }] as any[]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-4 justify-center">
          <LegendItem color="#EF4444" label="Push" />
          <LegendItem color="#0F172A" label="Pull" />
          <LegendItem color="#10B981" label="Lower" />
        </div>
      </Card>

      <Card title="Força por Categoria (1RM)">
        <div className="h-64 w-full relative">
          {!hasPerfData && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 z-10 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aguardando Dados...</span>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hasPerfData ? performanceData : [{ name: '', push: 0, pull: 0, lower: 0 }] as any[]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Line type="monotone" dataKey="push" name="Push (kg)" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, fill: '#EF4444' }} />
              <Line type="monotone" dataKey="pull" name="Pull (kg)" stroke="#0F172A" strokeWidth={3} dot={{ r: 4, fill: '#0F172A' }} />
              <Line type="monotone" dataKey="lower" name="Lower (kg)" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-4 justify-center">
          <LegendItem color="#EF4444" label="Push" />
          <LegendItem color="#0F172A" label="Pull" />
          <LegendItem color="#10B981" label="Lower" />
        </div>
      </Card>

      <Card title="Comparativo VO2 Máx (Antes vs Depois)">
        <div className="h-64 w-full relative">
          {!hasPerfData && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 z-10 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aguardando Dados...</span>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={vo2ComparisonData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="Antes" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Depois" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-4 justify-center">
          <LegendItem color="#94a3b8" label="Antes" />
          <LegendItem color="#3B82F6" label="Depois" />
        </div>
      </Card>

      <Card title="Histórico de VO2 Máx">
        <div className="h-64 w-full relative">
          {!hasPerfData && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 z-10 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aguardando Dados...</span>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hasPerfData ? performanceData : [{ name: '', vo2: 0 }] as any[]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <YAxis hide />
              <Tooltip 
                cursor={{ fill: '#F1F5F9' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="vo2" name="VO2 Máx" fill="#3B82F6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Performance Aeróbica (Distância)">
        <div className="h-64 w-full relative">
          {!hasPerfData && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 z-10 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aguardando Dados...</span>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hasPerfData ? performanceData : [{ name: '', distance: 0 }] as any[]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <YAxis hide />
              <Tooltip 
                cursor={{ fill: '#F1F5F9' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="distance" name="Distância (m)" fill="#0F172A" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Evolução de Membros">
        <div className="h-64 w-full relative">
          {!hasPerfData && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 z-10 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aguardando Dados...</span>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hasPerfData ? performanceData : [{ name: '', arm: 0, leg: 0 }] as any[]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Line type="monotone" dataKey="arm" name="Braço (cm)" stroke="#DC2626" strokeWidth={3} dot={{ r: 4, fill: '#DC2626' }} />
              <Line type="monotone" dataKey="leg" name="Perna (cm)" stroke="#0F172A" strokeWidth={3} dot={{ r: 4, fill: '#0F172A' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-4 justify-center">
          <LegendItem color="#DC2626" label="Braço" />
          <LegendItem color="#0F172A" label="Perna" />
        </div>
      </Card>

      <Card title="Insights de Evolução">
        <div className="space-y-4">
          {hasCompData && compData.length >= 2 ? (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[10px] uppercase font-black text-slate-400 mb-2">Composição Corporal</div>
              <p className="text-sm font-bold text-slate-700">
                Desde o primeiro registro, você {compData[compData.length-1].fat < compData[0].fat ? 'reduziu' : 'aumentou'} seu percentual de gordura em {Math.abs(compData[0].fat - compData[compData.length-1].fat).toFixed(1)}% 
                e {compData[compData.length-1].lean > compData[0].lean ? 'ganhou' : 'perdeu'} {Math.abs(compData[compData.length-1].lean - compData[0].lean).toFixed(1)}kg de massa magra.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 opacity-50">
              <p className="text-xs text-slate-400 italic">Dados insuficientes para insights de composição.</p>
            </div>
          )}
          {hasPerfData && performanceData.length >= 2 ? (
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] uppercase font-black text-slate-400 mb-2">Força e Potência</div>
                <p className="text-sm font-bold text-slate-700">
                  Sua força média {performanceData[performanceData.length-1].strength > performanceData[0].strength ? 'aumentou' : 'regrediu'} {Math.abs(performanceData[performanceData.length-1].strength - performanceData[0].strength).toFixed(1)}kg.
                  A maior evolução foi em {
                    (() => {
                      const diffs = [
                        { name: 'Push', val: performanceData[performanceData.length-1].push - performanceData[0].push },
                        { name: 'Pull', val: performanceData[performanceData.length-1].pull - performanceData[0].pull },
                        { name: 'Lower', val: performanceData[performanceData.length-1].lower - performanceData[0].lower }
                      ];
                      return diffs.sort((a, b) => b.val - a.val)[0].name;
                    })()
                  }.
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] uppercase font-black text-slate-400 mb-2">Performance Aeróbica</div>
                <p className="text-sm font-bold text-slate-700">
                  Seu VO2 Máximo {performanceData[performanceData.length-1].vo2 > performanceData[0].vo2 ? 'evoluiu' : 'regrediu'} {Math.abs(performanceData[performanceData.length-1].vo2 - performanceData[0].vo2).toFixed(1)} pontos.
                  A distância percorrida {performanceData[performanceData.length-1].distance > performanceData[0].distance ? 'aumentou' : 'diminuiu'} {Math.abs(performanceData[performanceData.length-1].distance - performanceData[0].distance).toFixed(0)}m.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 opacity-50">
              <p className="text-xs text-slate-400 italic">Dados insuficientes para insights de performance.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  </div>
);
}

interface HistoryMetricProps {
  label: string;
  initial: number;
  final?: number;
  unit: string;
  inverse?: boolean;
}

const HistoryMetric: React.FC<HistoryMetricProps> = ({ label, initial, final, unit, inverse = false }) => {
  const diff = final !== undefined ? final - initial : 0;
  const isBetter = inverse ? diff < 0 : diff > 0;
  
  return (
    <div className="flex items-center justify-between group">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-slate-400">{initial.toFixed(1)}{unit}</span>
        {final !== undefined && (
          <>
            <div className="w-4 h-px bg-slate-200" />
            <span className={cn("text-sm font-mono font-black", isBetter ? "text-green-600" : "text-red-600")}>
              {final.toFixed(1)}{unit}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function RetestMetricCard({ label, initial, final, unit }: { label: string, initial: number, final: number, unit: string }) {
  const diff = final - initial;
  const improvement = initial > 0 ? (diff / initial) * 100 : 0;
  
  return (
    <div className="p-4 bg-white border border-slate-300 rounded-2xl text-center shadow-sm min-w-[140px]">
      <div className="text-[10px] uppercase tracking-widest text-slate-600 font-black mb-1">{label}</div>
      <div className="text-2xl font-bold font-mono text-red-600">{final}</div>
      <div className="text-[8px] text-slate-400 font-bold mb-2">{unit}</div>
      <div className={cn("text-[10px] font-black font-mono", diff >= 0 ? "text-green-600" : "text-red-600")}>
        {diff >= 0 ? '+' : ''}{diff.toFixed(1)} ({improvement.toFixed(1)}%)
      </div>
    </div>
  );
}

function ComparisonCard({ label, initial, final, unit, inverse = false }: { label: string, initial: number, final: number, unit: string, inverse?: boolean }) {
  const diff = final - initial;
  const isBetter = inverse ? diff < 0 : diff > 0;
  const percent = initial !== 0 ? ((final - initial) / initial) * 100 : 0;

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-300 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-[10px] uppercase tracking-widest text-slate-800 font-black mb-4">{label}</div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[8px] text-slate-400 font-bold uppercase">Inicial</div>
          <div className="text-lg font-mono text-slate-600">{initial}{unit}</div>
        </div>
        <div className="text-right">
          <div className="text-[8px] text-slate-400 font-bold uppercase">Final</div>
          <div className="text-2xl font-mono font-black text-slate-900">{final}{unit}</div>
        </div>
      </div>
      <div className={cn(
        "mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.1em]",
        isBetter ? "text-green-600" : "text-red-600"
      )}>
        <span>Evolução</span>
        <span>{diff > 0 ? '+' : ''}{diff.toFixed(1)}{unit} ({percent.toFixed(1)}%)</span>
      </div>
    </div>
  );
}

function InfoTooltip({ content }: { content: string }) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <button className="inline-flex items-center justify-center rounded-full p-0.5 text-slate-400 hover:text-red-600 transition-colors">
            <HelpCircle size={14} />
          </button>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content className="tooltip-content" sideOffset={5}>
            {content}
            <TooltipPrimitive.Arrow className="fill-slate-900" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

function InfoPopover({ title, content }: { title: string, content: string }) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button className="inline-flex items-center justify-center rounded-full p-1 text-slate-400 hover:text-red-600 transition-colors outline-none">
          <Info size={16} />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content className="popover-content" sideOffset={5}>
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-900">{title}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{content}</p>
          </div>
          <PopoverPrimitive.Close className="absolute top-2 right-2 p-1 rounded-full hover:bg-slate-100 text-slate-400 transition-colors outline-none">
            <Plus className="rotate-45" size={14} />
          </PopoverPrimitive.Close>
          <PopoverPrimitive.Arrow className="fill-white" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

const Card: React.FC<{ title: string, children: React.ReactNode, info?: string, actions?: React.ReactNode }> = ({ title, children, info, actions }) => {
  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-300 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-800">{title}</h3>
        <div className="flex items-center gap-2">
          {actions}
          {info && <InfoPopover title={title} content={info} />}
        </div>
      </div>
      {children}
    </div>
  );
}

function Input({ label, info, ...props }: { label: string, info?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] uppercase tracking-widest text-slate-700 font-bold">{label}</label>
        {info && <InfoTooltip content={info} />}
      </div>
      <input 
        className="w-full bg-slate-100 border border-slate-300 rounded-xl p-3 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all text-sm font-bold"
        {...props}
      />
    </div>
  );
}

function MetricResult({ label, value, unit, info }: { label: string, value: number, unit: string, info?: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-300 shadow-sm text-center group hover:border-red-600/20 transition-colors">
      <div className="flex items-center justify-center gap-1.5 mb-2">
        <div className="text-[10px] uppercase tracking-widest text-slate-800 font-black">{label}</div>
        {info && <InfoTooltip content={info} />}
      </div>
      <div className="text-3xl font-mono font-black tracking-tighter text-slate-900">
        {value}<span className="text-sm text-slate-400 ml-1 font-bold">{unit}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, info }: { label: string, value: number, sub: string, color: 'red' | 'slate' | 'green', info?: string }) {
  const colorClass = color === 'red' ? 'text-red-600' : color === 'green' ? 'text-green-600' : 'text-slate-900';
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-300 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] uppercase tracking-widest text-slate-800 font-black">{label}</div>
        {info && <InfoTooltip content={info} />}
      </div>
      <div className={cn("text-3xl font-mono font-black tracking-tighter", colorClass)}>
        {value}<span className="text-xs text-slate-400 ml-1 uppercase font-bold">{sub}</span>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[10px] uppercase tracking-widest text-slate-600 font-black">{label}</span>
    </div>
  );
}

function StatusItem({ label, range, active, color }: { label: string, range: string, active: boolean, color: string }) {
  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-xl transition-all",
      active ? "bg-white shadow-md scale-105 ring-1 ring-slate-300" : "opacity-40 grayscale"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn("w-3 h-3 rounded-full", color)} />
        <span className="text-xs font-bold tracking-tight">{label}</span>
      </div>
      <span className="text-[10px] font-mono text-slate-600 font-black">{range}</span>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ExerciseProvider>
        <MainRouter />
      </ExerciseProvider>
    </AuthProvider>
  );
}

function MainRouter() {
  const { user, role, athleteId, loading } = useAuth();
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500 font-bold">Carregando...</div>;
  }

  if (!user || !role) {
    return <LoginScreen />;
  }

  if (role === 'coach') {
    if (selectedAthleteId) {
      return <AthleteView athleteId={selectedAthleteId} isCoach={true} onBack={() => setSelectedAthleteId(null)} />;
    }
    return <CoachDashboard onSelectAthlete={setSelectedAthleteId} />;
  }

  if (role === 'athlete' && athleteId) {
    return <AthleteView athleteId={athleteId} isCoach={false} />;
  }

  return <LoginScreen />;
}
