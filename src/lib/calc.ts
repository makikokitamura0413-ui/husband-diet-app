import type {
  ActivityLevel,
  AppData,
  DateKey,
  ExerciseType,
  MealType,
  UserSettings,
  WeightRecord,
} from './types';
import { addDays, daysInMonth, diffDays } from './date';

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
  snack: '間食',
};
export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const ACTIVITY_LEVELS: Record<ActivityLevel, { label: string; desc: string; factor: number }> = {
  low: { label: '低い', desc: 'デスクワーク中心・通勤以外ほぼ動かない', factor: 1.5 },
  normal: { label: 'ふつう', desc: '立ち仕事や移動・家事がそこそこある', factor: 1.75 },
  high: { label: '高い', desc: '体を使う仕事・一日中よく動く', factor: 2.0 },
};

/** METs（身体活動のメッツ表を参考にした代表値） */
export const EXERCISES: Record<ExerciseType, { label: string; mets: number; note: string }> = {
  walking: { label: 'ウォーキング', mets: 3.5, note: '普通〜やや速歩き' },
  jogging: { label: 'ジョギング', mets: 7.0, note: 'ゆっくり走る' },
  running: { label: 'ランニング', mets: 9.8, note: '時速約10km' },
  cycling: { label: 'サイクリング', mets: 6.8, note: '時速約20km' },
  swimming: { label: '水泳', mets: 7.0, note: 'クロールなど・ふつうのペース' },
  strength: { label: '筋トレ', mets: 5.0, note: 'ウエイト・自重トレーニング' },
  other: { label: 'その他', mets: 4.0, note: '中程度の運動として計算' },
};
export const EXERCISE_ORDER: ExerciseType[] = [
  'walking',
  'jogging',
  'running',
  'cycling',
  'swimming',
  'strength',
  'other',
];

/**
 * 基礎代謝（kcal/日）: 国立健康・栄養研究所の式
 * (0.0481×体重 + 0.0234×身長 − 0.0138×年齢 − 定数) × 1000 / 4.186
 */
export function calcBmr(s: Pick<UserSettings, 'sex' | 'age' | 'heightCm'>, weightKg: number): number {
  const c = s.sex === 'male' ? 0.4235 : 0.9708;
  const bmr = ((0.0481 * weightKg + 0.0234 * s.heightCm - 0.0138 * s.age - c) * 1000) / 4.186;
  return Math.max(0, Math.round(bmr));
}

/** 日常活動による消費 = 基礎代謝 ×（活動係数 − 1） */
export function calcDailyActivity(bmr: number, level: ActivityLevel): number {
  return Math.round(bmr * (ACTIVITY_LEVELS[level].factor - 1));
}

/**
 * 運動による追加消費（kcal）
 * = (METs − 1) × 体重kg × 時間h × 1.05
 * 安静時の分（1 MET）は基礎代謝・日常活動に含まれるため差し引く。
 */
export function calcExerciseKcal(type: ExerciseType, minutes: number, weightKg: number): number {
  if (!(minutes > 0) || !(weightKg > 0)) return 0;
  const mets = EXERCISES[type].mets;
  return Math.round((mets - 1) * weightKg * (minutes / 60) * 1.05);
}

/** その日時点で有効な体重（その日以前で最も新しい記録。なければ設定値） */
export function weightOn(data: AppData, date: DateKey): number | null {
  let best: WeightRecord | null = null;
  for (const w of data.weights) {
    if (w.date <= date && (!best || w.date > best.date)) best = w;
  }
  if (best) return best.weightKg;
  // 最初の体重記録より前の日は、初回設定の体重で代用
  return data.settings?.weightKg ?? null;
}

export interface DaySummary {
  date: DateKey;
  /** その日に記録された体重（なければ null） */
  weight: number | null;
  intake: number;
  bmr: number;
  dailyActivity: number;
  exercise: number;
  totalBurn: number;
  /** 摂取 − 総消費（マイナスなら消費が上回っている） */
  balance: number;
  mealCount: number;
  exerciseCount: number;
  hasRecord: boolean;
}

