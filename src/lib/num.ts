/** 全角数字も受け付けて数値化。数値でなければ NaN */
export function parseNum(s: string): number {
  const half = s.replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).trim();
  if (!half) return NaN;
  const n = Number(half);
  return Number.isFinite(n) ? n : NaN;
}
