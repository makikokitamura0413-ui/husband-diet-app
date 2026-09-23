export type Sex = 'male' | 'female';
export type ActivityLevel = 'low' | 'normal' | 'high';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type ExerciseType =
  | 'walking'
  | 'jogging'
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'strength'
  | 'other';

/** 日付は常に 'YYYY-MM-DD'（端末のローカル日付） */
export type DateKey = string;

export interface UserSettings {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
}

export interface WeightRecord {
  date: DateKey;
  weightKg: number;
}

export interface MealRecord {
  id: string;
  date: DateKey;
  mealType: MealType;
  foodName: string;
  /** 量（何人前・何杯など。基準量に対する倍率） */
  amount: number;
  /** 基準量の単位表示（例: 1杯, 1人前） */
  unit: string;
  /** 推定カロリー（量を掛けた後の値） */
  kcal: number;
}

export interface ExerciseRecord {
  id: string;
  date: DateKey;
  type: ExerciseType;
  /** その他の場合の名前など */
  name?: string;
  minutes: number;
  /** 推定追加消費カロリー */
  kcal: number;
}

/** ユーザーが自分で登録した食事メニュー（1食分のカロリー） */
export interface CustomFood {
  id: string;
  name: string;
  kcal: number;
}

export interface AppData {
  version: 1;
  settings: UserSettings | null;
  weights: WeightRecord[];
  meals: MealRecord[];
  exercises: ExerciseRecord[];
  customFoods: CustomFood[];
}
