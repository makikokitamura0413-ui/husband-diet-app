import { beforeEach, describe, expect, it } from 'vitest';
import { buildFreeMeal } from './meal';
import { actions, getData, recentFoods } from './store';

beforeEach(() => actions.resetAll());

describe('食事の自由入力', () => {
  it('食事名とカロリーをそのまま記録データにする', () => {
    const r = buildFreeMeal('2026-09-23', 'lunch', ' 牛丼 ', '650');
    expect(r).toEqual({
      ok: true,
      meal: { date: '2026-09-23', mealType: 'lunch', foodName: '牛丼', amount: 1, unit: '1食', kcal: 650 },
    });
  });

  it('登録データの推定値ではなく入力値を使う', () => {
    // 「ラーメン」は内蔵データでは500kcalだが、入力した820を使う
    const r = buildFreeMeal('2026-09-23', 'dinner', 'ラーメン', '820');
    expect(r.ok && r.meal.kcal).toBe(820);
  });

  it('全角数字・0kcal・小数（四捨五入）', () => {
    const k = (t: string) => {
      const r = buildFreeMeal('2026-09-23', 'snack', 'x', t);
      return r.ok ? r.meal.kcal : null;
    };
    expect(k('６５０')).toBe(650);
    expect(k('0')).toBe(0);
    expect(k('120.6')).toBe(121);
  });

  it('入力が足りない・不正ならエラー', () => {
    expect(buildFreeMeal('2026-09-23', 'lunch', '  ', '650').ok).toBe(false);
    expect(buildFreeMeal('2026-09-23', 'lunch', '牛丼', '').ok).toBe(false);
    expect(buildFreeMeal('2026-09-23', 'lunch', '牛丼', 'abc').ok).toBe(false);
    expect(buildFreeMeal('2026-09-23', 'lunch', '牛丼', '-10').ok).toBe(false);
    expect(buildFreeMeal('2026-09-23', 'lunch', '牛丼', '10001').ok).toBe(false);
  });

  it('保存してもマイメニューには登録されず、既存の記録も変わらない', () => {
    const c = actions.saveCustomFood({ name: '妻のお弁当', kcal: 620 });
    actions.saveMeal({ date: '2026-09-22', mealType: 'lunch', foodName: '妻のお弁当', amount: 1, unit: '1食', kcal: 620 });
    const before = structuredClone(getData().meals);

    const r = buildFreeMeal('2026-09-23', 'dinner', '焼肉', '1100');
    if (!r.ok) throw new Error(r.error);
    actions.saveMeal(r.meal);

    expect(getData().customFoods).toEqual([c]);
    expect(getData().meals).toHaveLength(2);
    expect(getData().meals.slice(0, 1)).toEqual(before);
    // 最近の食事には出る
    expect(recentFoods(getData())[0].foodName).toBe('焼肉');
  });
});
