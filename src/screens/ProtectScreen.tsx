import { useState } from 'react';
import { actions, useStoreStatus } from '../lib/store';
import { saveTextFile } from '../platform/files';
import { Header } from '../components/Layout';
import { RestoreFromFile, SnapshotList } from '../components/DataSafety';

/**
 * 保存データを読み込めなかったときの画面（保護モード）。
 * この状態では初期設定・記録の保存など、保存データを書き換える操作は一切できない。
 */
export default function ProtectScreen() {
  const { errorReason } = useStoreStatus();
  const [message, setMessage] = useState('');

  const saveRaw = async () => {
    let raw: string | null;
    try {
      raw = actions.readRawData();
    } catch (e) {
      setMessage('保存領域を読み出せないため、ファイルに書き出せませんでした：' + (e as Error).message);
      return;
    }
    if (raw === null) {
      setMessage('保存データが見つかりませんでした。');
      return;
    }
    const d = new Date();
    const name = `diet-raw-data-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
    const r = await saveTextFile(name, raw, 'カロリー記録の保存データ（読み込めなかったもの）');
    setMessage(r === 'cancelled' ? '保存をキャンセルしました。' : `元の保存データを「${name}」として書き出しました。`);
  };

  return (
    <div className="app">
      <Header title="データの保護" />
      <div className="page">
        <section className="protect-box" role="alert">
          <h2>保存データを確認できませんでした</h2>
          <p>データ保護のため、新しいデータで上書きする操作を停止しています。</p>
          <p className="hint">
            これまでの記録はまだ消えていない可能性があります。この画面では初期設定や記録の保存はできません。
          </p>
          {errorReason && <p className="protect-reason">理由：{errorReason}</p>}
        </section>

        <div className="card">
          <h2>まず試してください</h2>
          <button className="btn primary block" onClick={() => actions.reload()}>
            もう一度読み込む
          </button>
          <p className="hint">アプリを一度閉じて開き直しても直らない場合は、下の方法を使ってください。</p>
        </div>

        <div className="card">
          <h2>元の保存データを残す</h2>
          <p className="hint">読み込めなかった保存データを、そのままファイルに書き出します（データは変更しません）。</p>
          <button className="btn block" onClick={saveRaw}>
            元の保存データをファイルに保存
          </button>
          {message && (
            <p className="hint" role="status">
              {message}
            </p>
          )}
        </div>

        <div className="card">
          <h2>バックアップから戻す</h2>
          <p className="hint">
            確認画面で内容を確かめてから置き換えます。読み込めなかった元データは、置き換える前に別の場所へ写して残します。
          </p>
          <RestoreFromFile protectMode />
          <div className="group-title">端末内の控え</div>
          <SnapshotList protectMode />
        </div>
      </div>
    </div>
  );
}
