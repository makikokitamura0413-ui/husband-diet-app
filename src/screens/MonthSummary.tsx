import { useData } from '../lib/store';
import { fmt, fmtSigned, summarizeMonth } from '../lib/calc';
import { formatDay, formatMonth, monthOf, todayKey } from '../lib/date';
import { EstimateNote, Header } from '../components/Layout';
import { MonthNav } from './Calendar';

export default function MonthSummaryScreen({ month: m }: { month: string | null }) {
  const data = useData();
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : monthOf(todayKey());
  const s = summarizeMonth(data, month);
  const hasMeals = s.recordedDays > 0;
  // 7,200kcal ≈ 体脂肪1kg の目安
  const fatKg = hasMeals ? s.balance / 7200 : 0;

  return (
    <>
      <Header title="月間サマリー" />
      <div className="page">
        <MonthNav month={month} base="/summary" />

        <section className={'hero ' + (hasMeals ? (s.balance <= 0 ? 'good' : 'over') : '')}>
          <div className="hero-label">{formatMonth(month)}のカロリー収支</div>
          <div className="hero-value" data-testid="m-balance">
            {hasMeals ? fmtSigned(s.balance) : '—'}
            <span className="unit">kcal</span>
          </div>
          <div className="hero-sub">
            {hasMeals ? `体脂肪換算で約 ${fatKg <= 0 ? '−' : '+'}${Math.abs(fatKg).toFixed(1)} kg 相当（目安）` : 'この月の食事記録はありません'}
          </div>
        </section>

        <section className="card">
          <h2>カロリー</h2>
          <table className="summary-table">
            <tbody>
              <Row label="総摂取カロリー" value={`${fmt(s.totalIntake)} kcal`} id="m-intake" />
              <Row label="総消費カロリー" value={`${fmt(s.totalBurn)} kcal`} id="m-burn" />
              <Row label="カロリー収支" value={hasMeals ? `${fmtSigned(s.balance)} kcal` : '—'} id="m-balance2" />
              <Row label="1日平均摂取" value={`${fmt(s.avgIntake)} kcal`} id="m-avg-intake" />
              <Row label="1日平均消費" value={`${fmt(s.avgBurn)} kcal`} id="m-avg-burn" />
            </tbody>
          </table>
          <p className="hint">食事を記録した {s.recordedDays} 日分を集計しています。</p>
        </section>

        <section className="card">
          <h2>運動</h2>
          <table className="summary-table">
            <tbody>
              <Row label="運動した日数" value={`${s.exerciseDays} 日`} id="m-ex-days" />
              <Row label="運動の追加消費 合計" value={`${fmt(s.totalExercise)} kcal`} id="m-ex-total" />
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2>体重</h2>
          <table className="summary-table">
            <tbody>
              <Row
                label="月初体重"
                sub={s.startWeight ? formatDay(s.startWeight.date) : undefined}
                value={s.startWeight ? `${s.startWeight.weightKg.toFixed(1)} kg` : '—'}
                id="m-start-w"
              />
              <Row
                label="月末体重"
                sub={s.endWeight ? formatDay(s.endWeight.date) : undefined}
                value={s.endWeight ? `${s.endWeight.weightKg.toFixed(1)} kg` : '—'}
                id="m-end-w"
              />
              <Row
                label="体重変化"
                value={s.weightChange !== null ? `${s.weightChange > 0 ? '+' : s.weightChange < 0 ? '−' : '±'}${Math.abs(s.weightChange).toFixed(1)} kg` : '—'}
                id="m-w-change"
                strong
              />
            </tbody>
          </table>
          <p className="hint">月初・月末はその月の最初と最後の体重記録です。</p>
        </section>
        <EstimateNote />
      </div>
    </>
  );
}

function Row({ label, value, id, sub, strong }: { label: string; value: string; id: string; sub?: string; strong?: boolean }) {
  return (
    <tr className={strong ? 'strong' : ''}>
      <th>
        {label}
        {sub && <small>{sub}</small>}
      </th>
      <td data-testid={id}>{value}</td>
    </tr>
  );
}
