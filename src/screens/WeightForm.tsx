import { useState } from 'react';
import { actions, useData } from '../lib/store';
import { weightOn } from '../lib/calc';
import { formatDay } from '../lib/date';
import { back } from '../lib/router';
import { parseNum } from '../lib/num';
import { Header } from '../components/Layout';

export default function WeightForm({ date }: { date: string }) {
  const data = useData();
  const existing = data.weights.find((w) => w.date === date);
  const initial = existing?.weightKg ?? weightOn(data, date) ?? 70;
  const [value, setValue] = useState(initial.toFixed(1));
  const w = parseNum(value);
  const valid = w >= 30 && w <= 300;

  const step = (d: number) => setValue((Math.round(((valid ? w : initial) + d) * 10) / 10).toFixed(1));

  const save = () => {
    if (!valid) return;
    actions.saveWeight({ date, weightKg: Math.round(w * 10) / 10 });
    back(`/day/${date}`);
  };

  return (
    <>
      <Header title="体重を記録" onBack={`/day/${date}`} />
      <div className="page form-page">
        <div className="form-date">{formatDay(date)}</div>
        <div className="card weight-card">
          <div className="weight-input">
            <button type="button" className="round" onClick={() => step(-0.1)} aria-label="0.1kg減らす">
              −
            </button>
            <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} aria-label="体重" />
            <button type="button" className="round" onClick={() => step(0.1)} aria-label="0.1kg増やす">
              ＋
            </button>
          </div>
          <div className="weight-unit">kg</div>
          <p className="hint">{existing ? 'この日の記録を上書きします。' : '前回の体重を初期値にしています。'}</p>
        </div>
        <div className="sticky-actions">
          {existing && (
            <button
              className="btn danger-text"
              onClick={() => {
                if (confirm('この日の体重記録を削除しますか？')) {
                  actions.deleteWeight(date);
                  back(`/day/${date}`);
                }
              }}
            >
              削除
            </button>
          )}
          <button className="btn primary" disabled={!valid} onClick={save}>
            保存する
          </button>
        </div>
      </div>
    </>
  );
}
