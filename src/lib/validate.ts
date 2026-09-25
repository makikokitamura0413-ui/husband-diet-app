import type { AppData } from './types';

/**
 * 保存データ（husband-diet-app:v1 の中身）の検査。
 * - 形式は変更しない。欠けている customFoods（マイメニュー導入前のデータ）だけ [] で補う
 * - 知らない項目は捨てずにそのまま残す（将来の版で追加された項目を消さないため）
 * - 型が合わないものがあれば「不正」とし、呼び出し側はデータを書き換えずに保護モードにする
 */
export type ValidateResult = { ok: true; data: AppData } | { ok: false; errors: string[] };

export const SUPPORTED_DATA_VERSION = 1;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown) => typeof v === 'string';
const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const oneOf = (list: string[]) => (v: unknown) => typeof v === 'string' && list.includes(v);

type Rule = [field: string, check: (v: unknown) => boolean, optional?: boolean];

const RULES: Record<string, Rule[]> = {
  settings: [
    ['sex', oneOf(['male', 'female'])],
    ['age', isNum],
    ['heightCm', isNum],
    ['weightKg', isNum],
    ['activityLevel', oneOf(['low', 'normal', 'high'])],
  ],
  weights: [
    ['date', isDate],
    ['weightKg', isNum],
  ],
  meals: [
    ['id', isStr],
    ['date', isDate],
    ['mealType', oneOf(['breakfast', 'lunch', 'dinner', 'snack'])],
    ['foodName', isStr],
    ['amount', isNum],
    ['unit', isStr],
    ['kcal', isNum],
  ],
  exercises: [
    ['id', isStr],
    ['date', isDate],
    ['type', oneOf(['walking', 'jogging', 'running', 'cycling', 'swimming', 'strength', 'other'])],
    ['name', isStr, true],
    ['minutes', isNum],
    ['kcal', isNum],
  ],
  customFoods: [
    ['id', isStr],
    ['name', isStr],
    ['kcal', isNum],
  ],
};

function checkRecord(path: string, v: unknown, rules: Rule[], errors: string[]) {
  if (!isObj(v)) {
    errors.push(`${path} がオブジェクトではありません`);
    return;
  }
  for (const [field, check, optional] of rules) {
    if (optional && v[field] === undefined) continue;
    if (!check(v[field])) errors.push(`${path}.${field} の値が不正です`);
  }
}

export function validateAppData(input: unknown): ValidateResult {
  const errors: string[] = [];
  if (!isObj(input)) return { ok: false, errors: ['データがオブジェクトではありません'] };

  const version = input.version ?? SUPPORTED_DATA_VERSION;
  if (version !== SUPPORTED_DATA_VERSION) {
    return { ok: false, errors: [`対応していないデータの版です（version: ${String(input.version)}）`] };
  }
  if (input.settings !== null && input.settings !== undefined) checkRecord('settings', input.settings, RULES.settings, errors);

  for (const key of ['weights', 'meals', 'exercises', 'customFoods'] as const) {
    const list = input[key];
    if (key === 'customFoods' && list === undefined) continue;
    if (!Array.isArray(list)) {
      errors.push(`${key} が配列ではありません`);
      continue;
    }
    list.forEach((item, i) => checkRecord(`${key}[${i}]`, item, RULES[key], errors));
  }
  if (errors.length) return { ok: false, errors: errors.slice(0, 5).concat(errors.length > 5 ? [`ほか ${errors.length - 5} 件`] : []) };

  return {
    ok: true,
    data: {
      ...(input as unknown as AppData),
      settings: (input.settings ?? null) as AppData['settings'],
      customFoods: (input.customFoods ?? []) as AppData['customFoods'],
      version: 1,
    },
  };
}

export interface DataCounts {
  weights: number;
  meals: number;
  exercises: number;
  customFoods: number;
  hasSettings: boolean;
  from: string | null;
  to: string | null;
}

export function countData(d: AppData): DataCounts {
  const dates = [...d.weights.map((w) => w.date), ...d.meals.map((m) => m.date), ...d.exercises.map((e) => e.date)].sort();
  return {
    weights: d.weights.length,
    meals: d.meals.length,
    exercises: d.exercises.length,
    customFoods: d.customFoods.length,
    hasSettings: !!d.settings,
    from: dates[0] ?? null,
    to: dates[dates.length - 1] ?? null,
  };
}
