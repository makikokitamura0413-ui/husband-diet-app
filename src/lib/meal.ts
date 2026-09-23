import type { DateKey, MealRecord, MealType } from './types';
import { parseNum } from './num';

/** 自由入力の食事の基準量表示（マイメニューと同じ「1食」） */
export const FREE_UNIT = '1食';
export const MAX_MEAL_KCAL = 10000;

export type FreeMealResult =
  | { ok: true; meal: Omit<MealRecord, 'id'> }
  | { ok: false; error: string };

/**
 * 自由入力（食事名＋カロリー）から食事記録を作る。
 * カロリーは入力値をそのまま使い（整数に丸めるだけ）、マイメニューには登録しない。
 */
export function buildFreeMeal(date: DateKey, mealType: MealType, name: string, kcalText: string): FreeMealResult {
  const foodName = name.trim();
  if (!foodName) return { ok: false, error: '食事メニューを入力してください' };
  const kcal = parseNum(kcalText);
  if (!Number.isFinite(kcal) || kcal < 0 || kcal > MAX_MEAL_KCAL) {
    return { ok: false, error: `カロリーは0〜${MAX_MEAL_KCAL.toLocaleString('ja-JP')}の数字で入力してください` };
  }
  return { ok: true, meal: { date, mealType, foodName, amount: 1, unit: FREE_UNIT, kcal: Math.round(kcal) } };
}
