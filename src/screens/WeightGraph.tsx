import { useEffect, useRef, useState } from 'react';
import { useData } from '../lib/store';
import { movingAverage7, type WeightPoint } from '../lib/calc';
import { addDays, diffDays, formatDay, fromKey, todayKey } from '../lib/date';
import { go } from '../lib/router';
import { Header, Segmented } from '../components/Layout';

type Range = '30' | '90' | 'all';

export default function WeightGraph() {
  const data = useData();
  const [range, setRange] = useState<Range>('30');
  const all = movingAverage7(data.weights);
  const today = todayKey();
  const points = range === 'all' ? all : all.filter((p) => p.date > addDays(today, -Number(range)));
  const latest = all[all.length - 1];

  return (
    <>
      <Header title="体重グラフ" />
      <div className="page">
        {latest && (
          <section className="stat-grid">
            <div className="stat">
              <div className="stat-label">最新の体重</div>
              <div className="stat-value">
                {latest.weight.toFixed(1)}
                <span className="unit">kg</span>
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">7日平均</div>
              <div className="stat-value" data-testid="latest-avg7">
                {latest.avg7.toFixed(1)}
                <span className="unit">kg</span>
              </div>
            </div>
          </section>
        )}
        <Segmented
          name="期間"
          value={range}
          onChange={setRange}
          options={[
            { value: '30', label: '30日' },
            { value: '90', label: '90日' },
            { value: 'all', label: '全期間' },
          ]}
        />
        <section className="card chart-card">
          <div className="legend">
            <span><i className="lg-dot" />実測体重</span>
            <span><i className="lg-line" />7日移動平均</span>
          </div>
          {points.length === 0 ? (
            <p className="empty-text">この期間の体重記録はありません。</p>
          ) : (
            <Chart points={points} />
          )}
          <p className="hint">7日移動平均＝その日を含む直近7日間の記録の平均。記録が7日分ない場合はある分だけで平均します。</p>
        </section>

        <button className="btn block" onClick={() => go(`/weight/${today}`)}>
          今日の体重を記録
        </button>

        {points.length > 0 && (
          <section className="card">
            <h2>記録一覧</h2>
            <table className="summary-table" data-testid="weight-table">
              <thead>
                <tr>
                  <th>日付</th>
                  <td>実測</td>
                  <td>7日平均</td>
                </tr>
              </thead>
              <tbody>
                {[...points].reverse().map((p) => (
                  <tr key={p.date}>
                    <th>{formatDay(p.date)}</th>
                    <td>{p.weight.toFixed(1)}</td>
                    <td>{p.avg7.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </>
  );
}

function Chart({ points }: { points: WeightPoint[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(340);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const H = 220;
  const pad = { l: 40, r: 12, t: 12, b: 26 };
  const first = points[0].date;
  const last = points[points.length - 1].date;
  const span = Math.max(1, diffDays(first, last));
  const vals = points.flatMap((p) => [p.weight, p.avg7]);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi - lo < 2) {
    const mid = (hi + lo) / 2;
    lo = mid - 1;
    hi = mid + 1;
  }
  lo = Math.floor(lo - 0.3);
  hi = Math.ceil(hi + 0.3);
  const x = (d: string) =>
    points.length === 1 ? (pad.l + width - pad.r) / 2 : pad.l + (diffDays(first, d) / span) * (width - pad.l - pad.r);
  const y = (v: number) => pad.t + ((hi - v) / (hi - lo)) * (H - pad.t - pad.b);

  const stepY = hi - lo > 8 ? 2 : 1;
  const ticksY: number[] = [];
  for (let v = lo; v <= hi; v += stepY) ticksY.push(v);
  const ticksX = points.length === 1 ? [first] : [first, points[Math.floor((points.length - 1) / 2)].date, last];
  const uniqX = [...new Set(ticksX)];
  const md = (d: string) => {
    const t = fromKey(d);
    return `${t.getMonth() + 1}/${t.getDate()}`;
  };

  const avgPath = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.avg7).toFixed(1)}`).join('');

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.date) - px) < Math.abs(x(points[best].date) - px)) best = i;
    });
    setHover(best);
  };
  const hp = hover !== null ? points[hover] : null;

  return (
    <div className="chart-wrap" ref={wrap}>
      <svg
        width={width}
        height={H}
        role="img"
        aria-label="体重と7日移動平均のグラフ"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        data-testid="weight-chart"
      >
        {ticksY.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} className="grid" />
            <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" className="axis">
              {v}
            </text>
          </g>
        ))}
        {uniqX.map((d, i) => (
          <text
            key={d}
            x={x(d)}
            y={H - 6}
            textAnchor={uniqX.length === 1 ? 'middle' : i === 0 ? 'start' : i === uniqX.length - 1 ? 'end' : 'middle'}
            className="axis"
          >
            {md(d)}
          </text>
        ))}
        {hp && <line x1={x(hp.date)} x2={x(hp.date)} y1={pad.t} y2={H - pad.b} className="crosshair" />}
        {points.map((p) => (
          <circle key={p.date} cx={x(p.date)} cy={y(p.weight)} r={4} className="pt-actual" />
        ))}
        <path d={avgPath} className="avg-line" data-testid="avg-line" />
        {points.length === 1 && <circle cx={x(first)} cy={y(points[0].avg7)} r={3} className="pt-avg" />}
        {hp && <circle cx={x(hp.date)} cy={y(hp.avg7)} r={5} className="pt-avg-hover" />}
      </svg>
      {hp && (
        <div
          className="tooltip"
          style={{ left: Math.min(Math.max(x(hp.date) - 70, 0), width - 140) }}
          role="status"
        >
          <div className="tt-date">{formatDay(hp.date)}</div>
          <div>
            <i className="lg-dot" />実測 <b>{hp.weight.toFixed(1)}</b> kg
          </div>
          <div>
            <i className="lg-line" />7日平均 <b>{hp.avg7.toFixed(1)}</b> kg
            <small>（{hp.count}件）</small>
          </div>
        </div>
      )}
    </div>
  );
}
