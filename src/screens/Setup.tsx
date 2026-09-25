import { useState } from 'react';
import { actions, useData, useStoreStatus } from '../lib/store';
import { ACTIVITY_LEVELS, calcBmr, calcDailyActivity, fmt } from '../lib/calc';
import type { ActivityLevel, Sex } from '../lib/types';
import { EstimateNote, Header, Segmented } from '../components/Layout';
import { go } from '../lib/router';
import { todayKey } from '../lib/date';
import { parseNum } from '../lib/num';
import { DataSafetyCard, RestoreFromFile, SnapshotList } from '../components/DataSafety';
import { isStandalone } from '../platform/files';

const num = parseNum;

export default function Setup({ firstRun = false }: { firstRun?: boolean }) {
  const data = useData();
  const s = data.settings;
  const [sex, setSex] = useState<Sex>(s?.sex ?? 'male');
  const [age, setAge] = useState(s ? String(s.age) : '');
  const [height, setHeight] = useState(s ? String(s.heightCm) : '');
  const [weight, setWeight] = useState(s ? String(s.weightKg) : '');
  const [level, setLevel] = useState<ActivityLevel>(s?.activityLevel ?? 'low');
  const [saved, setSaved] = useState(false);
  const { snapshots } = useStoreStatus();

  const a = num(age);
  const h = num(height);
  const w = num(weight);
  const valid = a >= 10 && a <= 100 && h >= 100 && h <= 250 && w >= 30 && w <= 300;
  const bmr = valid ? calcBmr({ sex, age: a, heightCm: h }, w) : 0;
  const act = valid ? calcDailyActivity(bmr, level) : 0;

  const save = () => {
    if (!valid) return;
    // 保存できなかった場合（他の画面で更新済み・保存失敗など）は先へ進まない
    if (!actions.saveSettings({ sex, age: Math.round(a), heightCm: h, weightKg: w, activityLevel: level })) return;
    if (firstRun) {
      // 初回の体重を今日の記録としても保存しておく
      actions.saveWeight({ date: todayKey(), weightKg: w });
      go('/');
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <>
      <Header title={firstRun ? 'はじめに' : '設定'} />
      <div className="page">
        {firstRun && (
          <p className="lead">
            消費カロリーを推定するために、あなたの情報を入力してください。あとから「設定」で変更できます。
          </p>
        )}
        {firstRun && (
          <div className="card restore-first">
            <h2>以前の記録がある場合</h2>
            <p className="hint">
              この画面（{isStandalone() ? 'ホーム画面のアプリ' : 'このブラウザ'}）には保存データがありません。以前の記録がある場合は、
              初期設定をする前にバックアップファイルから復元してください。
              {isStandalone() && ' ホーム画面のアプリは Safari とは別の保存場所です。'}
            </p>
            <RestoreFromFile />
            {snapshots.length > 0 && (
              <>
                <div className="group-title">この端末に残っている控え</div>
                <SnapshotList />
              </>
            )}
          </div>
        )}
        <div className="card form">
          <label className="field">
            <span>性別</span>
            <Segmented
              name="性別"
              value={sex}
              onChange={setSex}
              options={[
                { value: 'male', label: '男性' },
                { value: 'female', label: '女性' },
              ]}
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>年齢</span>
              <div className="input-unit">
                <input inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} placeholder="40" aria-label="年齢" />
                <em>歳</em>
              </div>
            </label>
            <label className="field">
              <span>身長</span>
              <div className="input-unit">
                <input inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="172" aria-label="身長" />
                <em>cm</em>
              </div>
            </label>
          </div>
          <label className="field">
            <span>{firstRun ? '体重' : '体重（初期値）'}</span>
            <div className="input-unit">
              <input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="75.0" aria-label="体重" />
              <em>kg</em>
            </div>
          </label>
          <div className="field">
            <span>日常活動レベル</span>
            <div className="choice-list" role="radiogroup" aria-label="日常活動レベル">
              {(Object.keys(ACTIVITY_LEVELS) as ActivityLevel[]).map((k) => (
                <button
                  type="button"
                  key={k}
                  role="radio"
                  aria-checked={level === k}
                  className={'choice' + (level === k ? ' on' : '')}
                  onClick={() => setLevel(k)}
                >
                  <b>{ACTIVITY_LEVELS[k].label}</b>
                  <small>{ACTIVITY_LEVELS[k].desc}</small>
                </button>
              ))}
            </div>
          </div>
        </div>

        {valid && (
          <div className="card preview">
            <div>
              基礎代謝 <b>{fmt(bmr)}</b> kcal ＋ 日常活動 <b>{fmt(act)}</b> kcal
            </div>
            <div className="preview-total">
              運動なしの1日の消費 ≈ <b data-testid="setup-base-burn">{fmt(bmr + act)}</b> kcal
            </div>
            <EstimateNote>基礎代謝は国立健康・栄養研究所の式による推定値です。</EstimateNote>
          </div>
        )}

        <button className="btn primary block" disabled={!valid} onClick={save}>
          {firstRun ? 'はじめる' : saved ? '保存しました ✓' : '保存する'}
        </button>
        {!valid && (age || height || weight) && (
          <p className="hint">年齢・身長・体重を正しく入力してください。</p>
        )}

        {!firstRun && <DataSafetyCard />}
      </div>
    </>
  );
}
