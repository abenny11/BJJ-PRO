/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BodyMetrics, Gender, BodyComposition, BJJStyle } from '../types';

/**
 * IBJJF Weight Categories (Adult, Gi)
 */
export interface WeightCategory {
  name: string;
  limit: number; // kg
}

export const MALE_WEIGHT_CATEGORIES: WeightCategory[] = [
  { name: 'Galo', limit: 57.5 },
  { name: 'Pluma', limit: 64.0 },
  { name: 'Pena', limit: 70.0 },
  { name: 'Leve', limit: 76.0 },
  { name: 'Médio', limit: 82.3 },
  { name: 'Meio-Pesado', limit: 88.3 },
  { name: 'Pesado', limit: 94.3 },
  { name: 'Super Pesado', limit: 100.5 },
  { name: 'Pesadíssimo', limit: Infinity },
];

export const FEMALE_WEIGHT_CATEGORIES: WeightCategory[] = [
  { name: 'Galo', limit: 48.5 },
  { name: 'Pluma', limit: 53.5 },
  { name: 'Pena', limit: 58.5 },
  { name: 'Leve', limit: 64.0 },
  { name: 'Médio', limit: 69.0 },
  { name: 'Meio-Pesado', limit: 74.0 },
  { name: 'Pesado', limit: 79.3 },
  { name: 'Super Pesado', limit: Infinity },
];

export function getBJJWeightCategory(weight: number, gender: Gender): string {
  const categories = gender === 'Masculino' ? MALE_WEIGHT_CATEGORIES : FEMALE_WEIGHT_CATEGORIES;
  for (const cat of categories) {
    if (weight <= cat.limit) return cat.name;
  }
  return 'Desconhecido';
}

export function getIdealWeightCategory(weight: number, height: number, gender: Gender): { current: string, ideal: string, suggestion: string } {
  const current = getBJJWeightCategory(weight, gender);
  
  // Simple heuristic: Ideal weight for BJJ is often around Height(cm) - 100 to 105 for competitors
  const idealWeight = height - 105;
  const ideal = getBJJWeightCategory(idealWeight, gender);
  
  let suggestion = "";
  if (weight > idealWeight + 5) {
    suggestion = `Você está acima do peso ideal para sua altura no cenário competitivo. Tente baixar para a categoria ${ideal}.`;
  } else if (weight < idealWeight - 5) {
    suggestion = `Você está leve para sua altura. Ganhar massa muscular para subir para a categoria ${ideal} pode te dar vantagem de alavanca.`;
  } else {
    suggestion = `Você está em uma ótima categoria para sua altura!`;
  }

  return { current, ideal, suggestion };
}

/**
 * Suggest BJJ Style based on biotype
 */
export function suggestBJJStyle(metrics: BodyMetrics): { style: BJJStyle, positions: string[] } {
  const { height, weight, armLength, legLength } = metrics;
  
  // Ratio of height to weight (simple indicator of "lankiness")
  const bmi = weight / ((height / 100) ** 2);
  
  // If we have limb data, use it
  const isLanky = bmi < 23 || (armLength && armLength > height * 0.45) || (legLength && legLength > height * 0.55);
  const isStocky = bmi > 27;

  if (isLanky) {
    return {
      style: 'Guardeiro',
      positions: ['Triângulo', 'Guarda Laçada', 'Guarda Aranha', 'Omoplata']
    };
  } else if (isStocky) {
    return {
      style: 'Passador',
      positions: ['Passagem de Pressão', 'Meia Guarda por cima', 'Leg Weave', 'Norte-Sul']
    };
  } else {
    return {
      style: 'Híbrido',
      positions: ['Single Leg', 'Guarda X', 'Passagem de Gancho', 'Costas']
    };
  }
}

/**
 * Technical BJJ Suggestions based on Height/Weight tables
 */
