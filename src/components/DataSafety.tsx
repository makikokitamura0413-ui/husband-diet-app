import { useEffect, useRef, useState } from 'react';
import { actions, useData, useStoreStatus, type SnapshotInfo } from '../lib/store';
import { createBackup, parseBackup, sameData, type ParseBackupResult } from '../lib/backup';
import { countData } from '../lib/validate';
import { canShareFiles, isStandalone, readTextFile, saveTextFile } from '../platform/files';
import { getPersistState, requestPersist, type PersistState } from '../platform/persist';
import { CountsTable, fmtDateTime, RestoreDialog } from './RestoreDialog';
import type { AppData } from '../lib/types';

declare const __APP_VERSION__: string;

const REASON: Record<SnapshotInfo['reason'], string> = {
  daily: 'その日最初の起動時',
  'before-restore': '復元する前',
  'before-reset': '全削除する前',
};

export function daysSince(iso?: string): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

/** バックアップを「ファイル」へ保存する */
export function useSaveBackup() {
  const data = useData();
  const [result, setResult] = useState<string>('');
  const save = async () => {
    const { fileName, text } = createBackup(data, new Date(), __APP_VERSION__);
    const r = await saveTextFile(fileName, text, 'カロリー記録のバックアップ');
    if (r === 'cancelled') {
      setResult('保存をキャンセルしました（バックアップは作成されていません）。');
      return;
    }
    actions.markBackup(r);
    setResult(
      r === 'share'
        ? `共有シートを開きました：「"ファイル"に保存」を選んでください（${fileName}）。保存後は「バックアップファイルを確認」で中身を確認できます。`
        : `ダウンロードしました（${fileName}）。`,
    );
  };
  return { save, result };
}

/** ファイルを選んで検査する（書き込みはしない） */
function useBackupPicker(onParsed: (r: ParseBackupResult, fileName: string) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const input = (
    <input
      ref={ref}
      type="file"
      accept="application/json,.json,text/plain"
      hidden
      onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        try {
          onParsed(parseBackup(await readTextFile(f)), f.name);
        } catch (err) {
          onParsed({ ok: false, error: 'ファイルを読み込めませんでした：' + (err as Error).message }, f.name);
        }
      }}
    />
  );
  return { open: () => ref.current?.click(), input };
}

/** 復元（確認画面つき） */
export function RestoreFromFile({ protectMode = false, label = 'バックアップから復元' }: { protectMode?: boolean; label?: string }) {
  const data = useData();
  const [pending, setPending] = useState<{ data: AppData; r: Extract<ParseBackupResult, { ok: true }>; fileName: string } | null>(null);
  const [message, setMessage] = useState('');
  const picker = useBackupPicker((r, fileName) => {
    if (!r.ok) setMessage(`「${fileName}」は復元できません：${r.error}`);
    else {
      setMessage('');
      setPending({ data: r.data, r, fileName });
    }
  });
  return (
    <>
      <button className="btn block" onClick={picker.open}>
        {label}
      </button>
      {picker.input}
      {message && (
        <p className="form-error" role="alert">
          {message}
        </p>
      )}
      {pending && (
        <RestoreDialog
          title="バックアップから復元"
          source={`ファイル：${pending.fileName}`}
          info={pending.r.info}
          data={pending.data}
          current={protectMode ? null : data}
          protectMode={protectMode}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            const res = actions.restore(pending.data);
            setPending(null);
            setMessage(res.ok ? '' : '復元できませんでした：' + res.error);
            if (res.ok) alert('バックアップから復元しました。');
          }}
        />
      )}
    </>
  );
}

