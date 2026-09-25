import { useEffect } from 'react';
import type { AppData } from '../lib/types';
import type { BackupInfo } from '../lib/backup';
import { countData, type DataCounts } from '../lib/validate';

const fmtDateTime = (iso: string | null) => {
  if (!iso) return '不明';
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};
/** 期間を短く表示：2026/9/20〜9/25（年が変わる場合は両方に年を付ける） */
const range = (c: DataCounts) => {
  if (!c.from || !c.to) return '記録なし';
  const [fy, fm, fd] = c.from.split('-').map(Number);
  const [ty, tm, td] = c.to.split('-').map(Number);
  return `${fy}/${fm}/${fd}〜${ty === fy ? '' : ty + '/'}${tm}/${td}`;
};

/** 件数の比較表（復元の確認・バックアップの確認で共通） */
export function CountsTable({ left, leftLabel, right, rightLabel }: { left: DataCounts; leftLabel: string; right?: DataCounts; rightLabel?: string }) {
  const rows: [string, (c: DataCounts) => string][] = [
    ['設定', (c) => (c.hasSettings ? 'あり' : 'なし')],
    ['体重', (c) => `${c.weights} 件`],
    ['食事', (c) => `${c.meals} 件`],
    ['運動', (c) => `${c.exercises} 件`],
    ['マイメニュー', (c) => `${c.customFoods} 件`],
    ['期間', range],
  ];
  return (
    <table className="summary-table compare-table">
      <thead>
        <tr>
          <th />
          <td>{leftLabel}</td>
          {right && <td>{rightLabel}</td>}
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, f]) => (
          <tr key={label}>
            <th>{label}</th>
            <td>{f(left)}</td>
            {right && <td>{f(right)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** 復元の確認画面。「置き換える」を押すまで何も変更しない */
export function RestoreDialog({
  title,
  source,
  info,
  data,
  current,
  protectMode,
  onCancel,
  onConfirm,
}: {
  title: string;
  source: string;
  info?: BackupInfo;
  data: AppData;
  current: AppData | null;
  protectMode?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  const next = countData(data);
  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="復元の確認" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onCancel} aria-label="閉じる">
            ×
          </button>
        </div>
        <p className="hint">
          {source}
          {info && `（${info.legacy ? '以前の形式・' : ''}作成：${fmtDateTime(info.exportedAt)}）`}
        </p>
        <CountsTable left={next} leftLabel="復元する内容" right={current ? countData(current) : undefined} rightLabel="現在のデータ" />
        <div className="warn-box" role="note">
          {protectMode ? (
            <>
              現在の保存データは読み込めないため、<b>元のデータをそのまま別の場所に写してから</b>置き換えます。
            </>
          ) : (
            <>
              現在のデータは<b>この内容に置き換わります</b>。置き換える前の状態は「端末内の控え」に自動で残し、そこから戻せます。
            </>
          )}
        </div>
        <div className="btn-row">
          <button className="btn" onClick={onCancel}>
            キャンセル
          </button>
          <button className="btn primary" onClick={onConfirm}>
            置き換えて復元
          </button>
        </div>
      </div>
    </div>
  );
}

export { fmtDateTime };
