import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Edit2, Save, X, Dumbbell, ExternalLink } from 'lucide-react';
import { DEFAULT_EXERCISES, Exercise } from '../lib/exercises';
import { handleSupabaseError, OperationType } from '../lib/supabaseError';

export function ExerciseManagement({ coachId }: { coachId: string }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Exercise>>({});
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchExercises();
  }, [coachId]);

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('coach_id', coachId);
      if (error) {
        handleSupabaseError(error, OperationType.LIST, `exercises?coach_id=${coachId}`);
        setExercises(DEFAULT_EXERCISES);
      } else {
        const customExercises = (data || []) as Exercise[];
        // Merge default with custom (custom overrides default if same ID)
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
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (exercise: Exercise) => {
    const { error } = await supabase.from('exercises').upsert({
      ...exercise,
      coach_id: coachId
    });
    if (error) {
      handleSupabaseError(error, OperationType.WRITE, `exercises/${exercise.id}`);
    } else {
      setEditingId(null);
      setIsAdding(false);
      fetchExercises();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este exercício?')) return;
    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('id', id)
      .eq('coach_id', coachId);
    if (error) {
      handleSupabaseError(error, OperationType.DELETE, `exercises/${id}`);
    } else {
      fetchExercises();
    }
  };

  const startEdit = (ex: Exercise) => {
    setEditingId(ex.id);
    setEditForm(ex);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId('new');
    setEditForm({
      id: Math.random().toString(36).substring(2, 9),
      name: '',
      category: 'Upper Push',
      type: 'VARIAVEL',
      videoUrl: '',
      subExercises: []
    });
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando exercícios...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">Gerenciar Exercícios</h2>
        <button 
          onClick={startAdd}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg active:scale-95"
        >
          <Plus size={18} />
          Novo Exercício
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {exercises.map((ex) => {
          const isEditing = editingId === ex.id;
          const isDefault = DEFAULT_EXERCISES.some(d => d.id === ex.id && !d.coachId);
          const isFixed = ex.type === 'FIXO';

          return (
            <div key={ex.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black text-slate-400">Nome</label>
                      <input 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-red-600"
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        disabled={isFixed}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black text-slate-400">Categoria</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-red-600"
                        value={editForm.category}
                        onChange={e => setEditForm({ ...editForm, category: e.target.value as any })}
                      >
                        <option value="Upper Push">Upper Push (Empurrada)</option>
                        <option value="Upper Pull">Upper Pull (Puxada)</option>
                        <option value="Lower Body">Lower Body (Inferiores)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black text-slate-400">Opção (A, B, C...)</label>
                      <input 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-red-600"
                        value={editForm.groupId || ''}
                        onChange={e => setEditForm({ ...editForm, groupId: e.target.value || undefined })}
                        placeholder="Ex: A"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-3">
                      <label className="text-[10px] uppercase font-black text-slate-400">Opções</label>
                      <div className="space-y-2">
                        {(editForm.subExercises || []).map((sub, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-red-600"
                              value={sub.name}
                              placeholder="Nome da opção"
                              onChange={e => {
                                const newSubs = [...(editForm.subExercises || [])];
                                newSubs[idx] = { ...newSubs[idx], name: e.target.value };
                                setEditForm({ ...editForm, subExercises: newSubs });
                              }}
                            />
                            <input
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-red-600"
                              value={sub.videoUrl || ''}
                              placeholder="URL do vídeo"
                              onChange={e => {
                                const newSubs = [...(editForm.subExercises || [])];
                                newSubs[idx] = { ...newSubs[idx], videoUrl: e.target.value };
                                setEditForm({ ...editForm, subExercises: newSubs });
                              }}
                            />
                            <button
                              onClick={() => {
                                const newSubs = (editForm.subExercises || []).filter((_, i) => i !== idx);
                                setEditForm({ ...editForm, subExercises: newSubs });
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => setEditForm({ ...editForm, subExercises: [...(editForm.subExercises || []), { name: '' }] })}
                          className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700"
                        >
                          <Plus size={14} /> Adicionar Opção
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black text-slate-400">Tipo</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-red-600"
                        value={editForm.type}
                        onChange={e => setEditForm({ ...editForm, type: e.target.value as any })}
                      >
                        <option value="FIXO">FIXO (Obrigatório)</option>
                        <option value="VARIAVEL">VARIÁVEL (Dropdown)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black text-slate-400">URL do Vídeo (YouTube)</label>
                      <input 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-red-600"
                        value={editForm.videoUrl}
                        onChange={e => setEditForm({ ...editForm, videoUrl: e.target.value })}
                        placeholder="https://youtube.com/..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button 
                      onClick={() => { setEditingId(null); setIsAdding(false); }}
                      className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => handleSave(editForm as Exercise)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-all"
                    >
                      <Save size={16} />
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ex.type === 'FIXO' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>
                      <Dumbbell size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-900">{ex.name}</h3>
                        <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded ${ex.type === 'FIXO' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {ex.type}
                        </span>
                      </div>
                      {ex.subExercises && ex.subExercises.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-[10px] uppercase font-black text-slate-400">Opções:</p>
                          {ex.subExercises.map((sub, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                              <span>• {sub.name}</span>
                              {sub.videoUrl && (
                                <a href={sub.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                                  <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ex.category}</span>
                        {ex.videoUrl && (
                          <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 flex items-center gap-1 text-[10px] font-bold uppercase">
                            <ExternalLink size={10} />
                            Vídeo
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <>
                      <button 
                        onClick={() => startEdit(ex)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(ex.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isAdding && editingId === 'new' && (
          <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-red-200 shadow-sm animate-in fade-in zoom-in duration-300">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-slate-400">Nome</label>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-red-600"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Ex: Supino Reto"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-slate-400">Categoria</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-red-600"
                    value={editForm.category}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value as any })}
                  >
                    <option value="Upper Push">Upper Push (Empurrada)</option>
                    <option value="Upper Pull">Upper Pull (Puxada)</option>
                    <option value="Lower Body">Lower Body (Inferiores)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-slate-400">Opção (A, B, C...)</label>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-red-600"
                    value={editForm.groupId || ''}
                    onChange={e => setEditForm({ ...editForm, groupId: e.target.value || undefined })}
                    placeholder="Ex: A"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-3">
                  <label className="text-[10px] uppercase font-black text-slate-400">Opções</label>
                  <div className="space-y-2">
                    {(editForm.subExercises || []).map((sub, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-red-600"
                          value={sub.name}
                          placeholder="Nome da opção"
                          onChange={e => {
                            const newSubs = [...(editForm.subExercises || [])];
                            newSubs[idx] = { ...newSubs[idx], name: e.target.value };
                            setEditForm({ ...editForm, subExercises: newSubs });
                          }}
                        />
                        <input
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-red-600"
                          value={sub.videoUrl || ''}
                          placeholder="URL do vídeo"
                          onChange={e => {
                            const newSubs = [...(editForm.subExercises || [])];
                            newSubs[idx] = { ...newSubs[idx], videoUrl: e.target.value };
                            setEditForm({ ...editForm, subExercises: newSubs });
                          }}
                        />
                        <button
                          onClick={() => {
                            const newSubs = (editForm.subExercises || []).filter((_, i) => i !== idx);
                            setEditForm({ ...editForm, subExercises: newSubs });
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setEditForm({ ...editForm, subExercises: [...(editForm.subExercises || []), { name: '' }] })}
                      className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700"
                    >
                      <Plus size={14} /> Adicionar Opção
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-slate-400">Tipo</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-red-600"
                    value={editForm.type}
                    onChange={e => setEditForm({ ...editForm, type: e.target.value as any })}
                  >
                    <option value="FIXO">FIXO (Obrigatório)</option>
                    <option value="VARIAVEL">VARIÁVEL (Dropdown)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-slate-400">URL do Vídeo (YouTube)</label>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-red-600"
                    value={editForm.videoUrl}
                    onChange={e => setEditForm({ ...editForm, videoUrl: e.target.value })}
                    placeholder="https://youtube.com/..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  onClick={() => { setEditingId(null); setIsAdding(false); }}
                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleSave(editForm as Exercise)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-all shadow-lg"
                >
                  <Save size={16} />
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
