import { useMemo, useState } from 'react';
import { actions, recentFoods, useData } from '../lib/store';
import { MEAL_LABELS, MEAL_ORDER, fmt } from '../lib/calc';
import { FOODS, customToFood, findFood, searchFoods, type Food } from '../lib/foods';
import { formatDay } from '../lib/date';
import { back } from '../lib/router';
import { parseNum } from '../lib/num';
import type { MealType } from '../lib/types';
import { EstimateNote, Header, Segmented } from '../components/Layout';
import { CustomFoodSheet } from '../components/CustomFoodSheet';

const AMOUNTS = [0.5, 1, 1.5, 2];
const POPULAR = ['牛丼 並盛', 'ラーメン', 'カレーライス', '定食（一般的）', 'おにぎり', 'ビール 350ml', 'ハイボール', 'コーヒー（ブラック）'];

function mealTypeByTime(): MealType {
  const h = new Date().getHours();
  if (h >= 4 && h < 10) return 'breakfast';
  if (h >= 10 && h < 15) return 'lunch';
  if (h >= 17 || h < 4) return 'dinner';
  return 'snack';
}

export default function MealForm({ date, editId }: { date: string; editId: string | null }) {
  const data = useData();
  const editing = editId ? data.meals.find((m) => m.id === editId) : undefined;

  const [mealType, setMealType] = useState<MealType>(editing?.mealType ?? mealTypeByTime());
  const [name, setName] = useState(editing?.foodName ?? '');
  const [base, setBase] = useState<Food | null>(() =>
    editing ? { name: editing.foodName, unit: editing.unit, kcal: Math.round(editing.kcal / (editing.amount || 1)) } : null,
  );
  const [amount, setAmount] = useState(editing?.amount ?? 1);
  // 手入力で上書きしたカロリー（null なら自動計算）
  const [manualKcal, setManualKcal] = useState<string | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [toast, setToast] = useState('');
  // マイメニュー登録シート（開いているときは初期のメニュー名を持つ）
  const [sheetName, setSheetName] = useState<string | null>(null);

  const custom = data.customFoods;
  const suggestions = useMemo(() => searchFoods(name, 8, custom), [name, custom]);
  const recent = useMemo(() => recentFoods(data), [data]);
  // よく使う：マイメニュー（記録回数の多い順）→ 定番メニュー
  const popular = useMemo(() => {
    const count = new Map<string, number>();
    for (const m of data.meals) count.set(m.foodName, (count.get(m.foodName) ?? 0) + 1);
    const mine = [...custom]
      .sort((a, b) => (count.get(b.name) ?? 0) - (count.get(a.name) ?? 0))
      .map(customToFood);
    const names = new Set(mine.map((f) => f.name));
    return [...mine, ...POPULAR.filter((n) => !names.has(n)).map((n) => FOODS.find((x) => x.name === n)!)];
  }, [data.meals, custom]);

  const autoKcal = base ? Math.round(base.kcal * amount) : null;
  const kcal = manualKcal !== null ? parseNum(manualKcal) : autoKcal;
  const valid = name.trim() !== '' && kcal !== null && Number.isFinite(kcal) && kcal >= 0 && amount > 0;

  // 量を変えたら推定値で再計算（登録データにない食品は手入力値を残す）
  const changeAmount = (a: number) => {
    setAmount(a);
    if (base) setManualKcal(null);
  };

  const pick = (f: Food) => {
    setName(f.name);
    setBase(f);
    setManualKcal(null);
    setShowSuggest(false);
  };

  const onName = (v: string) => {
    setName(v);
    setShowSuggest(true);
    // 完全一致すればそのまま推定値を採用
    const exact = findFood(v, custom);
    setBase(exact ?? null);
  };

  const save = (keepAdding: boolean) => {
    if (!valid || kcal === null) return;
    actions.saveMeal({
      id: editing?.id,
      date,
      mealType,
      foodName: name.trim(),
      amount,
      unit: base?.unit ?? '1食',
      kcal: Math.round(kcal),
    });
    if (keepAdding) {
      setToast(`「${name.trim()}」を追加しました`);
      setName('');
      setBase(null);
      setAmount(1);
      setManualKcal(null);
      setTimeout(() => setToast(''), 2000);
    } else {
      back(`/day/${date}`);
    }
  };

  return (
    <>
      <Header title={editing ? '食事を編集' : '食事を追加'} onBack={`/day/${date}`} />
      <div className="page form-page">
        <div className="form-date">{formatDay(date)}</div>
        <Segmented
          name="食事区分"
          value={mealType}
          onChange={setMealType}
          options={MEAL_ORDER.map((t) => ({ value: t, label: MEAL_LABELS[t] }))}
        />

        <div className="card form">
          <label className="field">
            <span>料理名・食品名</span>
            <input
              value={name}
              onChange={(e) => onName(e.target.value)}
              onFocus={() => setShowSuggest(true)}
              placeholder="例：牛丼、ラーメン、ビール"
              aria-label="料理名・食品名"
              autoComplete="off"
            />
          </label>
          {showSuggest && name && suggestions.length > 0 && !(base && base.name === name) && (
            <ul className="suggest" role="listbox" aria-label="候補">
              {suggestions.map((f) => (
                <li key={f.name}>
                  <button type="button" onClick={() => pick(f)}>
                    <span>
                      {f.custom && <i className="tag-mine">マイ</i>}
                      {f.name}
                    </span>
                    <small>
                      {f.unit} {f.custom ? '' : '約'}
                      {fmt(f.kcal)}kcal
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {showSuggest && name && suggestions.length === 0 && !base && (
            <p className="hint">登録データにありません。下のカロリー欄に目安を入力するか、マイメニューに登録できます。</p>
          )}
          <button type="button" className="btn outline block" onClick={() => setSheetName(base ? '' : name.trim())}>
            {name.trim() && !base ? `＋「${name.trim()}」をマイメニューに登録` : '＋ 自分でメニューを登録'}
          </button>

          {!name && recent.length > 0 && !editing && (
            <div className="field">
              <span>最近の食事</span>
              <div className="chips">
                {recent.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="chip"
                    onClick={() => {
                      const f = findFood(m.foodName, custom);
                      pick(f ?? { name: m.foodName, unit: m.unit, kcal: Math.round(m.kcal / (m.amount || 1)) });
                      setAmount(m.amount);
                    }}
                  >
                    {m.foodName}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!name && (
            <div className="field">
              <span>よく使う</span>
              <div className="chips">
                {popular.map((f) => (
                  <button
                    key={(f.custom ? 'mine:' : '') + f.name}
                    type="button"
                    className={'chip' + (f.custom ? ' mine' : '')}
                    onClick={() => pick(f)}
                  >
                    {f.custom && '★ '}
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="field">
            <span>量{base ? `（基準：${base.unit}）` : ''}</span>
            <div className="amount-row">
              {AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={'chip' + (amount === a ? ' on' : '')}
                  onClick={() => changeAmount(a)}
                >
                  ×{a}
                </button>
              ))}
              <div className="stepper">
                <button type="button" aria-label="量を減らす" onClick={() => changeAmount(Math.max(0.5, amount - 0.5))}>−</button>
                <b data-testid="amount">{amount}</b>
                <button type="button" aria-label="量を増やす" onClick={() => changeAmount(amount + 0.5)}>＋</button>
              </div>
            </div>
          </div>

          <label className="field">
            <span>推定カロリー（目安）</span>
            <div className="input-unit big">
              <input
                inputMode="numeric"
                value={manualKcal ?? (autoKcal !== null ? String(autoKcal) : '')}
                onChange={(e) => setManualKcal(e.target.value)}
                placeholder="0"
                aria-label="推定カロリー"
              />
              <em>kcal</em>
            </div>
          </label>
          <EstimateNote>
            {base?.custom
              ? 'マイメニューに登録したカロリー（1食分）を使っています。数値は直接修正できます。'
              : '表示カロリーは一般的な量での推定値（目安）です。お店や量によって変わります。数値は直接修正できます。'}
          </EstimateNote>
        </div>

        {toast && <div className="toast" role="status">{toast}</div>}
        {sheetName !== null && (
          <CustomFoodSheet
            initialName={sheetName}
            onClose={() => setSheetName(null)}
            onPicked={(c) => {
              pick(customToFood(c));
              setAmount(1);
              setSheetName(null);
            }}
          />
        )}
        <div className="sticky-actions">
          {!editing && (
            <button className="btn" disabled={!valid} onClick={() => save(true)}>
              続けて追加
            </button>
          )}
          <button className="btn primary" disabled={!valid} onClick={() => save(false)}>
            {editing ? '更新する' : '保存する'}
          </button>
        </div>
      </div>
    </>
  );
}
