import type { AppData } from './types';
import { countData, validateAppData, type DataCounts } from './validate';

/**
 * バックアップファイル（iPhone の「ファイル」などに保存する外部バックアップ）の形式。
 * 中身の data は保存データ（husband-diet-app:v1）と同じ形式。
 */
export const BACKUP_FORMAT = 'husband-diet-app-backup';
export const BACKUP_FORMAT_VERSION = 1;
const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  exportedAt: string;
  appVersion: string;
  counts: DataCounts;
  data: AppData;
}

export interface BackupInfo {
  /** 旧形式（データをそのまま書き出していた頃）のファイルか */
  legacy: boolean;
  exportedAt: string | null;
  appVersion: string | null;
  counts: DataCounts;
}

export type ParseBackupResult = { ok: true; data: AppData; info: BackupInfo } | { ok: false; error: string };

const pad = (n: number) => String(n).padStart(2, '0');

export function backupFileName(at: Date): string {
  return `diet-backup-${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}.json`;
}

export function createBackup(data: AppData, at: Date, appVersion: string): { fileName: string; text: string; counts: DataCounts } {
  const counts = countData(data);
  const file: BackupFile = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: at.toISOString(),
    appVersion,
    counts,
    data,
  };
  return { fileName: backupFileName(at), text: JSON.stringify(file, null, 2), counts };
}

/** ファイルの中身を検査する。書き込みは一切しない */
export function parseBackup(text: string): ParseBackupResult {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, error: 'ファイルが大きすぎます' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    return { ok: false, error: 'JSON 形式のファイルではありません' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'このアプリのバックアップファイルではありません' };
  }
  const obj = parsed as Record<string, unknown>;

  let legacy = false;
  let payload: unknown;
  if ('format' in obj) {
    if (obj.format !== BACKUP_FORMAT) return { ok: false, error: 'このアプリのバックアップファイルではありません' };
    if (typeof obj.formatVersion !== 'number' || obj.formatVersion > BACKUP_FORMAT_VERSION) {
      return { ok: false, error: '新しい版のアプリで作られたバックアップのため読み込めません。アプリを更新してください' };
    }
    payload = obj.data;
  } else if (Array.isArray(obj.meals) && Array.isArray(obj.weights) && Array.isArray(obj.exercises)) {
    legacy = true; // 以前の「バックアップを保存」で作ったファイル
    payload = obj;
  } else {
    return { ok: false, error: 'このアプリのバックアップファイルではありません' };
  }

  const v = validateAppData(payload);
  if (!v.ok) return { ok: false, error: 'バックアップの内容に不正な値があります：' + v.errors.join('、') };

  const counts = countData(v.data);
  if (!legacy && obj.counts && typeof obj.counts === 'object') {
    // 書き出したときの件数と一致するか（途中で壊れていないか）
    const c = obj.counts as Partial<DataCounts>;
    if (c.meals !== counts.meals || c.weights !== counts.weights || c.exercises !== counts.exercises) {
      return { ok: false, error: 'バックアップの件数が記録と一致しません（ファイルが壊れている可能性があります）' };
    }
  }
  return {
    ok: true,
    data: v.data,
    info: {
      legacy,
      exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : null,
      appVersion: typeof obj.appVersion === 'string' ? obj.appVersion : null,
      counts,
    },
  };
}

/** 2つのデータが同じ内容か（バックアップ確認用） */
export function sameData(a: AppData, b: AppData): boolean {
  const norm = (d: AppData) => JSON.stringify({ ...d, customFoods: d.customFoods ?? [] });
  return norm(a) === norm(b);
}
