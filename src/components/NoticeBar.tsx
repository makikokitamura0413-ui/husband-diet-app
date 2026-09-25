import { actions, useStoreStatus } from '../lib/store';

/** 保存失敗・他の画面での更新などを知らせる帯 */
export function NoticeBar() {
  const { notice } = useStoreStatus();
  if (!notice) return null;
  return (
    <div className={'notice-bar ' + notice.kind} role={notice.kind === 'error' ? 'alert' : 'status'}>
      <span>{notice.message}</span>
      <button className="icon-btn" onClick={() => actions.dismissNotice()} aria-label="閉じる">
        ×
      </button>
    </div>
  );
}
