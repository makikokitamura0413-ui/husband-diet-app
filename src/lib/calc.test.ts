import { describe, expect, it } from 'vitest';
import {
  calcBmr,
  calcDailyActivity,
  calcExerciseKcal,
  movingAverage7,
  summarizeDay,
  summarizeMonth,
  weightOn,
} from './calc';
import { searchFoods, normalize } from './foods';
import { parseNum } from './num';
import { addDays, addMonths, daysInMonth } from './date';
import type { AppData } from './types';

const base = (): AppData => ({
  version: 1,
  settings: { sex: 'male', age: 40, heightCm: 172, weightKg: 80, activityLevel: 'low' },
  weights: [],
  meals: [],
  exercises: [],
});

describe('基礎代謝・日常活動', () => {
  it('男性40歳172cm80kg の基礎代謝は約1650kcal', () => {
    // (0.0481*80 + 0.0234*172 - 0.0138*40 - 0.4235)*1000/4.186
    expect(calcBmr({ sex: 'male', age: 40, heightCm: 172 }, 80)).toBe(1648);
  });
  it('女性は男性より低い', () => {
    expect(calcBmr({ sex: 'female', age: 40, heightCm: 172 }, 80)).toBeLessThan(1648);
  });
  it('活動レベル low は基礎代謝×0.5', () => {
    expect(calcDailyActivity(1648, 'low')).toBe(824);
    expect(calcDailyActivity(1648, 'normal')).toBe(1236);
    expect(calcDailyActivity(1648, 'high')).toBe(1648);
  });
});

describe('運動消費', () => {
  it('ランニング20分・80kg', () => {
    // (9.8-1)*80*(20/60)*1.05 = 246.4
    expect(calcExerciseKcal('running', 20, 80)).toBe(246);
  });
  it('ウォーキング30分・70kg', () => {
    expect(calcExerciseKcal('walking', 30, 70)).toBe(92);
  });
  it('0分や不正値は0', () => {
    expect(calcExerciseKcal('running', 0, 80)).toBe(0);
    expect(calcExerciseKcal('running', NaN, 80)).toBe(0);
  });
});

describe('1日の集計', () => {
  it('総消費 = 基礎代謝 + 日常活動 + 運動、収支 = 摂取 − 総消費', () => {
    const d = base();
    d.meals.push(
      { id: 'a', date: '2026-09-22', mealType: 'lunch', foodName: '牛丼 並盛', amount: 1, unit: '1杯', kcal: 650 },
      { id: 'b', date: '2026-09-22', mealType: 'dinner', foodName: 'ビール 350ml', amount: 2, unit: '1缶', kcal: 280 },
    );
    d.exercises.push({ id: 'e', date: '2026-09-22', type: 'running', minutes: 20, kcal: 246 });
    const s = summarizeDay(d, '2026-09-22');
    expect(s.intake).toBe(930);
    expect(s.bmr).toBe(1648);
    expect(s.dailyActivity).toBe(824);
    expect(s.exercise).toBe(246);
    expect(s.totalBurn).toBe(1648 + 824 + 246);
    expect(s.balance).toBe(930 - (1648 + 824 + 246));
  });
  it('体重記録があればその日以降の基礎代謝に反映', () => {
    const d = base();
    d.weights.push({ date: '2026-09-10', weightKg: 70 });
    expect(weightOn(d, '2026-09-09')).toBe(80);
    expect(weightOn(d, '2026-09-10')).toBe(70);
    expect(weightOn(d, '2026-09-30')).toBe(70);
    expect(summarizeDay(d, '2026-09-11').bmr).toBe(calcBmr(d.settings!, 70));
  });
});

