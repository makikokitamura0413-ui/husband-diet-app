import type { DaySummary } from '../lib/calc';
import { fmt, fmtSigned } from '../lib/calc';

export function BalanceHero({ s, hasMeals }: { s: DaySummary; hasMeals: boolean }) {
  const deficit = s.balance <= 0;
  return (
    <section className={'hero ' + (hasMeals ? (deficit ? 'good' : 'over') : '')}>
      <div className="hero-label">カロリー収支（摂取 − 総消費）</div>
      <div className="hero-value" data-testid="balance">
        {hasMeals ? fmtSigned(s.balance) : '—'}
        <span className="unit">kcal</span>
      </div>
      <div className="hero-sub">
        {!hasMeals
          ? '食事を記録すると収支が出ます'
          : deficit
            ? '▼ 消費が上回っています（減量ペース）'
            : '▲ 摂取が上回っています'}
      </div>
    </section>
  );
}

export function StatGrid({ s }: { s: DaySummary }) {
  return (
    <section className="stat-grid">
      <Stat label="体重" value={s.weight !== null ? s.weight.toFixed(1) : '—'} unit="kg" testId="stat-weight" />
      <Stat label="摂取カロリー" value={fmt(s.intake)} unit="kcal" testId="stat-intake" />
      <Stat label="総消費カロリー" value={fmt(s.totalBurn)} unit="kcal" testId="stat-burn" />
      <Stat label="運動の追加消費" value={fmt(s.exercise)} unit="kcal" testId="stat-exercise" />
    </section>
  );
}

function Stat({ label, value, unit, testId }: { label: string; value: string; unit: string; testId: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" data-testid={testId}>
        {value}
        <span className="unit">{unit}</span>
      </div>
    </div>
  );
}

export function BurnBreakdown({ s }: { s: DaySummary }) {
  return (
    <table className="breakdown">
      <tbody>
        <tr>
          <th>基礎代謝</th>
          <td>{fmt(s.bmr)} kcal</td>
        </tr>
        <tr>
          <th>＋ 日常活動</th>
          <td>{fmt(s.dailyActivity)} kcal</td>
        </tr>
        <tr>
          <th>＋ 運動</th>
          <td>{fmt(s.exercise)} kcal</td>
        </tr>
        <tr className="total">
          <th>＝ 総消費</th>
          <td>{fmt(s.totalBurn)} kcal</td>
        </tr>
      </tbody>
    </table>
  );
}
