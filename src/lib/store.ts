import { useSyncExternalStore } from 'react';
import { normalize } from './foods';
import type { AppData, CustomFood, ExerciseRecord, MealRecord, UserSettings, WeightRecord } from './types';

const KEY = 'husband-diet-app:v1';

const empty = (): AppData => ({ version: 1, settings: null, weights: [], meals: [], exercises: [], customFoods: [] });

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return normalizeData(JSON.parse(raw) as Partial<AppData>);
  } catch {
    return empty();
  }
}

/** 古い形式のデータ（マイメニュー追加前など）にも欠けた項目を補う */
function normalizeData(parsed: Partial<AppData>): AppData {
  return {
    ...empty(),
    ...parsed,
    customFoods: Array.isArray(parsed.customFoods) ? parsed.customFoods : [],
    version: 1,
  };
}

let state: AppData = load();
const listeners = new Set<() => void>();

function commit(next: AppData) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 容量不足などは無視（画面上の状態は保持される）
  }
  listeners.forEach((l) => l());
}

export function getData(): AppData {
  return state;
}

export function useData(): AppData {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const actions = {
  saveSettings(settings: UserSettings) {
    commit({ ...state, settings });
  },
  /** 同じ日の体重は上書き */
  saveWeight(rec: WeightRecord) {
    const weights = state.weights.filter((w) => w.date !== rec.date);
    weights.push(rec);
    weights.sort((a, b) => a.date.localeCompare(b.date));
    commit({ ...state, weights });
  },
  deleteWeight(date: string) {
    commit({ ...state, weights: state.weights.filter((w) => w.date !== date) });
  },
  saveMeal(rec: Omit<MealRecord, 'id'> & { id?: string }) {
    const id = rec.id ?? newId();
    const meals = state.meals.filter((m) => m.id !== id);
    meals.push({ ...rec, id });
    commit({ ...state, meals });
  },
  deleteMeal(id: string) {
    commit({ ...state, meals: state.meals.filter((m) => m.id !== id) });
  },
  saveExercise(rec: Omit<ExerciseRecord, 'id'> & { id?: string }) {
    const id = rec.id ?? newId();
    const exercises = state.exercises.filter((e) => e.id !== id);
    exercises.push({ ...rec, id });
    commit({ ...state, exercises });
  },
  deleteExercise(id: string) {
    commit({ ...state, exercises: state.exercises.filter((e) => e.id !== id) });
  },
  /** マイメニューを登録・更新。同じ名前が既にあればエラー */
  saveCustomFood(rec: Omit<CustomFood, 'id'> & { id?: string }): CustomFood {
    const name = rec.name.trim();
    if (!name) throw new Error('メニュー名を入力してください');
    if (!(rec.kcal >= 0)) throw new Error('カロリーを正しく入力してください');
    if (findCustomFoodByName(state, name, rec.id)) throw new Error(`「${name}」は既に登録されています`);
    const id = rec.id ?? newId();
    const saved: CustomFood = { id, name, kcal: Math.round(rec.kcal) };
    const exists = state.customFoods.some((c) => c.id === id);
    const customFoods = exists
      ? state.customFoods.map((c) => (c.id === id ? saved : c))
      : [...state.customFoods, saved];
    commit({ ...state, customFoods });
    return saved;
  },
  /** マイメニューだけを削除（過去の食事記録はそのまま残る） */
  deleteCustomFood(id: string) {
    commit({ ...state, customFoods: state.customFoods.filter((c) => c.id !== id) });
  },
  exportJson(): string {
    return JSON.stringify(state, null, 2);
  },
  importJson(json: string) {
    const parsed = JSON.parse(json) as AppData;
    if (!Array.isArray(parsed.meals) || !Array.isArray(parsed.weights) || !Array.isArray(parsed.exercises)) {
      throw new Error('形式が正しくありません');
    }
    commit(normalizeData(parsed));
  },
  resetAll() {
    commit(empty());
  },
};

/** 同じ名前のマイメニュー（表記ゆれ・カタカナ/ひらがなも同一扱い）。exceptId は編集中の自分自身 */
export function findCustomFoodByName(data: AppData, name: string, exceptId?: string): CustomFood | undefined {
  const n = normalize(name);
  return data.customFoods.find((c) => c.id !== exceptId && normalize(c.name) === n);
}

/** 最近使った食品（入力を減らすためのクイック候補） */
export function recentFoods(data: AppData, limit = 6): MealRecord[] {
  const seen = new Set<string>();
  const out: MealRecord[] = [];
  const sorted = [...data.meals].sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)));
  for (const m of sorted) {
    const key = m.foodName + '|' + m.amount;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
    if (out.length >= limit) break;
  }
  return out;
}
