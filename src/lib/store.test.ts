import { describe, expect, it } from 'vitest';
import { createStore, DATA_KEY, SNAPSHOT_KEY, UNREADABLE_PREFIX } from './store';
import { createMemoryDriver } from './storage/driver';
import { createBackup, parseBackup } from './backup';

const SETTINGS = { sex: 'male', age: 40, heightCm: 172, weightKg: 80, activityLevel: 'low' } as const;

/** 各版のアプリが実際に保存していた形（JSON.stringify(state) のキー順） */
const V1_MVP = JSON.stringify({
  version: 1,
  settings: SETTINGS,
  weights: [{ date: '2026-09-20', weightKg: 80.2 }, { date: '2026-09-22', weightKg: 79.5 }],
  meals: [
    { id: 'mfa1', date: '2026-09-22', mealType: 'lunch', foodName: '牛丼 大盛り', amount: 1.5, unit: '1杯', kcal: 1350 },
    { id: 'mfa2', date: '2026-09-22', mealType: 'snack', foodName: 'たこ焼き', amount: 0.5, unit: '1食', kcal: 400 },
  ],
  exercises: [{ id: 'e1', date: '2026-09-22', type: 'other', name: 'ゴルフ', minutes: 90, kcal: 330 }],
});
const V2_CUSTOM = JSON.stringify({
  ...JSON.parse(V1_MVP),
  customFoods: [{ id: 'c1', name: '妻のお弁当', kcal: 650 }],
});
const V3_FREE = JSON.stringify({
  ...JSON.parse(V2_CUSTOM),
  meals: [...JSON.parse(V2_CUSTOM).meals, { id: 'mf3', date: '2026-09-23', mealType: 'dinner', foodName: '焼肉', amount: 1, unit: '1食', kcal: 1100 }],
});

const at = (iso: string) => () => new Date(iso);

describe('① 既存データをそのまま維持', () => {
  for (const [name, raw] of [
    ['#1 MVP の形（customFoods なし）', V1_MVP],
    ['#2 マイメニュー追加後の形', V2_CUSTOM],
    ['#3 自由入力追加後の形', V3_FREE],
  ] as const) {
    it(`${name}：読み込むだけでは本データを1文字も変えない`, () => {
      const d = createMemoryDriver({ [DATA_KEY]: raw });
      const s = createStore(d, at('2026-09-25T08:00:00'));
      expect(s.getStatus().status).toBe('ok');
      expect(d.map.get(DATA_KEY)).toBe(raw);
      const parsed = JSON.parse(raw);
      expect(s.getData().meals).toEqual(parsed.meals);
      expect(s.getData().weights).toEqual(parsed.weights);
      expect(s.getData().exercises).toEqual(parsed.exercises);
      expect(s.getData().settings).toEqual(parsed.settings);
      expect(s.getData().customFoods).toEqual(parsed.customFoods ?? []);
    });
  }

  it('新しい記録を追加しても、既存の記録・キー名・形式はそのまま', () => {
    const d = createMemoryDriver({ [DATA_KEY]: V3_FREE });
    const s = createStore(d);
    expect(s.actions.saveMeal({ date: '2026-09-25', mealType: 'lunch', foodName: 'そば', amount: 1, unit: '1食', kcal: 350 })).toBe(true);
    const saved = JSON.parse(d.map.get(DATA_KEY)!);
    const before = JSON.parse(V3_FREE);
    expect(saved.meals.slice(0, before.meals.length)).toEqual(before.meals);
    expect(saved.meals).toHaveLength(before.meals.length + 1);
    expect(saved.weights).toEqual(before.weights);
    expect(saved.exercises).toEqual(before.exercises);
    expect(saved.customFoods).toEqual(before.customFoods);
    expect(Object.keys(saved)).toEqual(['version', 'settings', 'weights', 'meals', 'exercises', 'customFoods']);
  });

  it('知らない項目（将来の版で追加された項目など）も消さない', () => {
    const raw = JSON.stringify({ ...JSON.parse(V3_FREE), futureField: { a: 1 } });
    const d = createMemoryDriver({ [DATA_KEY]: raw });
    const s = createStore(d);
    s.actions.saveWeight({ date: '2026-09-25', weightKg: 79 });
    expect(JSON.parse(d.map.get(DATA_KEY)!).futureField).toEqual({ a: 1 });
  });

  it('本データ以外に作るキーは控え・メタ・確認用だけ（本データのキーは増やさない・消さない）', () => {
    const d = createMemoryDriver({ [DATA_KEY]: V3_FREE, 'other-app': 'x' });
    const s = createStore(d);
    s.actions.saveWeight({ date: '2026-09-25', weightKg: 79 });
    s.actions.markBackup('share');
    expect([...d.map.keys()].sort()).toEqual(['husband-diet-app:meta', DATA_KEY, SNAPSHOT_KEY, 'other-app'].sort());
    expect(d.map.get('other-app')).toBe('x');
  });
});

