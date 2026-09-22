import { actions, useData } from '../lib/store';
import { EXERCISES, MEAL_LABELS, MEAL_ORDER, fmt, summarizeDay } from '../lib/calc';
import { addDays, formatDay, monthOf, todayKey } from '../lib/date';
import { go } from '../lib/router';
import { EstimateNote, Header } from '../components/Layout';
import { BalanceHero, BurnBreakdown, StatGrid } from '../components/Stats';

export default function DayDetail({ date }: { date: string }) {
  const data = useData();
  const s = summarizeDay(data, date);
  const meals = data.meals.filter((m) => m.date === date);
  const exercises = data.exercises.filter((e) => e.date === date);
  const isFuture = date > todayKey();

  return (
    <>
      <Header title="日付詳細" onBack={`/calendar?m=${monthOf(date)}`} />
      <div className="page">
        <div className="day-nav">
          <button className="icon-btn" aria-label="前の日" onClick={() => location.replace(`#/day/${addDays(date, -1)}`)}>
            ‹
          </button>
          <b data-testid="day-label">{formatDay(date)}</b>
          <button className="icon-btn" aria-label="次の日" onClick={() => location.replace(`#/day/${addDays(date, 1)}`)}>
            ›
          </button>
        </div>
        <BalanceHero s={s} hasMeals={s.mealCount > 0} />
        <StatGrid s={s} />

        <section className="card">
          <div className="section-head">
            <h2>食事</h2>
            <span className="muted">{fmt(s.intake)} kcal</span>
          </div>
          {meals.length === 0 && <p className="empty-text">記録なし</p>}
          {MEAL_ORDER.map((type) => {
            const list = meals.filter((m) => m.mealType === type);
            if (!list.length) return null;
            return (
              <div key={type} className="group">
                <div className="group-title">{MEAL_LABELS[type]}</div>
                <ul className="list">
                  {list.map((m) => (
                    <li key={m.id}>
                      <button className="list-main" onClick={() => go(`/meal/${date}?id=${m.id}`)}>
                        <span>
                          {m.foodName}
                          <small>
                            {m.unit} × {m.amount}
                          </small>
                        </span>
                        <b>{fmt(m.kcal)} kcal</b>
                      </button>
                      <button
                        className="del"
                        aria-label={`${m.foodName}を削除`}
                        onClick={() => confirm(`「${m.foodName}」を削除しますか？`) && actions.deleteMeal(m.id)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <button className="btn primary block" onClick={() => go(`/meal/${date}`)} disabled={isFuture}>
            ＋ 食事を追加
          </button>
        </section>

        <section className="card">
          <div className="section-head">
            <h2>運動</h2>
            <span className="muted">{fmt(s.exercise)} kcal</span>
          </div>
          {exercises.length === 0 && <p className="empty-text">記録なし</p>}
          <ul className="list">
            {exercises.map((e) => (
              <li key={e.id}>
                <button className="list-main" onClick={() => go(`/exercise/${date}?id=${e.id}`)}>
                  <span>
                    {e.type === 'other' && e.name ? e.name : EXERCISES[e.type].label}
                    <small>{e.minutes}分</small>
                  </span>
                  <b>{fmt(e.kcal)} kcal</b>
                </button>
                <button
                  className="del"
                  aria-label="運動を削除"
                  onClick={() => confirm('この運動を削除しますか？') && actions.deleteExercise(e.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button className="btn accent block" onClick={() => go(`/exercise/${date}`)} disabled={isFuture}>
            ＋ 運動を追加
          </button>
        </section>

        <section className="card">
          <div className="section-head">
            <h2>体重</h2>
            <span className="muted">{s.weight !== null ? `${s.weight.toFixed(1)} kg` : '未記録'}</span>
          </div>
          <button className="btn block" onClick={() => go(`/weight/${date}`)} disabled={isFuture}>
            {s.weight !== null ? '体重を修正' : '体重を記録'}
          </button>
        </section>

        <section className="card">
          <h2>総消費カロリーの内訳</h2>
          <BurnBreakdown s={s} />
        </section>
        <EstimateNote />
      </div>
    </>
  );
}
