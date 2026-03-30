/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Gender = 'Masculino' | 'Feminino';

export interface BodyMetrics {
  age: number;
  height: number; // cm
  weight: number; // kg
  neck: number; // cm
  abdomen: number; // cm
  chest?: number; // cm
  waist?: number; // cm
  hips?: number; // cm
  biceps?: number; // cm
  thigh?: number; // cm
  calf?: number; // cm
  hip?: number; // cm (women only)
  armLength?: number; // cm
  legLength?: number; // cm
}

export interface BodyComposition {
  fatPercentage: number;
  fatMass: number;
  leanMass: number;
}

export interface StrengthTestSeries {
  weight: number;
  reps: number;
  rest: string;
}

export interface StrengthTest {
  exercise: string;
  series: [StrengthTestSeries, StrengthTestSeries, StrengthTestSeries];
  estimated1RM: number;
}

export interface AerobicTest {
  distance: number; // meters
  vo2Max: number;
  vVo2Max: number;
}

export interface StrengthLog {
  exerciseId: string;
  sets: [number | null, number | null, number | null];
  prescribedWeight: number;
  goalReps: number;
}

export interface AerobicLog {
  sessionId: string;
  distance: number | null;
  rpe: string | null;
  avgHr: number | null;
  prescribedSpeed: { low: number; high: number };
  duration: number;
}

export interface WeeklyLog {
  strength: Record<string, StrengthLog>; // exerciseId -> log
  aerobic: Record<string, AerobicLog>; // sessionId -> log
  presence: Record<string, boolean>; // date string -> completed
}

export interface RetestStrengthTest {
  exercise: string;
  buildUp: StrengthTestSeries;
  test: StrengthTestSeries & { completed: boolean };
  series2: StrengthTestSeries;
  series3: StrengthTestSeries;
  estimated1RM: number;
}

export interface RetestAerobicTest {
  distance: number;
  vo2Max: number;
  vVo2Max: number;
}

export interface Cycle {
  id: string;
  startDate: string;
  endDate?: string;
  initialMetrics: BodyMetrics;
  initialStrengthTests: Record<string, StrengthTest>;
  initialAerobicTest?: AerobicTest;
  selectedExercises?: Record<string, string>; // category -> exerciseId for variable exercises
  selectedSubExercises?: Record<string, string>; // exerciseId -> subExerciseName
  weeklyLogs: Record<number, WeeklyLog>;
  retestMetrics?: BodyMetrics;
  retestStrengthTests?: Record<string, RetestStrengthTest>;
  retestAerobicTest?: RetestAerobicTest;
}

export interface BodyCompRecord {
  date: string;
  metrics: BodyMetrics;
  composition: BodyComposition;
}

export type BJJStyle = 'Guardeiro' | 'Passador' | 'Híbrido';

export interface MealItem {
  foodId: string;
  quantity: number; // in grams or units
}

export interface Meal {
  id: string;
  name: string;
  time: string; // HH:mm
  items: MealItem[];
  isPreWorkout?: boolean;
  isPostWorkout?: boolean;
}

export interface DailyNutrition {
  meals: Meal[];
}

export interface NutritionLog {
  [date: string]: DailyNutrition;
}

export type DayOfWeek = 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta' | 'Sábado' | 'Domingo';
export type TrainingType = 'Jiu-Jitsu' | 'Academia';

export interface TrainingSession {
  type: TrainingType;
  time: string; // HH:mm
  duration: number; // minutes
}

export interface TrainingSchedule {
  [key: string]: TrainingSession[]; // key is DayOfWeek
}

export interface UserData {
  name: string;
  gender: Gender;
  belt?: 'Branca' | 'Azul' | 'Roxa' | 'Marrom' | 'Preta';
  stylePreference?: BJJStyle;
  strongPositions?: string[];
  path: 'Competidor' | 'Lifestyle';
  pathData: {
    fightDuration?: number;
    fightsToFinal?: number;
    rollsCount?: number;
    rollDuration?: number;
  };
  currentCycle: Cycle;
  history: Cycle[];
  bodyCompHistory: BodyCompRecord[];
  nutritionLog?: NutritionLog;
  trainingSchedule?: TrainingSchedule;
}