/** 端末内の控えの一覧と、そこからの復元 */
export function SnapshotList({ protectMode = false }: { protectMode?: boolean }) {
  const data = useData();
  const { snapshots } = useStoreStatus();
  const [pending, setPending] = useState<SnapshotInfo | null>(null);
  const [message, setMessage] = useState('');
  if (snapshots.length === 0) return <p className="empty-text">端末内の控えはまだありません。</p>;
  return (
    <>
      <ul className="list snapshot-list" aria-label="端末内の控え">
        {[...snapshots].reverse().map((s) => (
          <li key={s.id}>
            <div className="list-main static">
              <span>
                {fmtDateTime(s.createdAt)}
                <small>
                  {REASON[s.reason]}・食事{s.counts.meals}件・体重{s.counts.weights}件
                </small>
              </span>
            </div>
            <button className="btn small" onClick={() => setPending(s)}>
              戻す
            </button>
          </li>
        ))}
      </ul>
      {message && (
        <p className="form-error" role="alert">
          {message}
        </p>
      )}
      {pending && (
        <SnapshotConfirm
          snap={pending}
          current={protectMode ? null : data}
          protectMode={protectMode}
          onCancel={() => setPending(null)}
          onDone={(err) => {
            setPending(null);
            setMessage(err ? '戻せませんでした：' + err : '');
            if (!err) alert('端末内の控えから戻しました。');
          }}
        />
      )}
    </>
  );
}

function SnapshotConfirm({
  snap,
  current,
  protectMode,
  onCancel,
  onDone,
}: {
  snap: SnapshotInfo;
  current: AppData | null;
  protectMode: boolean;
  onCancel: () => void;
  onDone: (err?: string) => void;
}) {
  // 控えの中身は store 内にあるので、確認画面では件数を表示する
  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="復元の確認" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>端末内の控えから戻す</h2>
          <button className="icon-btn" onClick={onCancel} aria-label="閉じる">
            ×
          </button>
        </div>
        <p className="hint">
          {fmtDateTime(snap.createdAt)}（{REASON[snap.reason]}）の控え
        </p>
        <CountsTable left={snap.counts} leftLabel="戻す内容" right={current ? countData(current) : undefined} rightLabel="現在のデータ" />
        <div className="warn-box" role="note">
          {protectMode ? '現在の保存データは別の場所に写してから置き換えます。' : '現在のデータはこの内容に置き換わります。今の状態も控えに残ります。'}
        </div>
        <div className="btn-row">
          <button className="btn" onClick={onCancel}>
            キャンセル
          </button>
          <button
            className="btn primary"
            onClick={() => {
              const r = actions.restoreSnapshot(snap.id);
              onDone(r.ok ? undefined : r.error);
            }}
          >
            置き換えて戻す
          </button>
        </div>
      </div>
    </div>
  );
}

