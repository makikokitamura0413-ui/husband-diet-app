import { useData } from '../lib/store';
import { summarizeDay, movingAverage7 } from '../lib/calc';
import { formatDay, todayKey } from '../lib/date';
import { go } from '../lib/router';
import { Header, EstimateNote } from '../components/Layout';
import { BalanceHero, StatGrid } from '../components/Stats';

export default function Home() {
  const data = useData();
  const today = todayKey();
  const s = summarizeDay(data, today);
  const ma = movingAverage7(data.weights);
  const latest = ma[ma.length - 1];

  return (
    <>
      <Header title="今日" />
      <div className="page">
        <button className="date-link" onClick={() => go(`/day/${today}`)}>
          {formatDay(today)} <span>詳細 ›</span>
        </button>
        <BalanceHero s={s} hasMeals={s.mealCount > 0} />
        <StatGrid s={s} />

        <div className="actions">
          <button className="btn primary big" onClick={() => go(`/meal/${today}`)}>
            ＋ 食事を追加
          </button>
          <button className="btn accent big" onClick={() => go(`/exercise/${today}`)}>
            ＋ 運動を追加
          </button>
          <button className="btn big" onClick={() => go(`/weight/${today}`)}>
            体重を記録
          </button>
        </div>

        {latest && (
          <button className="card link-card" onClick={() => go('/graph')}>
            <span>体重 7日平均</span>
            <b>
              {latest.avg7.toFixed(1)} <small>kg</small>
            </b>
            <span className="chev">›</span>
          </button>
        )}
        <EstimateNote>摂取・消費カロリーはすべて推定値（目安）です。</EstimateNote>
      </div>
    </>
  );
}
