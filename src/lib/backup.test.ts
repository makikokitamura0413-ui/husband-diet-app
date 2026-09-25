import { describe, expect, it } from 'vitest';
import { backupFileName, createBackup, parseBackup, sameData } from './backup';
import type { AppData } from './types';

const DATA: AppData = {
  version: 1,
  settings: { sex: 'male', age: 40, heightCm: 172, weightKg: 80, activityLevel: 'normal' },
  weights: [{ date: '2026-09-01', weightKg: 80 }, { date: '2026-09-25', weightKg: 78.4 }],
  meals: [{ id: 'm1', date: '2026-09-25', mealType: 'dinner', foodName: '焼肉', amount: 1, unit: '1食', kcal: 1100 }],
  exercises: [{ id: 'e1', date: '2026-09-24', type: 'running', minutes: 20, kcal: 246 }],
  customFoods: [{ id: 'c1', name: '妻のお弁当', kcal: 650 }],
};

describe('⑦ バックアップファイル', () => {
  it('設定・体重・食事・運動・マイメニューをすべて含み、形式情報と件数を持つ', () => {
    const { text, fileName } = createBackup(DATA, new Date(2026, 8, 25, 7, 5), '0.2.0');
    const f = JSON.parse(text);
    expect(fileName).toBe('diet-backup-20260925-0705.json');
    expect(f.format).toBe('husband-diet-app-backup');
    expect(f.formatVersion).toBe(1);
    expect(f.appVersion).toBe('0.2.0');
    expect(f.data).toEqual(DATA);
    expect(f.counts).toMatchObject({ weights: 2, meals: 1, exercises: 1, customFoods: 1, hasSettings: true, from: '2026-09-01', to: '2026-09-25' });
  });

  it('書き出し → 読み込みで完全に一致する', () => {
    const r = parseBackup(createBackup(DATA, new Date(), 't').text);
    expect(r.ok && sameData(r.data, DATA)).toBe(true);
  });

  it('ファイル名は日時入り', () => {
    expect(backupFileName(new Date(2026, 0, 2, 3, 4))).toBe('diet-backup-20260102-0304.json');
  });
});

describe('⑧ 復元前の検査', () => {
  it('以前の版の「バックアップを保存」で作ったファイル（データそのまま）も読める', () => {
    const legacy = JSON.stringify({ version: 1, settings: DATA.settings, weights: DATA.weights, meals: DATA.meals, exercises: DATA.exercises }, null, 2);
    const r = parseBackup(legacy);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.info.legacy).toBe(true);
      expect(r.data.customFoods).toEqual([]);
      expect(r.data.meals).toEqual(DATA.meals);
    }
  });

  it('BOM 付きの JSON も読める', () => {
    expect(parseBackup('﻿' + createBackup(DATA, new Date(), 't').text).ok).toBe(true);
  });

  const bad: [string, string, RegExp][] = [
    ['JSON でない', 'hello', /JSON/],
    ['別アプリのファイル', JSON.stringify({ format: 'other-app', data: {} }), /このアプリのバックアップ/],
    ['関係ない JSON', JSON.stringify({ a: 1 }), /このアプリのバックアップ/],
    ['新しい版の形式', JSON.stringify({ ...JSON.parse(createBackup(DATA, new Date(), 't').text), formatVersion: 99 }), /新しい版/],
    ['記録の値が不正', JSON.stringify({ ...JSON.parse(createBackup(DATA, new Date(), 't').text), data: { ...DATA, meals: [{ id: 'x', kcal: 'many' }] } }), /不正な値/],
    ['件数が記録と違う（壊れている）', JSON.stringify({ ...JSON.parse(createBackup(DATA, new Date(), 't').text), counts: { ...createBackup(DATA, new Date(), 't').counts, meals: 5 } }), /件数/],
    ['配列', '[]', /このアプリのバックアップ/],
  ];
  for (const [name, text, msg] of bad) {
    it(`${name}は拒否する`, () => {
      const r = parseBackup(text);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(msg);
    });
  }
});