describe('② 読み込み失敗時の保護モード', () => {
  const broken: [string, string][] = [
    ['途中で切れた JSON', V3_FREE.slice(0, 80)],
    ['null', 'null'],
    ['配列', '[]'],
    ['文字列', '"abc"'],
    ['meals が配列でない', JSON.stringify({ ...JSON.parse(V3_FREE), meals: 'x' })],
    ['記録の値が不正', JSON.stringify({ ...JSON.parse(V3_FREE), meals: [{ id: 1 }] })],
    ['未対応の新しい版', JSON.stringify({ ...JSON.parse(V3_FREE), version: 2 })],
  ];
  for (const [name, raw] of broken) {
    it(`${name}：保護モードになり、どの操作でも元データを書き換えない`, () => {
      const d = createMemoryDriver({ [DATA_KEY]: raw });
      const s = createStore(d);
      expect(s.getStatus().status).toBe('error');
      expect(s.getStatus().errorReason).toBeTruthy();
      // 初期設定の保存・記録の追加・削除・マイメニュー登録をすべて試す
      expect(s.actions.saveSettings(SETTINGS)).toBe(false);
      expect(s.actions.saveWeight({ date: '2026-09-25', weightKg: 79 })).toBe(false);
      expect(s.actions.saveMeal({ date: '2026-09-25', mealType: 'lunch', foodName: 'x', amount: 1, unit: '1食', kcal: 1 })).toBe(false);
      expect(s.actions.deleteMeal('mfa1')).toBe(false);
      expect(() => s.actions.saveCustomFood({ name: 'x', kcal: 1 })).toThrow();
      expect(d.map.get(DATA_KEY)).toBe(raw);
    });
  }

  it('読み出しで例外が出ても「データなし」とは扱わない', () => {
    const d = createMemoryDriver({ [DATA_KEY]: V3_FREE });
    d.faults.read = true;
    const s = createStore(d);
    expect(s.getStatus().status).toBe('error');
    d.faults.read = false;
    expect(s.actions.saveSettings(SETTINGS)).toBe(false);
    expect(d.map.get(DATA_KEY)).toBe(V3_FREE);
  });

  it('キーが無くても、書き込めない環境なら「初回」とは扱わない', () => {
    const d = createMemoryDriver();
    d.faults.write = true;
    const s = createStore(d);
    expect(s.getStatus().status).toBe('error');
  });

  it('本当に空（キーなし・書き込み可）のときだけ初回として初期設定を保存できる', () => {
    const d = createMemoryDriver();
    const s = createStore(d);
    expect(s.getStatus().status).toBe('empty');
    expect(s.actions.saveSettings(SETTINGS)).toBe(true);
    expect(JSON.parse(d.map.get(DATA_KEY)!).settings).toEqual(SETTINGS);
  });

  it('保護モードから「もう一度読み込む」で、読めるようになれば通常に戻る', () => {
    const d = createMemoryDriver({ [DATA_KEY]: V3_FREE });
    d.faults.read = true;
    const s = createStore(d);
    d.faults.read = false;
    s.actions.reload();
    expect(s.getStatus().status).toBe('ok');
    expect(s.getData().meals).toHaveLength(3);
  });

  it('保護モードで復元する場合は、元データを別キーに写してから置き換える', () => {
    const raw = V3_FREE.slice(0, 80);
    const d = createMemoryDriver({ [DATA_KEY]: raw });
    const s = createStore(d, at('2026-09-25T08:00:00Z'));
    const b = parseBackup(createBackup(JSON.parse(V2_CUSTOM), new Date(), 't').text);
    if (!b.ok) throw new Error(b.error);
    expect(s.actions.restore(b.data)).toEqual({ ok: true });
    const copies = d.keys(UNREADABLE_PREFIX);
    expect(copies).toHaveLength(1);
    expect(d.map.get(copies[0])).toBe(raw);
    expect(s.getStatus().status).toBe('ok');
    expect(s.getData().customFoods).toHaveLength(1);
  });

  it('保護モードで元データを写せない場合は、復元を中止して何も変えない', () => {
    const raw = 'null';
    const d = createMemoryDriver({ [DATA_KEY]: raw });
    const s = createStore(d);
    d.faults.write = true;
    const r = s.actions.restore(JSON.parse(V2_CUSTOM));
    expect(r.ok).toBe(false);
    expect(d.map.get(DATA_KEY)).toBe(raw);
  });
});

