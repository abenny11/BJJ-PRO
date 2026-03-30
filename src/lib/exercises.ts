export interface Exercise {
  id: string;
  name: string;
  category: 'Upper Push' | 'Upper Pull' | 'Lower Body';
  type: 'FIXO' | 'VARIAVEL';
  groupId?: string; // New field for grouping
  videoUrl?: string;
  coachId?: string;
  subExercises?: { name: string; videoUrl?: string }[]; // Updated field for Opções
}

export const DEFAULT_EXERCISES: Exercise[] = [
  // Membros Superiores Empurrada
  { id: 'bench', name: 'Supino Reto (Bench Press)', category: 'Upper Push', type: 'FIXO', groupId: 'push-1', videoUrl: 'https://www.youtube.com/results?search_query=Supino+Reto' },
  { id: 'incline_bench', name: 'Supino Inclinado com Barra', category: 'Upper Push', type: 'FIXO', groupId: 'push-2', videoUrl: 'https://www.youtube.com/results?search_query=Supino+Inclinado+com+Barra' },
  { id: 'shoulder_press', name: 'Dumbbell Shoulder Press', category: 'Upper Push', type: 'FIXO', groupId: 'push-3', videoUrl: 'https://www.youtube.com/results?search_query=Dumbbell+Shoulder+Press' },
  { id: 'upright_row', name: 'Remada Alta com Barra', category: 'Upper Push', type: 'FIXO', groupId: 'push-4', videoUrl: 'https://www.youtube.com/results?search_query=Remada+Alta+com+Barra' },
  { id: 'triceps_pulley', name: 'Tríceps Pulley', category: 'Upper Push', type: 'FIXO', groupId: 'push-5', videoUrl: 'https://www.youtube.com/results?search_query=Tríceps+Pulley' },

  // Membros Superiores Puxada
  { id: 'row', name: 'Remada Inclinada (Barbell Row)', category: 'Upper Pull', type: 'FIXO', groupId: 'pull-1', videoUrl: 'https://www.youtube.com/results?search_query=Remada+Inclinada+Barbell+Row' },
  { id: 'lat_pull_down', name: 'Puxada Frontal (Supinação)', category: 'Upper Pull', type: 'FIXO', groupId: 'pull-2', videoUrl: 'https://www.youtube.com/results?search_query=Puxada+Frontal' },
  { id: 'db_row', name: 'Remada Inclinada com Halter', category: 'Upper Pull', type: 'FIXO', groupId: 'pull-3', videoUrl: 'https://www.youtube.com/results?search_query=Remada+com+Halter' },
  { id: 'reverse_fly', name: 'Voador Inverso no banco inclinado com Halter', category: 'Upper Pull', type: 'FIXO', groupId: 'pull-4', videoUrl: 'https://www.youtube.com/results?search_query=Voador+Inverso' },
  { id: 'hammer_curl', name: 'Rosca Martelo com Halter', category: 'Upper Pull', type: 'FIXO', groupId: 'pull-5', videoUrl: 'https://www.youtube.com/results?search_query=Rosca+Martelo' },

  // Membros Inferiores
  { id: 'squat', name: 'Agachamento com Barra nas Costas (Back Squat)', category: 'Lower Body', type: 'FIXO', groupId: 'lower-1', videoUrl: 'https://www.youtube.com/results?search_query=Agachamento+Back+Squat' },
  { id: 'deadlift', name: 'Levantamento Terra (Deadlift)', category: 'Lower Body', type: 'FIXO', groupId: 'lower-2', videoUrl: 'https://www.youtube.com/results?search_query=Levantamento+Terra' },
  { id: 'lunge', name: 'Afundo com Halteres', category: 'Lower Body', type: 'FIXO', groupId: 'lower-3', videoUrl: 'https://www.youtube.com/results?search_query=Afundo+com+Halteres' },
  { id: 'stiff', name: 'Stiff com Halter', category: 'Lower Body', type: 'FIXO', groupId: 'lower-4', videoUrl: 'https://www.youtube.com/results?search_query=Stiff+com+Halter' }
];
