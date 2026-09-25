// テスト用：ブラウザの localStorage の代わり（clear / removeItem はアプリで使わないので用意しない）
const map = new Map<string, string>();
const storage = {
  getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
  setItem: (k: string, v: string) => void map.set(k, String(v)),
  key: (i: number) => [...map.keys()][i] ?? null,
  get length() {
    return map.size;
  },
};
Object.assign(globalThis, { window: globalThis, localStorage: storage });