/** 設定画面の「データの保護とバックアップ」 */
export function DataSafetyCard() {
  const data = useData();
  const { meta } = useStoreStatus();
  const { save, result } = useSaveBackup();
  const [persist, setPersist] = useState<PersistState | 'checking'>('checking');
  const [verify, setVerify] = useState<{ fileName: string; r: ParseBackupResult } | null>(null);
  const verifyPicker = useBackupPicker((r, fileName) => setVerify({ r, fileName }));

  useEffect(() => {
    getPersistState().then(setPersist);
  }, []);

  const since = daysSince(meta.lastBackupAt);
  const share = canShareFiles();
  const standalone = isStandalone();

  return (
    <div className="card data-tools">
      <h2>データの保護とバックアップ</h2>

      <section className="safety-block">
        <h3>① ファイルへのバックアップ（外部バックアップ）</h3>
        <p className="hint">
          iPhone の「ファイル」アプリなどに保存するバックアップです。<b>Safari の Webサイトデータを消去しても残る唯一の控え</b>
          なので、定期的に保存してください。
        </p>
        <div className="kv">
          <span>最終バックアップ</span>
          <b data-testid="last-backup">
            {meta.lastBackupAt ? `${fmtDateTime(meta.lastBackupAt)}（${since === 0 ? '今日' : `${since}日前`}・${meta.lastBackupMethod === 'share' ? '共有シート' : 'ダウンロード'}）` : 'まだありません'}
          </b>
        </div>
        <button className="btn primary block" onClick={save}>
          バックアップを保存
        </button>
        {result && (
          <p className="hint" role="status">
            {result}
          </p>
        )}
        <button className="btn block" onClick={verifyPicker.open}>
          バックアップファイルを確認
        </button>
        {verifyPicker.input}
        {verify && (
          <div className={'verify-box ' + (verify.r.ok ? 'ok' : 'ng')} role="status" data-testid="verify-result">
            {verify.r.ok ? (
              <>
                <b>✓ 復元に使えるバックアップです</b>
                <p className="hint">
                  {verify.fileName}（作成：{fmtDateTime(verify.r.info.exportedAt)}）
                  <br />
                  {sameData(verify.r.data, data) ? '現在のデータと完全に一致しています。' : '現在のデータとは内容が異なります（保存後に記録を追加した場合など）。'}
                </p>
                <CountsTable left={verify.r.info.counts} leftLabel="ファイル" right={countData(data)} rightLabel="現在" />
              </>
            ) : (
              <>
                <b>✕ このファイルは復元に使えません</b>
                <p className="hint">
                  {verify.fileName}：{verify.r.error}
                </p>
              </>
            )}
            <p className="hint">※ 確認は読み取るだけで、データは変更しません。</p>
          </div>
        )}
        <RestoreFromFile />
        <details className="howto">
          <summary>iPhone での保存・確認のしかた</summary>
          <ol>
            <li>「バックアップを保存」を押す</li>
            <li>共有シートで「"ファイル"に保存」を選び、保存先（iCloud Drive や「この iPhone 内」）を選んで「保存」</li>
            <li>「バックアップファイルを確認」を押し、いま保存したファイルを選ぶ</li>
            <li>「✓ 復元に使えるバックアップです」「現在のデータと完全に一致」と表示されれば成功</li>
          </ol>
          <p className="hint">
            この画面の環境：{standalone ? 'ホーム画面から起動' : 'ブラウザで表示'}／共有シートでのファイル保存：{share ? '対応' : '非対応（ダウンロードで保存）'}
          </p>
        </details>
      </section>

      <section className="safety-block">
        <h3>② 端末内の控え（自動）</h3>
        <p className="hint">
          毎日最初の起動時と、復元・全削除の前に自動で作る控えです。操作ミスや不具合のときに戻せます。
          <b>このブラウザの保存領域の中にあるため、Safari の Webサイトデータを消去すると一緒に消えます。</b>
        </p>
        <SnapshotList />
      </section>

      <section className="safety-block">
        <h3>③ 保存領域の永続化</h3>
        <p className="hint">
          ブラウザに「このサイトのデータを自動で消さないで」と申請します。許可されると消されにくくなりますが、
          <b>Safari の Webサイトデータを消去した場合などは消えます</b>（消えないことの保証ではありません）。
        </p>
        <div className="kv">
          <span>状態</span>
          <b data-testid="persist-state">
            {persist === 'checking' ? '確認中…' : persist === 'granted' ? '許可されています' : persist === 'not-granted' ? '許可されていません' : 'このブラウザは非対応'}
          </b>
        </div>
        {persist === 'not-granted' && (
          <button className="btn block" onClick={async () => setPersist(await requestPersist())}>
            永続化をもう一度申請
          </button>
        )}
        {!standalone && (
          <p className="hint">
            ホーム画面に追加して使うと、Safari の「しばらく使わないと消える」制限の対象外になります。ただし
            <b>ホーム画面のアプリは Safari とは別の保存場所</b>
            です。移すときは Safari で「バックアップを保存」→ ホーム画面のアプリで「バックアップから復元」してください。
          </p>
        )}
      </section>

      <button
        className="btn danger-text"
        onClick={() => {
          if (!confirm('すべての記録と設定を削除します。削除前の状態は端末内の控えに残ります。よろしいですか？')) return;
          const r = actions.resetAll();
          if (!r.ok) alert('削除を中止しました：' + r.error);
        }}
      >
        すべてのデータを削除
      </button>
    </div>
  );
}
