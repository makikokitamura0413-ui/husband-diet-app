import { beforeEach, describe, expect, it } from 'vitest';
import { actions, getData, recentFoods } from './store';
import { findFood, searchFoods } from './foods';

beforeEach(() => actions.resetAll());

describe('マイメニューの保存', () => {
  it('登録・編集・削除できる', () => {
    const a = actions.saveCustomFood({ name: ' 妻のお弁当 ', kcal: 620 });
    expect(a.name).toBe('妻のお弁当');
    expect(getData().customFoods).toEqual([{ id: a.id, name: '妻のお弁当', kcal: 620 }]);

    actions.saveCustomFood({ id: a.id, name: '妻のお弁当（大）', kcal: 780 });
    expect(getData().customFoods).toEqual([{ id: a.id, name: '妻のお弁当（大）', kcal: 780 }]);

    actions.deleteCustomFood(a.id);
    expect(getData().customFoods).toEqual([]);
  });

  it('入力したカロリーをそのまま使う（小数は四捨五入のみ）', () => {
    expect(actions.saveCustomFood({ name: 'A', kcal: 537 }).kcal).toBe(537);
    expect(actions.saveCustomFood({ name: 'B', kcal: 0 }).kcal).toBe(0);
  });

  it('同じ名前（ひらがな/カタカナ・空白違いも含む）は重複登録できない', () => {
    actions.saveCustomFood({ name: 'ラーメン大', kcal: 900 });
    expect(() => actions.saveCustomFood({ name: 'らーめん 大', kcal: 1 })).toThrow('既に登録');
    // 自分自身の編集は OK
    const b = getData().customFoods[0];
    expect(() => actions.saveCustomFood({ id: b.id, name: 'ラーメン大', kcal: 950 })).not.toThrow();
  });

  it('名前が空・カロリー不正はエラー', () => {
    expect(() => actions.saveCustomFood({ name: '  ', kcal: 100 })).toThrow();
    expect(() => actions.saveCustomFood({ name: 'x', kcal: NaN })).toThrow();
    expect(() => actions.saveCustomFood({ name: 'x', kcal: -5 })).toThrow();
  });

  it('マイメニューを削除しても過去の食事記録は残る', () => {
    const c = actions.saveCustomFood({ name: '社食A定食', kcal: 750 });
    actions.saveMeal({ date: '2026-09-23', mealType: 'lunch', foodName: c.name, amount: 1, unit: '1食', kcal: 750 });
    actions.deleteCustomFood(c.id);
    expect(getData().meals).toHaveLength(1);
    expect(getData().meals[0].kcal).toBe(750);
  });

  it('マイメニュー導入前のバックアップも読み込める', () => {
    actions.importJson(JSON.stringify({ version: 1, settings: null, weights: [], meals: [], exercises: [] }));
    expect(getData().customFoods).toEqual([]);
    const json = actions.exportJson();
    actions.saveCustomFood({ name: 'x', kcal: 1 });
    expect(JSON.parse(actions.exportJson()).customFoods).toHaveLength(1);
    actions.importJson(json);
    expect(getData().customFoods).toEqual([]);
  });
});

describe('マイメニューの検索・選択', () => {
  const mine = [{ id: '1', name: '妻のカレー', kcal: 700 }];

  it('既存の検索結果は変わらない（マイメニューなし）', () => {
    expect(searchFoods('カレー')[0].name).toBe('カレーライス');
    expect(searchFoods('カレー', 8, []).map((f) => f.name)).toEqual(searchFoods('カレー').map((f) => f.name));
  });

  it('マイメニューも検索でき、同じ一致度なら先頭に出る', () => {
    const r = searchFoods('カレー', 8, mine);
    expect(r.map((f) => f.name)).toContain('妻のカレー');
    expect(r.find((f) => f.name === '妻のカレー')).toMatchObject({ kcal: 700, unit: '1食', custom: true });
    // 既存の食品も引き続き出る
    expect(r.map((f) => f.name)).toContain('カレーライス');
    expect(searchFoods('妻', 8, mine)[0].name).toBe('妻のカレー');
  });

  it('完全一致ではマイメニューを優先', () => {
    expect(findFood('妻のカレー', mine)).toMatchObject({ kcal: 700, custom: true });
    expect(findFood('ラーメン', [{ id: '2', name: 'ラーメン', kcal: 480 }])?.kcal).toBe(480);
    expect(findFood('ラーメン')?.kcal).toBe(500);
  });

  it('マイメニューで記録した食事は「最近の食事」に出る', () => {
    actions.saveMeal({ date: '2026-09-23', mealType: 'dinner', foodName: '妻のカレー', amount: 1, unit: '1食', kcal: 700 });
    expect(recentFoods(getData()).map((m) => m.foodName)).toEqual(['妻のカレー']);
  });
});
