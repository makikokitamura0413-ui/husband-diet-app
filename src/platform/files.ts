/**
 * ファイルの保存・読み込み（Web 版）。将来ネイティブアプリ化する場合はこのファイルを差し替える。
 *
 * iPhone では共有シート（navigator.share）から「"ファイル"に保存」を選べる。
 * 共有シートが使えない環境ではダウンロードにする。
 */
export type SaveResult = 'share' | 'download' | 'cancelled';

export function canShareFiles(): boolean {
  try {
    const probe = new File(['{}'], 'probe.json', { type: 'application/json' });
    return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export async function saveTextFile(fileName: string, text: string, title: string): Promise<SaveResult> {
  const file = new File([text], fileName, { type: 'application/json' });
  if (canShareFiles()) {
    try {
      await navigator.share({ files: [file], title });
      return 'share';
    } catch (e) {
      // ユーザーが共有シートを閉じた
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // それ以外の失敗はダウンロードで保存する
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'download';
}

export function readTextFile(file: File): Promise<string> {
  return file.text();
}

/** ホーム画面から起動しているか（iPhone では Safari と保存場所が別になる） */
export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
