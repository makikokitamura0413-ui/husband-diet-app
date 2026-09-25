/**
 * ストレージの永続化要求（navigator.storage.persist）。
 * 許可されると、容量不足などでブラウザが自動的にデータを消す対象から外れやすくなる。
 * ただし、ユーザーが Safari の「Webサイトデータを消去」を行った場合などは消える。
 * 「絶対に消えない」ことは保証しない。
 */
export type PersistState = 'granted' | 'not-granted' | 'unsupported';

export async function getPersistState(): Promise<PersistState> {
  try {
    if (!navigator.storage?.persisted) return 'unsupported';
    return (await navigator.storage.persisted()) ? 'granted' : 'not-granted';
  } catch {
    return 'unsupported';
  }
}

export async function requestPersist(): Promise<PersistState> {
  try {
    if (!navigator.storage?.persist) return 'unsupported';
    if (await navigator.storage.persisted()) return 'granted';
    return (await navigator.storage.persist()) ? 'granted' : 'not-granted';
  } catch {
    return 'unsupported';
  }
}
