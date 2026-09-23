import { useEffect, useRef, useState } from 'react';
import { actions, useData } from '../lib/store';
import { fmt } from '../lib/calc';
import { parseNum } from '../lib/num';
import type { CustomFood } from '../lib/types';

/**
 * マイメニューの登録・編集・削除を行う下からのシート。
 * 登録（または更新）したメニューは onPicked で食事入力フォームに渡す。
 */
export function CustomFoodSheet({
  initialName,
  onClose,
  onPicked,
}: {
  initialName: string;
  onClose: () => void;
  onPicked: (food: CustomFood) => void;
}) {
  const data = useData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState(initialName);
  const [kcal, setKcal] = useState('');
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const k = parseNum(kcal);
  const valid = name.trim() !== '' && k >= 0 && k <= 10000;

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setKcal('');
    setError('');
  };

  const submit = () => {
    if (!valid) return;
    try {
      const saved = actions.saveCustomFood({ id: editingId ?? undefined, name, kcal: k });
      onPicked(saved);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const startEdit = (c: CustomFood) => {
    setEditingId(c.id);
    setName(c.name);
    setKcal(String(c.kcal));
    setError('');
    nameRef.current?.focus();
  };

  const remove = (c: CustomFood) => {
    if (!confirm(`マイメニュー「${c.name}」を削除しますか？\n（これまでの食事記録は消えません）`)) return;
    actions.deleteCustomFood(c.id);
    if (editingId === c.id) resetForm();
  };

  const list = [...data.customFoods].sort((a, b) => a.name.localeCompare(b.name, 'ja'));

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="マイメニュー"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <h2>{editingId ? 'マイメニューを編集' : '自分でメニューを登録'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>

        <div className="form sheet-form">
          <label className="field">
            <span>メニュー名</span>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="例：妻のお弁当、社食A定食"
              aria-label="メニュー名"
              autoComplete="off"
              maxLength={40}
            />
          </label>
          <label className="field">
            <span>カロリー（1食分）</span>
            <div className="input-unit big">
              <input
                inputMode="numeric"
                value={kcal}
                onChange={(e) => {
                  setKcal(e.target.value);
                  setError('');
                }}
                placeholder="0"
                aria-label="メニューのカロリー"
              />
              <em>kcal</em>
            </div>
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="btn-row">
            {editingId ? (
              <button type="button" className="btn" onClick={resetForm}>
                編集をやめる
              </button>
            ) : (
              <button type="button" className="btn" onClick={onClose}>
                キャンセル
              </button>
            )}
            <button type="button" className="btn primary" disabled={!valid} onClick={submit}>
              {editingId ? '更新して選ぶ' : '登録して選ぶ'}
            </button>
          </div>
          <p className="hint">入力したカロリーをそのまま使います。登録したメニューは次回からも検索・選択できます。</p>
        </div>

        <div className="sheet-list">
          <div className="group-title">登録済みのマイメニュー（{list.length}件）</div>
          {list.length === 0 && <p className="empty-text">まだ登録はありません。</p>}
          <ul className="list" aria-label="登録済みのマイメニュー">
            {list.map((c) => (
              <li key={c.id} className={editingId === c.id ? 'editing' : ''}>
                <button className="list-main" onClick={() => onPicked(c)} aria-label={`${c.name}を選ぶ`}>
                  <span>{c.name}</span>
                  <b>{fmt(c.kcal)} kcal</b>
                </button>
                <button className="del" onClick={() => startEdit(c)} aria-label={`${c.name}を編集`}>
                  ✎
                </button>
                <button className="del" onClick={() => remove(c)} aria-label={`${c.name}を削除`}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