describe('③ 書き込み失敗・古いタブによる上書き対策', () => {
  it('書き込みに失敗したら false を返し、エラーを通知し、画面上のデータも変えない', () => {
    const d = createMemoryDriver({ [DATA_KEY]: V3_FREE });
    const s = createStore(d);
    d.faults.write = true;
    expect(s.actions.saveWeight({ date: '2026-09-25', weightKg: 79 })).toBe(false);
    expect(s.getStatus().notice?.kind).toBe('error');
    expect(s.getData().weights).toHaveLength(2);
    expect(d.map.get(DATA_KEY)).toBe(V3_FREE);
  });

  it('古いタブ（他のタブで更新された後）で保存しても上書きせず、最新を読み込み直す', () => {
    const d = createMemoryDriver({ [DATA_KEY]: V1_MVP });
    const oldTab = createStore(d);
    const newTab = createStore(d);
    expect(newTab.actions.saveMeal({ date: '2026-09-25', mealType: 'lunch', foodName: '新しい記録', amount: 1, unit: '1食', kcal: 500 })).toBe(true);
    const latest = d.map.get(DATA_KEY);

    expect(oldTab.actions.saveWeight({ date: '2026-09-25', weightKg: 70 })).toBe(false);
    expect(d.map.get(DATA_KEY)).toBe(latest);
    expect(oldTab.getStatus().notice?.kind).toBe('info');
    expect(oldTab.getData().meals.map((m) => m.foodName)).toContain('新しい記録');
    // 読み込み直した後なら保存できる
    expect(oldTab.actions.saveWeight({ date: '2026-09-25', weightKg: 70 })).toBe(true);
    expect(JSON.parse(d.map.get(DATA_KEY)!).meals.map((m: { foodName: string }) => m.foodName)).toContain('新しい記録');
  });

  it('何も無い状態で開いた古いタブで初期設定をしても、他のタブで作ったデータを消さない', () => {
    const d = createMemoryDriver();
    const oldTab = createStore(d); // 初期設定画面のまま放置
    const newTab = createStore(d);
    newTab.actions.saveSettings(SETTINGS);
    newTab.actions.saveMeal({ date: '2026-09-25', mealType: 'lunch', foodName: '大事な記録', amount: 1, unit: '1食', kcal: 500 });
    expect(oldTab.actions.saveSettings({ ...SETTINGS, age: 99 })).toBe(false);
    expect(JSON.parse(d.map.get(DATA_KEY)!).meals).toHaveLength(1);
  });

  it('syncIfChanged：他のタブの変更を書き込みなしで反映する', () => {
    const d = createMemoryDriver({ [DATA_KEY]: V1_MVP });
    const a = createStore(d);
    const b = createStore(d);
    b.actions.saveWeight({ date: '2026-09-25', weightKg: 78 });
    expect(a.syncIfChanged()).toBe(true);
    expect(a.getData().weights).toHaveLength(3);
  });
});

describe('⑥ 自動スナップショット（端末内の控え）', () => {
  it('その日最初の起動時に1回だけ控えを作り、本データは変えない', () => {
    const d = createMemoryDriver({ [DATA_KEY]: V3_FREE });
    createStore(d, at('2026-09-25T08:00:00'));
    createStore(d, at('2026-09-25T20:00:00'));
    let items = JSON.parse(d.map.get(SNAPSHOT_KEY)!).items;
    expect(items).toHaveLength(1);
    expect(items[0].raw).toBe(V3_FREE);
    createStore(d, at('2026-09-26T08:00:00'));
    items = JSON.parse(d.map.get(SNAPSHOT_KEY)!).items;
    expect(items).toHaveLength(2);
    expect(d.map.get(DATA_KEY)).toBe(V3_FREE);
  });

  it('毎日の控えは直近3日分まで', () => {
    const d = createMemoryDriver({ [DATA_KEY]: V3_FREE });
    for (const day of ['21', '22', '23', '24', '25']) createStore(d, at(`2026-09-${day}T08:00:00`));
    const items = JSON.parse(d.map.get(SNAPSHOT_KEY)!).items;
    expect(items.map((i: { createdAt: string }) => new Date(i.createdAt).getDate())).toEqual([23, 24, 25]);
  });

  it('復元の前に今のデータを控え、その控えから元に戻せる', () => {
    const d = createMemoryDriver({ [DATA_KEY]: V3_FREE });
    const s = createStore(d);
    expect(s.actions.restore(JSON.parse(V1_MVP))).toEqual({ ok: true });
    expect(s.getData().customFoods).toEqual([]);
    const snap = s.getStatus().snapshots.find((x) => x.reason === 'before-restore')!;
    expect(snap.counts.meals).toBe(3);
    expect(s.actions.restoreSnapshot(snap.id)).toEqual({ ok: true });
    expect(s.getData().meals).toHaveLength(3);
    expect(s.getData().customFoods).toHaveLength(1);
  });

  it('「すべて削除」の前にも控えを残す', () => {
    const d = createMemoryDriver({ [DATA_KEY]: V3_FREE });
    const s = createStore(d);
    expect(s.actions.resetAll()).toEqual({ ok: true });
    expect(s.getData().meals).toHaveLength(0);
    const snap = s.getStatus().snapshots.find((x) => x.reason === 'before-reset')!;
    expect(s.actions.restoreSnapshot(snap.id)).toEqual({ ok: true });
    expect(s.getData().meals).toHaveLength(3);
  });

  it('控えを保存できない場合は、復元・削除を中止する', () => {
    const d = createMemoryDriver({ [DATA_KEY]: V3_FREE, [SNAPSHOT_KEY]: '{壊れた控え' });
    const s = createStore(d);
    expect(s.actions.resetAll().ok).toBe(false);
    expect(d.map.get(DATA_KEY)).toBe(V3_FREE);
    expect(d.map.get(SNAPSHOT_KEY)).toBe('{壊れた控え');
  });
});