describe('7日移動平均', () => {
  it('7日未満は存在するデータで平均', () => {
    const r = movingAverage7([
      { date: '2026-09-01', weightKg: 80 },
      { date: '2026-09-02', weightKg: 79 },
      { date: '2026-09-03', weightKg: 78.4 },
    ]);
    expect(r.map((p) => p.avg7)).toEqual([80, 79.5, 79.1]);
    expect(r.map((p) => p.count)).toEqual([1, 2, 3]);
  });
  it('直近7日（暦日）の窓で計算し、それより古い記録は含めない', () => {
    const ws = Array.from({ length: 10 }, (_, i) => ({ date: addDays('2026-09-01', i), weightKg: 80 - i * 0.2 }));
    const r = movingAverage7(ws);
    const last = r[r.length - 1]; // 9/10: 9/4〜9/10 の7件
    expect(last.count).toBe(7);
    const expected = ws.slice(3).reduce((s, w) => s + w.weightKg, 0) / 7;
    expect(last.avg7).toBeCloseTo(Math.round(expected * 10) / 10, 5);
  });
  it('記録が飛んでいる場合は窓内の記録だけ', () => {
    const r = movingAverage7([
      { date: '2026-09-01', weightKg: 80 },
      { date: '2026-09-09', weightKg: 78 },
    ]);
    expect(r[1].avg7).toBe(78);
    expect(r[1].count).toBe(1);
  });
  it('並び順に依存しない', () => {
    const r = movingAverage7([
      { date: '2026-09-03', weightKg: 78 },
      { date: '2026-09-01', weightKg: 80 },
    ]);
    expect(r[0].date).toBe('2026-09-01');
    expect(r[1].avg7).toBe(79);
  });
});

describe('月間集計', () => {
  it('食事記録のある日を対象に集計し、体重変化を出す', () => {
    const d = base();
    d.meals.push(
      { id: '1', date: '2026-09-01', mealType: 'lunch', foodName: 'x', amount: 1, unit: '1', kcal: 2000 },
      { id: '2', date: '2026-09-02', mealType: 'lunch', foodName: 'x', amount: 1, unit: '1', kcal: 2400 },
      { id: '3', date: '2026-10-01', mealType: 'lunch', foodName: 'x', amount: 1, unit: '1', kcal: 9999 },
    );
    d.exercises.push(
      { id: 'e1', date: '2026-09-02', type: 'walking', minutes: 30, kcal: 100 },
      { id: 'e2', date: '2026-09-02', type: 'running', minutes: 20, kcal: 200 },
      { id: 'e3', date: '2026-09-15', type: 'walking', minutes: 30, kcal: 100 },
    );
    d.weights.push(
      { date: '2026-09-01', weightKg: 80 },
      { date: '2026-09-20', weightKg: 78.6 },
      { date: '2026-08-31', weightKg: 81 },
    );
    const m = summarizeMonth(d, '2026-09');
    const day1 = summarizeDay(d, '2026-09-01');
    const day2 = summarizeDay(d, '2026-09-02');
    expect(m.recordedDays).toBe(2);
    expect(m.totalIntake).toBe(4400);
    expect(m.totalBurn).toBe(day1.totalBurn + day2.totalBurn);
    expect(m.balance).toBe(4400 - m.totalBurn);
    expect(m.avgIntake).toBe(2200);
    expect(m.avgBurn).toBe(Math.round(m.totalBurn / 2));
    expect(m.exerciseDays).toBe(2);
    expect(m.totalExercise).toBe(400);
    expect(m.startWeight?.weightKg).toBe(80);
    expect(m.endWeight?.weightKg).toBe(78.6);
    expect(m.weightChange).toBe(-1.4);
  });
  it('記録なしの月は0と—', () => {
    const m = summarizeMonth(base(), '2026-02');
    expect(m.recordedDays).toBe(0);
    expect(m.avgIntake).toBe(0);
    expect(m.weightChange).toBeNull();
  });
});

describe('食品検索・日付・数値', () => {
  it('ひらがな・カタカナ・部分一致で検索できる', () => {
    expect(searchFoods('牛丼').map((f) => f.name)).toContain('牛丼 大盛り');
    expect(searchFoods('ぎゅうどん').length).toBeGreaterThan(0);
    expect(searchFoods('らーめん')[0].name).toBe('ラーメン');
    expect(searchFoods('カレー')[0].name).toBe('カレーライス');
    expect(searchFoods('ハイボール')[0].name).toBe('ハイボール');
    expect(searchFoods('コーヒー').length).toBeGreaterThan(0);
    for (const q of ['チャーハン', 'パスタ', 'おにぎり', 'パン', '定食', 'ビール']) {
      expect(searchFoods(q).length, q).toBeGreaterThan(0);
    }
    expect(normalize('ラーメン')).toBe('らーめん');
  });
  it('日付ユーティリティ', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(daysInMonth('2028-02')).toHaveLength(29);
  });
  it('全角数字も読める', () => {
    expect(parseNum('７２．５')).toBe(72.5);
    expect(parseNum('')).toBeNaN();
    expect(parseNum('abc')).toBeNaN();
  });
});
