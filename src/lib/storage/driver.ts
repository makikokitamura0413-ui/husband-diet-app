/**
 * 保存先の抽象化。アプリの他の部分はこのインターフェースだけを使う。
 * 将来 iOS アプリ化する場合は、ネイティブの保存領域を使うドライバーに差し替える。
 *
 * - read: キーが無ければ null。読み出し自体に失敗した場合は必ず例外を投げる
 *   （「失敗」を「データなし」と区別するため）
 * - write: 失敗したら必ず例外を投げる
 * - 削除（clear / remove）の操作はあえて用意しない
 */
export interface StorageDriver {
  read(key: string): string | null;
  write(key: string, value: string): void;
  /** このドライバーで保存しているキーの一覧（調査・表示用。読み取りのみ） */
  keys(prefix: string): string[];
}

export const localStorageDriver: StorageDriver = {
  read(key) {
    return window.localStorage.getItem(key);
  },
  write(key, value) {
    window.localStorage.setItem(key, value);
  },
  keys(prefix) {
    const out: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(prefix)) out.push(k);
    }
    return out;
  },
};

/** テスト用：メモリ上の保存先。失敗を注入できる */
export function createMemoryDriver(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  const faults = { read: false, write: false };
  const driver: StorageDriver & { map: Map<string, string>; faults: typeof faults } = {
    map,
    faults,
    read(key) {
      if (faults.read) throw new Error('read failed (test)');
      return map.has(key) ? map.get(key)! : null;
    },
    write(key, value) {
      if (faults.write) throw new Error('write failed (test)');
      map.set(key, value);
    },
    keys(prefix) {
      return [...map.keys()].filter((k) => k.startsWith(prefix));
    },
  };
  return driver;
}
