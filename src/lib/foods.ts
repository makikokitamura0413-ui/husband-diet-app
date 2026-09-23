import type { CustomFood } from './types';

// 簡易食品データ。カロリーは一般的な1食分の「目安」。
export interface Food {
  name: string;
  kcal: number;
  unit: string;
  /** 検索用の別名（ひらがな・カタカナ・略称） */
  aliases?: string[];
  /** ユーザーが登録したマイメニューなら true */
  custom?: boolean;
}

/** マイメニューの基準量の表示 */
export const CUSTOM_UNIT = '1食';

export function customToFood(c: CustomFood): Food {
  return { name: c.name, kcal: c.kcal, unit: CUSTOM_UNIT, custom: true };
}

export const FOODS: Food[] = [
  // ご飯もの・丼
  { name: '牛丼 並盛', kcal: 650, unit: '1杯', aliases: ['牛丼', 'ぎゅうどん', 'なみもり'] },
  { name: '牛丼 大盛り', kcal: 900, unit: '1杯', aliases: ['ぎゅうどん', 'おおもり'] },
  { name: '牛丼 小盛', kcal: 480, unit: '1杯', aliases: ['ぎゅうどん', 'こもり'] },
  { name: 'カツ丼', kcal: 900, unit: '1杯', aliases: ['かつどん'] },
  { name: '親子丼', kcal: 700, unit: '1杯', aliases: ['おやこどん'] },
  { name: '天丼', kcal: 800, unit: '1杯', aliases: ['てんどん'] },
  { name: '海鮮丼', kcal: 600, unit: '1杯', aliases: ['かいせんどん'] },
  { name: 'カレーライス', kcal: 750, unit: '1皿', aliases: ['カレー', 'かれー'] },
  { name: 'カツカレー', kcal: 1000, unit: '1皿', aliases: ['カレー', 'かつかれー'] },
  { name: 'チャーハン', kcal: 700, unit: '1皿', aliases: ['炒飯', 'ちゃーはん'] },
  { name: 'オムライス', kcal: 750, unit: '1皿', aliases: ['おむらいす'] },
  { name: 'ご飯 普通盛り', kcal: 250, unit: '1杯(150g)', aliases: ['ごはん', '白米', 'ライス'] },
  { name: 'ご飯 大盛り', kcal: 420, unit: '1杯(250g)', aliases: ['ごはん', '白米', 'ライス'] },
  { name: 'おにぎり', kcal: 180, unit: '1個', aliases: ['おにぎり', 'お握り', 'むすび'] },
  { name: '寿司', kcal: 50, unit: '1貫', aliases: ['すし', 'スシ'] },
  // 麺
  { name: 'ラーメン', kcal: 500, unit: '1杯', aliases: ['らーめん', '醤油ラーメン'] },
  { name: 'とんこつラーメン', kcal: 650, unit: '1杯', aliases: ['ラーメン', '豚骨'] },
  { name: 'つけ麺', kcal: 700, unit: '1杯', aliases: ['つけめん'] },
  { name: 'パスタ', kcal: 650, unit: '1皿', aliases: ['ぱすた', 'スパゲッティ'] },
  { name: 'ナポリタン', kcal: 700, unit: '1皿', aliases: ['パスタ', 'なぽりたん'] },
  { name: 'ミートソースパスタ', kcal: 700, unit: '1皿', aliases: ['パスタ', 'スパゲッティ'] },
  { name: 'うどん', kcal: 350, unit: '1杯', aliases: ['かけうどん'] },
  { name: 'そば', kcal: 350, unit: '1杯', aliases: ['蕎麦', 'ざるそば'] },
  { name: '焼きそば', kcal: 550, unit: '1皿', aliases: ['やきそば'] },
  // 定食
  { name: '定食（一般的）', kcal: 800, unit: '1食', aliases: ['定食', 'ていしょく'] },
  { name: '唐揚げ定食', kcal: 950, unit: '1食', aliases: ['定食', 'からあげ'] },
  { name: '生姜焼き定食', kcal: 850, unit: '1食', aliases: ['定食', 'しょうがやき'] },
  { name: '焼き魚定食', kcal: 650, unit: '1食', aliases: ['定食', 'さかな'] },
  { name: 'とんかつ定食', kcal: 1000, unit: '1食', aliases: ['定食', 'トンカツ'] },
  // パン・軽食
  { name: 'パン（食パン6枚切）', kcal: 160, unit: '1枚', aliases: ['パン', 'ぱん', 'トースト'] },
  { name: '菓子パン', kcal: 350, unit: '1個', aliases: ['パン', 'メロンパン'] },
  { name: '惣菜パン', kcal: 300, unit: '1個', aliases: ['パン', 'カレーパン'] },
  { name: 'サンドイッチ', kcal: 300, unit: '1パック', aliases: ['さんどいっち'] },
  { name: 'ハンバーガー', kcal: 450, unit: '1個', aliases: ['はんばーがー', 'バーガー'] },
  { name: 'フライドポテト Mサイズ', kcal: 400, unit: '1個', aliases: ['ポテト', 'ぽてと'] },
  { name: 'ピザ', kcal: 250, unit: '1切れ', aliases: ['ぴざ'] },
  { name: 'サラダ', kcal: 100, unit: '1皿', aliases: ['さらだ'] },
  { name: '味噌汁', kcal: 40, unit: '1杯', aliases: ['みそしる'] },
  { name: 'ゆで卵', kcal: 80, unit: '1個', aliases: ['たまご', '卵'] },
  { name: '納豆', kcal: 90, unit: '1パック', aliases: ['なっとう'] },
  { name: 'ヨーグルト', kcal: 70, unit: '1個', aliases: ['よーぐると'] },
  { name: 'バナナ', kcal: 90, unit: '1本', aliases: ['ばなな'] },
  { name: '唐揚げ', kcal: 90, unit: '1個', aliases: ['からあげ'] },
  { name: '餃子', kcal: 50, unit: '1個', aliases: ['ぎょうざ', 'ギョーザ'] },
  { name: '焼き鳥', kcal: 90, unit: '1本', aliases: ['やきとり'] },
  { name: '枝豆', kcal: 60, unit: '1皿', aliases: ['えだまめ'] },
  // 間食
  { name: 'ポテトチップス', kcal: 330, unit: '1袋(60g)', aliases: ['ぽてち', 'ポテチ'] },
  { name: 'チョコレート', kcal: 280, unit: '1枚(50g)', aliases: ['ちょこ', 'チョコ'] },
  { name: 'アイスクリーム', kcal: 250, unit: '1個', aliases: ['あいす', 'アイス'] },
  { name: 'プロテイン', kcal: 110, unit: '1杯', aliases: ['ぷろていん'] },
  // 飲み物
  { name: 'ビール 350ml', kcal: 140, unit: '1缶', aliases: ['ビール', 'びーる'] },
  { name: 'ビール 中ジョッキ', kcal: 200, unit: '1杯', aliases: ['ビール', 'びーる', '生ビール'] },
  { name: 'ハイボール', kcal: 70, unit: '1杯', aliases: ['はいぼーる'] },
  { name: 'チューハイ', kcal: 180, unit: '1缶350ml', aliases: ['ちゅーはい', 'サワー'] },
  { name: '日本酒', kcal: 190, unit: '1合', aliases: ['にほんしゅ', '酒'] },
  { name: 'ワイン', kcal: 90, unit: '1杯', aliases: ['わいん'] },
  { name: 'コーヒー（ブラック）', kcal: 5, unit: '1杯', aliases: ['コーヒー', 'こーひー', '珈琲'] },
  { name: 'カフェラテ', kcal: 130, unit: '1杯', aliases: ['コーヒー', 'ラテ'] },
  { name: '缶コーヒー（加糖）', kcal: 80, unit: '1本', aliases: ['コーヒー', 'こーひー'] },
  { name: 'コーラ', kcal: 160, unit: '1本350ml', aliases: ['こーら', 'ジュース'] },
  { name: 'オレンジジュース', kcal: 90, unit: '1杯200ml', aliases: ['ジュース'] },
];