export function summarizeDay(data: AppData, date: DateKey): DaySummary {
  const meals = data.meals.filter((m) => m.date === date);
  const exercises = data.exercises.filter((e) => e.date === date);
  const weightRec = data.weights.find((w) => w.date === date) ?? null;
  const intake = meals.reduce((s, m) => s + m.kcal, 0);
  const exercise = exercises.reduce((s, e) => s + e.kcal, 0);
  const w = weightOn(data, date);
  const bmr = data.settings && w ? calcBmr(data.settings, w) : 0;
  const dailyActivity = data.settings ? calcDailyActivity(bmr, data.settings.activityLevel) : 0;
  const totalBurn = bmr + dailyActivity + exercise;
  return {
    date,
    weight: weightRec?.weightKg ?? null,
    intake,
    bmr,
    dailyActivity,
    exercise,
    totalBurn,
    balance: intake - totalBurn,
    mealCount: meals.length,
    exerciseCount: exercises.length,
    hasRecord: meals.length > 0 || exercises.length > 0 || weightRec !== null,
  };
}

export interface MonthSummary {
  month: string;
  /** 食事記録がある日（集計対象日） */
  recordedDays: number;
  totalIntake: number;
  totalBurn: number;
  balance: number;
  avgIntake: number;
  avgBurn: number;
  exerciseDays: number;
  totalExercise: number;
  startWeight: WeightRecord | null;
  endWeight: WeightRecord | null;
  weightChange: number | null;
}

/**
 * 月間集計。
 * 摂取・消費・収支・平均は「食事記録がある日」だけを対象にする
 * （記録していない日の消費だけが積み上がって収支が狂うのを防ぐため）。
 */
export function summarizeMonth(data: AppData, month: string): MonthSummary {
  const days = daysInMonth(month).map((d) => summarizeDay(data, d));
  const recorded = days.filter((d) => d.mealCount > 0);
  const totalIntake = recorded.reduce((s, d) => s + d.intake, 0);
  const totalBurn = recorded.reduce((s, d) => s + d.totalBurn, 0);
  const n = recorded.length;
  const weights = data.weights
    .filter((w) => w.date.startsWith(month + '-'))
    .sort((a, b) => a.date.localeCompare(b.date));
  const startWeight = weights[0] ?? null;
  const endWeight = weights.length ? weights[weights.length - 1] : null;
  return {
    month,
    recordedDays: n,
    totalIntake,
    totalBurn,
    balance: totalIntake - totalBurn,
    avgIntake: n ? Math.round(totalIntake / n) : 0,
    avgBurn: n ? Math.round(totalBurn / n) : 0,
    exerciseDays: days.filter((d) => d.exerciseCount > 0).length,
    totalExercise: days.reduce((s, d) => s + d.exercise, 0),
    startWeight,
    endWeight,
    weightChange:
      startWeight && endWeight && weights.length >= 2
        ? round1(endWeight.weightKg - startWeight.weightKg)
        : null,
  };
}

export interface WeightPoint {
  date: DateKey;
  weight: number;
  /** その日を含む直近7日間（暦日）の記録の平均。7日分なければ存在する分だけで平均 */
  avg7: number;
  /** 平均に使った記録数 */
  count: number;
}

export function movingAverage7(weights: WeightRecord[]): WeightPoint[] {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((w) => {
    const from = addDays(w.date, -6);
    const win = sorted.filter((x) => x.date >= from && x.date <= w.date);
    const avg = win.reduce((s, x) => s + x.weightKg, 0) / win.length;
    return { date: w.date, weight: w.weightKg, avg7: round1(avg), count: win.length };
  });
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function isWithinDays(date: DateKey, base: DateKey, days: number): boolean {
  const d = diffDays(date, base);
  return d >= 0 && d < days;
}

export function fmt(n: number): string {
  return Math.round(n).toLocaleString('ja-JP');
}

export function fmtSigned(n: number): string {
  const r = Math.round(n);
  return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r).toLocaleString('ja-JP');
}
