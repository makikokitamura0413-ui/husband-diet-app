import { useSyncExternalStore } from 'react';
import { normalize } from './foods';
import { toKey } from './date';
import { localStorageDriver, type StorageDriver } from './storage/driver';
import { countData, validateAppData, type DataCounts } from './validate';
import type { AppData, CustomFood, ExerciseRecord, MealRecord, UserSettings, WeightRecord } from './types';

/** 本データ。キー名・形式は最初の版から変えない */
export const DATA_KEY = 'husband-diet-app:v1';
/** 端末内の自動の控え（同じストレージ内なので、Safari のデータ消去では一緒に消える） */
export const SNAPSHOT_KEY = 'husband-diet-app:v1:snapshots';
/** 最終バックアップ日時など、データ以外の情報 */
export const META_KEY = 'husband-diet-app:meta';
/** 「本当に空か」を確かめるための書き込み確認用 */
export const PROBE_KEY = 'husband-diet-app:probe';
/** 読めなかった元データを、復元で置き換える前に写しておく先（接頭辞＋日時） */
export const UNREADABLE_PREFIX = 'husband-diet-app:v1:unreadable:';

const MAX_DAILY_SNAPSHOTS = 3;
const MAX_OTHER_SNAPSHOTS = 3;

export const emptyData = (): AppData => ({
  version: 1,
  settings: null,
  weights: [],
  meals: [],
  exercises: [],
  customFoods: [],
});

/**
 * ok    : 保存データを読み込めた
 * empty : 保存データが本当に無く、書き込めることも確認できた（初回）
 * error : 読み込めなかった／内容を確認できなかった → 保護モード（一切書き込まない）
 */
export type LoadStatus = 'ok' | 'empty' | 'error';

export interface Notice {
  kind: 'error' | 'info';
  message: string;
}

export type SnapshotReason = 'daily' | 'before-restore' | 'before-reset';

export interface SnapshotInfo {
  id: string;
  createdAt: string;
  reason: SnapshotReason;
  counts: DataCounts;
}

interface Snapshot extends SnapshotInfo {
  raw: string;
}

export interface BackupMeta {
  lastBackupAt?: string;
  lastBackupMethod?: 'share' | 'download';
}

export interface StoreStatus {
  status: LoadStatus;
  /** error のときの理由 */
  errorReason: string | null;
  notice: Notice | null;
  snapshots: SnapshotInfo[];
  meta: BackupMeta;
}

