import { useData } from '../lib/store';
import { summarizeDay } from '../lib/calc';
import { addMonths, daysInMonth, formatMonth, fromKey, monthOf, todayKey } from '../lib/date';
import { go } from '../lib/router';
import { Header } from '../components/Layout';

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

export function MonthNav({ month, base }: { month: string; base: string }) {
  return (
    <div className="month-nav">
      <button className="icon-btn" aria-label="前の月" onClick={() => go(`${base}?m=${addMonths(month, -1)}`)}>
        ‹
      </button>
      <b data-testid="month-label">{formatMonth(month)}</b>
      <button className="icon-btn" aria-label="次の月" onClick={() => go(`${base}?m=${addMonths(month, 1)}`)}>
        ›
      </button>
    </div>
  );
}

export default function CalendarScreen({ month: m }: { month: string | null }) {
  const data = useData();
  const today = todayKey();
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : monthOf(today);
  const days = daysInMonth(month);
  const lead = fromKey(days[0]).getDay();

  return (
    <>
      <Header title="カレンダー" />
      <div className="page">
        <MonthNav month={month} base="/calendar" />
        <div className="cal-legend">
          <span><i className="dot in" />摂取</span>
          <span><i className="dot out" />総消費</span>
          <span className="muted">（kcal・推定）</span>
        </div>
        <div className="calendar" role="grid">
          {WEEK.map((w, i) => (
            <div key={w} className={'cal-head' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '')}>
              {w}
            </div>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <div key={'e' + i} className="cal-cell empty" />
          ))}
          {days.map((d) => {
            const s = summarizeDay(data, d);
            const dow = fromKey(d).getDay();
            const future = d > today;
            const cls = [
              'cal-cell',
              d === today ? 'today' : '',
              s.mealCount > 0 ? (s.balance <= 0 ? 'good' : 'over') : '',
              dow === 0 ? 'sun' : dow === 6 ? 'sat' : '',
              future ? 'future' : '',
            ].join(' ');
            return (
              <button key={d} className={cls} onClick={() => go(`/day/${d}`)} data-testid={`cal-${d}`}>
                <span className="cal-date">{Number(d.slice(8))}</span>
                {s.hasRecord && (
                  <>
                    <span className="cal-in">{s.mealCount > 0 ? Math.round(s.intake) : '-'}</span>
                    <span className="cal-out">{Math.round(s.totalBurn)}</span>
                  </>
                )}
                {s.exerciseCount > 0 && <span className="cal-ex" aria-label="運動あり" />}
              </button>
            );
          })}
        </div>
        <p className="hint">
          背景色：<span className="swatch good" />消費が上回った日　<span className="swatch over" />摂取が上回った日　●運動した日
        </p>
        <button className="btn block" onClick={() => go(`/summary?m=${month}`)}>
          {formatMonth(month)}のサマリーを見る
        </button>
      </div>
    </>
  );
}