/** カタカナ→ひらがな、空白除去、小文字化 */
export function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s　]+/g, '')
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/**
 * 入力文字列に合う食品を、近いものから順に返す。
 * custom（マイメニュー）を渡すと同じ規則で検索し、同じ一致度なら先に並べる。
 */
export function searchFoods(query: string, limit = 8, custom: CustomFood[] = []): Food[] {
  const q = normalize(query);
  if (!q) return [];
  const scored: { food: Food; score: number }[] = [];
  for (const food of [...custom.map(customToFood), ...FOODS]) {
    const keys = [food.name, ...(food.aliases ?? [])].map(normalize);
    let score = 0;
    for (const k of keys) {
      if (k === q) score = Math.max(score, 3);
      else if (k.startsWith(q)) score = Math.max(score, 2);
      else if (k.includes(q) || (q.length >= 2 && q.includes(k))) score = Math.max(score, 1);
    }
    if (score > 0) scored.push({ food, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.food);
}

/** 名前が完全一致する食品（マイメニューを優先） */
export function findFood(name: string, custom: CustomFood[] = []): Food | undefined {
  const n = normalize(name);
  const mine = custom.find((c) => normalize(c.name) === n);
  if (mine) return customToFood(mine);
  return FOODS.find((f) => normalize(f.name) === n);
}
