import { useState } from 'react';
import { actions, useData } from '../lib/store';
import { EXERCISES, EXERCISE_ORDER, calcExerciseKcal, fmt, weightOn } from '../lib/calc';
import { formatDay } from '../lib/date';
import { back } from '../lib/router';
import { parseNum } from '../lib/num';
import type { ExerciseType } from '../lib/types';
import { EstimateNote, Header } from '../components/Layout';

const MINUTES = [10, 20, 30, 45, 60];

export default function ExerciseForm({ date, editId }: { date: string; editId: string | null }) {
  const data = useData();
  const editing = editId ? data.exercises.find((e) => e.id === editId) : undefined;
  const [type, setType] = useState<ExerciseType>(editing?.type ?? 'walking');
  const [name, setName] = useState(editing?.name ?? '');
  const [minutes, setMinutes] = useState(editing ? String(editing.minutes) : '30');

  const weight = weightOn(data, date) ?? 0;
  const min = parseNum(minutes);
  const validMin = min > 0 && min <= 600;
  const kcal = validMin ? calcExerciseKcal(type, min, weight) : 0;

  const save = () => {
    if (!validMin) return;
    actions.saveExercise({
      id: editing?.id,
      date,
      type,
      name: type === 'other' ? name.trim() || undefined : undefined,
      minutes: Math.round(min),
      kcal,
    });
    back(`/day/${date}`);
  };

  return (
    <>
      <Header title={editing ? '運動を編集' : '運動を追加'} onBack={`/day/${date}`} />
      <div className="page form-page">
        <div className="form-date">{formatDay(date)}</div>
        <div className="card form">
          <div className="field">
            <span>運動の種類</span>
            <div className="ex-grid" role="radiogroup" aria-label="運動の種類">
              {EXERCISE_ORDER.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={type === t}
                  className={'choice' + (type === t ? ' on' : '')}
                  onClick={() => setType(t)}
                >
                  <b>{EXERCISES[t].label}</b>
                  <small>{EXERCISES[t].note}</small>
                </button>
              ))}
            </div>
          </div>
          {type === 'other' && (
            <label className="field">
              <span>運動名（任意）</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：ゴルフ、テニス" aria-label="運動名" />
            </label>
          )}
          <div className="field">
            <span>時間</span>
            <div className="chips">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={'chip' + (min === m ? ' on' : '')}
                  onClick={() => setMinutes(String(m))}
                >
                  {m}分
                </button>
              ))}
            </div>
            <div className="input-unit">
              <input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} aria-label="時間（分）" />
              <em>分</em>
            </div>
          </div>
        </div>

        <div className="card result">
          <div className="result-label">
            {type === 'other' && name ? name : EXERCISES[type].label} {validMin ? `${Math.round(min)}分` : ''}
          </div>
          <div className="result-value">
            推定消費カロリー <b data-testid="exercise-kcal">{fmt(kcal)}</b> kcal
          </div>
          <EstimateNote>
            体重{weight.toFixed(1)}kg・{EXERCISES[type].mets}メッツで計算した推定値です（安静時の分を除いた追加消費）。
          </EstimateNote>
        </div>

        <div className="sticky-actions">
          <button className="btn accent" disabled={!validMin} onClick={save}>
            {editing ? '更新する' : '保存する'}
          </button>
        </div>
      </div>
    </>
  );
}