export type RestoreResult = { ok: true } | { ok: false; error: string };

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function createStore(driver: StorageDriver, now: () => Date = () => new Date()) {
  let data: AppData = emptyData();
  /** 最後に読み込んだ（または自分で書き込んだ）本データの文字列。他の画面での変更を検知するのに使う */
  let lastRaw: string | null = null;
  let status: StoreStatus = { status: 'empty', errorReason: null, notice: null, snapshots: [], meta: {} };
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((l) => l());
  // load() の後に最新の状態を読むため（型の絞り込みを避ける）
  const store_status = (): StoreStatus => status;
  const setStatus = (patch: Partial<StoreStatus>) => {
    status = { ...status, ...patch };
  };

  // ---------- 端末内の控え ----------
  function readSnapshots(): Snapshot[] | null {
    try {
      const raw = driver.read(SNAPSHOT_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.items) ? (parsed.items as Snapshot[]) : null;
    } catch {
      return null; // 読めない控えは上書きしない
    }
  }

  function writeSnapshots(items: Snapshot[]): boolean {
    const daily = items.filter((s) => s.reason === 'daily').slice(-MAX_DAILY_SNAPSHOTS);
    const other = items.filter((s) => s.reason !== 'daily').slice(-MAX_OTHER_SNAPSHOTS);
    const kept = [...daily, ...other].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    try {
      driver.write(SNAPSHOT_KEY, JSON.stringify({ version: 1, items: kept }));
      setStatus({ snapshots: kept.map(({ raw: _raw, ...info }) => info) });
      return true;
    } catch {
      return false;
    }
  }

  function addSnapshot(reason: SnapshotReason, raw: string, d: AppData): boolean {
    const items = readSnapshots();
    if (items === null) return false;
    const createdAt = now().toISOString();
    return writeSnapshots([...items, { id: newId(), createdAt, reason, raw, counts: countData(d) }]);
  }

  /** その日最初の読み込み時に、変更前の状態を控えておく */
  function dailySnapshot() {
    if (status.status !== 'ok' || lastRaw === null) return;
    const items = readSnapshots();
    if (items === null) return;
    const today = toKey(now());
    const hasToday = items.some((s) => s.reason === 'daily' && toKey(new Date(s.createdAt)) === today);
    if (!hasToday) addSnapshot('daily', lastRaw, data);
  }

  function readMeta(): BackupMeta {
    try {
      const raw = driver.read(META_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  // ---------- 読み込み ----------
  function load() {
    lastRaw = null;
    data = emptyData();
    let raw: string | null;
    try {
      raw = driver.read(DATA_KEY);
    } catch (e) {
      setStatus({ status: 'error', errorReason: `保存領域を読み出せませんでした（${errMsg(e)}）` });
      return;
    }

    if (raw === null) {
      // 本当に空かを確認：書き込めなければ「空」とは扱わない
      try {
        driver.write(PROBE_KEY, now().toISOString());
      } catch (e) {
        setStatus({ status: 'error', errorReason: `この画面では保存領域を利用できません（${errMsg(e)}）` });
        return;
      }
      setStatus({ status: 'empty', errorReason: null });
    } else {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        setStatus({ status: 'error', errorReason: '保存データの形式が壊れています（JSONとして読めません）' });
        return;
      }
      const v = validateAppData(parsed);
      if (!v.ok) {
        setStatus({ status: 'error', errorReason: '保存データの内容を確認できませんでした：' + v.errors.join('、') });
        return;
      }
      data = v.data;
      lastRaw = raw;
      setStatus({ status: 'ok', errorReason: null });
    }
    const snaps = readSnapshots() ?? [];
    setStatus({ snapshots: snaps.map(({ raw: _raw, ...info }) => info), meta: readMeta() });
    dailySnapshot();
  }

  // ---------- 書き込み（すべてここを通る） ----------
  function commit(next: AppData): boolean {
    if (status.status === 'error') {
      setStatus({ notice: { kind: 'error', message: 'データ保護のため保存を停止しています。' } });
      emit();
      return false;
    }
    let current: string | null;
    try {
      current = driver.read(DATA_KEY);
    } catch (e) {
      setStatus({ notice: { kind: 'error', message: `保存できませんでした（保存領域を読み出せません：${errMsg(e)}）` } });
      emit();
      return false;
    }
    if (current !== lastRaw) {
      // 別のタブ・画面で更新されている → 古い内容で上書きせず、最新を読み込み直す
      load();
      setStatus({
        notice: { kind: 'info', message: '別の画面でデータが更新されていたため、最新のデータを読み込みました。もう一度操作してください。' },
      });
      emit();
      return false;
    }
    const serialized = JSON.stringify(next);
    try {
      driver.write(DATA_KEY, serialized);
    } catch (e) {
      setStatus({
        notice: { kind: 'error', message: `保存できませんでした。入力内容は記録されていません（${errMsg(e)}）` },
      });
      emit();
      return false;
    }
    let back: string | null = null;
    try {
      back = driver.read(DATA_KEY);
    } catch {
      /* 下で扱う */
    }
    if (back !== serialized) {
      load();
      setStatus({ notice: { kind: 'error', message: '保存したデータを確認できませんでした。最新の状態を読み込み直しました。' } });
      emit();
      return false;
    }
    data = next;
    lastRaw = serialized;
    setStatus({ status: 'ok', errorReason: null });
    emit();
    return true;
  }

  /** データを丸ごと置き換える（復元）。置き換える前の状態は必ず控えるか、写しておく */
  function replaceAll(next: AppData, reason: 'before-restore' | 'before-reset'): RestoreResult {
    const v = validateAppData(next);
    if (!v.ok) return { ok: false, error: '復元するデータが不正です：' + v.errors.join('、') };

    if (status.status === 'error') {
      // 読めなかった元データを別キーに写してから置き換える（元データを失わない）
      let raw: string | null;
      try {
        raw = driver.read(DATA_KEY);
      } catch (e) {
        return { ok: false, error: `保存領域を読み出せないため中止しました（${errMsg(e)}）` };
      }
      if (raw !== null) {
        const copyKey = UNREADABLE_PREFIX + now().toISOString();
        try {
          driver.write(copyKey, raw);
          if (driver.read(copyKey) !== raw) throw new Error('写しを確認できません');
        } catch (e) {
          return { ok: false, error: `元のデータを写せなかったため中止しました（${errMsg(e)}）` };
        }
      }
      try {
        const serialized = JSON.stringify(v.data);
        driver.write(DATA_KEY, serialized);
        if (driver.read(DATA_KEY) !== serialized) throw new Error('書き込みを確認できません');
      } catch (e) {
        return { ok: false, error: `保存できませんでした（${errMsg(e)}）` };
      }
      load();
      emit();
      const after = store_status();
      return after.status === 'ok' ? { ok: true } : { ok: false, error: after.errorReason ?? '読み込みに失敗しました' };
    }

    if (lastRaw !== null && !addSnapshot(reason, lastRaw, data)) {
      return { ok: false, error: '現在のデータの控えを保存できなかったため中止しました。' };
    }
    return commit(v.data) ? { ok: true } : { ok: false, error: status.notice?.message ?? '保存できませんでした' };
  }

  const actions = {
    saveSettings(settings: UserSettings) {
      return commit({ ...data, settings });
    },
    /** 同じ日の体重は上書き */
    saveWeight(rec: WeightRecord) {
      const weights = data.weights.filter((w) => w.date !== rec.date);
      weights.push(rec);
      weights.sort((a, b) => a.date.localeCompare(b.date));
      return commit({ ...data, weights });
    },
    deleteWeight(date: string) {
      return commit({ ...data, weights: data.weights.filter((w) => w.date !== date) });
    },
    saveMeal(rec: Omit<MealRecord, 'id'> & { id?: string }) {
      const id = rec.id ?? newId();
      const meals = data.meals.filter((m) => m.id !== id);
      meals.push({ ...rec, id });
      return commit({ ...data, meals });
    },
    deleteMeal(id: string) {
      return commit({ ...data, meals: data.meals.filter((m) => m.id !== id) });
    },
    saveExercise(rec: Omit<ExerciseRecord, 'id'> & { id?: string }) {
      const id = rec.id ?? newId();
      const exercises = data.exercises.filter((e) => e.id !== id);
      exercises.push({ ...rec, id });
      return commit({ ...data, exercises });
    },
    deleteExercise(id: string) {
      return commit({ ...data, exercises: data.exercises.filter((e) => e.id !== id) });
    },
    /** マイメニューを登録・更新。同じ名前が既にあればエラー */
    saveCustomFood(rec: Omit<CustomFood, 'id'> & { id?: string }): CustomFood {
      const name = rec.name.trim();
      if (!name) throw new Error('メニュー名を入力してください');
      if (!(rec.kcal >= 0)) throw new Error('カロリーを正しく入力してください');
      if (findCustomFoodByName(data, name, rec.id)) throw new Error(`「${name}」は既に登録されています`);
      const id = rec.id ?? newId();
      const saved: CustomFood = { id, name, kcal: Math.round(rec.kcal) };
      const exists = data.customFoods.some((c) => c.id === id);
      const customFoods = exists ? data.customFoods.map((c) => (c.id === id ? saved : c)) : [...data.customFoods, saved];
      if (!commit({ ...data, customFoods })) throw new Error(status.notice?.message ?? '保存できませんでした');
      return saved;
    },
    /** マイメニューだけを削除（過去の食事記録はそのまま残る） */
    deleteCustomFood(id: string) {
      return commit({ ...data, customFoods: data.customFoods.filter((c) => c.id !== id) });
    },
    /** 確認済みのデータで置き換える（復元）。現在のデータは端末内の控えに残す */
    restore(next: AppData): RestoreResult {
      return replaceAll(next, 'before-restore');
    },
    /** 端末内の控えから戻す */
    restoreSnapshot(id: string): RestoreResult {
      const snap = (readSnapshots() ?? []).find((s) => s.id === id);
      if (!snap) return { ok: false, error: '控えが見つかりません' };
      let parsed: unknown;
      try {
        parsed = JSON.parse(snap.raw);
      } catch {
        return { ok: false, error: '控えのデータが壊れています' };
      }
      const v = validateAppData(parsed);
      return v.ok ? replaceAll(v.data, 'before-restore') : { ok: false, error: '控えのデータが不正です' };
    },
    /** すべて削除（設定画面から確認のうえ実行）。削除前の状態は控えに残す */
    resetAll(): RestoreResult {
      return replaceAll(emptyData(), 'before-reset');
    },
    /** バックアップを保存した日時を記録 */
    markBackup(method: 'share' | 'download') {
      const meta: BackupMeta = { ...readMeta(), lastBackupAt: now().toISOString(), lastBackupMethod: method };
      try {
        driver.write(META_KEY, JSON.stringify(meta));
      } catch {
        /* 記録できなくてもバックアップ自体は済んでいる */
      }
      setStatus({ meta });
      emit();
    },
    dismissNotice() {
      setStatus({ notice: null });
      emit();
    },
    /** 保存データを読み込み直す（保護モードからの再試行・他の画面での変更の反映） */
    reload() {
      load();
      emit();
    },
    /** 保護モードで、読めなかった元データをそのまま取り出す（ファイルに保存するため） */
    readRawData(): string | null {
      return driver.read(DATA_KEY);
    },
  };

  /** 他の画面で変更されていたら読み込み直す（書き込みはしない） */
  function syncIfChanged(): boolean {
    let current: string | null;
    try {
      current = driver.read(DATA_KEY);
    } catch {
      return false;
    }
    if (current === lastRaw) return false;
    load();
    emit();
    return true;
  }

  load();

  return {
    actions,
    syncIfChanged,
    getData: () => data,
    getStatus: () => status,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

// ---------- アプリで使う既定のストア（ブラウザの localStorage） ----------
export const store = createStore(localStorageDriver);
export const actions = store.actions;

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  // 他のタブでの保存を反映（古いタブのまま上書きしないため）
  window.addEventListener('storage', (e) => {
    if (e.key === DATA_KEY || e.key === null) store.syncIfChanged();
  });
  // iPhone でアプリに戻ってきたときにも確認
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') store.syncIfChanged();
  });
}

export function getData(): AppData {
  return store.getData();
}

export function useData(): AppData {
  return useSyncExternalStore(store.subscribe, store.getData);
}

export function useStoreStatus(): StoreStatus {
  return useSyncExternalStore(store.subscribe, store.getStatus);
}

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