export function getBJJTechnicalFocus(heightCm: number, weightKg: number): { guard: string, pass: string } {
  const height = heightCm / 100;
  const weight = weightKg;

  let guard = "";
  let pass = "";

  // Guard Logic based on Image 1
  if (weight <= 70) {
    if (height <= 1.70) guard = "50/50 - Berimbolo";
    else if (height <= 1.80) guard = "Guarda Fechada / De la Riva";
    else guard = "Foco em Nutrição (Ganho de Massa)";
  } else if (weight <= 80) {
    if (height <= 1.70) guard = "Guarda Laçada";
    else if (height <= 1.80) guard = "Guarda Fechada / De la Riva";
    else guard = "Foco em Nutrição (Ganho de Massa)";
  } else if (weight <= 90) {
    if (height <= 1.70) guard = "Meia Guarda";
    else if (height <= 1.75) guard = "Guarda Fechada / De la Riva";
    else if (height <= 1.90) guard = "Guarda Fechada / De la Riva";
    else guard = "Foco em Nutrição (Ganho de Massa)";
  } else {
    guard = "Meia Guarda";
  }

  // Pass Logic based on Image 2
  if (weight >= 100) {
    pass = "Passagem Emborcando";
  } else if (weight >= 70) {
    if (height <= 1.60) pass = "Passagem Emborcando";
    else if (height <= 1.90) pass = "Knee Cut";
    else pass = "Passagem Long Step";
  } else {
    if (height <= 1.60) pass = "Passagem Toreando";
    else pass = "Passagem Long Step";
  }

  return { guard, pass };
}

/**
 * US Navy Body Fat Formula
 */
export function calculateBodyFat(metrics: BodyMetrics, gender: Gender): BodyComposition {
  const { height, weight, neck, abdomen, hip } = metrics;
  let fatPercentage = 0;

  if (gender === 'Masculino') {
    // 495 / (1.03248 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450
    fatPercentage = 495 / (1.03248 - 0.19077 * Math.log10(abdomen - neck) + 0.15456 * Math.log10(height)) - 450;
  } else {
    // 495 / (1.29579 - 0.35004 * log10(waist + hip - neck) + 0.22100 * log10(height)) - 450
    const hipValue = hip || 0;
    fatPercentage = 495 / (1.29579 - 0.35004 * Math.log10(abdomen + hipValue - neck) + 0.22100 * Math.log10(height)) - 450;
  }

  const fatMass = (weight * fatPercentage) / 100;
  const leanMass = weight - fatMass;

  return {
    fatPercentage: Math.max(0, parseFloat(fatPercentage.toFixed(1))),
    fatMass: Math.max(0, parseFloat(fatMass.toFixed(1))),
    leanMass: Math.max(0, parseFloat(leanMass.toFixed(1))),
  };
}

/**
 * Brzycki 1RM Estimation
 */
export function estimate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps <= 0) return 0;
  return parseFloat((weight / (1.0278 - 0.0278 * reps)).toFixed(1));
}

/**
 * Cooper Test VO2 Max
 */
export function calculateVO2Max(distanceMeters: number): number {
  // (Distance - 504.9) / 44.73
  return parseFloat(((distanceMeters - 504.9) / 44.73).toFixed(1));
}

/**
 * Velocity at VO2 Max (vVO2max) estimation
 * Simple estimation: VO2max / 3.5 * 12 (roughly)
 * Or more commonly: Distance / 12 * 60 / 1000 for km/h
 */
/**
 * Velocity at VO2 Max (vVO2max) estimation
 * Simple estimation: VO2max / 3.5 * 12 (roughly)
 * Or more commonly: Distance / 12 * 60 / 1000 for km/h
 */
export function calculateVVO2Max(distanceMeters: number): number {
  return parseFloat(((distanceMeters / 12) * 0.06).toFixed(1)); // km/h
}

/**
 * Calculate exercise performance percentage
 */
export function calculateExercisePerformance(setsDone: (number | null)[], goalReps: number): number {
  const repsDone = setsDone.reduce((sum, reps) => (sum || 0) + (reps || 0), 0);
  const targetReps = goalReps * setsDone.length;
  if (targetReps === 0) return 0;
  return parseFloat(((repsDone / targetReps) * 100).toFixed(1));
}

/**
 * Calculate training average performance
 */
export function calculateTrainingAverage(exercises: any[]): number {
  if (exercises.length === 0) return 0;
  const sum = exercises.reduce((acc, ex) => acc + ex.performance, 0);
  return parseFloat((sum / exercises.length).toFixed(1));
}

/**
 * Calculate weekly group average performance
 */
export function calculateWeeklyGroupAverage(trainings: any[]): number {
  if (trainings.length === 0) return 0;
  const sum = trainings.reduce((acc, t) => acc + t.average, 0);
  return parseFloat((sum / trainings.length).toFixed(1));
}
